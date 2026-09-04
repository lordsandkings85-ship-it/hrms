import { Global, Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { MilestoneAnnouncementsService } from './milestone-announcements.service';

@Global()
@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService, MilestoneAnnouncementsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
