import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class RecruitmentService {
  constructor(private prisma: PrismaService) {}

  listJobs(companyId: string) {
    return this.prisma.job.findMany({ where: { companyId }, include: { candidates: true } });
  }
  createJob(companyId: string, title: string, description?: string) {
    return this.prisma.job.create({ data: { companyId, title, description } });
  }
  addCandidate(jobId: string, name: string, email: string, resumeUrl?: string) {
    return this.prisma.candidate.create({ data: { jobId, name, email, resumeUrl } });
  }
  moveStage(candidateId: string, stage: string) {
    return this.prisma.candidate.update({ where: { id: candidateId }, data: { stage } });
  }
  scheduleInterview(candidateId: string, scheduledAt: string, interviewer?: string) {
    return this.prisma.interview.create({
      data: { candidateId, scheduledAt: new Date(scheduledAt), interviewer },
    });
  }
  submitFeedback(interviewId: string, feedback: string, rating: number) {
    return this.prisma.interview.update({ where: { id: interviewId }, data: { feedback, rating } });
  }
  createOffer(candidateId: string, ctc: number) {
    return this.prisma.offer.create({ data: { candidateId, ctc } });
  }

  async evaluateCandidate(candidateId: string) {
    const candidate = await this.prisma.candidate.findUnique({
      where: { id: candidateId },
      include: { interview: true }
    });
    
    if (!candidate) throw new NotFoundException('Candidate not found');
    if (candidate.interview.length === 0) throw new BadRequestException('No interviews found to evaluate');

    let totalScore = 0;
    let scoredInterviews = 0;
    for (const iv of candidate.interview) {
      if (iv.rating) {
        totalScore += iv.rating;
        scoredInterviews++;
      }
    }

    if (scoredInterviews === 0) throw new BadRequestException('No rated interviews found');

    const averageRating = totalScore / scoredInterviews;

    if (averageRating >= 4.0) {
      // Auto move to offer stage
      await this.prisma.candidate.update({ where: { id: candidateId }, data: { stage: 'offered' } });
      // Generate draft offer (default 10L CTC for prototype)
      const offer = await this.createOffer(candidateId, 1000000);
      return { message: 'Candidate evaluated as STRONG. Auto-moved to offered stage.', offer, averageRating };
    } else {
      // Auto reject
      await this.prisma.candidate.update({ where: { id: candidateId }, data: { stage: 'rejected' } });
      return { message: 'Candidate evaluated as WEAK. Auto-rejected.', averageRating };
    }
  }

  async onboardCandidate(offerId: string) {
    const offer = await this.prisma.offer.findUnique({
      where: { id: offerId },
      include: { candidate: { include: { job: true } } }
    });

    if (!offer) throw new NotFoundException('Offer not found');
    if (offer.status === 'accepted') throw new BadRequestException('Offer already accepted');

    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Mark offer as accepted
      await tx.offer.update({ where: { id: offerId }, data: { status: 'accepted' } });
      await tx.candidate.update({ where: { id: offer.candidateId }, data: { stage: 'hired' } });

      // 2. Fetch default department (or any department for prototype)
      const dept = await tx.department.findFirst({ where: { companyId: offer.candidate.job.companyId } });
      
      // 3. Create Employee record
      const employee = await tx.employee.create({
        data: {
          companyId: offer.candidate.job.companyId,
          firstName: offer.candidate.name.split(' ')[0] || 'New',
          lastName: offer.candidate.name.split(' ')[1] || 'Hire',
          email: offer.candidate.email,
          employeeCode: `EMP-${Math.floor(Math.random() * 10000)}`,
          departmentId: dept?.id,
        }
      });

      // 4. Create Salary Structure based on Offer CTC
      await tx.salaryStructure.create({
        data: {
          employeeId: employee.id,
          effectiveFrom: new Date(),
          basic: offer.ctc * 0.4,
          hra: offer.ctc * 0.2,
          specialAllowance: offer.ctc * 0.3,
          pfDeduction: (offer.ctc * 0.4) * 0.12,
          ptDeduction: 0,
          
        }
      });

      // 5. Create User Account
      const employeeRole = await tx.role.findFirst({ where: { companyId: offer.candidate.job.companyId, name: 'Employee' } });
      const passwordHash = await bcrypt.hash('password123', 10);
      
      const user = await tx.user.create({
        data: {
          companyId: offer.candidate.job.companyId,
          email: offer.candidate.email,
          passwordHash,
          employeeId: employee.id,
          roleId: employeeRole?.id
        }
      });

      return { employee, user };
    });

    return { success: true, message: 'Zero-touch onboarding complete!', data: result };
  }
}
