import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { Permissions } from '../../../common/decorators/permissions.decorator';
import { CurrentUser, AuthUser } from '../../../common/decorators/current-user.decorator';
import { TrainingService } from './training.service';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('training')
export class TrainingController {
  constructor(private service: TrainingService) {}
  @Get('courses') listCourses(@CurrentUser() user: AuthUser) { return this.service.listCourses(user.companyId); }
  @Post('courses')
  @Permissions({ module: 'training', action: 'edit' })
  createCourse(@CurrentUser() user: AuthUser, @Body() body: { title: string; description?: string }) {
    return this.service.createCourse(user.companyId, body.title, body.description);
  }
  @Post('courses/:id/enroll')
  @Permissions({ module: 'training', action: 'edit' })
  enroll(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body('employeeId') employeeId: string) {
    return this.service.enroll(user.companyId, id, employeeId);
  }
  @Post('enrollments/:id/progress')
  @Permissions({ module: 'training', action: 'edit' })
  updateProgress(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body('progress') progress: number) {
    return this.service.updateProgress(user.companyId, id, progress);
  }
  @Post('compliance/auto-assign')
  @Permissions({ module: 'training', action: 'edit' })
  autoAssign(@CurrentUser() user: AuthUser) {
    return this.service.autoAssignComplianceTraining(user.companyId);
  }
}

