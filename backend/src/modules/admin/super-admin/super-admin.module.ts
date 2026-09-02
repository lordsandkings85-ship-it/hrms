import { Module } from '@nestjs/common';
import { SuperAdminController } from './super-admin.controller';
import { SuperAdminService } from './super-admin.service';
import { AttendanceModule } from '../../hr/attendance/attendance.module';
import { LeaveModule } from '../../hr/leave/leave.module';

@Module({
  imports: [AttendanceModule, LeaveModule],
  controllers: [SuperAdminController],
  providers: [SuperAdminService],
})
export class SuperAdminModule {}

