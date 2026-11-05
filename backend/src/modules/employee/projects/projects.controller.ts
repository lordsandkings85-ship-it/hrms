import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../../../common/decorators/current-user.decorator';
import { ProjectsService } from './projects.service';

@UseGuards(JwtAuthGuard)
@Controller('projects')
export class ProjectsController {
  constructor(private service: ProjectsService) {}
  @Get() list(@CurrentUser() user: AuthUser) { return this.service.list(user.companyId); }
  @Post() create(@CurrentUser() user: AuthUser, @Body('name') name: string) { return this.service.create(user.companyId, name); }
  @Post(':id/tasks') addTask(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body('title') title: string) {
    return this.service.addTask(id, user.companyId, title, user.userId);
  }
  @Post('tasks/:taskId/status') updateStatus(@CurrentUser() user: AuthUser, @Param('taskId') taskId: string, @Body('status') status: string) {
    return this.service.updateTaskStatus(taskId, user.companyId, status, user.userId);
  }
}
