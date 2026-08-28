import { Module } from '@nestjs/common';
import { LeaveController } from './leave.controller';
import { LeaveService } from './leave.service';
import { LeaveAccrualService } from './leave-accrual.service';
import { MonthlyLeaveAllocationService } from './monthly-leave-allocation.service';

@Module({
  controllers: [LeaveController],
  providers: [LeaveService, LeaveAccrualService, MonthlyLeaveAllocationService],
  exports: [LeaveService, LeaveAccrualService, MonthlyLeaveAllocationService],
})
export class LeaveModule {}

