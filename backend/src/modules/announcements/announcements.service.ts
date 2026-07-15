import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AnnouncementsService {
  constructor(private prisma: PrismaService) {}
  list(companyId: string) {
    return this.prisma.announcement.findMany({ where: { companyId }, orderBy: { createdAt: 'desc' } });
  }
  create(companyId: string, title: string, body: string) {
    return this.prisma.announcement.create({ data: { companyId, title, body } });
  }
}
