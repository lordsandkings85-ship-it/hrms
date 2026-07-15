import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { SuperAdminGuard } from '../../common/guards/super-admin.guard';
import { SuperAdminService } from './super-admin.service';

@UseGuards(JwtAuthGuard, SuperAdminGuard)
@Controller('super-admin')
export class SuperAdminController {
  constructor(private service: SuperAdminService) {}

  @Get('tenants')
  listTenants() { return this.service.listTenants(); }

  @Get('health')
  health() { return this.service.systemHealth(); }

  @Get('audit-logs')
  auditLogs(@Query('companyId') companyId?: string) { return this.service.auditLogs(companyId); }

  @Get('seed-existing')
  seedExisting() { return this.service.seedExisting(); }

  @Post('tenants/provision')
  provisionTenant(@Body() body: any) {
    return this.service.provisionTenant(body);
  }
}
