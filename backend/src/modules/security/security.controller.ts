import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CompanyScopeGuard } from '../../common/guards/company-scope.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { SecurityService } from './security.service';
import { DeviceReportDto } from './dto/device-context.dto';
import {
  SecurityReasonDto,
  TrustDeviceDto,
  UpdateSecurityPolicyDto,
} from './dto/security-actions.dto';

@Controller('security')
export class SecurityController {
  constructor(private security: SecurityService) {}

  /**
   * Public, heavily throttled: the desktop app calls this when startup
   * validation blocks an unsupported machine, i.e. before any login exists.
   */
  @Post('device-report')
  @HttpCode(202)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  report(@Body() dto: DeviceReportDto, @Req() req: Request) {
    return this.security.reportStartup(dto, req);
  }

  @UseGuards(JwtAuthGuard, CompanyScopeGuard, PermissionsGuard)
  @Get('policy')
  @Permissions({ module: 'security', action: 'view' })
  getPolicy(@CurrentUser() user: AuthUser) {
    return this.security.getPolicy(user.companyId);
  }

  @UseGuards(JwtAuthGuard, CompanyScopeGuard, PermissionsGuard)
  @Patch('policy')
  @Permissions({ module: 'security', action: 'edit' })
  updatePolicy(@CurrentUser() user: AuthUser, @Body() dto: UpdateSecurityPolicyDto) {
    return this.security.updatePolicy(user, dto);
  }

  @UseGuards(JwtAuthGuard, CompanyScopeGuard, PermissionsGuard)
  @Get('blocked-users')
  @Permissions({ module: 'security', action: 'view' })
  blockedUsers(@CurrentUser() user: AuthUser) {
    return this.security.listBlockedUsers(user);
  }

  @UseGuards(JwtAuthGuard, CompanyScopeGuard, PermissionsGuard)
  @Get('events')
  @Permissions({ module: 'security', action: 'view' })
  events(
    @CurrentUser() user: AuthUser,
    @Query('type') type?: string,
    @Query('userId') userId?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('companyId') companyId?: string,
  ) {
    return this.security.listEvents(user, { type, userId, limit, offset, companyId });
  }

  @UseGuards(JwtAuthGuard, CompanyScopeGuard, PermissionsGuard)
  @Get('sessions')
  @Permissions({ module: 'security', action: 'view' })
  sessions(
    @CurrentUser() user: AuthUser,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.security.listSessions(user, {
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    });
  }

  @UseGuards(JwtAuthGuard, CompanyScopeGuard, PermissionsGuard)
  @Post('sessions/:id/revoke')
  @HttpCode(200)
  @Permissions({ module: 'security', action: 'edit' })
  revokeSession(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.security.revokeSession(user, id);
  }

  @UseGuards(JwtAuthGuard, CompanyScopeGuard, PermissionsGuard)
  @Get('summary')
  @Permissions({ module: 'security', action: 'view' })
  async summary(@CurrentUser() user: AuthUser) {
    const [policy, blocked, events] = await Promise.all([
      this.security.getPolicy(user.companyId),
      this.security.listBlockedUsers(user),
      this.security.listEvents(user, { limit: '25' }),
    ]);
    return {
      policy,
      blockedUsers: blocked,
      recentEvents: events,
    };
  }

  @UseGuards(JwtAuthGuard, CompanyScopeGuard, PermissionsGuard)
  @Post('users/:userId/block')
  @HttpCode(200)
  @Permissions({ module: 'security', action: 'edit' })
  block(@CurrentUser() user: AuthUser, @Param('userId') userId: string, @Body() dto: SecurityReasonDto) {
    return this.security.blockUser(user, userId, dto.reason);
  }

  @UseGuards(JwtAuthGuard, CompanyScopeGuard, PermissionsGuard)
  @Post('users/:userId/unblock')
  @HttpCode(200)
  @Permissions({ module: 'security', action: 'edit' })
  unblock(@CurrentUser() user: AuthUser, @Param('userId') userId: string, @Body() dto: SecurityReasonDto) {
    return this.security.unblockUser(user, userId, dto.reason);
  }

  @UseGuards(JwtAuthGuard, CompanyScopeGuard, PermissionsGuard)
  @Get('devices')
  @Permissions({ module: 'security', action: 'view' })
  devices(@CurrentUser() user: AuthUser) {
    return this.security.listDevices(user);
  }

  @UseGuards(JwtAuthGuard, CompanyScopeGuard, PermissionsGuard)
  @Post('devices')
  @Permissions({ module: 'security', action: 'edit' })
  trustDevice(@CurrentUser() user: AuthUser, @Body() dto: TrustDeviceDto) {
    return this.security.trustDevice(user, dto);
  }

  @UseGuards(JwtAuthGuard, CompanyScopeGuard, PermissionsGuard)
  @Delete('devices/:id')
  @Permissions({ module: 'security', action: 'edit' })
  revokeDevice(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.security.revokeDevice(user, id);
  }
}
