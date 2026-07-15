import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { PerformanceService } from './performance.service';

@UseGuards(JwtAuthGuard)
@Controller('performance')
export class PerformanceController {
  constructor(private service: PerformanceService) {}

  @Get('goals/:employeeId')
  listGoals(@Param('employeeId') employeeId: string) {
    return this.service.listGoals(employeeId);
  }
  @Post('goals/:employeeId')
  createGoal(@Param('employeeId') employeeId: string, @Body() body: { title: string; description?: string; dueDate?: string }) {
    return this.service.createGoal(employeeId, body.title, body.description, body.dueDate);
  }
  @Post('goals/:goalId/progress')
  updateProgress(@Param('goalId') goalId: string, @Body('progress') progress: number) {
    return this.service.updateProgress(goalId, progress);
  }
  @Post('reviews/:employeeId')
  submitReview(
    @CurrentUser() user: AuthUser,
    @Param('employeeId') employeeId: string,
    @Body() body: { cycle: string; type: string; score?: number; comments?: string },
  ) {
    // If the user's AuthUser doesn't map directly to an employee profile in the mock, fallback to a system ID or their userId
    const reviewerId = user.userId;
    return this.service.submitReview(employeeId, reviewerId, body.cycle, body.type, body.score, body.comments);
  }
  
  @Get('reviews/:employeeId/aggregate')
  getAggregatedScore(@Param('employeeId') employeeId: string, @Query('cycle') cycle: string) {
    return this.service.getAggregatedScore(employeeId, cycle);
  }
  @Get('reviews/:employeeId')
  listReviews(@Param('employeeId') employeeId: string) {
    return this.service.listReviews(employeeId);
  }
}
