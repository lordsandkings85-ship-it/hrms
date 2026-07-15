import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { BillingService } from './billing.service';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('billing')
export class BillingController {
  constructor(private service: BillingService) {}
  @Get('subscription') getSubscription(@CurrentUser() user: AuthUser) { return this.service.getSubscription(user.companyId); }
  @Get('invoices') listInvoices(@CurrentUser() user: AuthUser) { return this.service.listInvoices(user.companyId); }
  @Post('upgrade')
  @Permissions({ module: 'billing', action: 'edit' })
  upgrade(@CurrentUser() user: AuthUser, @Body('planName') planName: string) {
    return this.service.upgradePlan(user.companyId, planName);
  }

  // NOTE: In production, this would be a Cron Job or behind SuperAdminGuard
  @Post('generate-invoices')
  generateInvoices() {
    return this.service.generateMonthlyInvoices();
  }
}
