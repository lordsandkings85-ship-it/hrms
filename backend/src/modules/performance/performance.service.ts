import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PerformanceService {
  constructor(private prisma: PrismaService) {}
  listGoals(employeeId: string) {
    return this.prisma.goal.findMany({ where: { employeeId } });
  }
  createGoal(employeeId: string, title: string, description?: string, dueDate?: string) {
    return this.prisma.goal.create({
      data: { employeeId, title, description, dueDate: dueDate ? new Date(dueDate) : undefined },
    });
  }
  updateProgress(goalId: string, progress: number) {
    return this.prisma.goal.update({ where: { id: goalId }, data: { progress } });
  }
  submitReview(employeeId: string, reviewerId: string, cycle: string, type: string, score?: number, comments?: string) {
    return this.prisma.performanceReview.create({ 
      data: { employeeId, reviewerId, cycle, type, score, comments } 
    });
  }

  async getAggregatedScore(employeeId: string, cycle: string) {
    const reviews = await this.prisma.performanceReview.findMany({
      where: { employeeId, cycle, score: { not: null } }
    });

    if (reviews.length === 0) return null;

    let managerScore = 0, managerCount = 0;
    let peerScore = 0, peerCount = 0;
    let selfScore = 0, selfCount = 0;

    for (const r of reviews) {
      if (r.type === 'manager' && r.score != null) { managerScore += r.score; managerCount++; }
      else if (r.type === 'peer' && r.score != null) { peerScore += r.score; peerCount++; }
      else if (r.type === 'self' && r.score != null) { selfScore += r.score; selfCount++; }
    }

    const mAvg = managerCount > 0 ? managerScore / managerCount : null;
    const pAvg = peerCount > 0 ? peerScore / peerCount : null;
    const sAvg = selfCount > 0 ? selfScore / selfCount : null;

    // Weights: Manager 60%, Peer 30%, Self 10%
    let totalWeight = 0;
    let totalScore = 0;

    if (mAvg !== null) { totalScore += mAvg * 0.6; totalWeight += 0.6; }
    if (pAvg !== null) { totalScore += pAvg * 0.3; totalWeight += 0.3; }
    if (sAvg !== null) { totalScore += sAvg * 0.1; totalWeight += 0.1; }

    return totalWeight > 0 ? Number((totalScore / totalWeight).toFixed(2)) : null;
  }
  listReviews(employeeId: string) {
    return this.prisma.performanceReview.findMany({ where: { employeeId }, orderBy: { createdAt: 'desc' } });
  }
}
