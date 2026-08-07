import { Module } from '@nestjs/common';
import { TaxSetupController } from './tax-setup.controller';
import { TaxSetupService } from './tax-setup.service';

@Module({
  controllers: [TaxSetupController],
  providers: [TaxSetupService],
  exports: [TaxSetupService],
})
export class TaxSetupModule {}