import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getSummary(companyId: string) {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

    const [
      totalEmployees,
      presentToday,
      onLeaveToday,
      pendingLeaveApprovals,
      openPositions,
      activeProjects,
    ] = await this.prisma.$transaction([
      this.prisma.employee.count({ 
        where: { 
          companyId, 
          status: 'active',
          user: {
            isNot: {
              role: {
                isSystem: true
              }
            }
          }
        } 
      }),
      this.prisma.attendanceLog.count({
        where: {
          employee: { companyId },
          date: { gte: startOfDay, lt: endOfDay },
          status: 'present',
        },
      }),
      this.prisma.leaveRequest.count({
        where: {
          employee: { companyId },
          status: 'approved',
          startDate: { lte: endOfDay },
          endDate: { gte: startOfDay },
        },
      }),
      this.prisma.leaveRequest.count({
        where: { employee: { companyId }, status: 'pending' },
      }),
      this.prisma.job.count({ where: { companyId, status: 'open' } }),
      this.prisma.project.count({ where: { companyId, status: 'active' } }),
    ]);

    const sixMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 5, 1);
    const logs = await this.prisma.attendanceLog.findMany({
      where: {
        employee: { companyId },
        date: { gte: sixMonthsAgo }
      },
      select: { date: true, status: true }
    });

    const trendMap: Record<string, { month: string; present: number; absent: number; leave: number }> = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const monthStr = d.toLocaleString('en-US', { month: 'short' });
      trendMap[monthStr] = { month: monthStr, present: 0, absent: 0, leave: 0 };
    }

    for (const log of logs) {
      const m = log.date.toLocaleString('en-US', { month: 'short' });
      if (trendMap[m]) {
        if (log.status === 'present' || log.status === 'late' || log.status === 'half_day') trendMap[m].present++;
        else if (log.status === 'absent') trendMap[m].absent++;
        else if (log.status === 'on_leave') trendMap[m].leave++;
      }
    }

    return {
      widgets: {
        totalEmployees,
        presentToday,
        absentToday: Math.max(totalEmployees - presentToday - onLeaveToday, 0),
        onLeaveToday,
        pendingApprovals: pendingLeaveApprovals,
        openPositions,
        activeProjects,
      },
      attendanceTrend: Object.values(trendMap),
    };
  }
}
