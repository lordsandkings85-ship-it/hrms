import { Module } from '@nestjs/common';
import { EmployeeServicesService } from './employee-services.service';
import { EmployeeServicesController } from './employee-services.controller';

@Module({
  controllers: [EmployeeServicesController],
  providers: [EmployeeServicesService],
  exports: [EmployeeServicesService],
})
export class EmployeeServicesModule {}
