import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class FnfService {
  constructor(private prisma: PrismaService) {}

  async initiate(employeeId: string, lastWorkingDay: string, noticePeriodDays = 90) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        salaryStructures: { orderBy: { effectiveFrom: 'desc' }, take: 1 },
        leaveBalances: { include: { leaveType: true } },
        company: true,
      },
    });
    if (!employee) throw new NotFoundException('Employee not found');

    const lwd = new Date(lastWorkingDay);
    const joiningDate = employee.joiningDate || new Date();
    const yearsOfService = (lwd.getTime() - joiningDate.getTime()) / (1000 * 60 * 60 * 24 * 365);
    const isGratuityEligible = yearsOfService >= 5;

    const salary = employee.salaryStructures[0];
    const basicMonthly = salary?.basic || 0;
    const perDay = basicMonthly / 26;

    // Gratuity = (15 * Basic * Years) / 26
    const gratuityAmount = isGratuityEligible ? (15 * basicMonthly * Math.floor(yearsOfService)) / 26 : 0;

    // Leave encashment — earned leave balance
    const earnedLeave = employee.leaveBalances.find(b => b.leaveType.name.toLowerCase().includes('earned'));
    const leaveEncashDays = earnedLeave ? earnedLeave.allotted - earnedLeave.used : 0;
    const leaveEncashAmount = leaveEncashDays * perDay;

    // Notice period recovery (if not served fully)
    // For simplicity, assume partial service is passed as noticeRecovery
    const noticeRecovery = 0; // admin can override
    const unpaidSalaryAmt = 0;

    const netSettlement =
      gratuityAmount +
      leaveEncashAmount +
      unpaidSalaryAmt -
      noticeRecovery;

    const existing = await this.prisma.fnfSettlement.findUnique({ where: { employeeId } });
    if (existing) {
      return this.prisma.fnfSettlement.update({
        where: { employeeId },
        data: {
          lastWorkingDay: lwd,
          noticePeriodDays,
          noticeRecovery,
          gratuityAmount,
          leaveEncashDays,
          leaveEncashAmount,
          netSettlement,
          isGratuityEligible,
          status: 'draft',
        },
      });
    }

    return this.prisma.fnfSettlement.create({
      data: {
        employeeId,
        lastWorkingDay: lwd,
        noticePeriodDays,
        noticeRecovery,
        gratuityAmount,
        leaveEncashDays,
        leaveEncashAmount,
        netSettlement,
        isGratuityEligible,
        status: 'draft',
      },
    });
  }

  async get(employeeId: string) {
    return this.prisma.fnfSettlement.findUnique({
      where: { employeeId },
      include: { employee: { select: { firstName: true, lastName: true, employeeCode: true } } },
    });
  }

  async list(companyId: string) {
    const employees = await this.prisma.employee.findMany({
      where: { companyId },
      select: { id: true },
    });
    const empIds = employees.map(e => e.id);
    return this.prisma.fnfSettlement.findMany({
      where: { employeeId: { in: empIds } },
      include: { employee: { select: { firstName: true, lastName: true, employeeCode: true, department: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async approve(id: string) {
    const settlement = await this.prisma.fnfSettlement.findUnique({ where: { id } });
    if (!settlement) throw new NotFoundException('Settlement not found');

    // Asset Recovery Check
    const pendingAssets = await this.prisma.assetAssignment.findMany({
      where: {
        employeeId: settlement.employeeId,
        
        returnedAt: null,
      },
      include: { asset: true }
    });

    if (pendingAssets.length > 0) {
      throw new BadRequestException(`Cannot approve settlement. Employee has ${pendingAssets.length} unreturned assets (e.g. ${pendingAssets[0].assetId}).`);
    }

    return this.prisma.fnfSettlement.update({
      where: { id },
      data: { status: 'approved' },
    });
  }

  async updateOverrides(id: string, data: { noticeRecovery?: number; otherDeductions?: number; unpaidSalaryAmt?: number; unpaidSalaryDays?: number }) {
    const settlement = await this.prisma.fnfSettlement.findUnique({ where: { id } });
    if (!settlement) throw new NotFoundException('Settlement not found');

    const noticeRecovery = data.noticeRecovery ?? settlement.noticeRecovery;
    const otherDeductions = data.otherDeductions ?? settlement.otherDeductions;
    const unpaidSalaryAmt = data.unpaidSalaryAmt ?? settlement.unpaidSalaryAmt;

    const netSettlement =
      settlement.gratuityAmount +
      settlement.leaveEncashAmount +
      unpaidSalaryAmt -
      noticeRecovery -
      otherDeductions;

    return this.prisma.fnfSettlement.update({
      where: { id },
      data: { noticeRecovery, otherDeductions, unpaidSalaryAmt, unpaidSalaryDays: data.unpaidSalaryDays ?? settlement.unpaidSalaryDays, netSettlement },
    });
  }
}
