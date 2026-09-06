import { AttendanceService } from './attendance.service';

describe('AttendanceService.listRegularizations', () => {
  const companyId = 'c-1';

  const buildService = () => {
    const prisma = {
      regularizationRequest: {
        findMany: jest.fn(async () => [
          {
            id: 'r-1',
            attendanceLogId: 'l-1',
            employeeId: 'e-1',
            requestedCheckIn: new Date('2026-09-04T09:00:00Z'),
            requestedCheckOut: new Date('2026-09-04T18:00:00Z'),
            reason: 'Client meeting',
            status: 'approved',
            type: 'regularization',
            resolutionNote: 'OK',
            approverId: 'u-1',
            createdAt: new Date('2026-09-03T10:00:00Z'),
            employee: { id: 'e-1', firstName: 'Alice', lastName: 'Smith', employeeCode: 'E1', department: { name: 'Eng' } },
            attendanceLog: { id: 'l-1', date: new Date('2026-09-03'), checkIn: null, checkOut: null, status: 'absent', attendanceStatus: 'OFF_DAY_OR_INCOMPLETE', isWithinGeofence: null },
          },
        ]),
      },
      user: {
        findMany: jest.fn(async () => [
          { id: 'u-1', email: 'hr@x.com', employee: { firstName: 'Priya', lastName: 'Patel' } },
        ]),
      },
    };
    const notifications = { notifyApprover: jest.fn(async () => {}), notifyEmployee: jest.fn(async () => {}) };
    const service = new AttendanceService(prisma as any, notifications as any);
    return { service, prisma };
  };

  it('filters by status when one is provided', async () => {
    const { service, prisma } = buildService();
    await service.listRegularizations(companyId, 'approved');
    expect(prisma.regularizationRequest.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { employee: { companyId }, status: 'approved' } }),
    );
  });

  it('does NOT filter by status for all/unknown values', async () => {
    const { service, prisma } = buildService();
    await service.listRegularizations(companyId, 'all');
    expect(prisma.regularizationRequest.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { employee: { companyId } } }),
    );
  });

  it('resolves approver display name from the linked employee profile', async () => {
    const { service, prisma } = buildService();
    const rows = await service.listRegularizations(companyId, 'all');
    expect(rows[0].approverName).toBe('Priya Patel');
    expect(prisma.user.findMany).toHaveBeenCalledWith({
      where: { id: { in: ['u-1'] } },
      select: expect.objectContaining({ id: true }),
    });
  });

  it('does not query users when no request has an approver', async () => {
    const prisma = {
      regularizationRequest: {
        findMany: jest.fn(async () => [{
          id: 'r-2', approverId: null, employee: { id: 'e-1' }, attendanceLog: {},
        }]),
      },
      user: { findMany: jest.fn() },
    };
    const notifications = { notifyApprover: jest.fn(async () => {}), notifyEmployee: jest.fn(async () => {}) };
    const service = new AttendanceService(prisma as any, notifications as any);
    const rows = await service.listRegularizations(companyId, 'pending');
    expect(rows[0].approverName).toBeNull();
    expect(prisma.user.findMany).not.toHaveBeenCalled();
  });
});