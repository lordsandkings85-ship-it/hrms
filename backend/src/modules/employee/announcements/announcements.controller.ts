import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { Permissions } from '../../../common/decorators/permissions.decorator';
import { CurrentUser, AuthUser } from '../../../common/decorators/current-user.decorator';
import { AnnouncementsService } from './announcements.service';

@UseGuards(JwtAuthGuard)
@Controller('announcements')
export class AnnouncementsController {
  constructor(private service: AnnouncementsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.service.list(user.companyId);
  }

  @UseGuards(PermissionsGuard)
  @Permissions({ module: 'announcements', action: 'create' })
  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @Body() body: { title: string; body: string; category?: string; author?: string; isPinned?: boolean },
  ) {
    return this.service.create(user.companyId, { ...body, author: body.author || user.email || 'HR Team' });
  }

  @UseGuards(PermissionsGuard)
  @Permissions({ module: 'announcements', action: 'edit' })
  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: { title?: string; body?: string; category?: string; isPinned?: boolean; isActive?: boolean },
  ) {
    return this.service.update(id, user.companyId, body);
  }

  @UseGuards(PermissionsGuard)
  @Permissions({ module: 'announcements', action: 'delete' })
  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.remove(id, user.companyId);
  }
}
