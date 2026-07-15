import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TravelService {
  constructor(private prisma: PrismaService) {}
  request(employeeId: string, fromDate: string, toDate: string, purpose?: string, advance?: number) {
    return this.prisma.travelRequest.create({
      data: { employeeId, fromDate: new Date(fromDate), toDate: new Date(toDate), purpose, advance: advance || 0 },
    });
  }
  updateStatus(id: string, status: string) {
    return this.prisma.travelRequest.update({ where: { id }, data: { status } });
  }
  listForEmployee(employeeId: string) {
    return this.prisma.travelRequest.findMany({ where: { employeeId }, orderBy: { fromDate: 'desc' } });
  }
  async listForCompany(companyId: string) {
    const employees = await this.prisma.employee.findMany({
      where: { companyId },
      select: { id: true, firstName: true, lastName: true },
    });
    const employeeIds = employees.map((e) => e.id);

    const requests = await this.prisma.travelRequest.findMany({
      where: { employeeId: { in: employeeIds } },
      orderBy: { fromDate: 'desc' },
    });

    return requests.map((req) => ({
      ...req,
      employee: employees.find((e) => e.id === req.employeeId),
    }));
  }
}
