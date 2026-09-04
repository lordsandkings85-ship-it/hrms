import { Controller, Get, Post, Param, UseGuards, Query } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { NotificationsService } from './notifications.service';

@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private notifications: NotificationsService) {}

  @Get()
  getMine(
    @CurrentUser() user: AuthUser,
    @Query('unreadOnly') unreadOnly?: string,
    @Query('limit') limit?: string,
  ) {
    return this.notifications.getMine(
      { ...user, isSuperAdmin: (user as any).isSuperAdmin },
      { unreadOnly: unreadOnly === 'true', limit: limit ? Number(limit) : undefined },
    );
  }

  @Get('unread-count')
  getUnreadCount(@CurrentUser() user: AuthUser) {
    return this.notifications.getUnreadCount({ ...user, isSuperAdmin: (user as any).isSuperAdmin });
  }

  @Post(':id/read')
  markRead(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.notifications.markRead({ ...user, isSuperAdmin: (user as any).isSuperAdmin }, id);
  }

  @Post(':id/unread')
  markUnread(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.notifications.markUnread({ ...user, isSuperAdmin: (user as any).isSuperAdmin }, id);
  }

  @Post('read-all')
  markAllRead(@CurrentUser() user: AuthUser) {
    return this.notifications.markAllRead({ ...user, isSuperAdmin: (user as any).isSuperAdmin });
  }

  @Post(':id')
  deleteById(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.notifications.deleteById({ ...user, isSuperAdmin: (user as any).isSuperAdmin }, id);
  }
}
