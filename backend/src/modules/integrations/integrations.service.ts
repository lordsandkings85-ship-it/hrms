import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

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
}
