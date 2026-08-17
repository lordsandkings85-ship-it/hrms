import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { computeIncomeTax, computePF, computeESI, TaxInput } from './tax.calculator';
import { decryptPiiFields, decryptNestedPii } from '../../../utils/crypto.util';
import { MailService } from '../../../common/mail/mail.service';

@Injectable()
export class PayrollService {
  constructor(private prisma: PrismaService, private mail: MailService) {}

  async setSalaryStructure(companyId: string, employeeId: string, data: any) {
    const employee = await this.prisma.employee.findFirst({ where: { id: employeeId, companyId } });
    if (!employee) throw new NotFoundException('Employee not found in this company');
    const { effectiveFrom, ...rest } = data || {};

    const previous = await this.prisma.salaryStructure.findFirst({
      where: { employeeId },
      orderBy: { effectiveFrom: 'desc' },
    });
    const previousCtc = previous
      ? Number(previous.basic) + Number(previous.hra) + Number(previous.da) +
        Number(previous.conveyance) + Number(previous.medical) + Number(previous.specialAllowance)
      : 0;
    const revisedCtc = Number(rest.basic || 0) + Number(rest.hra || 0) + Number(rest.da || 0) +
      Number(rest.conveyance || 0) + Number(rest.medical || 0) + Number(rest.specialAllowance || 0);

    const effectiveDate = effectiveFrom ? new Date(effectiveFrom) : new Date();

    const [structure] = await this.prisma.$transaction([
      this.prisma.salaryStructure.create({
        data: { employeeId, ...rest, effectiveFrom: effectiveDate },
      }),
      this.prisma.salaryRevision.create({
        data: {
          companyId,
          employeeId,
          effectiveFrom: effectiveDate,
          revisedCtc,
          previousCtc,
          reason: data.reason || 'salary_structure_update',
          remarks: data.remarks,
        },
      }),
    ]);
    return structure;
  }

  async getSalaryStructure(companyId: string, employeeId: string) {
    const employee = await this.prisma.employee.findFirst({ where: { id: employeeId, companyId } });
    if (!employee) throw new NotFoundException('Employee not found in this company');
    return this.prisma.salaryStructure.findFirst({
      where: { employeeId },
      orderBy: { effectiveFrom: 'desc' },
    });
  }

  async openCycle(companyId: string, month: number, year: number) {
    return this.prisma.payrollCycle.upsert({
      where: { companyId_month_year: { companyId, month, year } },
      update: {},
      create: { companyId, month, year },
    });
  }

  async lockCycle(companyId: string, cycleId: string) {
    const cycle = await this.prisma.payrollCycle.findFirst({ where: { id: cycleId, companyId } });
    if (!cycle) throw new NotFoundException('Payroll cycle not found');
    if (cycle.status === 'locked') throw new BadRequestException('Cycle already locked');
    return this.prisma.payrollCycle.update({ where: { id: cycleId }, data: { status: 'locked' } });
  }

  async listCycles(companyId: string) {
    return this.prisma.payrollCycle.findMany({
      where: { companyId },
      include: { _count: { select: { payslips: true } } },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });
  }

  /** Bulk payroll run: computes gross/net + TDS for every active employee */
  async runPayroll(companyId: string, month: number, year: number, regime: 'old' | 'new' = 'new') {
    const cycle = await this.openCycle(companyId, month, year);

    if (cycle.status === 'locked') throw new BadRequestException('Payroll cycle is locked');

const employees = await this.prisma.employee.findMany({
      where: { companyId, status: 'active' },
      include: { 
        salaryStructures: { orderBy: { effectiveFrom: 'desc' }, take: 1 },
        adminInfo: true,
        attendanceLog: {
          where: {
            date: {
              gte: new Date(year, month - 1, 1),
              lt: new Date(year, month, 1)
            }
          }
        },
        shiftAssignment: {
          where: {
            effectiveFrom: {
              lt: new Date(year, month, 1)
            }
          },
          include: { shift: true }
        }
      },
    });

    const holidays = await this.prisma.holiday.findMany({
      where: { companyId, date: { gte: new Date(year, month - 1, 1), lt: new Date(year, month, 1) } },
    });

    // Fetch all additional payouts for this month/year in bulk
    const allPayouts = await this.prisma.additionalPayout.findMany({
      where: { employee: { companyId }, month, year },
    });
    const payoutsByEmployee = new Map<string, number>();
    for (const p of allPayouts) {
      payoutsByEmployee.set(p.employeeId, (payoutsByEmployee.get(p.employeeId) || 0) + Number(p.amount));
    }

    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 1);

    // Count working days in a date range based on workingDaysPerWeek
    const countWorkingDays = (from: Date, to: Date, workingDaysPerWeek: number) => {
      let workingDays = 0;
      for (let day = new Date(from); day < to; day.setDate(day.getDate() + 1)) {
        const dayOfWeek = day.getDay(); // 0 is Sunday, 6 is Saturday
        if (workingDaysPerWeek === 5 && dayOfWeek >= 1 && dayOfWeek <= 5) workingDays++;
        else if (workingDaysPerWeek === 6 && dayOfWeek >= 1 && dayOfWeek <= 6) workingDays++;
        else if (workingDaysPerWeek === 7) workingDays++;
      }
      return workingDays;
    };
    const isWorkingDay = (date: Date, workingDaysPerWeek: number) => {
      const dayOfWeek = date.getDay();
      if (workingDaysPerWeek === 5) return dayOfWeek >= 1 && dayOfWeek <= 5;
      if (workingDaysPerWeek === 6) return dayOfWeek >= 1 && dayOfWeek <= 6;
      return true;
    };

let payslipCount = 0;
    const updated = await this.prisma.$transaction(async (tx) => {
      for (const emp of employees) {
        const structure = emp.salaryStructures[0];
        if (!structure) continue;
        const wdPerWeek = emp.workingDaysPerWeek ?? 5;

        const gross = Number(structure.basic) + Number(structure.hra) + Number(structure.da) + Number(structure.conveyance) +
          Number(structure.medical) + Number(structure.specialAllowance);

        // LOP Calculation: working days with no attendance log, excluding company holidays
        const totalWorkingDays = countWorkingDays(monthStart, monthEnd, wdPerWeek);
        // Dedupe by stored calendar date (UTC) - multiple punches per day count once.
        const loggedDays = new Set(
          emp.attendanceLog
            .filter((log) => isWorkingDay(log.date, wdPerWeek))
            .map((log) => log.date.getUTCFullYear() * 10000 + log.date.getUTCMonth() * 100 + log.date.getUTCDate()),
        ).size;
        const holidayDays = holidays.filter((h) => isWorkingDay(h.date, wdPerWeek)).length;
        const lopDays = Math.max(0, totalWorkingDays - loggedDays - holidayDays);
        let lopAmount = (gross / totalWorkingDays) * lopDays;
        
        // Safety Clamp: LOP cannot exceed gross salary
        lopAmount = Math.min(lopAmount, gross);

        // Shift Allowance: per-day allowance × working days the assignment covers in the month
        let totalShiftAllowance = 0;
        for (const sa of emp.shiftAssignment) {
          if (sa.shift && sa.shift.allowance) {
            const overlapStart = sa.effectiveFrom > monthStart ? sa.effectiveFrom : monthStart;
            if (overlapStart < monthEnd) {
              const coveredDays = countWorkingDays(overlapStart, monthEnd, wdPerWeek);
              totalShiftAllowance += Number(sa.shift.allowance) * coveredDays;
            }
          }
        }

        // Add shift allowance to gross
        const grossWithAllowance = gross + totalShiftAllowance;

        // H1: Include additional payouts (bonus, overtime pay, etc.)
        const additionalPay = payoutsByEmployee.get(emp.id) || 0;

        // H2: Auto-compute statutory deductions only when enabled
        const adminInfo = emp.adminInfo;
        const useManualPf = adminInfo?.pfAsPerGovt === false;
        const useManualEsi = adminInfo?.esicApplicable === false;
        const pfDeduction = useManualPf
          ? Number(structure.pfDeduction || 0)
          : computePF(Number(structure.basic));
        const esiDeduction = useManualEsi
          ? Number(structure.esiDeduction || 0)
          : computeESI(gross);
        const pt = Number(structure.ptDeduction);

        // Income tax (TDS)
        const taxInput: TaxInput = {
          basic: Number(structure.basic),
          hra: Number(structure.hra),
          da: Number(structure.da),
          conveyance: Number(structure.conveyance),
          medical: Number(structure.medical),
          specialAllowance: Number(structure.specialAllowance),
          regime,
        };
        const taxResult = computeIncomeTax(taxInput);
        const tdsMonthly = taxResult.tdsPerMonth;

        const totalDeductions = pfDeduction + esiDeduction + pt + tdsMonthly + lopAmount;
        // H1: Gross includes additional payouts; net cannot go below zero
        const grossTotal = grossWithAllowance + additionalPay;
        const net = Math.max(0, grossTotal - totalDeductions);

        // Upsert payslip for this cycle
        const existing = await tx.payslip.findFirst({
          where: { employeeId: emp.id, payrollCycleId: cycle.id },
        });

        const breakdown = {
          basic: Number(structure.basic),
          hra: Number(structure.hra),
          da: Number(structure.da),
          conveyance: Number(structure.conveyance),
          medical: Number(structure.medical),
          specialAllowance: Number(structure.specialAllowance),
          shiftAllowance: totalShiftAllowance,
          additionalPayout: additionalPay,
          pfDeduction,
          esiDeduction,
          ptDeduction: pt,
          tdsMonthly: Math.round(tdsMonthly),
          taxRegime: regime,
          taxableAnnual: taxResult.taxableIncome,
          effectiveTaxRate: taxResult.effectiveRate,
          lopDays,
          lopAmount: Math.round(lopAmount),
          totalWorkingDays,
        };

        if (existing) {
          await tx.payslip.update({
            where: { id: existing.id },
            data: { grossPay: grossTotal, totalDeductions, netPay: net, breakdown: breakdown as any },
          });
        } else {
          await tx.payslip.create({
            data: {
              employeeId: emp.id,
              payrollCycleId: cycle.id,
              grossPay: grossTotal,
              totalDeductions,
              netPay: net,
              breakdown: breakdown as any,
            },
          });
          payslipCount++;
        }
      }

      return tx.payrollCycle.update({ where: { id: cycle.id }, data: { status: 'processed' } });
    });
    return { cycle: updated, payslipCount };
  }

  async getPayslips(companyId: string, employeeId: string) {
    const employee = await this.prisma.employee.findFirst({ where: { id: employeeId, companyId } });
    if (!employee) throw new NotFoundException('Employee not found in this company');
    return this.prisma.payslip.findMany({
      where: { employeeId },
      include: { payrollCycle: true },
      orderBy: { generatedAt: 'desc' },
    });
  }

  async getPayslipDetail(companyId: string, payslipId: string) {
    const payslip = await this.prisma.payslip.findFirst({
      where: { id: payslipId, employee: { companyId } },
      include: {
        payrollCycle: true,
        employee: {
          select: {
            firstName: true, lastName: true, employeeCode: true, email: true,
            aadhaar: true, pan: true, uan: true, pfNumber: true, joiningDate: true,
            paymentInfo: true, bankAccountNumber: true, bankIfsc: true,
            department: { select: { name: true } },
            designation: { select: { title: true } },
          },
        },
      },
    });
    if (!payslip) throw new NotFoundException('Payslip not found');
    if (payslip.employee) {
      payslip.employee = decryptPiiFields(payslip.employee);
      payslip.employee.paymentInfo = decryptNestedPii(payslip.employee.paymentInfo as any, 'paymentInfo');
    }
    return payslip;
  }

  /** Compute tax preview without running payroll — used by frontend calculator */
  computeTaxPreview(input: TaxInput) {
    return computeIncomeTax(input);
  }
async getAttendanceSummary(companyId: string, month: number, year: number) {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 1);

    const [employees, holidays, logs, cycle] = await Promise.all([
      this.prisma.employee.findMany({
        where: { companyId, status: 'active' },
        select: { id: true, employeeCode: true, firstName: true, lastName: true, workingDaysPerWeek: true, department: { select: { name: true } } }
      }),
      this.prisma.holiday.findMany({ where: { companyId, date: { gte: start, lt: end } } }),
      this.prisma.attendanceLog.findMany({ where: { employee: { companyId }, date: { gte: start, lt: end } } }),
      this.prisma.payrollCycle.findUnique({ where: { companyId_month_year: { companyId, month, year } } }),
    ]);

    const logsByEmployee = new Map<string, typeof logs>();
    for (const log of logs) {
      const list = logsByEmployee.get(log.employeeId) || [];
      list.push(log);
      logsByEmployee.set(log.employeeId, list);
    }

    const countWorkingDays = (from: Date, to: Date, workingDaysPerWeek: number) => {
      let workingDays = 0;
      for (let day = new Date(from); day < to; day.setDate(day.getDate() + 1)) {
        const dayOfWeek = day.getDay();
        if (workingDaysPerWeek === 5 && dayOfWeek >= 1 && dayOfWeek <= 5) workingDays++;
        else if (workingDaysPerWeek === 6 && dayOfWeek >= 1 && dayOfWeek <= 6) workingDays++;
        else if (workingDaysPerWeek === 7) workingDays++;
      }
      return workingDays;
    };

    return employees.map((emp) => {
      const wd = emp.workingDaysPerWeek ?? 5;
      const isWorkingDay = (d: Date) => {
        const dow = d.getUTCDay();
        if (wd === 5) return dow >= 1 && dow <= 5;
        if (wd === 6) return dow >= 1 && dow <= 6;
        return true;
      };
      const empLogs = logsByEmployee.get(emp.id) || [];
      const uniqueDays = new Map<number, (typeof logs)[number]>();
      for (const log of empLogs) {
        if (!isWorkingDay(log.date)) continue;
        const key = log.date.getUTCFullYear() * 10000 + log.date.getUTCMonth() * 100 + log.date.getUTCDate();
        const existing = uniqueDays.get(key);
        if (!existing) uniqueDays.set(key, log);
        else if (log.status === 'late' || log.status === 'half_day') uniqueDays.set(key, log);
      }
      const uniqueLogs = Array.from(uniqueDays.values());
      const present = uniqueLogs.filter((l) => l.status === 'present').length;
      const late = uniqueLogs.filter((l) => l.status === 'late').length;
      const halfDay = uniqueLogs.filter((l) => l.status === 'half_day').length;
      const onLeave = uniqueLogs.filter((l) => l.status === 'on_leave').length;
      const holidaysCount = holidays.filter((h) => {
        const dow = h.date.getDay();
        if (wd === 5) return dow >= 1 && dow <= 5;
        if (wd === 6) return dow >= 1 && dow <= 6;
        return true;
      }).length;
      const totalDays = countWorkingDays(start, end, wd);
      const absent = Math.max(0, totalDays - present - late - halfDay - onLeave - holidaysCount);

      return {
        ...emp,
        totalDays,
        present,
        late,
        halfDay,
        onLeave,
        absent,
        holidays: holidaysCount,
        status: cycle?.status || 'pending',
      };
    });
  }

  async getPayouts(companyId: string, month: number, year: number) {
    return this.prisma.additionalPayout.findMany({
      where: { employee: { companyId }, month, year },
      include: { employee: { select: { firstName: true, lastName: true, employeeCode: true } } }
    });
  }

  async addPayout(companyId: string, body: any) {
    const employee = await this.prisma.employee.findFirst({
      where: { id: body.employeeId, companyId },
      select: { id: true },
    });
    if (!employee) throw new NotFoundException('Employee not found in this company');
    return this.prisma.additionalPayout.create({
      data: {
        employeeId: body.employeeId,
        month: body.month,
        year: body.year,
        type: body.type,
        amount: body.amount,
        notes: body.notes
      }
    });
  }

  async deletePayout(companyId: string, id: string) {
    const payout = await this.prisma.additionalPayout.findFirst({
      where: { id, employee: { companyId } },
    });
    if (!payout) throw new NotFoundException('Payout not found');
    return this.prisma.additionalPayout.delete({ where: { id } });
  }

  async getCyclePayslips(companyId: string, cycleId: string) {
    const cycle = await this.prisma.payrollCycle.findFirst({ where: { id: cycleId, companyId } });
    if (!cycle) throw new NotFoundException('Payroll cycle not found');
    return this.prisma.payslip.findMany({
      where: { payrollCycleId: cycleId },
      include: { employee: { select: { firstName: true, lastName: true, employeeCode: true, department: { select: { name: true } } } } }
    });
  }

async sendPayslips(companyId: string, cycleId: string) {
    const cycle = await this.prisma.payrollCycle.findFirst({ where: { id: cycleId, companyId } });
    if (!cycle) throw new NotFoundException('Payroll cycle not found');

    const payslips = await this.prisma.payslip.findMany({
      where: { payrollCycleId: cycleId },
      include: { employee: { select: { email: true, firstName: true, lastName: true, employeeCode: true } } },
    });
    if (!payslips.length) throw new BadRequestException('No payslips exist in this cycle');

    if (!this.mail.isConfigured()) {
      throw new BadRequestException('Email is not configured. Set SMTP_HOST to send payslips.');
    }

    const failures: Array<{ employeeCode: string; reason: string }> = [];
    let sent = 0;
    for (const p of payslips) {
      const email = p.employee?.email;
      if (!email) {
        failures.push({ employeeCode: p.employee?.employeeCode || 'unknown', reason: 'No email on file' });
        continue;
      }
      try {
        await this.mail.send({
          to: email,
          subject: `Payslip — ${cycle.month}/${cycle.year} — ${p.employee.firstName} ${p.employee.lastName || ''}`,
          html: this.buildPayslipEmailHtml(p, cycle),
        });
        sent++;
      } catch (err) {
        failures.push({ employeeCode: p.employee.employeeCode, reason: (err as Error).message });
      }
    }

    return { success: sent === payslips.length, sent, total: payslips.length, failures };
  }

  private buildPayslipEmailHtml(payslip: any, cycle: any): string {
    const gross = Number(payslip.grossPay);
    const deductions = Number(payslip.totalDeductions);
    const net = Number(payslip.netPay);
    const money = (v: number) => v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return `
      <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto;">
        <h2>Payslip — ${cycle.month}/${cycle.year}</h2>
        <p>Hi ${payslip.employee.firstName},</p>
        <p>Your payslip for ${cycle.month}/${cycle.year} is ready.</p>
        <table style="border-collapse: collapse; width: 100%; margin-top: 16px;">
          <tr><td style="padding: 6px 0;">Gross pay</td><td style="text-align: right;">₹${money(gross)}</td></tr>
          <tr><td style="padding: 6px 0;">Total deductions</td><td style="text-align: right;">₹${money(deductions)}</td></tr>
          <tr><td style="padding: 6px 0; border-top: 1px solid #ccc;"><strong>Net pay</strong></td><td style="text-align: right; border-top: 1px solid #ccc;"><strong>₹${money(net)}</strong></td></tr>
        </table>
        <p style="margin-top: 20px; color: #666; font-size: 12px;">This is an automated message — please do not reply.</p>
      </div>`;
  }
}


