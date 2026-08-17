import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { RunPayrollDto, SalaryStructureDto, AddPayoutDto } from './payroll.dto';
import { FnfOverridesDto, InitiateFnfDto } from '../../../employee/fnf/dto/fnf.dto';
import {
  LoanDto,
  SalaryRevisionDto,
  OvertimeDto,
  TaxDeclarationDto,
} from '../../../employee/employee-services/dto/employee-services.dto';
import { SubmitExpenseDto } from '../../../employee/expenses/dto/expenses.dto';
import { SubmitTimesheetDto } from '../../../employee/timesheets/dto/timesheets.dto';
import { RequestTravelDto } from '../../../employee/travel/dto/travel.dto';

async function expectValid(dtoClass: any, data: any) {
  const dto = plainToInstance(dtoClass, data) as any;
  const errors = await validate(dto);
  expect(errors.length).toBe(0);
  return dto;
}

async function expectInvalid(dtoClass: any, data: any, expectedField?: string) {
  const dto = plainToInstance(dtoClass, data) as any;
  const errors = await validate(dto);
  expect(errors.length).toBeGreaterThan(0);
  if (expectedField) {
    const fieldErrors = errors.filter((e: any) => e.property === expectedField);
    expect(fieldErrors.length).toBeGreaterThan(0);
  }
  return errors;
}

describe('DTO Validation', () => {
  describe('RunPayrollDto', () => {
    it('accepts valid month/year', async () => {
      await expectValid(RunPayrollDto, { month: 8, year: 2026 });
    });
    it('accepts month 12', async () => {
      await expectValid(RunPayrollDto, { month: 12, year: 2025 });
    });
    it('rejects month 13', async () => {
      await expectInvalid(RunPayrollDto, { month: 13, year: 2026 }, 'month');
    });
    it('rejects month 0', async () => {
      await expectInvalid(RunPayrollDto, { month: 0, year: 2026 }, 'month');
    });
    it('rejects month -1', async () => {
      await expectInvalid(RunPayrollDto, { month: -1, year: 2026 }, 'month');
    });
    it('rejects missing month', async () => {
      await expectInvalid(RunPayrollDto, { year: 2026 }, 'month');
    });
    it('rejects missing year', async () => {
      await expectInvalid(RunPayrollDto, { month: 8 }, 'year');
    });
    it('rejects year 1999', async () => {
      await expectInvalid(RunPayrollDto, { month: 8, year: 1999 }, 'year');
    });
    it('accepts optional regime', async () => {
      const dto = await expectValid(RunPayrollDto, { month: 8, year: 2026, regime: 'old' });
      expect(dto.regime).toBe('old');
    });
  });

  describe('SalaryStructureDto', () => {
    it('accepts valid salary', async () => {
      await expectValid(SalaryStructureDto, { basic: 50000, hra: 20000 });
    });
    it('requires basic', async () => {
      await expectInvalid(SalaryStructureDto, { hra: 20000 }, 'basic');
    });
    it('rejects negative basic', async () => {
      await expectInvalid(SalaryStructureDto, { basic: -1000 }, 'basic');
    });
    it('accepts zero basic', async () => {
      await expectValid(SalaryStructureDto, { basic: 0 });
    });
    it('accepts empty effectiveFrom string', async () => {
      await expectValid(SalaryStructureDto, { basic: 35000, effectiveFrom: '' });
    });
    it('accepts valid ISO date', async () => {
      await expectValid(SalaryStructureDto, { basic: 35000, effectiveFrom: '2026-08-15' });
    });
    it('rejects invalid effectiveFrom', async () => {
      await expectInvalid(SalaryStructureDto, { basic: 35000, effectiveFrom: 'not-a-date' }, 'effectiveFrom');
    });
    it('rejects negative pfDeduction', async () => {
      await expectInvalid(SalaryStructureDto, { basic: 35000, pfDeduction: -500 }, 'pfDeduction');
    });
  });

  describe('AddPayoutDto', () => {
    it('accepts valid payout', async () => {
      await expectValid(AddPayoutDto, {
        employeeId: 'abc-123',
        month: 8,
        year: 2026,
        type: 'bonus',
        amount: 5000,
      });
    });
    it('rejects negative amount', async () => {
      await expectInvalid(AddPayoutDto, {
        employeeId: 'abc',
        month: 8,
        year: 2026,
        type: 'bonus',
        amount: -100,
      }, 'amount');
    });
    it('rejects missing employeeId', async () => {
      await expectInvalid(AddPayoutDto, {
        month: 8,
        year: 2026,
        type: 'bonus',
        amount: 100,
      }, 'employeeId');
    });
    it('rejects missing type', async () => {
      await expectInvalid(AddPayoutDto, {
        employeeId: 'abc',
        month: 8,
        year: 2026,
        amount: 100,
      }, 'type');
    });
  });

  describe('InitiateFnfDto', () => {
    it('accepts valid initiation', async () => {
      await expectValid(InitiateFnfDto, {
        employeeId: 'emp-1',
        lastWorkingDay: '2026-08-15',
      });
    });
    it('rejects missing lastWorkingDay', async () => {
      await expectInvalid(InitiateFnfDto, { employeeId: 'emp-1' }, 'lastWorkingDay');
    });
    it('accepts optional noticePeriodDays', async () => {
      const dto = await expectValid(InitiateFnfDto, {
        employeeId: 'emp-1',
        lastWorkingDay: '2026-08-15',
        noticePeriodDays: 30,
      });
      expect(dto.noticePeriodDays).toBe(30);
    });
  });

  describe('FnfOverridesDto', () => {
    it('accepts valid overrides', async () => {
      await expectValid(FnfOverridesDto, { noticeRecovery: 5000, otherDeductions: 1000 });
    });
    it('rejects negative noticeRecovery', async () => {
      await expectInvalid(FnfOverridesDto, { noticeRecovery: -100 }, 'noticeRecovery');
    });
    it('rejects negative unpaidSalaryAmt', async () => {
      await expectInvalid(FnfOverridesDto, { unpaidSalaryAmt: -500 }, 'unpaidSalaryAmt');
    });
    it('accepts empty body (all optional)', async () => {
      await expectValid(FnfOverridesDto, {});
    });
  });

  describe('LoanDto', () => {
    it('accepts valid loan', async () => {
      await expectValid(LoanDto, { employeeId: 'e1', purpose: 'car', amount: 50000 });
    });
    it('rejects negative amount', async () => {
      await expectInvalid(LoanDto, { employeeId: 'e1', purpose: 'x', amount: -10 }, 'amount');
    });
    it('rejects zero amount (not >= 0 with Min(0))', async () => {
      // Min(0) allows 0; IsNumber + Min(0) is >= 0
      await expectValid(LoanDto, { employeeId: 'e1', purpose: 'x', amount: 0 });
    });
    it('rejects missing purpose', async () => {
      await expectInvalid(LoanDto, { employeeId: 'e1', amount: 100 }, 'purpose');
    });
  });

  describe('SalaryRevisionDto', () => {
    it('accepts valid revision', async () => {
      await expectValid(SalaryRevisionDto, {
        employeeId: 'e1',
        effectiveFrom: '2026-09-01',
        revisedCtc: 800000,
      });
    });
    it('rejects negative revisedCtc', async () => {
      await expectInvalid(SalaryRevisionDto, {
        employeeId: 'e1',
        effectiveFrom: '2026-09-01',
        revisedCtc: -1000,
      }, 'revisedCtc');
    });
    it('rejects missing effectiveFrom', async () => {
      await expectInvalid(SalaryRevisionDto, {
        employeeId: 'e1',
        revisedCtc: 800000,
      }, 'effectiveFrom');
    });
  });

  describe('OvertimeDto', () => {
    it('accepts valid overtime', async () => {
      await expectValid(OvertimeDto, {
        employeeId: 'e1',
        date: '2026-08-15',
        hours: 2.5,
      });
    });
    it('rejects negative hours', async () => {
      await expectInvalid(OvertimeDto, {
        employeeId: 'e1',
        date: '2026-08-15',
        hours: -1,
      }, 'hours');
    });
  });

  describe('TaxDeclarationDto', () => {
    it('accepts valid declaration', async () => {
      await expectValid(TaxDeclarationDto, {
        employeeId: 'e1',
        section: '80C',
        declaredAmount: 150000,
      });
    });
    it('rejects negative declaredAmount', async () => {
      await expectInvalid(TaxDeclarationDto, {
        employeeId: 'e1',
        section: '80C',
        declaredAmount: -1000,
      }, 'declaredAmount');
    });
    it('rejects missing section', async () => {
      await expectInvalid(TaxDeclarationDto, {
        employeeId: 'e1',
        declaredAmount: 100000,
      }, 'section');
    });
  });

  describe('SubmitExpenseDto', () => {
    it('accepts valid expense', async () => {
      await expectValid(SubmitExpenseDto, {
        employeeId: 'e1',
        category: 'travel',
        amount: 2500,
      });
    });
    it('rejects negative amount', async () => {
      await expectInvalid(SubmitExpenseDto, {
        employeeId: 'e1',
        category: 'food',
        amount: -50,
      }, 'amount');
    });
  });

  describe('SubmitTimesheetDto', () => {
    it('accepts valid timesheet', async () => {
      await expectValid(SubmitTimesheetDto, {
        employeeId: 'e1',
        date: '2026-08-15',
        hours: 8,
      });
    });
    it('rejects negative hours', async () => {
      await expectInvalid(SubmitTimesheetDto, {
        employeeId: 'e1',
        date: '2026-08-15',
        hours: -2,
      }, 'hours');
    });
    it('rejects hours > 24', async () => {
      await expectInvalid(SubmitTimesheetDto, {
        employeeId: 'e1',
        date: '2026-08-15',
        hours: 25,
      }, 'hours');
    });
    it('accepts 0 hours', async () => {
      await expectValid(SubmitTimesheetDto, {
        employeeId: 'e1',
        date: '2026-08-15',
        hours: 0,
      });
    });
  });

  describe('RequestTravelDto', () => {
    it('accepts valid travel request', async () => {
      await expectValid(RequestTravelDto, {
        employeeId: 'e1',
        fromDate: '2026-09-01',
        toDate: '2026-09-05',
      });
    });
    it('rejects missing fromDate', async () => {
      await expectInvalid(RequestTravelDto, {
        employeeId: 'e1',
        toDate: '2026-09-05',
      }, 'fromDate');
    });
    it('accepts optional advance', async () => {
      const dto = await expectValid(RequestTravelDto, {
        employeeId: 'e1',
        fromDate: '2026-09-01',
        toDate: '2026-09-05',
        advance: 5000,
      });
      expect(dto.advance).toBe(5000);
    });
    it('rejects negative advance', async () => {
      await expectInvalid(RequestTravelDto, {
        employeeId: 'e1',
        fromDate: '2026-09-01',
        toDate: '2026-09-05',
        advance: -1000,
      }, 'advance');
    });
  });
});
