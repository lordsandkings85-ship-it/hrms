import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TrainingService {
  constructor(private prisma: PrismaService) {}
  listCourses() {
    return this.prisma.trainingCourse.findMany({ include: { enrollments: true } });
  }
  createCourse(title: string, description?: string) {
    return this.prisma.trainingCourse.create({ data: { title, description } });
  }
  enroll(courseId: string, employeeId: string) {
    return this.prisma.courseEnrollment.create({ data: { courseId, employeeId } });
  }
  updateProgress(enrollmentId: string, progress: number) {
    return this.prisma.courseEnrollment.update({
      where: { id: enrollmentId },
      data: { progress, completedAt: progress >= 100 ? new Date() : undefined },
    });
  }

  async autoAssignComplianceTraining(companyId: string) {
    // 1. Find or create the mandatory compliance courses
    const courseTitles = ['Data Security Basics', 'POSH Compliance', 'Code of Conduct'];
    let courses: any[] = [];
    for (const title of courseTitles) {
      let course = await this.prisma.trainingCourse.findFirst({ where: { title } });
      if (!course) {
        course = await this.prisma.trainingCourse.create({ data: { title, description: 'Mandatory Compliance Training' } });
      }
      courses.push(course);
    }

    // 2. Fetch all active employees
    const employees = await this.prisma.employee.findMany({ where: { companyId, status: 'active' }, select: { id: true } });

    // 3. Assign courses if not already enrolled
    let enrollmentsCreated = 0;
    for (const emp of employees) {
      for (const course of courses) {
        const existing = await this.prisma.courseEnrollment.findFirst({
          where: { employeeId: emp.id, courseId: course.id }
        });
        if (!existing) {
          await this.prisma.courseEnrollment.create({
            data: { employeeId: emp.id, courseId: course.id }
          });
          enrollmentsCreated++;
        }
      }
    }

    return { success: true, message: `Auto-enrolled employees into compliance training. Created ${enrollmentsCreated} new enrollments.` };
  }
}
