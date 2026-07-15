import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class LeaveAccrualService {
  private readonly logger = new Logger(LeaveAccrualService.name);

  constructor(private prisma: PrismaService) {}

  // Run on the 1st of every month at midnight
  @Cron(CronExpression.EVERY_1ST_DAY_OF_MONTH_AT_MIDNIGHT)
  async handleMonthlyLeaveAccrual() {
    this.logger.log('Starting monthly leave accrual job...');
    const year = new Date().getFullYear();

    // Find all leave types that have an accrual rate
    const leaveTypes = await this.prisma.leaveType.findMany({
      where: { accrualRate: { gt: 0 } },
    });

    if (!leaveTypes.length) {
      this.logger.log('No leave types with accrual rates found.');
      return;
    }

    // Get all active employees
    const employees = await this.prisma.employee.findMany({
      where: { status: 'active' },
      select: { id: true, companyId: true },
    });

    for (const employee of employees) {
      // Find the leave types for this employee's company
      const companyLeaveTypes = leaveTypes.filter(lt => lt.companyId === employee.companyId);
      
      for (const leaveType of companyLeaveTypes) {
        // Upsert leave balance for the year
        const existingBalance = await this.prisma.leaveBalance.findUnique({
          where: {
            employeeId_leaveTypeId_year: {
              employeeId: employee.id,
              leaveTypeId: leaveType.id,
              year,
            },
          },
        });

        if (existingBalance) {
          await this.prisma.leaveBalance.update({
            where: { id: existingBalance.id },
            data: { allotted: { increment: leaveType.accrualRate } },
          });
        } else {
          await this.prisma.leaveBalance.create({
            data: {
              employeeId: employee.id,
              leaveTypeId: leaveType.id,
              year,
              allotted: leaveType.accrualRate,
              used: 0,
            },
          });
        }
      }
    }
    
    this.logger.log(`Completed leave accrual for ${employees.length} employees.`);
  }
}
