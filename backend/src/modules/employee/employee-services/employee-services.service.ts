import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class EmployeeServicesService {
  constructor(private prisma: PrismaService) {}

  // ---------- Comp Off ----------
  createCompOff(companyId: string, employeeId: string, date: string, reason?: string) {
    return this.prisma.compOffRequest.create({
      data: { companyId, employeeId, date: new Date(date), reason },
    });
  }
  listCompOffMine(companyId: string, employeeId: string) {
    return this.prisma.compOffRequest.findMany({
      where: { companyId, employeeId },
      orderBy: { createdAt: 'desc' },
    });
  }
  listCompOff(companyId: string) {
    return this.prisma.compOffRequest.findMany({
      where: { companyId },
      include: { employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }
  /** Comp Off balance ledger — Rule 3 credit/consume ledger */
  listCompOffBalances(companyId: string, employeeId?: string) {
    return this.prisma.compOffBalance.findMany({
      where: { companyId, ...(employeeId ? { employeeId } : {}) },
      include: { attendanceLog: { select: { date: true, shiftStart: true, shiftEnd: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }
  async compOffRemaining(companyId: string, employeeId: string) {
    const rows = await this.prisma.compOffBalance.findMany({
      where: { companyId, employeeId, status: 'AVAILABLE' },
    });
    const available = rows.reduce((sum, r) => sum + (r.creditAmount - r.consumedAmount), 0);
    return { available, credits: rows };
  }

  async setCompOffStatus(id: string, companyId: string, status: string, approverId: string) {
    const res = await this.prisma.compOffRequest.updateMany({
      where: { id, companyId },
      data: { status, approvedBy: approverId },
    });
    if (!res.count) throw new NotFoundException('Comp-off request not found');
    const compOff = await this.prisma.compOffRequest.findFirst({ where: { id, companyId } });

    if (compOff && status === 'approved') {
      const year = compOff.date.getFullYear();
      // Rule 3 — prefer consuming an automatic Comp Off credit (e.g. second Saturday work).
      // This avoids double-counting: the credit was already entered in the ledger at check-out.
      const availableCredit = await this.prisma.compOffBalance.findFirst({
        where: {
          companyId,
          employeeId: compOff.employeeId,
          status: 'AVAILABLE',
          consumedAmount: 0,
        },
        orderBy: { createdAt: 'asc' },
      });

      if (availableCredit) {
        const remaining = Math.max(0, availableCredit.creditAmount - availableCredit.consumedAmount - 1);
        await this.prisma.compOffBalance.update({
          where: { id: availableCredit.id },
          data: {
            consumedAmount: { increment: 1 },
            status: remaining <= 0 ? 'CONSUMED' : 'AVAILABLE',
            consumedOn: new Date(),
            consumedBy: approverId,
            compOffRequestId: id,
          },
        });
      } else {
        // Legacy fallback — no automatic credit available (e.g. manual claim for company holiday):
        // grant a day to the "Compensatory Off" leave balance as before.
        let leaveType = await this.prisma.leaveType.findFirst({
          where: { companyId, name: { contains: 'ompensatory' } },
        });
        if (!leaveType) {
          leaveType = await this.prisma.leaveType.create({
            data: { companyId, name: 'Compensatory Off', paid: true },
          });
        }
        await this.prisma.leaveBalance.upsert({
          where: {
            employeeId_leaveTypeId_year: {
              employeeId: compOff.employeeId,
              leaveTypeId: leaveType.id,
              year,
            },
          },
          update: { allotted: { increment: 1 } },
          create: {
            employeeId: compOff.employeeId,
            leaveTypeId: leaveType.id,
            year,
            allotted: 1,
            used: 0,
          },
        });
      }
    }

    return compOff;
  }

  // ---------- Flexible Holiday ----------
  createFlexibleHoliday(companyId: string, employeeId: string, date: string, reason?: string) {
    return this.prisma.flexibleHolidayRequest.create({
      data: { companyId, employeeId, date: new Date(date), reason },
    });
  }
  listFlexibleHolidays(companyId: string, employeeId?: string) {
    return this.prisma.flexibleHolidayRequest.findMany({
      where: { companyId, ...(employeeId ? { employeeId } : {}) },
      include: employeeId ? undefined : {
        employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
  setFlexibleHolidayStatus(id: string, companyId: string, status: string, approverId: string) {
    return this.prisma.flexibleHolidayRequest.updateMany({
      where: { id, companyId },
      data: { status, approvedBy: approverId },
    }).then(() => this.prisma.flexibleHolidayRequest.findFirst({ where: { id, companyId } }));
  }

  // ---------- Overtime ----------
  createOvertime(companyId: string, employeeId: string, date: string, hours: number, reason?: string) {
    if (!hours || hours <= 0) throw new BadRequestException('Overtime hours must be positive');
    return this.prisma.overtimeRequest.create({
      data: { companyId, employeeId, date: new Date(date), hours, reason },
    });
  }
  listOvertime(companyId: string, employeeId?: string) {
    return this.prisma.overtimeRequest.findMany({
      where: { companyId, ...(employeeId ? { employeeId } : {}) },
      include: employeeId ? undefined : {
        employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
  setOvertimeStatus(id: string, companyId: string, status: string, approverId: string) {
    return this.prisma.overtimeRequest.updateMany({
      where: { id, companyId },
      data: { status, approvedBy: approverId },
    }).then(() => this.prisma.overtimeRequest.findFirst({ where: { id, companyId } }));
  }

  // ---------- Optional Holiday ----------
  createOptionalHoliday(companyId: string, employeeId: string, date: string, holidayName?: string, reason?: string) {
    return this.prisma.optionalHolidayRequest.create({
      data: { companyId, employeeId, date: new Date(date), holidayName, reason },
    });
  }
  listOptionalHolidays(companyId: string, employeeId?: string) {
    return this.prisma.optionalHolidayRequest.findMany({
      where: { companyId, ...(employeeId ? { employeeId } : {}) },
      include: employeeId ? undefined : {
        employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
  setOptionalHolidayStatus(id: string, companyId: string, status: string, approverId: string) {
    return this.prisma.optionalHolidayRequest.updateMany({
      where: { id, companyId },
      data: { status, approvedBy: approverId },
    }).then(() => this.prisma.optionalHolidayRequest.findFirst({ where: { id, companyId } }));
  }

  // ---------- Loans / Advances ----------
  async applyLoan(companyId: string, employeeId: string, data: {
    type?: string; purpose: string; amount: number; emiMonths?: number; emi?: number; notes?: string;
  }) {
    if (!data.amount || data.amount <= 0) throw new BadRequestException('Amount must be positive');
    const emi = data.emi || (data.emiMonths && data.emiMonths > 0 ? Math.round((data.amount / data.emiMonths) * 100) / 100 : 0);
    return this.prisma.loanRequest.create({
      data: {
        companyId, employeeId,
        type: data.type || 'loan',
        purpose: data.purpose,
        amount: data.amount,
        emiMonths: data.emiMonths || 0,
        emi,
        notes: data.notes,
      },
    });
  }
  listLoans(companyId: string, employeeId?: string) {
    return this.prisma.loanRequest.findMany({
      where: { companyId, ...(employeeId ? { employeeId } : {}) },
      include: employeeId ? undefined : {
        employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } },
      },
      orderBy: { appliedOn: 'desc' },
    });
  }
  async setLoanStatus(id: string, companyId: string, status: string, approverId: string) {
    const now = new Date();
    const data: any = { status, approvedBy: approverId };
    if (status === 'approved' || status === 'active') data.approvedOn = now;
    const res = await this.prisma.loanRequest.updateMany({ where: { id, companyId }, data });
    if (!res.count) throw new NotFoundException('Loan request not found');
    return this.prisma.loanRequest.findFirst({ where: { id, companyId } });
  }

  // ---------- Salary Revisions ----------
  async addSalaryRevision(companyId: string, employeeId: string, data: {
    effectiveFrom: string; revisedCtc: number; previousCtc?: number; reason?: string; remarks?: string;
  }) {
    if (!data.revisedCtc || data.revisedCtc <= 0) throw new BadRequestException('Revised CTC must be positive');
    const emp = await this.prisma.employee.findFirst({ where: { id: employeeId, companyId } });
    if (!emp) throw new NotFoundException('Employee not found');

    const existing = await this.prisma.salaryStructure.findFirst({
      where: { employeeId },
      orderBy: { effectiveFrom: 'desc' },
    });
    const effectiveFrom = new Date(data.effectiveFrom);

    // Scale the latest salary structure proportionally to the new CTC (or seed a default split)
    const base =
      existing
        ? Number(existing.basic) + Number(existing.hra) + Number(existing.da) + Number(existing.conveyance) + Number(existing.medical) + Number(existing.specialAllowance)
        : 0;
    const scale = base > 0 ? data.revisedCtc / base : 1;
    const defaultSplit = data.revisedCtc * 0.6;
    const salaryData = {
      basic: existing ? Math.round(Number(existing.basic) * scale) : Math.round(defaultSplit),
      hra: existing ? Math.round(Number(existing.hra) * scale) : Math.round(data.revisedCtc * 0.2),
      da: existing ? Math.round(Number(existing.da) * scale) : 0,
      conveyance: existing ? Math.round(Number(existing.conveyance) * scale) : 0,
      medical: existing ? Math.round(Number(existing.medical) * scale) : Math.round(data.revisedCtc * 0.1),
      specialAllowance: existing ? Math.round(Number(existing.specialAllowance) * scale) : Math.round(data.revisedCtc * 0.1),
    };

    const [revision] = await this.prisma.$transaction([
      this.prisma.salaryRevision.create({
        data: {
          companyId, employeeId,
          effectiveFrom,
          revisedCtc: data.revisedCtc,
          previousCtc: data.previousCtc ?? (base || 0),
          reason: data.reason || 'annual_appraisal',
          remarks: data.remarks,
        },
      }),
      this.prisma.salaryStructure.create({
        data: { employeeId, effectiveFrom, ...salaryData },
      }),
    ]);
    return revision;
  }
  listSalaryRevisions(companyId: string, employeeId?: string) {
    return this.prisma.salaryRevision.findMany({
      where: { companyId, ...(employeeId ? { employeeId } : {}) },
      include: employeeId ? undefined : {
        employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } },
      },
      orderBy: { effectiveFrom: 'desc' },
    });
  }

  // ---------- Tax Declarations ----------
  createTaxDeclaration(companyId: string, employeeId: string, data: {
    financialYear?: string; section: string; description?: string; declaredAmount: number;
  }) {
    if (!data.section) throw new BadRequestException('Section is required');
    return this.prisma.taxDeclaration.create({
      data: {
        companyId, employeeId,
        financialYear: data.financialYear || 'FY 2025-26',
        section: data.section,
        description: data.description,
        declaredAmount: data.declaredAmount,
      },
    });
  }
  listTaxDeclarations(companyId: string, employeeId?: string) {
    return this.prisma.taxDeclaration.findMany({
      where: { companyId, ...(employeeId ? { employeeId } : {}) },
      include: employeeId ? undefined : {
        employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
  async setTaxDeclarationStatus(id: string, companyId: string, status: string, approverId: string, approvedAmount?: number) {
    const res = await this.prisma.taxDeclaration.updateMany({
      where: { id, companyId },
      data: { status, approvedAmount: approvedAmount ?? 0 },
    });
    if (!res.count) throw new NotFoundException('Tax declaration not found');
    return this.prisma.taxDeclaration.findFirst({ where: { id, companyId } });
  }
}
