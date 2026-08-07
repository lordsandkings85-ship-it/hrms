import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class PerformanceSetupService {
  constructor(private prisma: PrismaService) {}

  async getKpas(companyId: string) {
    return this.prisma.kPA.findMany({
      where: { companyId },
      orderBy: { createdAt: 'asc' },
      include: { kras: true },
    });
  }

  async createKpa(companyId: string, data: { name: string; weight: string; description?: string }) {
    return this.prisma.kPA.create({
      data: { companyId, ...data },
    });
  }

  async updateKpa(id: string, data: Partial<{ name: string; weight: string; description?: string }>) {
    return this.prisma.kPA.update({ where: { id }, data });
  }

  async deleteKpa(id: string) {
    return this.prisma.kPA.delete({ where: { id } });
  }

  async getKras(companyId: string, kpaId?: string) {
    return this.prisma.kRA.findMany({
      where: { companyId, ...(kpaId ? { kpaId } : {}) },
      orderBy: { createdAt: 'asc' },
      include: { kpis: true },
    });
  }

  async createKra(companyId: string, data: { kpaId: string; name: string; description?: string; weight: string }) {
    return this.prisma.kRA.create({ data: { companyId, ...data } });
  }

  async updateKra(id: string, data: Partial<{ name: string; description?: string; weight: string }>) {
    return this.prisma.kRA.update({ where: { id }, data });
  }

  async deleteKra(id: string) {
    return this.prisma.kRA.delete({ where: { id } });
  }

  async getKpis(companyId: string, kraId?: string) {
    return this.prisma.kPI.findMany({
      where: { companyId, ...(kraId ? { kraId } : {}) },
      orderBy: { createdAt: 'asc' },
      include: { assignments: true, targets: true },
    });
  }

  async createKpi(companyId: string, data: { kraId: string; name: string; category: string; unit: string; weight: string }) {
    return this.prisma.kPI.create({ data: { companyId, ...data } });
  }

  async updateKpi(id: string, data: Partial<{ name: string; category: string; unit: string; weight: string }>) {
    return this.prisma.kPI.update({ where: { id }, data });
  }

  async deleteKpi(id: string) {
    return this.prisma.kPI.delete({ where: { id } });
  }

  async getKpiAssignments(companyId: string, employeeId?: string) {
    return this.prisma.kPIAssignment.findMany({
      where: { companyId, ...(employeeId ? { employeeId } : {}) },
      include: { kpi: true, employee: { select: { firstName: true, lastName: true } } },
    });
  }

  async createKpiAssignment(companyId: string, data: { employeeId: string; kpiId: string; weight: string }) {
    return this.prisma.kPIAssignment.create({ data: { companyId, ...data } });
  }

  async updateKpiAssignment(id: string, data: { weight: string }) {
    return this.prisma.kPIAssignment.update({ where: { id }, data });
  }

  async deleteKpiAssignment(id: string) {
    return this.prisma.kPIAssignment.delete({ where: { id } });
  }

  async getKpiTargets(companyId: string, employeeId?: string) {
    return this.prisma.kPITarget.findMany({
      where: { companyId, ...(employeeId ? { employeeId } : {}) },
      include: { kpi: true, employee: { select: { firstName: true, lastName: true } } },
    });
  }

  async createKpiTarget(companyId: string, data: { employeeId: string; kpiId: string; period: string; target: string; type: 'annual' | 'periodic' }) {
    return this.prisma.kPITarget.create({ data: { companyId, ...data } });
  }

  async updateKpiTarget(id: string, data: { target: string }) {
    return this.prisma.kPITarget.update({ where: { id }, data });
  }

  async deleteKpiTarget(id: string) {
    return this.prisma.kPITarget.delete({ where: { id } });
  }

  async getEvaluationSetups(companyId: string, employeeId?: string) {
    return this.prisma.evaluationSetup.findMany({
      where: { companyId, ...(employeeId ? { employeeId } : {}) },
      include: { employee: { select: { firstName: true, lastName: true } } },
    });
  }

  async upsertEvaluationSetup(companyId: string, employeeId: string, type: 'peer' | 'external', reviewers: any[]) {
    return this.prisma.evaluationSetup.upsert({
      where: { employeeId_type: { employeeId, type } },
      update: { reviewers, companyId },
      create: { companyId, employeeId, type, reviewers },
    });
  }

  async deleteEvaluationSetup(id: string) {
    return this.prisma.evaluationSetup.delete({ where: { id } });
  }

  async getEvaluation360(companyId: string, employeeId?: string) {
    return this.prisma.evaluation360.findMany({
      where: { companyId, ...(employeeId ? { employeeId } : {}) },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createEvaluation360(companyId: string, data: { employeeId: string; cycle: string; avgScore: number; rating: string }) {
    return this.prisma.evaluation360.create({ data: { companyId, ...data } });
  }
}