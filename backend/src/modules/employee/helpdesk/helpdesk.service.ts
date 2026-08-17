import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

export const TICKET_STATUSES = ['open', 'in_progress', 'resolved', 'closed'];
export const TICKET_PRIORITIES = ['low', 'medium', 'high', 'urgent'];
export const TICKET_CATEGORIES = ['hr', 'it', 'payroll', 'asset', 'general'];

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
    if (!data?.subject?.trim()) throw new BadRequestException('Subject is required');
    if (!data?.description?.trim()) throw new BadRequestException('Description is required');
    if (!TICKET_PRIORITIES.includes(data.priority)) throw new BadRequestException('Invalid priority');
    if (!TICKET_CATEGORIES.includes(data.category)) throw new BadRequestException('Invalid category');
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { employeeId: true } });
    return this.prisma.helpdeskTicket.create({
      data: {
        companyId,
        employeeId: user?.employeeId || null,
        subject: data.subject,
        description: data.description,
        priority: data.priority,
        category: data.category,
        ratings: data.ratings ?? null,
      }
    });
  }

  async listForEmployee(companyId: string, userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { employeeId: true } });
    return this.prisma.helpdeskTicket.findMany({
      where: { companyId, employeeId: user?.employeeId || null },
      include: { employee: { select: { firstName: true, lastName: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateStatus(id: string, companyId: string, status: string) {
    if (!TICKET_STATUSES.includes(status)) {
      throw new BadRequestException(`Invalid status. Allowed: ${TICKET_STATUSES.join(', ')}`);
    }
    const existing = await this.prisma.helpdeskTicket.findFirst({ where: { id, companyId } });
    if (!existing) throw new NotFoundException('Ticket not found');
    return this.prisma.helpdeskTicket.update({
      where: { id },
      data: { status }
    });
  }
}
