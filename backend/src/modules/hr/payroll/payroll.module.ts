import { Module } from '@nestjs/common';
import { PayrollController } from './payroll.controller';
import { PayrollService } from './payroll.service';
import { MailModule } from '../../../common/mail/mail.module';

@Module({
  imports: [MailModule],
  controllers: [PayrollController],
  providers: [PayrollService],
})
export class PayrollModule {}