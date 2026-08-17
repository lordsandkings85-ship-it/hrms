import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CompanyScopeGuard } from '../../../common/guards/company-scope.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { Permissions } from '../../../common/decorators/permissions.decorator';
import { CurrentUser, AuthUser } from '../../../common/decorators/current-user.decorator';
import { PerformanceService } from './performance.service';

@UseGuards(JwtAuthGuard, CompanyScopeGuard, PermissionsGuard)
@Controller('performance')
export class PerformanceController {
  constructor(private service: PerformanceService) {}

  @Get('goals/:employeeId')
  @Permissions({ module: 'performance', action: 'view' })
  listGoals(@Param('employeeId') employeeId: string) {
    return this.service.listGoals(employeeId);
  }
  @Post('goals/:employeeId')
  @Permissions({ module: 'performance', action: 'create' })
  createGoal(@Param('employeeId') employeeId: string, @Body() body: { title: string; description?: string; dueDate?: string }) {
    return this.service.createGoal(employeeId, body.title, body.description, body.dueDate);
  }
  @Post('goals/:goalId/progress')
  updateProgress(@CurrentUser() user: AuthUser, @Param('goalId') goalId: string, @Body('progress') progress: number) {
    return this.service.updateProgress(goalId, user.userId, progress);
  }
  @Post('goals/:goalId/approve')
  @Permissions({ module: 'performance', action: 'approve' })
  approveGoal(@Param('goalId') goalId: string) {
    return this.service.setGoalStatus(goalId, 'approved');
  }
  @Post('goals/:goalId/reject')
  @Permissions({ module: 'performance', action: 'approve' })
  rejectGoal(@Param('goalId') goalId: string) {
    return this.service.setGoalStatus(goalId, 'rejected');
  }
  @Post('reviews/:employeeId')
  @Permissions({ module: 'performance', action: 'create' })
  submitReview(
    @CurrentUser() user: AuthUser,
    @Param('employeeId') employeeId: string,
    @Body() body: { cycle: string; type: string; score?: number; comments?: string },
  ) {
    const reviewerId = user.userId;
    return this.service.submitReview(employeeId, reviewerId, body.cycle, body.type, body.score, body.comments);
  }
  
  @Get('reviews/:employeeId/aggregate')
  @Permissions({ module: 'performance', action: 'view' })
  getAggregatedScore(@Param('employeeId') employeeId: string, @Query('cycle') cycle: string) {
    return this.service.getAggregatedScore(employeeId, cycle);
  }
  @Get('reviews/:employeeId')
  @Permissions({ module: 'performance', action: 'view' })
  listReviews(@Param('employeeId') employeeId: string) {
    return this.service.listReviews(employeeId);
  }
}

