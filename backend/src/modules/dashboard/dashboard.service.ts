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
    };
  }
}
