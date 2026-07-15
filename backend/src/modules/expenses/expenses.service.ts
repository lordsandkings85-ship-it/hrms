import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ExpensesService {
  constructor(private prisma: PrismaService) {}
  submit(employeeId: string, category: string, amount: number, receiptUrl?: string) {
    return this.prisma.expense.create({ data: { employeeId, category, amount, receiptUrl } });
  }
  listForEmployee(employeeId: string) {
    return this.prisma.expense.findMany({ where: { employeeId }, orderBy: { createdAt: 'desc' } });
  }
  async updateStatus(id: string, status: string) {
    const expense = await this.prisma.expense.findUnique({ where: { id } });
    if (!expense) throw new NotFoundException('Expense not found');

    // Multi-tier approval logic
    if (status === 'approved') {
      if (expense.status === 'pending') {
        // First tier (Manager)
        return this.prisma.expense.update({ where: { id }, data: { status: 'manager_approved' } });
      } else if (expense.status === 'manager_approved') {
        // Second tier (Finance)
        return this.prisma.expense.update({ where: { id }, data: { status: 'approved' } });
      } else {
        throw new BadRequestException('Expense is not in a state to be approved');
      }
    }

    return this.prisma.expense.update({ where: { id }, data: { status } });
  }
}
