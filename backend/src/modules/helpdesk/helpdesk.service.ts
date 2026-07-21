import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class HelpdeskService {
  constructor(private prisma: PrismaService) {}

  list(companyId: string) {
    return this.prisma.helpdeskTicket.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
      include: {
        employee: { select: { firstName: true, lastName: true } }
      }
    });
  }

  create(companyId: string, employeeId: string | undefined, data: any) {
    return this.prisma.helpdeskTicket.create({
      data: {
        companyId,
        employeeId: employeeId || null,
        subject: data.subject,
        description: data.description,
        priority: data.priority,
        category: data.category,
      }
    });
  }

  updateStatus(id: string, companyId: string, status: string) {
    return this.prisma.helpdeskTicket.update({
      where: { id, companyId },
      data: { status }
    });
  }
}
