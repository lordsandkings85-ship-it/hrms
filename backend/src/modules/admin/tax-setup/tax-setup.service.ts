import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class TaxSetupService {
  constructor(private prisma: PrismaService) {}

  async getTDSSLabs(companyId: string) {
    return this.prisma.tDSSlab.findMany({ where: { companyId }, orderBy: { createdAt: 'asc' } });
  }

  async createTDSSlab(companyId: string, data: { regime: string; fromAmount: number; toAmount: number; rate: string }) {
    return this.prisma.tDSSlab.create({ data: { companyId, ...data } });
  }

  async updateTDSSlab(id: string, data: Partial<{ regime: string; fromAmount: number; toAmount: number; rate: string }>) {
    return this.prisma.tDSSlab.update({ where: { id }, data });
  }

  async deleteTDSSlab(id: string) {
    return this.prisma.tDSSlab.delete({ where: { id } });
  }

  async getTDSSections(companyId: string) {
    return this.prisma.tDSSection.findMany({ where: { companyId }, orderBy: { createdAt: 'asc' } });
  }

  async createTDSSection(companyId: string, data: { section: string; name: string; limit: string }) {
    return this.prisma.tDSSection.create({ data: { companyId, ...data } });
  }

  async updateTDSSection(id: string, data: Partial<{ section: string; name: string; limit: string }>) {
    return this.prisma.tDSSection.update({ where: { id }, data });
  }

  async deleteTDSSection(id: string) {
    return this.prisma.tDSSection.delete({ where: { id } });
  }

  async getIncomeSlabCategories(companyId: string) {
    return this.prisma.incomeSlabCategory.findMany({ where: { companyId }, orderBy: { createdAt: 'asc' } });
  }

  async createIncomeSlabCategory(companyId: string, data: { category: string; applicability: string; regime: string }) {
    return this.prisma.incomeSlabCategory.create({ data: { companyId, ...data } });
  }

  async updateIncomeSlabCategory(id: string, data: Partial<{ category: string; applicability: string; regime: string }>) {
    return this.prisma.incomeSlabCategory.update({ where: { id }, data });
  }

  async deleteIncomeSlabCategory(id: string) {
    return this.prisma.incomeSlabCategory.delete({ where: { id } });
  }
}