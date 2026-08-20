import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class AnnouncementsService {
  constructor(private prisma: PrismaService) {}

  list(companyId: string) {
    return this.prisma.announcement.findMany({
      where: { companyId, isActive: true },
      orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
    });
  }

  listAll(companyId: string) {
    return this.prisma.announcement.findMany({
      where: { companyId },
      orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
    });
  }

  create(companyId: string, data: { title: string; body: string; category?: string; author?: string; isPinned?: boolean }) {
    return this.prisma.announcement.create({
      data: {
        companyId,
        title: data.title,
        body: data.body,
        category: data.category || 'Company',
        author: data.author || 'HR Team',
        isPinned: data.isPinned || false,
      },
    });
  }

  async update(id: string, companyId: string, data: { title?: string; body?: string; category?: string; isPinned?: boolean; isActive?: boolean }) {
    const existing = await this.prisma.announcement.findFirst({ where: { id, companyId } });
    if (!existing) throw new NotFoundException('Announcement not found');
    return this.prisma.announcement.update({ where: { id }, data });
  }

  async remove(id: string, companyId: string) {
    const existing = await this.prisma.announcement.findFirst({ where: { id, companyId } });
    if (!existing) throw new NotFoundException('Announcement not found');
    return this.prisma.announcement.delete({ where: { id } });
  }
}
