import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class TrainingService {
  constructor(private prisma: PrismaService) {}
  listCourses(companyId: string) {
    return this.prisma.trainingCourse.findMany({ where: { companyId }, include: { enrollments: true } });
  }
  createCourse(companyId: string, title: string, description?: string) {
    return this.prisma.trainingCourse.create({ data: { companyId, title, description } });
  }
  async enroll(companyId: string, courseId: string, employeeId: string) {
    const course = await this.prisma.trainingCourse.findFirst({ where: { id: courseId, companyId } });
    if (!course) throw new NotFoundException('Course not found in this company');
    const employee = await this.prisma.employee.findFirst({ where: { id: employeeId, companyId } });
    if (!employee) throw new NotFoundException('Employee not found in this company');
    return this.prisma.courseEnrollment.create({ data: { companyId, courseId, employeeId } });
  }
  async updateProgress(companyId: string, enrollmentId: string, progress: number) {
    const enrollment = await this.prisma.courseEnrollment.findFirst({ where: { id: enrollmentId, companyId } });
    if (!enrollment) throw new NotFoundException('Enrollment not found in this company');
    return this.prisma.courseEnrollment.update({
      where: { id: enrollmentId },
      data: { progress, completedAt: progress >= 100 ? new Date() : undefined },
    });
  }

  async autoAssignComplianceTraining(companyId: string) {
    // 1. Find or create the mandatory compliance courses
    const courseTitles = ['Data Security Basics', 'POSH Compliance', 'Code of Conduct'];
    const courses: any[] = [];
    for (const title of courseTitles) {
      let course = await this.prisma.trainingCourse.findFirst({ where: { title, companyId } });
      if (!course) {
        course = await this.prisma.trainingCourse.create({ data: { companyId, title, description: 'Mandatory Compliance Training' } });
      }
      courses.push(course);
    }

    // 2. Fetch all active employees
    const employees = await this.prisma.employee.findMany({ where: { companyId, status: 'active' }, select: { id: true } });

    // 3. Assign courses if not already enrolled
    let enrollmentsCreated = 0;
    await this.prisma.$transaction(async (tx) => {
      for (const emp of employees) {
        for (const course of courses) {
          const existing = await tx.courseEnrollment.findFirst({
            where: { employeeId: emp.id, courseId: course.id, companyId }
          });
          if (!existing) {
            await tx.courseEnrollment.create({
              data: { companyId, employeeId: emp.id, courseId: course.id }
            });
            enrollmentsCreated++;
          }
        }
      }
    });

    return { success: true, message: `Auto-enrolled employees into compliance training. Created ${enrollmentsCreated} new enrollments.` };
  }
}