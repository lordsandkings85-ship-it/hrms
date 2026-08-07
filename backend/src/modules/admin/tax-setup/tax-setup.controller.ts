import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CompanyScopeGuard } from '../../../common/guards/company-scope.guard';
import { CurrentUser, AuthUser } from '../../../common/decorators/current-user.decorator';
import { TaxSetupService } from './tax-setup.service';

@UseGuards(JwtAuthGuard, CompanyScopeGuard)
@Controller('tax-setup')
export class TaxSetupController {
  constructor(private service: TaxSetupService) {}

  @Get('slabs')
  listSlabs(@CurrentUser() user: AuthUser) {
    return this.service.getTDSSLabs(user.companyId);
  }

  @Post('slabs')
  createSlab(@CurrentUser() user: AuthUser, @Body() body: { regime: string; fromAmount: number; toAmount: number; rate: string }) {
    return this.service.createTDSSlab(user.companyId, body);
  }

  @Put('slabs/:id')
  updateSlab(@Param('id') id: string, @Body() body: { regime?: string; fromAmount?: number; toAmount?: number; rate?: string }) {
    return this.service.updateTDSSlab(id, body);
  }

  @Delete('slabs/:id')
  deleteSlab(@Param('id') id: string) {
    return this.service.deleteTDSSlab(id);
  }

  @Get('sections')
  listSections(@CurrentUser() user: AuthUser) {
    return this.service.getTDSSections(user.companyId);
  }

  @Post('sections')
  createSection(@CurrentUser() user: AuthUser, @Body() body: { section: string; name: string; limit: string }) {
    return this.service.createTDSSection(user.companyId, body);
  }

  @Put('sections/:id')
  updateSection(@Param('id') id: string, @Body() body: { section?: string; name?: string; limit?: string }) {
    return this.service.updateTDSSection(id, body);
  }

  @Delete('sections/:id')
  deleteSection(@Param('id') id: string) {
    return this.service.deleteTDSSection(id);
  }

  @Get('income-slab-categories')
  listCategories(@CurrentUser() user: AuthUser) {
    return this.service.getIncomeSlabCategories(user.companyId);
  }

  @Post('income-slab-categories')
  createCategory(@CurrentUser() user: AuthUser, @Body() body: { category: string; applicability: string; regime: string }) {
    return this.service.createIncomeSlabCategory(user.companyId, body);
  }

  @Put('income-slab-categories/:id')
  updateCategory(@Param('id') id: string, @Body() body: { category?: string; applicability?: string; regime?: string }) {
    return this.service.updateIncomeSlabCategory(id, body);
  }

  @Delete('income-slab-categories/:id')
  deleteCategory(@Param('id') id: string) {
    return this.service.deleteIncomeSlabCategory(id);
  }
}