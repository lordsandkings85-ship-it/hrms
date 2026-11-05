import { NotFoundException } from '@nestjs/common';
import { AnnouncementsService } from './announcements.service';

describe('AnnouncementsService', () => {
  let service: AnnouncementsService;
  let prisma: any;

  beforeEach(() => {
    prisma = {
      announcement: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        updateMany: jest.fn(),
        deleteMany: jest.fn(),
      },
      company: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'comp-1' },
          { id: 'comp-2' },
          { id: 'comp-3' },
        ]),
      },
      notification: {
        createMany: jest.fn().mockResolvedValue({ count: 3 }),
        deleteMany: jest.fn().mockResolvedValue({ count: 3 }),
      },
      user: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'admin-1',
          isSuperAdmin: true,
          role: null,
        }),
      },
    };

    service = new AnnouncementsService(prisma);
  });

  describe('create', () => {
    it('creates an announcement once without cloning to other companies', async () => {
      prisma.announcement.findFirst.mockResolvedValue(null);
      prisma.announcement.create.mockResolvedValue({
        id: 'ann-1',
        companyId: 'comp-1',
        title: 'Holiday Notice',
        body: 'Details here',
      });

      const result = await service.create(
        'comp-1',
        { title: 'Holiday Notice', body: 'Details here' },
        'admin-1',
      );

      expect(prisma.announcement.create).toHaveBeenCalledTimes(1);
      expect(prisma.announcement.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          companyId: 'comp-1',
          title: 'Holiday Notice',
          body: 'Details here',
        }),
      });
      expect(result.id).toBe('ann-1');
    });

    it('suppresses duplicate submission if identical announcement was created within 60 seconds', async () => {
      const existing = {
        id: 'ann-existing',
        companyId: 'comp-1',
        title: 'Duplicate Notice',
        body: 'Details',
      };
      prisma.announcement.findFirst.mockResolvedValue(existing);

      const result = await service.create(
        'comp-1',
        { title: 'Duplicate Notice', body: 'Details' },
        'admin-1',
      );

      expect(prisma.announcement.create).not.toHaveBeenCalled();
      expect(result.id).toBe('ann-existing');
    });
  });

  describe('list and listAll deduplication', () => {
    it('deduplicates identical announcements so user never sees duplicates', async () => {
      prisma.announcement.findMany.mockResolvedValue([
        { id: '1', title: 'Diwali Holiday', body: 'Full body content', isPinned: true },
        { id: '2', title: 'Diwali Holiday', body: 'Full body content', isPinned: true },
        { id: '3', title: 'Diwali Holiday', body: 'Full body content', isPinned: false },
        { id: '4', title: 'Policy Update', body: 'Different content', isPinned: false },
      ]);

      const result = await service.list('comp-1', 'admin-1');

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('1');
      expect(result[1].id).toBe('4');
    });
  });

  describe('remove', () => {
    it('removes the announcement and any historical duplicates', async () => {
      prisma.announcement.findFirst.mockResolvedValue({
        id: 'ann-1',
        title: 'Test',
        body: 'Body',
      });
      prisma.announcement.findMany.mockResolvedValue([
        { id: 'ann-1' },
        { id: 'ann-2-clone' },
      ]);

      await service.remove('ann-1', 'comp-1', 'admin-1');

      expect(prisma.announcement.deleteMany).toHaveBeenCalledWith({
        where: { id: { in: ['ann-1', 'ann-2-clone'] } },
      });
      expect(prisma.notification.deleteMany).toHaveBeenCalledWith({
        where: { referenceType: 'ANNOUNCEMENT', referenceId: { in: ['ann-1', 'ann-2-clone'] } },
      });
    });

    it('throws NotFoundException if announcement does not exist', async () => {
      prisma.announcement.findFirst.mockResolvedValue(null);

      await expect(service.remove('missing', 'comp-1', 'admin-1')).rejects.toThrow(NotFoundException);
    });
  });
});

