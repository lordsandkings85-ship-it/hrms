import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { Permissions } from '../../../common/decorators/permissions.decorator';
import { CurrentUser, AuthUser } from '../../../common/decorators/current-user.decorator';
import { RecruitmentService } from './recruitment.service';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('recruitment')
export class RecruitmentController {
  constructor(private service: RecruitmentService) {}

  @Get('jobs')
  listJobs(@CurrentUser() user: AuthUser) {
    return this.service.listJobs(user.companyId);
  }
  @Get('interviews')
  @Permissions({ module: 'recruitment', action: 'view' })
  listInterviews(@CurrentUser() user: AuthUser) {
    return this.service.listInterviews(user.companyId);
  }
  @Post('jobs')
  @Permissions({ module: 'recruitment', action: 'create' })
  createJob(@CurrentUser() user: AuthUser, @Body() body: { title: string; description?: string }) {
    return this.service.createJob(user.companyId, body.title, body.description);
  }
  @Post('jobs/:jobId/candidates')
  @Permissions({ module: 'recruitment', action: 'edit' })
  addCandidate(@CurrentUser() user: AuthUser, @Param('jobId') jobId: string, @Body() body: { name: string; email: string; resumeUrl?: string }) {
    return this.service.addCandidate(user.companyId, jobId, body.name, body.email, body.resumeUrl);
  }
  @Post('candidates/:id/stage')
  @Permissions({ module: 'recruitment', action: 'edit' })
  moveStage(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body('stage') stage: string) {
    return this.service.moveStage(user.companyId, id, stage);
  }
  @Delete('candidates/:id')
  @Permissions({ module: 'recruitment', action: 'edit' })
  removeCandidate(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.removeCandidate(user.companyId, id);
  }
  @Post('candidates/:id/interviews')
  @Permissions({ module: 'recruitment', action: 'create' })
  scheduleInterview(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: { scheduledAt: string; interviewer?: string }) {
    return this.service.scheduleInterview(user.companyId, id, body.scheduledAt, body.interviewer);
  }
  @Post('interviews/:id/feedback')
  @Permissions({ module: 'recruitment', action: 'edit' })
  submitFeedback(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: { feedback: string; rating: number }) {
    return this.service.submitFeedback(user.companyId, id, body.feedback, body.rating);
  }
  @Post('candidates/:id/offer')
  @Permissions({ module: 'recruitment', action: 'create' })
  createOffer(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body('ctc') ctc: number) {
    return this.service.createOffer(user.companyId, id, ctc);
  }
  @Post('candidates/:id/evaluate')
  @Permissions({ module: 'recruitment', action: 'approve' })
  evaluateCandidate(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.evaluateCandidate(user.companyId, id);
  }
  @Post('offers/:id/accept')
  @Permissions({ module: 'recruitment', action: 'approve' })
  acceptOffer(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.onboardCandidate(user.companyId, id);
  }
}

