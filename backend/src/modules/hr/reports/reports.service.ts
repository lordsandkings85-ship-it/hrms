import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { isGroupWideUser } from '../../../utils/group-access.util';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async headcount(companyId: string, userId?: string) {
    const groupWide = userId ? await isGroupWideUser(this.prisma, userId) : false;
    const byDept = await this.prisma.employee.groupBy({
      by: ['departmentId'],
      where: groupWide ? { status: 'active', isSystem: false } : { companyId, status: 'active', isSystem: false },
      _count: true,
    });
    return byDept;
  }

  async attrition(companyId: string, year: number, userId?: string) {
    const groupWide = userId ? await isGroupWideUser(this.prisma, userId) : false;
    const terminated = await this.prisma.employee.count({
      where: {
        ...(groupWide ? { isSystem: false } : { companyId, isSystem: false }),
        status: 'terminated',
        updatedAt: { gte: new Date(`${year}-01-01`), lt: new Date(`${year + 1}-01-01`) },
      },
    });
    const total = await this.prisma.employee.count({
      where: groupWide ? { isSystem: false } : { companyId, isSystem: false },
    });
    return { terminated, total, attritionRate: total ? terminated / total : 0 };
  }

  async payrollCost(companyId: string, year: number, userId?: string) {
    const groupWide = userId ? await isGroupWideUser(this.prisma, userId) : false;
    const payslips = await this.prisma.payslip.findMany({
      where: {
        ...(groupWide ? {} : { employee: { companyId } }),
        payrollCycle: { year },
      },
    });
    const totalNet = payslips.reduce((sum, p) => sum + Number(p.netPay), 0);
    return { year, totalNet, payslipCount: payslips.length };
  }

  async payrollCostMonthly(companyId: string, year: number, userId?: string) {
    const groupWide = userId ? await isGroupWideUser(this.prisma, userId) : false;
    const cycles = await this.prisma.payrollCycle.findMany({
      where: {
        ...(groupWide ? {} : { companyId }),
        year,
      },
      include: { payslips: true },
    });
    const months = Array.from({ length: 12 }, (_, i) => i + 1);
    return {
      year,
      months: months.map((month) => {
        const matchingCycles = cycles.filter((c) => c.month === month);
        const totalNet = matchingCycles.reduce(
          (sum, c) => sum + (c.payslips?.reduce((s, p) => s + Number(p.netPay), 0) ?? 0),
          0,
        );
        const payslipCount = matchingCycles.reduce((sum, c) => sum + (c.payslips?.length ?? 0), 0);
        return { month, totalNet, payslipCount };
      }),
    };
  }

  async leaveSummary(companyId: string, year: number, userId?: string) {
    const groupWide = userId ? await isGroupWideUser(this.prisma, userId) : false;
    return this.prisma.leaveBalance.findMany({
      where: {
        ...(groupWide ? { employee: { isSystem: false } } : { employee: { companyId, isSystem: false } }),
        year,
      },
      include: {
        leaveType: true,
        employee: { select: { firstName: true, lastName: true, company: { select: { name: true, displayName: true } } } },
      },
    });
  }
}
