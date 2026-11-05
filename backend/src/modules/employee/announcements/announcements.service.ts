import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { isGroupWideUser } from '../../../utils/group-access.util';

@Injectable()
export class AnnouncementsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Deduplicates a list of announcements by title and trimmed body
   * to guarantee that duplicate copies never reach the client.
   */
  private deduplicate(list: any[]): any[] {
    const seen = new Set<string>();
    return list.filter((item) => {
      const key = `${item.title?.trim().toLowerCase()}:::${item.body?.trim().slice(0, 100).toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  async list(companyId: string, userId?: string) {
    const raw = await this.prisma.announcement.findMany({
      where: { isActive: true },
      orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
    });
    return this.deduplicate(raw);
  }

  async listAll(companyId: string, userId?: string) {
    const raw = await this.prisma.announcement.findMany({
      orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
    });
    return this.deduplicate(raw);
  }

  async create(
    companyId: string,
    data: { title: string; body: string; category?: string; author?: string; isPinned?: boolean },
    userId?: string,
  ) {
    const title = data.title?.trim();
    const body = data.body?.trim();
    const category = data.category || 'Company';
    const author = data.author || 'HR Team';
    const isPinned = data.isPinned || false;

    // 1. Idempotency / duplicate suppression:
    // If an announcement with identical title and body was created in the last 60 seconds, return it
    const recentDuplicate = await this.prisma.announcement.findFirst({
      where: {
        title,
        body,
        createdAt: { gte: new Date(Date.now() - 60_000) },
      },
    });
    if (recentDuplicate) {
      return recentDuplicate;
    }

    // 2. Create the announcement exactly ONCE (no cloning across companies)
    const primary = await this.prisma.announcement.create({
      data: {
        companyId,
        title,
        body,
        category,
        author,
        isPinned,
      },
    });

    // 3. Broadcast in-app notification to all companies so employees receive a bell alert
    try {
      const groupWide = userId ? await isGroupWideUser(this.prisma, userId) : false;
      const companies = await this.prisma.company.findMany({ select: { id: true } });
      const summaryMsg = body.length > 150 ? body.slice(0, 150) + '...' : body;
      const targetCompanies = groupWide ? companies : [{ id: companyId }];

      await this.prisma.notification.createMany({
        data: targetCompanies.map((c) => ({
          companyId: c.id,
          type: 'ANNOUNCEMENT',
          title,
          message: summaryMsg,
          priority: isPinned ? 'high' : 'normal',
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

    // Also update any historical duplicate sibling rows with identical title/body
    const duplicates = await this.prisma.announcement.findMany({
      where: {
        title: existing.title,
        body: existing.body,
      },
      select: { id: true },
    });
    const ids = duplicates.map((d) => d.id);
    if (!ids.includes(id)) ids.push(id);

    await this.prisma.announcement.updateMany({
      where: { id: { in: ids } },
      data,
    });

    return this.prisma.announcement.findUnique({ where: { id } });
  }

  async remove(id: string, companyId: string, userId?: string) {
    const groupWide = userId ? await isGroupWideUser(this.prisma, userId) : false;
    const existing = await this.prisma.announcement.findFirst({
      where: groupWide ? { id } : { id, companyId },
    });
    if (!existing) throw new NotFoundException('Announcement not found');

    // Also remove any historical duplicate sibling rows
    const duplicates = await this.prisma.announcement.findMany({
      where: {
        title: existing.title,
        body: existing.body,
      },
      select: { id: true },
    });
    const ids = duplicates.map((d) => d.id);
    if (!ids.includes(id)) ids.push(id);

    // Remove matching notifications
    await this.prisma.notification.deleteMany({
      where: { referenceType: 'ANNOUNCEMENT', referenceId: { in: ids } },
    }).catch(() => {});

    await this.prisma.announcement.deleteMany({ where: { id: { in: ids } } });
    return existing;
  }
}
