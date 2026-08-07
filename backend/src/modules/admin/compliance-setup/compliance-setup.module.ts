import { Module } from '@nestjs/common';
import { ComplianceSetupController } from './compliance-setup.controller';
import { ComplianceSetupService } from './compliance-setup.service';

@Module({
  controllers: [ComplianceSetupController],
  providers: [ComplianceSetupService],
  exports: [ComplianceSetupService],
})
export class ComplianceSetupModule {}