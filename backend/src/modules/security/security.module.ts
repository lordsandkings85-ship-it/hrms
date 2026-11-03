import { Module } from '@nestjs/common';
import { SecurityController } from './security.controller';
import { SecurityService } from './security.service';
import { DeviceRiskService } from './device-risk.service';

@Module({
  controllers: [SecurityController],
  providers: [SecurityService, DeviceRiskService],
  exports: [SecurityService, DeviceRiskService],
})
export class SecurityModule {}
