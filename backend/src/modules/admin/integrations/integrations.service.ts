import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class IntegrationsService {
  constructor(private prisma: PrismaService) {}
  list(companyId: string) {
    return this.prisma.integration.findMany({ where: { companyId } });
  }
  connect(companyId: string, provider: string, config?: any) {
    return this.prisma.integration.create({ data: { companyId, provider, status: 'connected', config } });
  }
  disconnect(id: string) {
    return this.prisma.integration.update({ where: { id }, data: { status: 'disconnected' } });
  }

  async getGoogleConfig(companyId: string) {
    const row = await this.prisma.integration.findUnique({
      where: { companyId_provider: { companyId, provider: 'google' } },
    });
    return row?.config ?? null;
  }

  async updateGoogleConfig(companyId: string, config: any) {
    return this.prisma.integration.upsert({
      where: { companyId_provider: { companyId, provider: 'google' } },
      update: { status: 'connected', config },
      create: { companyId, provider: 'google', status: 'connected', config },
    });
  }

  async getConfig(companyId: string, provider: string) {
    const row = await this.prisma.integration.findUnique({
      where: { companyId_provider: { companyId, provider } },
    });
    return row?.config ?? null;
  }

  async updateConfig(companyId: string, provider: string, config: any) {
    return this.prisma.integration.upsert({
      where: { companyId_provider: { companyId, provider } },
      update: { status: 'connected', config },
      create: { companyId, provider, status: 'connected', config },
    });
  }
}

