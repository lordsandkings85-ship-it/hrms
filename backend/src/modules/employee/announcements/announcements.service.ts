import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { isGroupWideUser } from '../../../utils/group-access.util';

@Injectable()
export class AnnouncementsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Tenant boundary for reads: normal users only see their own company's
   * announcements. Group-wide administrators still see the whole group.
   */
  private async companyFilter(companyId: string, userId?: string): Promise<{ companyId?: string }> {
    const groupWide = userId ? await isGroupWideUser(this.prisma, userId) : false;
    return groupWide ? {} : { companyId };
  }

  async list(companyId: string, userId?: string) {
    return this.prisma.announcement.findMany({
      where: { ...(await this.companyFilter(companyId, userId)), isActive: true },
      orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async listAll(companyId: string, userId?: string) {
    return this.prisma.announcement.findMany({
      where: await this.companyFilter(companyId, userId),
      orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async create(
    companyId: string,
    data: { title: string; body: string; category?: string; author?: string; isPinned?: boolean },
    userId?: string,
  ) {
    const groupWide = userId ? await isGroupWideUser(this.prisma, userId) : false;
    const companies = await this.prisma.company.findMany({ select: { id: true } });

    // Primary announcement for the active company
    const primary = await this.prisma.announcement.create({
      data: {
        companyId,
        title: data.title,
        body: data.body,
        category: data.category || 'Company',
        author: data.author || 'HR Team',
        isPinned: data.isPinned || false,
      },
    });

    // If group-wide / multi-company, clone announcement to other entities in the group so all company scopes have it
    if (groupWide && companies.length > 1) {
      for (const comp of companies) {
        if (comp.id === companyId) continue;
        await this.prisma.announcement.create({
          data: {
            companyId: comp.id,
            title: data.title,
            body: data.body,
            category: data.category || 'Company',
            author: data.author || 'HR Team',
            isPinned: data.isPinned || false,
          },
        }).catch(() => {});
      }
    }

    // Broadcast in-app notification to all companies so employees receive a bell alert
    try {
      const summaryMsg = data.body?.length > 150 ? data.body.slice(0, 150) + '...' : data.body;
      const targetCompanies = groupWide ? companies : [{ id: companyId }];

      await this.prisma.notification.createMany({
        data: targetCompanies.map((c) => ({
          companyId: c.id,
          type: 'ANNOUNCEMENT',
          title: data.title,
          message: summaryMsg,
          priority: data.isPinned ? 'high' : 'normal',
          audience: 'COMPANY',
          referenceType: 'ANNOUNCEMENT',
          referenceId: primary.id,
        })),
      });
    } catch (e) {
      console.error('Failed to create announcement notifications:', e);
    }

    return primary;
  }

  async update(
    id: string,
    companyId: string,
    data: { title?: string; body?: string; category?: string; isPinned?: boolean; isActive?: boolean },
    userId?: string,
  ) {
    const groupWide = userId ? await isGroupWideUser(this.prisma, userId) : false;
    const existing = await this.prisma.announcement.findFirst({
      where: groupWide ? { id } : { id, companyId },
    });
    if (!existing) throw new NotFoundException('Announcement not found');
    return this.prisma.announcement.update({ where: { id }, data });
  }

  async remove(id: string, companyId: string, userId?: string) {
    const groupWide = userId ? await isGroupWideUser(this.prisma, userId) : false;
    const existing = await this.prisma.announcement.findFirst({
      where: groupWide ? { id } : { id, companyId },
    });
    if (!existing) throw new NotFoundException('Announcement not found');

    // Also remove matching notifications
    await this.prisma.notification.deleteMany({
      where: { referenceType: 'ANNOUNCEMENT', referenceId: id },
    }).catch(() => {});

    return this.prisma.announcement.delete({ where: { id } });
  }
}
