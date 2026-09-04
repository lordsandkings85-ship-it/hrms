import { MilestoneAnnouncementsService, isSameMonthDay, isWorkAnniversaryToday } from './milestone-announcements.service';

describe('MilestoneAnnouncementsService date helpers', () => {
  const today = new Date(2026, 8, 4); // Sep 4 2026

  it('isSameMonthDay matches same month/day', () => {
    expect(isSameMonthDay(new Date(1990, 8, 4), today)).toBe(true);
    expect(isSameMonthDay(new Date(2026, 8, 4), today)).toBe(true);
    expect(isSameMonthDay(new Date(1990, 8, 5), today)).toBe(false);
    expect(isSameMonthDay(new Date(1990, 9, 4), today)).toBe(false);
  });

  it('isWorkAnniversaryToday only for same month/day on an earlier year', () => {
    expect(isWorkAnniversaryToday(new Date(2020, 8, 4), today)).toBe(true);
    expect(isWorkAnniversaryToday(new Date(2026, 8, 4), today)).toBe(false); // new joiner this year -> no
    expect(isWorkAnniversaryToday(new Date(2025, 8, 5), today)).toBe(false);
  });
});

describe('MilestoneAnnouncementsService', () => {
  const companyId = 'c-1';
  const today = new Date(2026, 8, 4); // Sep 4 2026

  const baseEmployee = {
    id: 'e-1',
    firstName: 'Alice',
    lastName: 'Smith',
    joiningDate: new Date(2020, 8, 4), // anniversary today (Sep 4, earlier year)
    dob: new Date(1990, 8, 4), // birthday today
  };

  interface Mocks {
    employees?: any[];
    existingNotification?: any;
    existingAnnouncement?: any;
  }

  const buildService = (mocks: Mocks = {}) => {
    const existingNotificationFn =
      mocks.existingNotification === undefined
        ? async () => null
        : typeof mocks.existingNotification === 'function'
          ? mocks.existingNotification
          : async () => mocks.existingNotification;

    const prisma = {
      company: { findMany: jest.fn(async () => [{ id: companyId }]) },
      employee: {
        findMany: jest.fn(async () => mocks.employees ?? [baseEmployee]),
      },
      notification: {
        findFirst: jest.fn(existingNotificationFn),
        count: jest.fn(async () => 1),
      },
      announcement: {
        findFirst: jest.fn(async () => mocks.existingAnnouncement ?? null),
        count: jest.fn(async () => 1),
        create: jest.fn(async (a: any) => a.data),
      },
    };
    const notifications = { create: jest.fn(async (n: any) => n) };
    const service = new MilestoneAnnouncementsService(prisma as any, notifications as any);
    return { service, prisma, notifications };
  };

  it('creates a COMPANY notification + announcement for a birthday today', async () => {
    const { service, notifications } = buildService();
    const result = await service.runForDate(today);

    expect(notifications.create).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'MILESTONE_BIRTHDAY', audience: 'COMPANY' }),
    );
    expect(notifications.create.mock.calls[0][0].title).toContain('Alice');
    expect(result.birthdays).toBe(1);
  });

  it('creates a COMPANY notification + announcement for a work anniversary today', async () => {
    const { service, notifications } = buildService({
      employees: [{ ...baseEmployee, dob: null }],
    });
    const result = await service.runForDate(today);

    expect(notifications.create).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'MILESTONE_ANNIVERSARY', audience: 'COMPANY' }),
    );
    expect(notifications.create.mock.calls[0][0].title).toContain('Work Anniversary');
    expect(result.anniversaries).toBe(1);
  });

  it('creates both birthday AND anniversary notifications when both fall today', async () => {
    const { service, notifications } = buildService();
    await service.runForDate(today);
    const types = notifications.create.mock.calls.map((c: any) => c[0].type);
    expect(types).toContain('MILESTONE_BIRTHDAY');
    expect(types).toContain('MILESTONE_ANNIVERSARY');
    expect(types).toHaveLength(2);
  });

  it('does not create anything when the employee has no milestone today', async () => {
    const { service, notifications } = buildService({
      employees: [
        { ...baseEmployee, joiningDate: new Date(2020, 8, 5), dob: new Date(1990, 8, 5) },
      ],
    });
    const result = await service.runForDate(today);
    expect(notifications.create).not.toHaveBeenCalled();
    expect(result.birthdays).toBe(0);
    expect(result.anniversaries).toBe(0);
  });

  it('is idempotent: skips creating when both milestone rows already exist today', async () => {
    const { service, notifications } = buildService({
      existingNotification: { id: 'n-1' },
      existingAnnouncement: { id: 'a-1' },
    });
    const result = await service.runForDate(today);
    expect(notifications.create).not.toHaveBeenCalled();
    expect(result.createdNotifications).toBe(1);
  });

  it('skips only the already-announced kind (mixed idempotency)', async () => {
    const { service, notifications } = buildService({
      // Anniversary notification already created today; birthday not yet.
      existingNotification: (args: any) => (args?.where?.type === 'MILESTONE_ANNIVERSARY' ? { id: 'n-a' } : null),
    });
    await service.runForDate(today);
    // Anniversary notification skipped; birthday notification still created.
    const types = notifications.create.mock.calls.map((c: any) => c[0].type);
    expect(types).toEqual(['MILESTONE_BIRTHDAY']);
  });
});
