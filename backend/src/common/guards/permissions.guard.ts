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

    const { user } = context.switchToHttp().getRequest();
    if (!user?.roleId) throw new ForbiddenException('No role assigned');

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
