import { Test } from '@nestjs/testing';
import { PayrollService } from './payroll.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { MailService } from '../../../common/mail/mail.service';
import { isGroupWideUser } from '../../../utils/group-access.util';

jest.mock('../../../utils/group-access.util', () => ({
  isGroupWideUser: jest.fn(async () => false),
}));

const mockGroupWide = (value: boolean) => (isGroupWideUser as jest.Mock).mockResolvedValue(value);

describe('PayrollService', () => {
  let service: PayrollService;
  let prisma: any;
  let mail: any;
  let employeeQueryArgs: any;

  const baseEmployee = (overrides: any = {}) => ({
    id: 'emp-1',
    companyId: 'company-1',
    workingDaysPerWeek: 5,
    salaryStructures: [],
    adminInfo: null,
    attendanceLog: [],
    shiftAssignment: [],
    ...overrides,
  });

  const baseStructure = (overrides: any = {}) => ({
    effectiveFrom: new Date('2026-01-01'),
    basic: 10000,
    hra: 0,
    da: 0,
    conveyance: 0,
    medical: 0,
    specialAllowance: 0,
    ptDeduction: 0,
    ...overrides,
  });

  beforeEach(async () => {
    employeeQueryArgs = null;
    prisma = {
      employee: {
        findMany: jest.fn(async (args: any) => {
          employeeQueryArgs = args;
          return [];
        }),
      },
      holiday: {
        findMany: jest.fn(async () => []),
      },
      attendancePolicy: {
        findMany: jest.fn(async () => []),
        findFirst: jest.fn(async () => null),
      },
      additionalPayout: {
        findMany: jest.fn(async () => []),
      },
      company: {
        findFirst: jest.fn(async () => ({
          id: 'company-1', name: 'Test Co', gstNumber: null, panNumber: null,
        })),
      },
      payrollCycle: {
        upsert: jest.fn(async () => ({ id: 'cycle-1', status: 'draft' })),
        update: jest.fn(async () => ({ id: 'cycle-1', status: 'processed' })),
      },
      payslip: {
        findFirst: jest.fn(async () => null),
        create: jest.fn(async () => ({})),
        update: jest.fn(async () => ({})),
      },
      $transaction: jest.fn(async (arg: any) => {
        if (typeof arg === 'function') return arg(prisma);
        if (Array.isArray(arg)) return Promise.all(arg.map((x: any) => (typeof x === 'function' ? x(prisma) : x)));
        return arg;
      }),
    };
    mail = { isConfigured: jest.fn(() => true), send: jest.fn(async () => undefined) };

    const moduleRef = await Test.createTestingModule({
      providers: [PayrollService, { provide: PrismaService, useValue: prisma }, { provide: MailService, useValue: mail }],
    }).compile();
    service = moduleRef.get(PayrollService);
  });

  describe('runPayroll', () => {
    it('selects the salary structure by effectiveFrom, not createdAt', async () => {
      prisma.employee.findMany.mockImplementationOnce(async (args: any) => {
        employeeQueryArgs = args;
        return [
          baseEmployee({
            salaryStructures: [
              { ...baseStructure(), id: 's-new', effectiveFrom: new Date('2026-08-01'), createdAt: new Date('2026-01-01') },
              { ...baseStructure({ basic: 5000 }), id: 's-old', effectiveFrom: new Date('2026-01-01'), createdAt: new Date('2026-07-01') },
            ],
          }),
        ];
      });

      await service.runPayroll('company-1', 8, 2026, 'new');

      expect(employeeQueryArgs.include.salaryStructures.orderBy).toEqual({ effectiveFrom: 'desc' });
    });

    it('deducts LOP for working days with no attendance, treating holidays as paid', async () => {
      // Aug 2026: 21 weekdays (5-day week). Fri Aug 14 is a company holiday — it stays
      // inside the working-day count and is paid automatically, so LOP only accrues on
      // genuinely unworked working days.
      const emp = baseEmployee({
        salaryStructures: [baseStructure()],
        attendanceLog: [
          { date: new Date(2026, 7, 3), status: 'present' },
          { date: new Date(2026, 7, 4), status: 'present' },
          { date: new Date(2026, 7, 5), status: 'late' },
          { date: new Date(2026, 7, 6), status: 'present' },
          { date: new Date(2026, 7, 7), status: 'on_leave' },
          { date: new Date(2026, 7, 11), status: 'absent' }, // nightly backfill - NOT a paid day
        ],
      });
      prisma.employee.findMany.mockResolvedValueOnce([emp]);
      // Company holiday on a working day (Friday Aug 14)
      prisma.holiday.findMany.mockResolvedValueOnce([{ id: 'h1', companyId: 'company-1', date: new Date(2026, 7, 14) }]);

      await service.runPayroll('company-1', 8, 2026, 'new');

      const createArgs = prisma.payslip.create.mock.calls[0][0];
      const breakdown = createArgs.data.breakdown;
      expect(breakdown.totalWorkingDays).toBe(21);
      expect(breakdown.holidayDays).toBe(1);
      expect(breakdown.paidHolidays).toBe(1);
      expect(breakdown.paidDays).toBe(6);
      expect(breakdown.lopDays).toBe(21 - 6);
      expect(breakdown.lopAmount).toBe(Math.round((10000 / 21) * 15));
      // net = gross - pf(1200) - esi(75) - lopAmount (rounded to nearest rupee)
      expect(createArgs.data.netPay).toBe(10000 - 1200 - 75 - Math.round((10000 / 21) * 15));
    });

    it('counts a holiday the employee worked exactly once (punch absorbs the paid holiday)', async () => {
      const emp = baseEmployee({
        salaryStructures: [baseStructure()],
        attendanceLog: [{ date: new Date('2026-08-14T00:00:00Z'), status: 'present' }], // worked on the holiday
      });
      prisma.employee.findMany.mockResolvedValueOnce([emp]);
      prisma.holiday.findMany.mockResolvedValueOnce([{ id: 'h1', companyId: 'company-1', date: new Date('2026-08-14T00:00:00Z') }]);

      await service.runPayroll('company-1', 8, 2026, 'new');

      const breakdown = prisma.payslip.create.mock.calls[0][0].data.breakdown;
      expect(breakdown.holidayDays).toBe(1);
      // The worked holiday counts once — not once as a punch plus once as a holiday.
      expect(breakdown.paidDays).toBe(1);
      expect(breakdown.lopDays).toBe(21 - 1);
    });

    it('does not count a holiday that falls on a weekly off as a paid working day', async () => {
      const emp = baseEmployee({
        salaryStructures: [baseStructure()],
        attendanceLog: [],
      });
      prisma.employee.findMany.mockResolvedValueOnce([emp]);
      // Sunday Aug 2 2026 is a weekly off — the holiday must not be a paid day.
      prisma.holiday.findMany.mockResolvedValueOnce([{ id: 'h1', companyId: 'company-1', date: new Date(2026, 7, 2) }]);

      await service.runPayroll('company-1', 8, 2026, 'new');

      const breakdown = prisma.payslip.create.mock.calls[0][0].data.breakdown;
      expect(breakdown.totalWorkingDays).toBe(21);
      expect(breakdown.holidayDays).toBe(0);
      expect(breakdown.paidHolidays).toBe(0);
      expect(breakdown.paidDays).toBe(0);
      expect(breakdown.lopDays).toBe(21);
    });

    it('pays full shift allowance for assignments active the whole month and prorates mid-month starts', async () => {
      const emp = baseEmployee({
        salaryStructures: [baseStructure()],
        attendanceLog: [],
        shiftAssignment: [
          { effectiveFrom: new Date('2026-08-01'), shift: { allowance: 100 } },
          { effectiveFrom: new Date('2026-08-10'), shift: { allowance: 50 } },
        ],
      });
      prisma.employee.findMany.mockResolvedValueOnce([emp]);

      await service.runPayroll('company-1', 8, 2026, 'new');

      const breakdown = prisma.payslip.create.mock.calls[0][0].data.breakdown;
      // Full month: 21 working days * 100; from Aug 10: 10-14,17-21,24-28,31 = 16 days * 50
      expect(breakdown.shiftAllowance).toBe(21 * 100 + 16 * 50);
    });

    it('counts multiple punches on the same day as one attended day, and ignores weekend punches', async () => {
      const emp = baseEmployee({
        salaryStructures: [baseStructure()],
        attendanceLog: [
          { date: new Date(2026, 7, 3, 9, 0), status: 'present' },
          { date: new Date('2026-08-03T18:30:00.000Z'), status: 'present' },
          { date: new Date(2026, 7, 2), status: 'present' }, // Sunday - not a working day
        ],
      });
      prisma.employee.findMany.mockResolvedValueOnce([emp]);

      await service.runPayroll('company-1', 8, 2026, 'new');

      const breakdown = prisma.payslip.create.mock.calls[0][0].data.breakdown;
      // 21 working days - 1 distinct logged working day (Aug 3) - 0 holidays = 20 LOP days
      expect(breakdown.lopDays).toBe(20);
    });

    it('charges half-day LOP for lates beyond the monthly allowance (8 lates → lateLopDays 1.0)', async () => {
      const lateDays = [3, 4, 5, 6, 7, 10, 11, 12]; // Mon-Fri weekdays of Aug 2026
      const emp = baseEmployee({
        salaryStructures: [baseStructure()],
        attendanceLog: lateDays.map((d) => ({ date: new Date(2026, 7, d), status: 'late' })),
      });
      prisma.employee.findMany.mockResolvedValueOnce([emp]);

      await service.runPayroll('company-1', 8, 2026, 'new');

      const breakdown = prisma.payslip.create.mock.calls[0][0].data.breakdown;
      // Penalized lates are still paid days; only the 2 beyond the allowance (11th, 12th)
      // add a half day of LOP each, on top of the base LOP for unworked days.
      expect(breakdown.paidDays).toBe(8);
      expect(breakdown.lateLopCount).toBe(2);
      expect(breakdown.lateLopDays).toBe(1);
      expect(breakdown.lopDays).toBe(21 - 8 + 1);
      expect(breakdown.lopAmount).toBe(Math.round((10000 / 21) * (21 - 8 + 1)));
    });

    it('uses the configured maxLatesPerMonth allowance (3 → 8 lates give 5 half-LOP days)', async () => {
      const lateDays = [3, 4, 5, 6, 7, 10, 11, 12];
      const emp = baseEmployee({
        salaryStructures: [baseStructure()],
        attendanceLog: lateDays.map((d) => ({ date: new Date(2026, 7, d), status: 'late' })),
      });
      prisma.employee.findMany.mockResolvedValueOnce([emp]);
      // First findMany = second-Saturday policies (none), second = maxLatesPerMonth.
      (prisma.attendancePolicy.findMany as jest.Mock)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ companyId: 'company-1', value: '3' }]);

      await service.runPayroll('company-1', 8, 2026, 'new');

      const breakdown = prisma.payslip.create.mock.calls[0][0].data.breakdown;
      expect(breakdown.lateLopCount).toBe(5);
      expect(breakdown.lateLopDays).toBe(2.5);
      expect(breakdown.lopDays).toBe(21 - 8 + 2.5);
    });

    it('keeps lates within the allowance free (6 lates → no LOP)', async () => {
      const lateDays = [3, 4, 5, 6, 7, 10];
      const emp = baseEmployee({
        salaryStructures: [baseStructure()],
        attendanceLog: lateDays.map((d) => ({ date: new Date(2026, 7, d), status: 'late' })),
      });
      prisma.employee.findMany.mockResolvedValueOnce([emp]);

      await service.runPayroll('company-1', 8, 2026, 'new');

      const breakdown = prisma.payslip.create.mock.calls[0][0].data.breakdown;
      expect(breakdown.lateLopCount).toBe(0);
      expect(breakdown.lateLopDays).toBe(0);
      expect(breakdown.lopDays).toBe(21 - 6);
    });

    it('queries shift assignments active during the month (effectiveFrom before month end)', async () => {
      prisma.employee.findMany.mockImplementationOnce(async (args: any) => {
        employeeQueryArgs = args;
        return [baseEmployee({ salaryStructures: [baseStructure()] })];
      });

      await service.runPayroll('company-1', 8, 2026, 'new');

      const shiftWhere = employeeQueryArgs.include.shiftAssignment.where;
      expect(shiftWhere.effectiveFrom.lt).toEqual(new Date(2026, 8, 1));
    });

    it('does not scope employees/payouts to the caller company for group-wide runs', async () => {
      mockGroupWide(true);
      prisma.employee.findMany.mockImplementationOnce(async (args: any) => {
        employeeQueryArgs = args;
        return [baseEmployee({ companyId: 'company-2', salaryStructures: [baseStructure()] })];
      });

      await service.runPayroll('company-1', 8, 2026, 'new', ['emp-1'], 'user-1');

      expect(employeeQueryArgs.where.companyId).toBeUndefined();
      expect(employeeQueryArgs.where.status).toBe('active');
      // Payouts fetched group-wide when run spans multiple companies.
      const payoutWhere = prisma.additionalPayout.findMany.mock.calls[0][0].where;
      expect(payoutWhere.employee).toBeUndefined();
      expect(payoutWhere.month).toBe(8);
    });

    it('fails loudly instead of marking a cycle processed with zero payslips', async () => {
      prisma.employee.findMany.mockResolvedValueOnce([]);

      await expect(service.runPayroll('company-1', 8, 2026, 'new')).rejects.toThrow('No eligible employees found');

      expect(prisma.payrollCycle.update).not.toHaveBeenCalled();
      expect(prisma.payslip.create).not.toHaveBeenCalled();
    });
  });

  describe('sendPayslips', () => {
    it('fails explicitly when SMTP is not configured instead of faking success', async () => {
      prisma.payrollCycle.findFirst = jest.fn(async () => ({ id: 'cycle-1', month: 8, year: 2026, companyId: 'company-1' }));
      prisma.payslip.findMany = jest.fn(async () => [{ id: 'p1', employee: { email: 'a@b.co', firstName: 'A', lastName: 'B', employeeCode: 'E1' } }]);
      mail.isConfigured.mockReturnValue(false);

      await expect(service.sendPayslips('company-1', 'cycle-1')).rejects.toThrow('Email is not configured');
      expect(mail.send).not.toHaveBeenCalled();
    });

    it('emails every employee and reports failures', async () => {
      prisma.payrollCycle.findFirst = jest.fn(async () => ({ id: 'cycle-1', month: 8, year: 2026, companyId: 'company-1' }));
      prisma.payslip.findMany = jest.fn(async () => [
        { id: 'p1', grossPay: 10000, totalDeductions: 1200, netPay: 8800, employee: { email: 'a@b.co', firstName: 'A', lastName: 'B', employeeCode: 'E1' } },
        { id: 'p2', grossPay: 20000, totalDeductions: 2000, netPay: 18000, employee: { email: 'c@d.co', firstName: 'C', lastName: 'D', employeeCode: 'E2' } },
      ]);
      mail.send.mockRejectedValueOnce(new Error('SMTP 550 rejected'));

      const result = await service.sendPayslips('company-1', 'cycle-1');

      expect(mail.send).toHaveBeenCalledTimes(2);
      expect(result.sent).toBe(1);
      expect(result.total).toBe(2);
      expect(result.success).toBe(false);
      expect(result.failures).toEqual([{ employeeCode: 'E1', reason: 'SMTP 550 rejected' }]);
    });
  });
});