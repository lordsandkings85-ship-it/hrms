import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { computeIncomeTax, computePF, computeESI, TaxInput } from './tax.calculator';

@Injectable()
export class PayrollService {
  constructor(private prisma: PrismaService) {}

  setSalaryStructure(employeeId: string, data: any) {
    return this.prisma.salaryStructure.create({ data: { employeeId, ...data } });
  }

  getSalaryStructure(employeeId: string) {
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

  async lockCycle(cycleId: string) {
    const cycle = await this.prisma.payrollCycle.findUnique({ where: { id: cycleId } });
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
        attendanceLog: {
          where: {
            date: {
              gte: new Date(year, month - 1, 1),
              lt: new Date(year, month, 1)
            },
            status: 'absent'
          }
        },
        shiftAssignment: {
          where: {
            effectiveFrom: {
              gte: new Date(year, month - 1, 1),
              lt: new Date(year, month, 1)
            }
          },
          include: { shift: true }
        }
      },
    });

    // Helper to get total working days in a month based on workingDaysPerWeek
    const getWorkingDaysInMonth = (workingDaysPerWeek: number) => {
      const daysInMonth = new Date(year, month, 0).getDate();
      let workingDays = 0;
      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month - 1, day);
        const dayOfWeek = date.getDay(); // 0 is Sunday, 6 is Saturday
        
        let isWeekend = false;
        if (workingDaysPerWeek === 5 && (dayOfWeek === 0 || dayOfWeek === 6)) isWeekend = true;
        if (workingDaysPerWeek === 6 && dayOfWeek === 0) isWeekend = true;
        
        if (!isWeekend) workingDays++;
      }
      return workingDays;
    };

    let payslipCount = 0;
    for (const emp of employees) {
      const structure = emp.salaryStructures[0];
      if (!structure) continue;

      const gross = structure.basic + structure.hra + structure.da + structure.conveyance +
        structure.medical + structure.specialAllowance;

      // LOP Calculation
      const totalWorkingDays = getWorkingDaysInMonth(emp.workingDaysPerWeek);
      const lopDays = emp.attendanceLog.length;
      let lopAmount = (gross / totalWorkingDays) * lopDays;
      
      // Safety Clamp: LOP cannot exceed gross salary
      lopAmount = Math.min(lopAmount, gross);

      // Shift Allowance Calculation
      let totalShiftAllowance = 0;
      for (const sa of emp.shiftAssignment) {
        if (sa.shift && sa.shift.allowance) {
          // Assume the assignment is for a week (5 working days)
          // Ideally cross-reference with actual attendance, but for prototype:
          totalShiftAllowance += sa.shift.allowance * 5; 
        }
      }

      // Add shift allowance to gross
      const grossWithAllowance = gross + totalShiftAllowance;

      // Adjusted gross for tax/pf calculations (or you can calculate on fixed gross depending on company policy)
      // Standard practice: PF and Taxes are calculated on actual earned salary (gross - lopAmount)
      // but for simplicity, we'll just deduct LOP from net.

      // Auto-compute statutory deductions
      const pfAuto = computePF(structure.basic);
      const esiAuto = computeESI(gross);
      const pt = structure.ptDeduction;

      // Income tax (TDS)
      const taxInput: TaxInput = {
        basic: structure.basic,
        hra: structure.hra,
        da: structure.da,
        conveyance: structure.conveyance,
        medical: structure.medical,
        specialAllowance: structure.specialAllowance,
        regime,
      };
      const taxResult = computeIncomeTax(taxInput);
      const tdsMonthly = taxResult.tdsPerMonth;

      const totalDeductions = pfAuto + esiAuto + pt + tdsMonthly + lopAmount;
      const net = grossWithAllowance - totalDeductions;

      // Upsert payslip for this cycle
      const existing = await this.prisma.payslip.findFirst({
        where: { employeeId: emp.id, payrollCycleId: cycle.id },
      });

      const breakdown = {
        basic: structure.basic,
        hra: structure.hra,
        da: structure.da,
        conveyance: structure.conveyance,
        medical: structure.medical,
        specialAllowance: structure.specialAllowance,
        shiftAllowance: totalShiftAllowance,
        pfDeduction: pfAuto,
        esiDeduction: esiAuto,
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
        await this.prisma.payslip.update({
          where: { id: existing.id },
          data: { grossPay: grossWithAllowance, totalDeductions, netPay: net, breakdown: breakdown as any },
        });
      } else {
        await this.prisma.payslip.create({
          data: {
            employeeId: emp.id,
            payrollCycleId: cycle.id,
            grossPay: grossWithAllowance,
            totalDeductions,
            netPay: net,
            breakdown: breakdown as any,
          },
        });
        payslipCount++;
      }
    }

    await this.prisma.payrollCycle.update({ where: { id: cycle.id }, data: { status: 'processed' } });
    return { cycle, payslipCount };
  }

  getPayslips(employeeId: string) {
    return this.prisma.payslip.findMany({
      where: { employeeId },
      include: { payrollCycle: true },
      orderBy: { generatedAt: 'desc' },
    });
  }

  getPayslipDetail(payslipId: string) {
    return this.prisma.payslip.findUnique({
      where: { id: payslipId },
      include: {
        payrollCycle: true,
        employee: {
          select: {
            firstName: true, lastName: true, employeeCode: true, email: true, pan: true,
            pfNumber: true, uan: true, bankAccountNumber: true, bankIfsc: true,
            department: { select: { name: true } },
            designation: { select: { title: true } },
          },
        },
      },
    });
  }

  /** Compute tax preview without running payroll — used by frontend calculator */
  computeTaxPreview(input: TaxInput) {
    return computeIncomeTax(input);
  }
}
