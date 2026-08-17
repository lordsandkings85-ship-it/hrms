import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';

@Injectable()
export class RecruitmentService {
  constructor(private prisma: PrismaService) {}

  listJobs(companyId: string) {
    return this.prisma.job.findMany({ where: { companyId }, include: { candidates: { include: { interview: true, offer: { take: 1, orderBy: { createdAt: 'desc' } } } } } });
  }
  createJob(companyId: string, title: string, description?: string) {
    return this.prisma.job.create({ data: { companyId, title, description } });
  }
  async addCandidate(companyId: string, jobId: string, name: string, email: string, resumeUrl?: string) {
    if (!email?.trim()) throw new BadRequestException('Candidate email is required');
    const job = await this.prisma.job.findFirst({ where: { id: jobId, companyId } });
    if (!job) throw new NotFoundException('Job not found');
    return this.prisma.candidate.create({ data: { jobId, name, email, resumeUrl } });
  }
  async moveStage(companyId: string, candidateId: string, stage: string) {
    const candidate = await this.prisma.candidate.findUnique({ where: { id: candidateId }, include: { job: true } });
    if (!candidate || candidate.job.companyId !== companyId) throw new NotFoundException('Candidate not found');
    return this.prisma.candidate.update({ where: { id: candidateId }, data: { stage } });
  }
  async removeCandidate(companyId: string, candidateId: string) {
    const candidate = await this.prisma.candidate.findUnique({ where: { id: candidateId }, include: { job: true } });
    if (!candidate || candidate.job.companyId !== companyId) throw new NotFoundException('Candidate not found');
    return this.prisma.$transaction([
      this.prisma.interview.deleteMany({ where: { candidateId } }),
      this.prisma.offer.deleteMany({ where: { candidateId } }),
      this.prisma.candidate.delete({ where: { id: candidateId } }),
    ]);
  }
  async scheduleInterview(companyId: string, candidateId: string, scheduledAt: string, interviewer?: string) {
    const candidate = await this.prisma.candidate.findUnique({ where: { id: candidateId }, include: { job: true } });
    if (!candidate || candidate.job.companyId !== companyId) throw new NotFoundException('Candidate not found');
    return this.prisma.interview.create({
      data: { candidateId, scheduledAt: new Date(scheduledAt), interviewer },
    });
  }
  async submitFeedback(companyId: string, interviewId: string, feedback: string, rating: number) {
    const interview = await this.prisma.interview.findUnique({
      where: { id: interviewId },
      include: { candidate: { include: { job: true } } },
    });
    if (!interview || interview.candidate.job.companyId !== companyId) throw new NotFoundException('Interview not found');
    return this.prisma.interview.update({ where: { id: interviewId }, data: { feedback, rating } });
  }
  async createOffer(companyId: string, candidateId: string, ctc: number) {
    const candidate = await this.prisma.candidate.findUnique({ where: { id: candidateId }, include: { job: true } });
    if (!candidate || candidate.job.companyId !== companyId) throw new NotFoundException('Candidate not found');
    return this.prisma.offer.create({ data: { candidateId, ctc } });
  }

  listInterviews(companyId: string) {
    return this.prisma.interview.findMany({
      where: { candidate: { job: { companyId } } },
      include: { candidate: { include: { job: true } } }
    });
  }

  async evaluateCandidate(companyId: string, candidateId: string) {
    const candidate = await this.prisma.candidate.findUnique({
      where: { id: candidateId },
      include: { interview: true, job: true }
    });
    
    if (!candidate || candidate.job.companyId !== companyId) throw new NotFoundException('Candidate not found');
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
      // Auto move to offered stage; the offer CTC is set by HR when creating the offer
      await this.prisma.candidate.update({ where: { id: candidateId }, data: { stage: 'offered' } });
      return { message: 'Candidate evaluated as STRONG. Moved to offered stage — create an offer with the approved CTC.', averageRating };
    } else {
      await this.prisma.candidate.update({ where: { id: candidateId }, data: { stage: 'rejected' } });
      return { message: 'Candidate evaluated as WEAK. Auto-rejected.', averageRating };
    }
  }

  async onboardCandidate(companyId: string, offerId: string) {
    const offer = await this.prisma.offer.findUnique({
      where: { id: offerId },
      include: { candidate: { include: { job: true } } }
    });

    if (!offer) throw new NotFoundException('Offer not found');
    if (offer.candidate.job.companyId !== companyId) throw new ForbiddenException('Offer does not belong to this company');
    if (offer.status === 'accepted') throw new BadRequestException('Offer already accepted');

    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Mark offer as accepted
      await tx.offer.update({ where: { id: offerId }, data: { status: 'accepted' } });
      await tx.candidate.update({ where: { id: offer.candidateId }, data: { stage: 'hired' } });

      // 2. Fetch first department of the company
      const dept = await tx.department.findFirst({ where: { companyId: offer.candidate.job.companyId } });
      
      // 3. Create Employee record
      const employee = await tx.employee.create({
        data: {
          companyId: offer.candidate.job.companyId,
          firstName: offer.candidate.name.split(' ')[0] || 'New',
          lastName: offer.candidate.name.split(' ')[1] || 'Hire',
          email: offer.candidate.email,
          employeeCode: `EMP-${Date.now().toString().slice(-6)}`,
          departmentId: dept?.id,
        }
      });

      // 4. Create Salary Structure based on Offer CTC
      const monthlyCtc = Number(offer.ctc) / 12;
      const basic = Math.round(monthlyCtc * 0.5);
      const hra = Math.round(monthlyCtc * 0.25);
      const specialAllowance = Math.max(0, Math.round(monthlyCtc - basic - hra));
      await tx.salaryStructure.create({
        data: {
          employeeId: employee.id,
          effectiveFrom: new Date(),
          basic,
          hra,
          specialAllowance,
          pfDeduction: Math.round(basic * 0.12),
          ptDeduction: 0,
        }
      });

      // 5. Create User Account with a generated initial password
      const employeeRole = await tx.role.findFirst({ where: { companyId: offer.candidate.job.companyId, name: 'Employee' } });
      const initialPassword = crypto.randomBytes(8).toString('hex');
      const passwordHash = await bcrypt.hash(initialPassword, 10);
      
      const user = await tx.user.create({
        data: {
          companyId: offer.candidate.job.companyId,
          email: offer.candidate.email,
          passwordHash,
          employeeId: employee.id,
          roleId: employeeRole?.id
        }
      });

      return { employee, user, initialPassword };
    });

    return { success: true, message: 'Zero-touch onboarding complete!', data: { employee: result.employee, user: result.user }, initialPassword: result.initialPassword };
  }
}

