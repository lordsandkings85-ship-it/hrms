import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { isApprover } from '../../../common/approver';

@Injectable()
export class DashboardService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  private async isGroupWide(userId?: string): Promise<boolean> {
    if (!userId) return false;
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        isSuperAdmin: true,
        role: { select: { name: true, isSystem: true, permissions: { select: { module: true, action: true } } } },
      },
    });
    if (!user) return false;
    if (user.isSuperAdmin) return true;
    if (user.role?.isSystem) return true;
    if (['HR Admin', 'Admin', 'Super Admin'].includes(user.role?.name || '')) return true;
    return !!user.role?.permissions?.some((p) => p.module === 'organization' || p.module === 'ALL' || p.module === '*' || p.action === 'ALL');
  }

  async getSummary(companyId: string, user?: any) {
    let isPrivileged = !!user?.isSuperAdmin;
    if (!isPrivileged && user?.roleId) {
      const role = await this.prisma.role.findUnique({
        where: { id: user.roleId },
        select: { isSystem: true },
      });
      if (role?.isSystem) {
        isPrivileged = true;
      } else {
        const grants = await this.prisma.permission.findMany({
          where: { roleId: user.roleId },
          select: { module: true, action: true },
        });
        isPrivileged = isApprover({ isSuperAdmin: false, roleIsSystem: false }, grants);
      }
    }

    const isGroupManager = isPrivileged || await this.isGroupWide(user?.userId || user?.id);
    let targetCompanyIds: string[] = [companyId];

    if (isGroupManager) {
      const allCompanies = await this.prisma.company.findMany({ select: { id: true } });
      targetCompanyIds = allCompanies.map((c) => c.id);
    } else if (user?.userId) {
      const empUser = await this.prisma.user.findUnique({
        where: { id: user.userId },
        select: { companyId: true, employee: { select: { companyId: true } } },
      });
      const resolvedCompanyId = empUser?.employee?.companyId || empUser?.companyId || companyId;
      if (resolvedCompanyId) {
        targetCompanyIds = [resolvedCompanyId];
      }
    }

    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

    const [
      totalEmployees,
      pendingLeaveApprovals,
      openPositions,
      activeProjects,
      pendingRegularizationCount,
    ] = await this.prisma.$transaction([
      this.prisma.employee.count({ 
        where: { 
          companyId: { in: targetCompanyIds }, 
          status: 'active',
          isSystem: false,
          NOT: {
            user: {
              role: {
                isSystem: true
              }
            }
          }
        } 
      }),
      this.prisma.leaveRequest.count({
        where: { employee: { companyId: { in: targetCompanyIds } }, status: 'pending' },
      }),
      this.prisma.job.count({ where: { companyId: { in: targetCompanyIds }, status: 'open' } }),
      this.prisma.project.count({ where: { companyId: { in: targetCompanyIds }, status: 'active' } }),
      this.prisma.regularizationRequest.count({
        where: { employee: { companyId: { in: targetCompanyIds } }, status: 'pending' },
      }),
    ]);

    const lateArrivals = await this.prisma.attendanceLog.count({
      where: {
        employee: { companyId: { in: targetCompanyIds } },
        date: { gte: startOfDay, lt: endOfDay },
        status: 'late'
      }
    });

    const activeIds = await this.prisma.employee.findMany({
      where: {
        companyId: { in: targetCompanyIds },
        status: 'active',
        isSystem: false,
        NOT: {
          user: {
            role: {
              isSystem: true,
            },
          },
        },
      },
      select: { id: true },
    });
    const presentGroup = await this.prisma.attendanceLog.groupBy({
      by: ['employeeId'],
      where: {
        employee: { companyId: { in: targetCompanyIds }, isSystem: false },
        date: { gte: startOfDay, lt: endOfDay },
        status: { in: ['present', 'late', 'half_day'] },
      },
      _count: true,
    });
    const onLeaveGroup = await this.prisma.leaveRequest.groupBy({
      by: ['employeeId'],
      where: {
        employee: { companyId: { in: targetCompanyIds }, isSystem: false },
        status: 'approved',
        isHalfDay: false,
        startDate: { lte: endOfDay },
        endDate: { gte: startOfDay },
      },
      _count: true,
    });
    const halfDayLeaveGroup = await this.prisma.leaveRequest.groupBy({
      by: ['employeeId'],
      where: {
        employee: { companyId: { in: targetCompanyIds }, isSystem: false },
        status: 'approved',
        isHalfDay: true,
        startDate: { lte: endOfDay },
        endDate: { gte: startOfDay },
      },
      _count: true,
    });
    const presentSet = new Set([...presentGroup.map((g) => g.employeeId), ...halfDayLeaveGroup.map((g) => g.employeeId)]);
    const onLeaveSet = new Set(onLeaveGroup.map((g) => g.employeeId));
    const presentToday = activeIds.filter((e) => presentSet.has(e.id) && !onLeaveSet.has(e.id)).length;
    const onLeaveToday = activeIds.filter((e) => onLeaveSet.has(e.id)).length;
    const absentToday = Math.max(totalEmployees - presentToday - onLeaveToday, 0);

    const currentMonthStr = today.getMonth() + 1;
    const currentYearNum = today.getFullYear();
    const cycles = await this.prisma.payrollCycle.findMany({
      where: { companyId: { in: targetCompanyIds }, month: currentMonthStr, year: currentYearNum },
      include: { payslips: true }
    });
    const payslipCount = cycles.reduce((acc, c) => acc + (c.payslips?.length || 0), 0);
    const pendingPayroll = Math.max(0, totalEmployees - payslipCount);

    const sixMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 5, 1);
    const logs = await this.prisma.attendanceLog.findMany({
      where: {
        employee: { companyId: { in: targetCompanyIds } },
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

    const deptStats = await this.prisma.employee.groupBy({
      by: ['departmentId'],
      where: { companyId: { in: targetCompanyIds }, status: 'active', isSystem: false },
      _count: { id: true }
    });

    const departments = await this.prisma.department.findMany({
      where: { companyId: { in: targetCompanyIds } },
      select: { id: true, name: true }
    });

    const deptMap = new Map(departments.map(d => [d.id, d.name]));
    const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#14B8A6', '#F43F5E', '#6366F1'];
    
    const departmentMix = deptStats
      .map((stat, i) => {
        const count = stat._count.id;
        const name = stat.departmentId ? (deptMap.get(stat.departmentId) || 'Department') : 'General';
        return {
          name,
          value: count,
          count,
          pct: totalEmployees > 0 ? Math.round((count / totalEmployees) * 100) : 0,
          color: COLORS[i % COLORS.length]
        };
      })
      .sort((a, b) => b.count - a.count);

    const headcountTrend: { month: string; headcount: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i + 1, 0);
      const count = await this.prisma.employee.count({
        where: {
          companyId: { in: targetCompanyIds },
          isSystem: false,
          OR: [
            { joiningDate: { lte: d } },
            { joiningDate: null }
          ],
          status: 'active'
        }
      });
      headcountTrend.push({
        month: d.toLocaleString('en-US', { month: 'short' }),
        headcount: count
      });
    }

    const candidates = await this.prisma.candidate.groupBy({
      by: ['stage'],
      where: { job: { companyId: { in: targetCompanyIds } } },
      _count: { id: true }
    });
    
    const recruitmentPipeline = {
      applied: 0,
      interview: 0,
      offer: 0,
      hired: 0
    };
    for (const c of candidates) {
      if (c.stage === 'applied') recruitmentPipeline.applied = c._count.id;
      else if (c.stage === 'interview') recruitmentPipeline.interview = c._count.id;
      else if (c.stage === 'offered') recruitmentPipeline.offer = c._count.id;
      else if (c.stage === 'hired') recruitmentPipeline.hired = c._count.id;
    }

    const currentYear = today.getFullYear();
    const leaveStats = await this.prisma.leaveRequest.groupBy({
      by: ['leaveTypeId'],
      where: { employee: { companyId: { in: targetCompanyIds } }, startDate: { gte: new Date(currentYear, 0, 1) } },
      _count: { id: true }
    });
    
    const leaveTypes = await this.prisma.leaveType.findMany({ where: { companyId: { in: targetCompanyIds } } });
    const leaveTypeMap = new Map(leaveTypes.map(t => [t.id, t.name]));
    
    const leaveStatistics = leaveStats.map(s => ({
      name: leaveTypeMap.get(s.leaveTypeId) ?? 'Other',
      value: s._count.id
    }));

    const activeEmployees = await this.prisma.employee.findMany({
      where: { companyId: { in: targetCompanyIds }, status: 'active', isSystem: false },
      include: { salaryStructures: { orderBy: { effectiveFrom: 'desc' }, take: 1 } }
    });
    
    let totalAnnualCTC = 0;
    const estimatedMonthlyCost = activeEmployees.reduce((sum, emp) => {
      let monthlyGross = 0;
      if (emp.salaryStructures && emp.salaryStructures.length > 0) {
        const s = emp.salaryStructures[0];
        monthlyGross = Number(s.basic || 0) + Number(s.hra || 0) + Number(s.da || 0) + Number(s.conveyance || 0) + Number(s.medical || 0) + Number(s.specialAllowance || 0);
      }
      totalAnnualCTC += (monthlyGross * 12);
      return sum + monthlyGross;
    }, 0);

    const payrollCost: { month: string; cost: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const mNum = d.getMonth() + 1;
      const yNum = d.getFullYear();
      
      const monthCycles = await this.prisma.payrollCycle.findMany({
        where: { companyId: { in: targetCompanyIds }, month: mNum, year: yNum },
        include: { payslips: true }
      });
      const payslips = monthCycles.flatMap(c => c.payslips || []);
      const cost = payslips.length > 0 ? payslips.reduce((acc, p) => acc + Number(p.netPay), 0) : estimatedMonthlyCost;
      
      payrollCost.push({
        month: d.toLocaleString('en-US', { month: 'short' }),
        cost
      });
    }

    const genderGroups = await this.prisma.employeePersonalInfo.groupBy({
      by: ['gender'],
      where: { employee: { companyId: { in: targetCompanyIds }, status: 'active', isSystem: false } },
      _count: { id: true }
    });

    const genderDistribution = [
      { name: 'Male', value: genderGroups.find(g => g.gender?.toLowerCase() === 'male')?._count.id || 0 },
      { name: 'Female', value: genderGroups.find(g => g.gender?.toLowerCase() === 'female')?._count.id || 0 },
      { name: 'Other', value: genderGroups.find(g => g.gender && !['male', 'female'].includes(g.gender.toLowerCase()))?._count.id || 0 }
    ];

    const inactiveEmployeesCount = await this.prisma.employee.count({
      where: { companyId: { in: targetCompanyIds }, isSystem: false, status: { in: ['resigned', 'terminated', 'inactive', 'ex-employee'] } }
    });
    const realAttritionPct = totalEmployees > 0 ? Number(((inactiveEmployeesCount / (totalEmployees + inactiveEmployeesCount)) * 100).toFixed(1)) : 0;

    const attritionRate: { month: string; rate: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      attritionRate.push({
        month: d.toLocaleString('en-US', { month: 'short' }),
        rate: realAttritionPct
      });
    }

    const currentMonthNum = today.getMonth() + 1;
    const currentYearVal = today.getFullYear();
    
    const employees = await this.prisma.employee.findMany({
      where: { companyId: { in: targetCompanyIds }, status: 'active', isSystem: false, joiningDate: { not: null } },
      select: { id: true, firstName: true, lastName: true, joiningDate: true }
    });

    const newJoiners: { id: string; name: string; date: Date }[] = [];
    const anniversaries: { id: string; name: string; years: number }[] = [];

    for (const e of employees) {
      if (!e.joiningDate) continue;
      const joinMonth = e.joiningDate.getMonth() + 1;
      const joinYear = e.joiningDate.getFullYear();
      
      const fullName = `${e.firstName} ${e.lastName || ''}`.trim();
      
      if (joinMonth === currentMonthNum && joinYear === currentYearVal) {
        newJoiners.push({
          id: e.id,
          name: fullName,
          date: e.joiningDate
        });
      }
      
      if (joinMonth === currentMonthNum && joinYear < currentYearVal) {
        anniversaries.push({
          id: e.id,
          name: fullName,
          years: currentYearVal - joinYear
        });
      }
    }

    const recentActivitiesRaw = await this.prisma.auditLog.findMany({
      where: { companyId: { in: targetCompanyIds } },
      orderBy: { createdAt: 'desc' },
      take: 8
    });
    
    let recentActivities: { id: string; title: string; time: string }[] = [];
    if (recentActivitiesRaw.length > 0) {
      recentActivities = recentActivitiesRaw.map(a => ({
        id: a.id,
        title: `${a.action} ${a.entity}`,
        time: a.createdAt.toISOString()
      }));
    } else {
      const recentEmps = await this.prisma.employee.findMany({
        where: { companyId: { in: targetCompanyIds }, isSystem: false },
        orderBy: { createdAt: 'desc' },
        take: 4,
        select: { id: true, firstName: true, lastName: true, createdAt: true }
      });
      recentActivities = recentEmps.map(e => ({
        id: e.id,
        title: `Employee Onboarded: ${e.firstName} ${e.lastName || ''}`.trim(),
        time: e.createdAt.toISOString()
      }));
    }

    const myNotifications = user?.userId
      ? await this.notifications.getMine(
          { userId: user.userId, companyId, email: user?.email ?? '', roleId: user?.roleId, isSuperAdmin: user?.isSuperAdmin },
          { limit: 30 },
        )
      : [];

    const notifications: { id: string; title: string; message?: string; type: 'urgent' | 'warning' | 'info' }[] =
      myNotifications.map((n) => ({
        id: n.id,
        title: n.title,
        message: n.message ?? undefined,
        type:
          n.priority === 'urgent'
            ? 'urgent'
            : n.priority === 'warning' || n.priority === 'high'
              ? 'warning'
              : 'info',
      }));

    if (isPrivileged) {
      if (pendingRegularizationCount > 0) {
        notifications.push({
          id: 'reg-alert',
          title: `${pendingRegularizationCount} Attendance Regularization Request(s) Pending Review`,
          type: 'warning',
        });
      }
      if (pendingLeaveApprovals > 0) {
        notifications.push({
          id: 'leave-approval-alert',
          title: `${pendingLeaveApprovals} Leave Request(s) Pending Approval`,
          type: 'urgent',
        });
      }
      if (openPositions > 0) {
        notifications.push({
          id: 'jobs-info',
          title: `${openPositions} Job Opening(s) Currently Active for Recruitment`,
          type: 'info',
        });
      }
    }

    const summary = {
      widgets: {
        totalEmployees,
        presentToday,
        absentToday,
        onLeaveToday,
        lateArrivals,
        pendingApprovals: pendingLeaveApprovals,
        pendingRegularization: pendingRegularizationCount,
        pendingPayroll,
        openPositions,
        activeProjects,
        totalAnnualCTC,
      },
      attendanceTrend: Object.values(trendMap),
      departmentMix,
      headcountTrend,
      leaveStatistics,
      monthlyPayrollCost: payrollCost,
      attritionRate,
      genderDistribution,
      recruitmentPipeline,
      recentActivities,
      notifications,
      pendingLeaveRequests: isPrivileged
        ? (await this.prisma.leaveRequest.findMany({
            where: { employee: { companyId: { in: targetCompanyIds } }, status: 'pending' },
            include: { employee: true, leaveType: true },
            orderBy: { createdAt: 'desc' },
            take: 5,
          })).map((pl) => ({
            id: pl.id,
            employeeName: `${pl.employee.firstName} ${pl.employee.lastName || ''}`.trim(),
            leaveType: pl.leaveType.name,
            startDate: pl.startDate,
            endDate: pl.endDate,
          }))
        : [],
      milestones: {
        newJoiners: newJoiners.slice(0, 5),
        anniversaries: anniversaries.slice(0, 5)
      }
    };

    if (!isPrivileged) {
      delete (summary.widgets as any).totalAnnualCTC;
      delete (summary as any).monthlyPayrollCost;
      delete (summary as any).departmentMix;
      delete (summary as any).headcountTrend;
      delete (summary as any).attritionRate;
      delete (summary as any).genderDistribution;
      delete (summary as any).recruitmentPipeline;
    }

    return summary;
  }
}
