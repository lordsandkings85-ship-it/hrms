import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class ComplianceSetupService {
  constructor(private prisma: PrismaService) {}

  async getProfessionalTaxSlabs(companyId: string) {
    return this.prisma.professionalTaxSlab.findMany({
      where: { companyId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async createProfessionalTaxSlab(companyId: string, data: { state: string; fromAmount: number; toAmount: number; amount: number }) {
    return this.prisma.professionalTaxSlab.create({ data: { companyId, ...data } });
  }

  async updateProfessionalTaxSlab(id: string, data: Partial<{ state: string; fromAmount: number; toAmount: number; amount: number }>) {
    return this.prisma.professionalTaxSlab.update({ where: { id }, data });
  }

  async deleteProfessionalTaxSlab(id: string) {
    return this.prisma.professionalTaxSlab.delete({ where: { id } });
  }

  async getPFConfigs(companyId: string) {
    return this.prisma.pFConfig.findMany({ where: { companyId }, orderBy: { createdAt: 'asc' } });
  }

  async createPFConfig(companyId: string, data: { component: string; rate: string; cap: string }) {
    return this.prisma.pFConfig.create({ data: { companyId, ...data } });
  }

  async updatePFConfig(id: string, data: Partial<{ component: string; rate: string; cap: string }>) {
    return this.prisma.pFConfig.update({ where: { id }, data });
  }

  async deletePFConfig(id: string) {
    return this.prisma.pFConfig.delete({ where: { id } });
  }

  async getESICConfigs(companyId: string) {
    return this.prisma.eSICConfig.findMany({ where: { companyId }, orderBy: { createdAt: 'asc' } });
  }

  async createESICConfig(companyId: string, data: { component: string; rate: string; wageLimit: string }) {
    return this.prisma.eSICConfig.create({ data: { companyId, ...data } });
  }

  async updateESICConfig(id: string, data: Partial<{ component: string; rate: string; wageLimit: string }>) {
    return this.prisma.eSICConfig.update({ where: { id }, data });
  }

  async deleteESICConfig(id: string) {
    return this.prisma.eSICConfig.delete({ where: { id } });
  }

  async getLWFConfigs(companyId: string) {
    return this.prisma.lWFConfig.findMany({ where: { companyId }, orderBy: { createdAt: 'asc' } });
  }

  async createLWFConfig(companyId: string, data: { state: string; employeeShare: number; employerShare: number }) {
    return this.prisma.lWFConfig.create({ data: { companyId, ...data } });
  }

  async updateLWFConfig(id: string, data: Partial<{ state: string; employeeShare: number; employerShare: number }>) {
    return this.prisma.lWFConfig.update({ where: { id }, data });
  }

  async deleteLWFConfig(id: string) {
    return this.prisma.lWFConfig.delete({ where: { id } });
  }

  async getComplianceForms(companyId: string) {
    return this.prisma.complianceForm.findMany({ where: { companyId }, orderBy: { createdAt: 'asc' } });
  }

  async createComplianceForm(companyId: string, data: { formName: string; category: string }) {
    return this.prisma.complianceForm.create({ data: { companyId, ...data } });
  }

  async updateComplianceForm(id: string, data: Partial<{ formName: string; category: string }>) {
    return this.prisma.complianceForm.update({ where: { id }, data });
  }

  async deleteComplianceForm(id: string) {
    return this.prisma.complianceForm.delete({ where: { id } });
  }
}