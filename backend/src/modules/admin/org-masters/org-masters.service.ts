import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class OrgMastersService {
  constructor(private prisma: PrismaService) {}

  async getHRMasters(companyId: string) {
    return this.prisma.hRMaster.findMany({ where: { companyId }, orderBy: { createdAt: 'asc' } });
  }

  async createHRMaster(companyId: string, data: { master: string; value: string }) {
    return this.prisma.hRMaster.create({ data: { companyId, ...data } });
  }

  async updateHRMaster(id: string, data: Partial<{ master: string; value: string }>) {
    return this.prisma.hRMaster.update({ where: { id }, data });
  }

  async deleteHRMaster(id: string) {
    return this.prisma.hRMaster.delete({ where: { id } });
  }

  async getImportMappings(companyId: string) {
    return this.prisma.importMapping.findMany({ where: { companyId }, orderBy: { createdAt: 'asc' } });
  }

  async createImportMapping(companyId: string, data: { employee: string; manager: string; email: string }) {
    return this.prisma.importMapping.create({ data: { companyId, ...data } });
  }

  async updateImportMapping(id: string, data: Partial<{ employee: string; manager: string; email: string }>) {
    return this.prisma.importMapping.update({ where: { id }, data });
  }

  async deleteImportMapping(id: string) {
    return this.prisma.importMapping.delete({ where: { id } });
  }

  async getHRForms(companyId: string) {
    return this.prisma.hRForm.findMany({ where: { companyId }, orderBy: { createdAt: 'asc' } });
  }

  async createHRForm(companyId: string, data: { formName: string; category: string }) {
    return this.prisma.hRForm.create({ data: { companyId, ...data } });
  }

  async updateHRForm(id: string, data: Partial<{ formName: string; category: string }>) {
    return this.prisma.hRForm.update({ where: { id }, data });
  }

  async deleteHRForm(id: string) {
    return this.prisma.hRForm.delete({ where: { id } });
  }
}