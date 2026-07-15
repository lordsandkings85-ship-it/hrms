import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { RecruitmentService } from './recruitment.service';

@UseGuards(JwtAuthGuard)
@Controller('recruitment')
export class RecruitmentController {
  constructor(private service: RecruitmentService) {}

  @Get('jobs')
  listJobs(@CurrentUser() user: AuthUser) {
    return this.service.listJobs(user.companyId);
  }
  @Post('jobs')
  createJob(@CurrentUser() user: AuthUser, @Body() body: { title: string; description?: string }) {
    return this.service.createJob(user.companyId, body.title, body.description);
  }
  @Post('jobs/:jobId/candidates')
  addCandidate(@Param('jobId') jobId: string, @Body() body: { name: string; email: string; resumeUrl?: string }) {
    return this.service.addCandidate(jobId, body.name, body.email, body.resumeUrl);
  }
  @Post('candidates/:id/stage')
  moveStage(@Param('id') id: string, @Body('stage') stage: string) {
    return this.service.moveStage(id, stage);
  }
  @Post('candidates/:id/interviews')
  scheduleInterview(@Param('id') id: string, @Body() body: { scheduledAt: string; interviewer?: string }) {
    return this.service.scheduleInterview(id, body.scheduledAt, body.interviewer);
  }
  @Post('interviews/:id/feedback')
  submitFeedback(@Param('id') id: string, @Body() body: { feedback: string; rating: number }) {
    return this.service.submitFeedback(id, body.feedback, body.rating);
  }
  @Post('candidates/:id/offer')
  createOffer(@Param('id') id: string, @Body('ctc') ctc: number) {
    return this.service.createOffer(id, ctc);
  }
  @Post('candidates/:id/evaluate')
  evaluateCandidate(@Param('id') id: string) {
    return this.service.evaluateCandidate(id);
  }
  @Post('offers/:id/accept')
  acceptOffer(@Param('id') id: string) {
    return this.service.onboardCandidate(id);
  }
}
