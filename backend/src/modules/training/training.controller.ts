import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { TrainingService } from './training.service';

@UseGuards(JwtAuthGuard)
@Controller('training')
export class TrainingController {
  constructor(private service: TrainingService) {}
  @Get('courses') listCourses() { return this.service.listCourses(); }
  @Post('courses') createCourse(@Body() body: { title: string; description?: string }) {
    return this.service.createCourse(body.title, body.description);
  }
  @Post('courses/:id/enroll') enroll(@Param('id') id: string, @Body('employeeId') employeeId: string) {
    return this.service.enroll(id, employeeId);
  }
  @Post('enrollments/:id/progress') updateProgress(@Param('id') id: string, @Body('progress') progress: number) {
    return this.service.updateProgress(id, progress);
  }
  @Post('compliance/auto-assign') autoAssign(@CurrentUser() user: AuthUser) {
    return this.service.autoAssignComplianceTraining(user.companyId);
  }
}
