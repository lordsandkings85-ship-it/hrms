import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

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

  async create(companyId: string, userId: string, data: any) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { employeeId: true } });
    return this.prisma.helpdeskTicket.create({
      data: {
        companyId,
        employeeId: user?.employeeId || null,
        subject: data.subject,
        description: data.description,
        priority: data.priority,
        category: data.category,
      }
    });
  }

  listForEmployee(companyId: string, userId: string) {
    return this.prisma.helpdeskTicket.findMany({
      where: { companyId },
      include: { employee: { select: { firstName: true, lastName: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateStatus(id: string, companyId: string, status: string) {
    const existing = await this.prisma.helpdeskTicket.findFirst({ where: { id, companyId } });
    if (!existing) throw new Error('Ticket not found');
    return this.prisma.helpdeskTicket.update({
      where: { id },
      data: { status }
    });
  }
}

