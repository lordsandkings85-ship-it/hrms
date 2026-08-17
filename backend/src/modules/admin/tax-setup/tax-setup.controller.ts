import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CompanyScopeGuard } from '../../../common/guards/company-scope.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { Permissions } from '../../../common/decorators/permissions.decorator';
import { CurrentUser, AuthUser } from '../../../common/decorators/current-user.decorator';
import { TaxSetupService } from './tax-setup.service';

@UseGuards(JwtAuthGuard, CompanyScopeGuard, PermissionsGuard)
@Controller('tax-setup')
export class TaxSetupController {
  constructor(private service: TaxSetupService) {}

  @Get('slabs')
  @Permissions({ module: 'tax-setup', action: 'view' })
  listSlabs(@CurrentUser() user: AuthUser) {
    return this.service.getTDSSLabs(user.companyId);
  }

  @Post('slabs')
  @Permissions({ module: 'tax-setup', action: 'edit' })
  createSlab(@CurrentUser() user: AuthUser, @Body() body: { regime: string; fromAmount: number; toAmount: number; rate: string }) {
    return this.service.createTDSSlab(user.companyId, body);
  }

  @Put('slabs/:id')
  @Permissions({ module: 'tax-setup', action: 'edit' })
  updateSlab(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: { regime?: string; fromAmount?: number; toAmount?: number; rate?: string }) {
    return this.service.updateTDSSlab(id, body);
  }

  @Delete('slabs/:id')
  @Permissions({ module: 'tax-setup', action: 'edit' })
  deleteSlab(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.deleteTDSSlab(id);
  }

  @Get('sections')
  @Permissions({ module: 'tax-setup', action: 'view' })
  listSections(@CurrentUser() user: AuthUser) {
    return this.service.getTDSSections(user.companyId);
  }

  @Post('sections')
  @Permissions({ module: 'tax-setup', action: 'edit' })
  createSection(@CurrentUser() user: AuthUser, @Body() body: { section: string; name: string; limit: string }) {
    return this.service.createTDSSection(user.companyId, body);
  }

  @Put('sections/:id')
  @Permissions({ module: 'tax-setup', action: 'edit' })
  updateSection(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: { section?: string; name?: string; limit?: string }) {
    return this.service.updateTDSSection(id, body);
  }

  @Delete('sections/:id')
  @Permissions({ module: 'tax-setup', action: 'edit' })
  deleteSection(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.deleteTDSSection(id);
  }

  @Get('income-slab-categories')
  @Permissions({ module: 'tax-setup', action: 'view' })
  listCategories(@CurrentUser() user: AuthUser) {
    return this.service.getIncomeSlabCategories(user.companyId);
  }

  @Post('income-slab-categories')
  @Permissions({ module: 'tax-setup', action: 'edit' })
  createCategory(@CurrentUser() user: AuthUser, @Body() body: { category: string; applicability: string; regime: string }) {
    return this.service.createIncomeSlabCategory(user.companyId, body);
  }

  @Put('income-slab-categories/:id')
  @Permissions({ module: 'tax-setup', action: 'edit' })
  updateCategory(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: { category?: string; applicability?: string; regime?: string }) {
    return this.service.updateIncomeSlabCategory(id, body);
  }

  @Delete('income-slab-categories/:id')
  @Permissions({ module: 'tax-setup', action: 'edit' })
  deleteCategory(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.deleteIncomeSlabCategory(id);
  }
}