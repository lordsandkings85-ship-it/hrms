import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ExpensesService } from './expenses.service';

@UseGuards(JwtAuthGuard)
@Controller('expenses')
export class ExpensesController {
  constructor(private service: ExpensesService) {}
  @Post() submit(@Body() body: { employeeId: string; category: string; amount: number; receiptUrl?: string }) {
    return this.service.submit(body.employeeId, body.category, body.amount, body.receiptUrl);
  }
  @Get('employee/:employeeId') list(@Param('employeeId') employeeId: string) { return this.service.listForEmployee(employeeId); }
  @Post(':id/status') updateStatus(@Param('id') id: string, @Body('status') status: string) { return this.service.updateStatus(id, status); }
}
