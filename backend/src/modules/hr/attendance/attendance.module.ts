import { Module } from '@nestjs/common';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';
import { AttendanceAutoMarkService } from './attendance-auto-mark.service';

@Module({
  controllers: [AttendanceController],
  providers: [AttendanceService, AttendanceAutoMarkService],
  exports: [AttendanceService],
})
export class AttendanceModule {}

