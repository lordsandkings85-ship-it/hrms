import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { NotificationsService } from './notifications.service';

function mockPrisma(opts: {
  employeeId?: string | null;
  managerId?: string | null;
  roleName?: string | null;
  roleIsSystem?: boolean;
  grants?: Array<{ module: string; action: string }>;
  notifications?: any[];
  record?: any | null;
} = {}) {
  const {
    employeeId = 'emp-user',
    managerId = null,
    roleName = null,
    roleIsSystem = false,
    grants = [],
    notifications = [],
    record = null,
  } = opts;

  const audit: { where?: any } = {};

  const prisma = {
    user: {
      findUnique: jest.fn(async () => ({ employeeId, role: { name: roleName, isSystem: roleIsSystem } })),
    },
    employee: {
      findUnique: jest.fn(async () => ({ id: employeeId, managerId })),
    },
    permission: {
      findMany: jest.fn(async () => grants),
    },
    notification: {
      create: jest.fn(async (args: any) => ({ id: 'n-new', ...args.data })),
      createMany: jest.fn(async () => ({ count: 1 })),
      findMany: jest.fn(async (args: any) => {
        audit.where = args?.where;
        return notifications;
      }),
      count: jest.fn(async () => notifications.length),
      findUnique: jest.fn(async () => record),
      findFirst: jest.fn(async (args: any) => {
        const id = args?.where?.id;
        const owned = notifications.some((n) => n.id === id);
        return owned ? record : null;
      }),
      update: jest.fn(async (args: any) => ({ id: args.where.id, isRead: args.data.isRead })),
      updateMany: jest.fn(async () => ({ count: 1 })),
      delete: jest.fn(async (args: any) => ({ id: args.where.id })),
    },
  };

  return { prisma, audit };
}

const user = {
  userId: 'u-user',
  companyId: 'company-a',
  email: 'user@a.com',
  roleId: 'role-user',
};

describe('NotificationsService authorization isolation', () => {
  it('employee sees only personal + company-wide notifications (not HR/ADMIN ones)', async () => {
    const { prisma, audit } = mockPrisma({ roleName: 'Employee', grants: [] });
    const svc = new NotificationsService(prisma as any);

    await svc.getMine(user);

    expect(audit.where?.companyId).toBe('company-a');
    const or = audit.where?.OR as any[];
    // Must NOT contain an HR/ADMIN audience for a plain employee.
    expect(or.some((c) => c.audience === 'HR')).toBe(false);
    expect(or.some((c) => c.audience === 'ADMIN')).toBe(false);
    expect(or.some((c) => c.audience === 'SYSTEM')).toBe(false);
    // Should include PERSONAL-to-self, PERSONAL-to-employee, and COMPANY.
    expect(or.some((c) => c.audience === 'COMPANY')).toBe(true);
    expect(or.some((c) => c.audience === 'PERSONAL')).toBe(true);
  });

  it('a role with only a NON-approval permission grant does NOT see HR-audience notifications', async () => {
    // e.g. an employee role holding a stray project:view grant.
    const { prisma, audit } = mockPrisma({
      roleName: 'Employee',
      grants: [{ module: 'projects', action: 'view' }],
    });
    const svc = new NotificationsService(prisma as any);

    await svc.getMine(user);

    const or = audit.where?.OR as any[];
    expect(or.some((c) => c.audience === 'HR')).toBe(false);
    expect(or.some((c) => c.audience === 'ADMIN')).toBe(false);
  });

  it('a matching role NAME (e.g. "Office Manager") with no approval grant does NOT see HR-audience notifications', async () => {
    const { prisma, audit } = mockPrisma({ roleName: 'Office Manager', grants: [] });
    const svc = new NotificationsService(prisma as any);

    await svc.getMine(user);

    const or = audit.where?.OR as any[];
    expect(or.some((c) => c.audience === 'HR')).toBe(false);
  });

  it('a role holding leave:approve sees HR-audience notifications', async () => {
    const { prisma, audit } = mockPrisma({
      roleName: 'HR Manager',
      grants: [{ module: 'leave', action: 'approve' }],
    });
    const svc = new NotificationsService(prisma as any);

    await svc.getMine(user);

    const or = audit.where?.OR as any[];
    expect(or.some((c) => c.audience === 'HR')).toBe(true);
    expect(or.some((c) => c.audience === 'ADMIN')).toBe(false);
  });

  it('a role holding attendance:approve sees HR-audience notifications', async () => {
    const { prisma, audit } = mockPrisma({
      roleName: 'Attendance Approver',
      grants: [{ module: 'attendance', action: 'approve' }],
    });
    const svc = new NotificationsService(prisma as any);

    await svc.getMine(user);

    const or = audit.where?.OR as any[];
    expect(or.some((c) => c.audience === 'HR')).toBe(true);
  });

  it('admin/system role sees HR, ADMIN and SYSTEM audiences', async () => {
    const { prisma, audit } = mockPrisma({ roleName: 'Super Admin', roleIsSystem: true });
    const svc = new NotificationsService(prisma as any);

    await svc.getMine({ ...user, isSuperAdmin: true });

    const or = audit.where?.OR as any[];
    expect(or.some((c) => c.audience === 'HR')).toBe(true);
    expect(or.some((c) => c.audience === 'ADMIN')).toBe(true);
    expect(or.some((c) => c.audience === 'SYSTEM')).toBe(true);
  });

  it('marks a notification read only when it belongs to the user\'s company and authorized set', async () => {
    const { prisma } = mockPrisma({
      record: { id: 'n-1', companyId: 'company-a', audience: 'PERSONAL', recipientUserId: 'u-user', isRead: false },
      notifications: [{ id: 'n-1', companyId: 'company-a', audience: 'PERSONAL', recipientUserId: 'u-user' }],
    });
    const svc = new NotificationsService(prisma as any);
    const res = await svc.markRead(user, 'n-1');
    expect(res.isRead).toBe(true);
  });

  it('rejects marking a notification from another company as read', async () => {
    const { prisma } = mockPrisma({
      record: { id: 'n-other', companyId: 'company-b', audience: 'PERSONAL', recipientUserId: 'u-user' },
      notifications: [],
    });
    const svc = new NotificationsService(prisma as any);
    await expect(svc.markRead(user, 'n-other')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects marking a notification of another employee/company as read (forbidden)', async () => {
    const { prisma } = mockPrisma({
      record: { id: 'n-x', companyId: 'company-a', audience: 'PERSONAL', recipientUserId: 'u-other' },
      notifications: [],
    });
    const svc = new NotificationsService(prisma as any);
    await expect(svc.markRead(user, 'n-x')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('getUnreadCount only counts notifications within the authorized window', async () => {
    const { prisma } = mockPrisma({ notifications: [{ id: 'a' }, { id: 'b' }] });
    const svc = new NotificationsService(prisma as any);
    const count = await svc.getUnreadCount(user);
    expect(count).toBe(2);
  });

  it('notifyApprover delivers a MANAGER notification to the requester\'s manager and an HR notification', async () => {
    const { prisma } = mockPrisma({});
    (prisma.employee.findUnique as jest.Mock).mockResolvedValueOnce({
      id: 'emp-user',
      managerId: 'emp-manager',
      companyId: 'company-a',
    });
    const svc = new NotificationsService(prisma as any);

    await svc.notifyApprover({
      companyId: 'company-a',
      type: 'LEAVE',
      title: 'Leave request',
      referenceType: 'LEAVE_REQUEST',
      referenceId: 'lr-1',
      requesterEmployeeId: 'emp-user',
    });

    const creates = (prisma.notification.create as jest.Mock).mock.calls.map((c) => c[0].data);
    expect(creates.some((d: any) => d.audience === 'MANAGER' && d.recipientEmployeeId === 'emp-manager')).toBe(true);
    expect(creates.some((d: any) => d.audience === 'HR')).toBe(true);
  });
});
