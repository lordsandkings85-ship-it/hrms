import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { PERMISSIONS_KEY, RequiredPermission } from '../decorators/permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

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
      const dbUser = await this.prisma.user.findUnique({
        where: { id: user.userId },
        select: { employeeId: true }
      });
      const userEmployeeId = dbUser?.employeeId;
      const bodyEmployeeId = request.body?.employeeId;
      const path = request.route?.path || '';
      const method = request.method || '';

      // Salary data may never be approved via the employee-self bypass, otherwise
      // an employee could inflate their own salary (salary-structure / salary-revision).
      const isSalaryMutation =
        (path.includes('salary-structure') || path.includes('salary-revision')) &&
        !['GET', 'HEAD', 'OPTIONS'].includes(method);

      if (
        !isSalaryMutation &&
        userEmployeeId &&
        (params?.employeeId === userEmployeeId || params?.id === userEmployeeId || bodyEmployeeId === userEmployeeId)
      ) {
        return true;
      }
      // Employees may view their own payslip detail (params.id is the payslip id, not the employee id)
      if (userEmployeeId && params?.id && request.route?.path?.endsWith('payslip/:id')) {
        const payslip = await this.prisma.payslip.findUnique({
          where: { id: params.id },
          select: { employeeId: true },
        });
        if (payslip?.employeeId === userEmployeeId) return true;
      }
      // Employees may list their own payslips
      if (userEmployeeId && method === 'GET' && request.route?.path?.endsWith('payslips/:employeeId') && params?.employeeId === userEmployeeId) {
        return true;
      }
    }

    if (!user?.roleId) throw new ForbiddenException('No role assigned');

    const role = await this.prisma.role.findUnique({ where: { id: user.roleId } });
    if (role?.isSystem) return true;

    const grants = await this.prisma.permission.findMany({
      where: { roleId: user.roleId },
    });

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
