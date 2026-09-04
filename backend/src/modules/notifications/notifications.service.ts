import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface NotificationContext {
  userId: string;
  companyId: string;
  email: string;
  roleId?: string;
  isSuperAdmin?: boolean;
}

export interface CreateNotificationInput {
  companyId: string;
  type: string;
  title: string;
  message?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  referenceType?: string;
  referenceId?: string;
  /** Describes who this notification is for.
   *  PERSONAL -> recipientUserId / recipientEmployeeId
   *  ROLE     -> roleId
   *  MANAGER  -> recipientEmployeeId (the manager's employee id)
   *  HR       -> any HR-privileged user in the company
   *  ADMIN    -> system/super admin only
   *  COMPANY  -> every user in the company (e.g. announcements)
   */
  audience?: 'PERSONAL' | 'ROLE' | 'MANAGER' | 'HR' | 'ADMIN' | 'COMPANY';
  recipientUserId?: string;
  recipientEmployeeId?: string;
  roleId?: string;
}

interface ResolvedCtx {
  employeeId: string | null;
  managerId: string | null;
  roleName: string | null;
  roleIsSystem: boolean;
  isHR: boolean;
  isAdmin: boolean;
}

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  /** Resolve the authenticated user's employee + role profile (server-side). */
  async resolveContext(user: NotificationContext): Promise<ResolvedCtx> {
    const dbUser = await this.prisma.user.findUnique({
      where: { id: user.userId },
      select: { employeeId: true, role: { select: { name: true, isSystem: true } } },
    });

    const employeeId: string | null = dbUser?.employeeId ?? null;
    let managerId: string | null = null;
    if (employeeId) {
      const emp = await this.prisma.employee.findUnique({
        where: { id: employeeId },
        select: { managerId: true },
      });
      managerId = emp?.managerId ?? null;
    }    const roleName = dbUser?.role?.name ?? null;
    const roleIsSystem = !!dbUser?.role?.isSystem;
    const isAdmin = !!user.isSuperAdmin || roleIsSystem;

    let isHR = isAdmin;
    if (user.roleId && !isAdmin) {
      const grantCount = await this.prisma.permission.count({ where: { roleId: user.roleId } });
      if (grantCount > 0) isHR = true;
    }
    const name = (roleName ?? '').toLowerCase();
    if (/hr|human resource|manager|admin|supervisor/.test(name)) isHR = true;

    return { employeeId, managerId, roleName, roleIsSystem, isHR, isAdmin };
  }

  /** Create a single notification for a target/audience. */
  async create(input: CreateNotificationInput): Promise<any> {
    return this.prisma.notification.create({
      data: {
        companyId: input.companyId,
        type: input.type,
        title: input.title,
        message: input.message,
        priority: input.priority ?? 'normal',
        referenceType: input.referenceType,
        referenceId: input.referenceId,
        audience: input.audience ?? 'PERSONAL',
        recipientUserId: input.recipientUserId ?? null,
        recipientEmployeeId: input.recipientEmployeeId ?? null,
        roleId: input.roleId ?? null,
      },
    });
  }

  /** Create the same notification for several recipients with identical content. */
  async createMany(base: Omit<CreateNotificationInput, 'companyId'>, companyId: string, recipients: CreateNotificationInput[]): Promise<number> {
    if (recipients.length === 0) return 0;
    const rows = recipients.map((r) => ({
      companyId,
      type: base.type,
      title: base.title,
      message: base.message,
      priority: base.priority ?? 'normal',
      referenceType: base.referenceType,
      referenceId: base.referenceId,
      audience: (r.audience ?? base.audience) ?? 'PERSONAL',
      recipientUserId: r.recipientUserId ?? null,
      recipientEmployeeId: r.recipientEmployeeId ?? null,
      roleId: r.roleId ?? null,
    }));
    const res = await this.prisma.notification.createMany({ data: rows });
    return res.count;
  }

  /** Shared authorization OR-window used by list/unread/mark queries. */
  private async audienceWindow(ctx: NotificationContext, resolved: ResolvedCtx): Promise<any[]> {
    const or: any[] = [];

    // Personal notifications targeting this specific user or their employee record.
    or.push({ audience: 'PERSONAL', recipientUserId: ctx.userId });
    if (resolved.employeeId) {
      or.push({ audience: 'PERSONAL', recipientEmployeeId: resolved.employeeId });
    }

    // Role-targeted notifications.
    if (ctx.roleId) {
      or.push({ audience: 'ROLE', roleId: ctx.roleId });
    }

    // Manager notifications for employees who report to this manager.
    // recipientEmployeeId === this manager's employee id.
    if (resolved.employeeId) {
      or.push({ audience: 'MANAGER', recipientEmployeeId: resolved.employeeId });
    }

    // HR-audience notifications.
    if (resolved.isHR) {
      or.push({ audience: 'HR' });
    }

    // Admin / system notifications.
    if (resolved.isAdmin) {
      or.push({ audience: 'ADMIN' });
      or.push({ audience: 'SYSTEM' });
    }

    // Company-wide announcements / communication for every user in the company.
    or.push({ audience: 'COMPANY' });

    return or;
  }

  /** Authorized list of the authenticated user's notifications. */
  async getMine(ctx: NotificationContext, opts: { unreadOnly?: boolean; limit?: number } = {}) {
    const resolved = await this.resolveContext(ctx);
    const or = await this.audienceWindow(ctx, resolved);
    const where: any = {
      companyId: ctx.companyId,
      OR: or,
    };
    if (opts.unreadOnly) where.isRead = false;

    return this.prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: opts.limit ?? 100,
    });
  }

  /** Authorized unread count for the authenticated user. */
  async getUnreadCount(ctx: NotificationContext): Promise<number> {
    const resolved = await this.resolveContext(ctx);
    const or = await this.audienceWindow(ctx, resolved);
    return this.prisma.notification.count({
      where: { companyId: ctx.companyId, isRead: false, OR: or },
    });
  }

  /** Verify a notification belongs to the authenticated user's authorized set, else throw. */
  private async assertOwned(ctx: NotificationContext, id: string, resolved: ResolvedCtx): Promise<any> {
    const notif = await this.prisma.notification.findUnique({ where: { id } });
    if (!notif || notif.companyId !== ctx.companyId) {
      throw new NotFoundException('Notification not found');
    }
    const or = await this.audienceWindow(ctx, resolved);
    const owned = await this.prisma.notification.findFirst({
      where: { id, companyId: ctx.companyId, OR: or },
    });
    if (!owned) throw new ForbiddenException('You cannot access this notification');
    return owned;
  }

  async markRead(ctx: NotificationContext, id: string) {
    const resolved = await this.resolveContext(ctx);
    await this.assertOwned(ctx, id, resolved);
    await this.prisma.notification.update({
      where: { id },
      data: { isRead: true, readAt: new Date() },
    });
    return { id, isRead: true };
  }

  async markUnread(ctx: NotificationContext, id: string) {
    const resolved = await this.resolveContext(ctx);
    await this.assertOwned(ctx, id, resolved);
    await this.prisma.notification.update({ where: { id }, data: { isRead: false, readAt: null } });
    return { id, isRead: false };
  }

  /** Mark-all-read applies only to the authenticated user's authorized notifications. */
  async markAllRead(ctx: NotificationContext) {
    const resolved = await this.resolveContext(ctx);
    const or = await this.audienceWindow(ctx, resolved);
    const unread = await this.prisma.notification.findMany({
      where: { companyId: ctx.companyId, isRead: false, OR: or },
      select: { id: true },
    });
    const ids = unread.map((n) => n.id);
    if (ids.length > 0) {
      await this.prisma.notification.updateMany({
        where: { id: { in: ids } },
        data: { isRead: true, readAt: new Date() },
      });
    }
    return { count: ids.length };
  }

  async deleteById(ctx: NotificationContext, id: string) {
    const resolved = await this.resolveContext(ctx);
    await this.assertOwned(ctx, id, resolved);
    await this.prisma.notification.delete({ where: { id } });
    return { id };
  }

  /**
   * Create an HR/approval notification addressed to a specific manager (or HR).
   * Used by event sources (leave apply, regularization, compoff, overtime, etc.).
   */
  async notifyApprover(params: {
    companyId: string;
    type: string;
    title: string;
    message?: string;
    referenceType: string;
    referenceId: string;
    requesterEmployeeId?: string;
    requesterUserId?: string;
  }) {
    const { companyId, type, title, message, referenceType, referenceId, requesterEmployeeId } = params;
    const created: any[] = [];

    const push = async (input: CreateNotificationInput) => {
      try {
        created.push(await this.create(input));
      } catch {
        // Best-effort: never fail the underlying HRMS operation because of a notification.
      }
    };

    // The requester's own manager (audience=MANAGER -> delivered to manager's user accounts).
    if (requesterEmployeeId) {
      const emp = await this.prisma.employee.findUnique({
        where: { id: requesterEmployeeId },
        select: { managerId: true, companyId: true },
      });
      if (emp && emp.managerId && emp.companyId === companyId) {
        await push({
          companyId,
          type,
          title,
          message,
          referenceType,
          referenceId,
          audience: 'MANAGER',
          recipientEmployeeId: emp.managerId,
        });
      }
    }

    // Always notify HR-privileged users in the company for approval workflows.
    await push({
      companyId,
      type,
      title,
      message,
      referenceType,
      referenceId,
      audience: 'HR',
    });

    return created;
  }

  /** Notify a specific employee (e.g. their leave was approved / rejected). */
  notifyEmployee(params: {
    companyId: string;
    type: string;
    title: string;
    message?: string;
    referenceType: string;
    referenceId: string;
    employeeId: string;
  }) {
    return this.create({
      companyId: params.companyId,
      type: params.type,
      title: params.title,
      message: params.message,
      referenceType: params.referenceType,
      referenceId: params.referenceId,
      audience: 'PERSONAL',
      recipientEmployeeId: params.employeeId,
    });
  }
}
