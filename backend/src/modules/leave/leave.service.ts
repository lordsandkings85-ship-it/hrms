import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class LeaveService {
  constructor(private prisma: PrismaService) {}

  listTypes(companyId: string) {
    return this.prisma.leaveType.findMany({ where: { companyId } });
  }

  createType(companyId: string, name: string, paid: boolean) {
    return this.prisma.leaveType.create({ data: { companyId, name, paid } });
  }

  apply(
    employeeId: string,
    leaveTypeId: string,
    startDate: string,
    endDate: string,
    isHalfDay: boolean,
    reason?: string,
  ) {
    return this.prisma.leaveRequest.create({
      data: {
        employeeId,
        leaveTypeId,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        isHalfDay,
        reason,
      },
    });
  }

  async approve(id: string, approverId: string) {
    const req = await this.prisma.leaveRequest.findUnique({ 
      where: { id },
      include: { employee: true }
    });
    if (!req) throw new NotFoundException('Leave request not found');

    let days = isHalfDayCount(req.startDate, req.endDate, req.isHalfDay);

    // Holiday Exclusion (Exclude non-Sunday holidays)
    if (!req.isHalfDay) {
      const holidays = await this.prisma.holiday.findMany({
        where: {
          companyId: req.employee.companyId,
          date: { gte: req.startDate, lte: req.endDate },
        },
      });
      let holidayCount = 0;
      for (const h of holidays) {
        if (h.date.getDay() !== 0) holidayCount++;
      }
      days = Math.max(0, days - holidayCount);
    }

    // Sandwich Rule detection across separate requests
    // If applying for a Monday (day 1), check if previous Friday (day 5) was a leave.
    const startDay = req.startDate.getDay();
    if (startDay === 1) { // Monday
      const lastFriday = new Date(req.startDate);
      lastFriday.setDate(lastFriday.getDate() - 3);
      
      const startOfLastFriday = new Date(lastFriday);
      startOfLastFriday.setHours(0,0,0,0);
      const endOfLastFriday = new Date(lastFriday);
      endOfLastFriday.setHours(23,59,59,999);
      
      const adjacentLeave = await this.prisma.leaveRequest.findFirst({
        where: {
          employeeId: req.employeeId,
          status: 'approved',
          endDate: {
            gte: startOfLastFriday,
            lte: endOfLastFriday
          }
        }
      });
      if (adjacentLeave) {
        // Sandwich detected: Add Saturday and Sunday
        days += 2;
      }
    }

    await this.prisma.leaveBalance.upsert({
      where: {
        employeeId_leaveTypeId_year: {
          employeeId: req.employeeId,
          leaveTypeId: req.leaveTypeId,
          year: req.startDate.getFullYear(),
        },
      },
      update: { used: { increment: days } },
      create: {
        employeeId: req.employeeId,
        leaveTypeId: req.leaveTypeId,
        year: req.startDate.getFullYear(),
        allotted: 0,
        used: days,
      },
    });

    return this.prisma.leaveRequest.update({
      where: { id },
      data: { status: 'approved', approverId },
    });
  }

  reject(id: string, approverId: string) {
    return this.prisma.leaveRequest.update({
      where: { id },
      data: { status: 'rejected', approverId },
    });
  }

  listForEmployee(employeeId: string) {
    return this.prisma.leaveRequest.findMany({
      where: { employeeId },
      include: { leaveType: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  listPendingForCompany(companyId: string) {
    return this.prisma.leaveRequest.findMany({
      where: { employee: { companyId }, status: 'pending' },
      include: { leaveType: true, employee: { select: { firstName: true, lastName: true } } },
    });
  }

  balances(employeeId: string, year: number) {
    return this.prisma.leaveBalance.findMany({
      where: { employeeId, year },
      include: { leaveType: true },
    });
  }

  listHolidays(companyId: string) {
    return this.prisma.holiday.findMany({
      where: { companyId },
      orderBy: { date: 'asc' }
    });
  }

  createHoliday(companyId: string, name: string, date: string) {
    return this.prisma.holiday.create({
      data: { companyId, name, date: new Date(date) }
    });
  }

  deleteHoliday(companyId: string, id: string) {
    return this.prisma.holiday.delete({
      where: { id, companyId }
    });
  }
}

function isHalfDayCount(start: Date, end: Date, isHalfDay: boolean): number {
  if (isHalfDay) return 0.5;
  
  let count = 0;
  let current = new Date(start);
  const endDate = new Date(end);
  
  // Reset times to compare dates safely
  current.setHours(0, 0, 0, 0);
  endDate.setHours(0, 0, 0, 0);
  
  while (current <= endDate) {
    // 0 is Sunday
    if (current.getDay() !== 0) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  
  return Math.max(count, 1);
}
