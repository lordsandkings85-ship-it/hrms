import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { PERMISSIONS_KEY, RequiredPermission } from '../decorators/permissions.decorator';

interface CachedPermissions {
  employeeId: string | null;
  isSystem: boolean;
  grants: Array<{ module: string; action: string }>;
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Route prefixes on which an employee may NOT self-bypass the required
 * permission for mutating requests (POST/PUT/PATCH/DELETE). Self-service is
 * still allowed on read methods and on employee-owned modules (attendance,
 * leave apply, expenses, travel, timesheets, documents, assets, helpdesk,
 * training, exit, fnf, employee-services, projects, announcements, shifts).
 * Without this, a user could e.g. POST /payroll/payouts with their own
 * employeeId in the body and skip the payroll:edit check entirely.
 */
const SENSITIVE_MUTATION_PREFIXES = [
  '/payroll', '/salary', '/employees', '/performance', '/recruitment',
  '/reports', '/organization', '/org-masters', '/attendance-policy',
  '/compliance-setup', '/tax-setup', '/integrations', '/billing',
  '/super-admin', '/settings', '/leave/balances', '/leave/monthly-',
];

@Injectable()
export class PermissionsGuard implements CanActivate {
  private permCache = new Map<string, { data: CachedPermissions; expiresAt: number }>();

  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  private getCached(userId: string): CachedPermissions | null {
    const entry = this.permCache.get(userId);
    if (entry && entry.expiresAt > Date.now()) return entry.data;
    if (entry) this.permCache.delete(userId);
    return null;
  }

  private setCache(userId: string, data: CachedPermissions): void {
    this.permCache.set(userId, { data, expiresAt: Date.now() + CACHE_TTL_MS });
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<RequiredPermission[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required || required.length === 0) return true;

    const request = context.switchToHttp().getRequest();
    const { user, params } = request;

    if (user?.isSuperAdmin) return true;

    // Check if user is accessing their own employee record or payroll resources
    if (user?.userId) {
      const cached = this.getCached(user.userId);
      const userEmployeeId = cached?.employeeId ?? (
        await this.prisma.user.findUnique({
          where: { id: user.userId },
          select: { employeeId: true }
        })
      )?.employeeId ?? null;

      // Cache the employeeId lookup if we didn't have it cached
      if (!cached && userEmployeeId) {
        this.setCache(user.userId, { employeeId: userEmployeeId, isSystem: false, grants: [] });
      }

      const bodyEmployeeId = request.body?.employeeId;
      const path = request.route?.path || '';
      const method = request.method || '';

      const isSalaryMutation =
        (path.includes('salary-structure') || path.includes('salary-revision')) &&
        !['GET', 'HEAD', 'OPTIONS'].includes(method);

      const isEmployeeRecordMutation =
        /^\/employees\/[^/]+$/.test(path.replace(/^\/api\/v1/, '')) &&
        !['GET', 'HEAD', 'OPTIONS'].includes(method);

      const isReadOnlyMethod = ['GET', 'HEAD', 'OPTIONS'].includes(method);
      const pathNoPrefix = path.replace(/^\/api\/v1/, '');
      const isSensitiveMutation =
        !isReadOnlyMethod &&
        SENSITIVE_MUTATION_PREFIXES.some((p) => pathNoPrefix.startsWith(p));

      const canSelfService =
        (isReadOnlyMethod || !isSensitiveMutation) &&
        !isSalaryMutation &&
        !isEmployeeRecordMutation;

      if (
        canSelfService &&
        userEmployeeId &&
        (params?.employeeId === userEmployeeId ||
          params?.id === userEmployeeId ||
          bodyEmployeeId === userEmployeeId ||
          request.query?.employeeId === userEmployeeId)
      ) {
        return true;
      }
      if (userEmployeeId && params?.id && request.route?.path?.endsWith('payslip/:id')) {
        const payslip = await this.prisma.payslip.findUnique({
          where: { id: params.id },
          select: { employeeId: true },
        });
        if (payslip?.employeeId === userEmployeeId) return true;
      }
      if (userEmployeeId && method === 'GET' && request.route?.path?.endsWith('payslips/:employeeId') && params?.employeeId === userEmployeeId) {
        return true;
      }
    }

    if (!user?.roleId) throw new ForbiddenException('No role assigned');

    // Check cache for role + permissions
    let isSystem: boolean;
    let grants: Array<{ module: string; action: string }>;

    const cached = this.getCached(user.userId);
    if (cached && cached.isSystem !== undefined && cached.grants.length > 0) {
      isSystem = cached.isSystem;
      grants = cached.grants;
    } else {
      const role = await this.prisma.role.findUnique({ where: { id: user.roleId } });
      isSystem = !!role?.isSystem;

      if (isSystem) {
        this.setCache(user.userId, { employeeId: cached?.employeeId ?? null, isSystem: true, grants: [] });
        return true;
      }

      grants = await this.prisma.permission.findMany({
        where: { roleId: user.roleId },
      });

      this.setCache(user.userId, {
        employeeId: cached?.employeeId ?? null,
        isSystem: false,
        grants,
      });
    }

    const ok = required.every((req) =>
      grants.some(
        (g) =>
          (g.module === req.module && g.action === req.action) ||
          (g.module === 'ALL' && g.action === 'ALL')
      ),
    );

    if (!ok) throw new ForbiddenException('Insufficient permissions');
    return true;
  }
}
