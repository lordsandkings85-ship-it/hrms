import { Module } from '@nestjs/common';
import { PerformanceSetupController } from './performance-setup.controller';
import { PerformanceSetupService } from './performance-setup.service';

@Module({
  controllers: [PerformanceSetupController],
  providers: [PerformanceSetupService],
  exports: [PerformanceSetupService],
})
export class PerformanceSetupModule {}