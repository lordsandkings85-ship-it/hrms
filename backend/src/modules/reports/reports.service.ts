import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async headcount(companyId: string) {
    const byDept = await this.prisma.employee.groupBy({
      by: ['departmentId'],
      where: { companyId, status: 'active' },
      _count: true,
    });
    return byDept;
  }

  async attrition(companyId: string, year: number) {
    const terminated = await this.prisma.employee.count({
      where: { companyId, status: 'terminated', updatedAt: { gte: new Date(`${year}-01-01`), lt: new Date(`${year + 1}-01-01`) } },
    });
    const total = await this.prisma.employee.count({ where: { companyId } });
    return { terminated, total, attritionRate: total ? terminated / total : 0 };
  }

  async payrollCost(companyId: string, year: number) {
    const payslips = await this.prisma.payslip.findMany({
      where: { employee: { companyId }, payrollCycle: { year } },
    });
    const totalNet = payslips.reduce((sum, p) => sum + p.netPay, 0);
    return { year, totalNet, payslipCount: payslips.length };
  }

  async leaveSummary(companyId: string, year: number) {
    return this.prisma.leaveBalance.findMany({
      where: { employee: { companyId }, year },
      include: { leaveType: true, employee: { select: { firstName: true, lastName: true } } },
    });
  }
}
