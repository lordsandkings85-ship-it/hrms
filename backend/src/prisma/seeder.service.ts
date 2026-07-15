import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from './prisma.service';

@Injectable()
export class SeederService {
  constructor(private prisma: PrismaService) {}

  async autoPopulate(companyId: string, adminEmployeeId: string) {
    // Disabled auto-population of mock data in production
    return;
    try {
      // 1. Create Branches
      const branch1 = await this.prisma.branch.create({
        data: { companyId, name: 'HQ - Bangalore', address: 'Outer Ring Road, Tech Park, Bangalore' },
      });
      const branch2 = await this.prisma.branch.create({
        data: { companyId, name: 'Delhi Hub', address: 'Connaught Place, New Delhi' },
      });

      // 2. Create Departments
      const deptEng = await this.prisma.department.create({
        data: { companyId, name: 'Engineering' },
      });
      const deptProduct = await this.prisma.department.create({
        data: { companyId, name: 'Product Management' },
      });
      const deptHr = await this.prisma.department.create({
        data: { companyId, name: 'Human Resources' },
      });

      // 3. Create Designations
      const desigSE = await this.prisma.designation.create({
        data: { companyId, title: 'Software Engineer', grade: 'L2' },
      });
      const desigPM = await this.prisma.designation.create({
        data: { companyId, title: 'Product Manager', grade: 'L3' },
      });
      const desigHR = await this.prisma.designation.create({
        data: { companyId, title: 'HR Specialist', grade: 'L2' },
      });

      // Update admin employee design/dept
      await this.prisma.employee.update({
        where: { id: adminEmployeeId },
        data: {
          branchId: branch1.id,
          departmentId: deptHr.id,
          designationId: desigHR.id,
        },
      });

      // 4. Create Mock Employees
      const empNames = [
        { first: 'Amit', last: 'Sharma', email: 'amit.sharma@acme.com', code: 'EMP002', dept: deptEng.id, desig: desigSE.id, branch: branch1.id },
        { first: 'Priya', last: 'Patel', email: 'priya.patel@acme.com', code: 'EMP003', dept: deptProduct.id, desig: desigPM.id, branch: branch1.id },
        { first: 'Rohan', last: 'Das', email: 'rohan.das@acme.com', code: 'EMP004', dept: deptEng.id, desig: desigSE.id, branch: branch2.id },
        { first: 'Sneha', last: 'Reddy', email: 'sneha.reddy@acme.com', code: 'EMP005', dept: deptEng.id, desig: desigSE.id, branch: branch1.id },
      ];

      const defaultHash = await bcrypt.hash('password123', 12);
      const createdEmployees: any[] = [];
      for (const item of empNames) {
        const emp = await this.prisma.employee.create({
          data: {
            companyId,
            employeeCode: item.code,
            firstName: item.first,
            lastName: item.last,
            email: item.email,
            branchId: item.branch,
            departmentId: item.dept,
            designationId: item.desig,
            joiningDate: new Date('2025-01-15'),
            status: 'active',
          },
        });
        createdEmployees.push(emp);

        // Create User login account for the mock employee
        await this.prisma.user.create({
          data: {
            companyId,
            email: item.email,
            passwordHash: defaultHash,
            employeeId: emp.id,
          },
        });
      }

      // 5. Create Leave Types and Balances
      const leaveTypeCasual = await this.prisma.leaveType.create({
        data: { companyId, name: 'Casual Leave', paid: true },
      });
      const leaveTypeSick = await this.prisma.leaveType.create({
        data: { companyId, name: 'Sick Leave', paid: true },
      });

      const allEmps = [adminEmployeeId, ...createdEmployees.map((e) => e.id)];
      const currentYear = new Date().getFullYear();

      for (const empId of allEmps) {
        await this.prisma.leaveBalance.create({
          data: { employeeId: empId, leaveTypeId: leaveTypeCasual.id, year: currentYear, allotted: 12, used: 2 },
        });
        await this.prisma.leaveBalance.create({
          data: { employeeId: empId, leaveTypeId: leaveTypeSick.id, year: currentYear, allotted: 8, used: 1 },
        });
      }

      // 6. Create Salary Structures & Processed Payrolls
      for (const empId of allEmps) {
        await this.prisma.salaryStructure.create({
          data: {
            employeeId: empId,
            effectiveFrom: new Date('2026-01-01'),
            basic: 45000,
            hra: 18000,
            da: 4000,
            conveyance: 1600,
            medical: 1250,
            specialAllowance: 8000,
            pfDeduction: 1800,
            esiDeduction: 450,
            ptDeduction: 200,
          },
        });
      }

      // Process two historical months payroll
      const prevMonth = new Date().getMonth(); // last month
      const currentYearVal = new Date().getFullYear();

      const processHistoricalPayroll = async (monthNum: number, yearNum: number) => {
        const cycle = await this.prisma.payrollCycle.create({
          data: { companyId, month: monthNum, year: yearNum, status: 'processed' },
        });

        for (const empId of allEmps) {
          await this.prisma.payslip.create({
            data: {
              employeeId: empId,
              payrollCycleId: cycle.id,
              grossPay: 77850,
              totalDeductions: 2450,
              netPay: 75400,
              breakdown: { basic: 45000, hra: 18000, da: 4000, conveyance: 1600, medical: 1250, specialAllowance: 8000 } as any,
              generatedAt: new Date(yearNum, monthNum - 1, 30),
            },
          });
        }
      };

      await processHistoricalPayroll(prevMonth === 0 ? 12 : prevMonth, prevMonth === 0 ? currentYearVal - 1 : currentYearVal);

      // 7. Create Active Projects & Tasks
      const proj1 = await this.prisma.project.create({
        data: { companyId, name: 'Core Platform v3 Upgrade', status: 'active' },
      });
      const proj2 = await this.prisma.project.create({
        data: { companyId, name: 'Mobile App Framework Migration', status: 'active' },
      });

      await this.prisma.task.create({
        data: { projectId: proj1.id, title: 'Database schema migration strategy', status: 'done', assigneeId: createdEmployees[0].id },
      });
      await this.prisma.task.create({
        data: { projectId: proj1.id, title: 'Implement RBAC middleware guards', status: 'in_progress', assigneeId: createdEmployees[2].id },
      });
      await this.prisma.task.create({
        data: { projectId: proj2.id, title: 'Vite & Bundler configuration tuning', status: 'todo', assigneeId: createdEmployees[3].id },
      });

      // 8. Create Mock Equipment Assets
      await this.prisma.asset.create({
        data: {
          companyId,
          type: 'laptop',
          identifier: 'MCBP-14-ENG-01',
          status: 'assigned',
          assignments: { create: { employeeId: createdEmployees[0].id, assignedAt: new Date() } },
        },
      });
      await this.prisma.asset.create({
        data: { companyId, type: 'laptop', identifier: 'DELL-XP-ENG-02', status: 'available' },
      });
      await this.prisma.asset.create({
        data: { companyId, type: 'software_license', identifier: 'JETBRAINS-ALL-01', status: 'available' },
      });

      // 9. Recruitment Board (Jobs and Candidates pipeline)
      const job1 = await this.prisma.job.create({
        data: { companyId, title: 'Senior Backend Specialist', status: 'open' },
      });

      const cand1 = await this.prisma.candidate.create({
        data: { jobId: job1.id, name: 'Raj Kumar', email: 'raj.kumar@gmail.com', stage: 'interview' },
      });
      await this.prisma.interview.create({
        data: { candidateId: cand1.id, scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000), interviewer: 'Priya Patel' },
      });

      // 10. Training courses & LMS seed
      const course1 = await this.prisma.trainingCourse.create({
        data: { title: 'OWASP Security Protocols for Backend APIs', description: 'Mandatory standard compliance training regarding server injection vulnerability protections.' },
      });
      await this.prisma.courseEnrollment.create({
        data: { courseId: course1.id, employeeId: createdEmployees[0].id, progress: 60 },
      });

      // 11. Announcements Bulletin
      await this.prisma.announcement.create({
        data: { companyId, title: 'Annual General Assembly', body: 'All workforce members are requested to log in for our quarterly town hall event scheduled for tomorrow at 2:00 PM IST.' },
      });

      // 12. Create billing subscription record
      await this.prisma.subscription.create({
        data: { companyId, planName: 'growth', status: 'active', renewsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
      });

      // 13. Create integration records
      await this.prisma.integration.create({
        data: { companyId, provider: 'slack', status: 'connected', config: JSON.stringify({ channelName: '#workforce-bulletins' }) },
      });

      // 14. Logs trace audit seeder
      await this.prisma.auditLog.create({
        data: { companyId, action: 'seeding', entity: 'system', metadata: JSON.stringify({ status: 'success' }) },
      });

      // 15. Create mock historical attendance
      for (const empId of allEmps) {
        const today = new Date();
        for (let d = 1; d <= 4; d++) {
          const logDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() - d);
          await this.prisma.attendanceLog.create({
            data: {
              employeeId: empId,
              date: logDate,
              checkIn: new Date(logDate.getFullYear(), logDate.getMonth(), logDate.getDate(), 9, Math.floor(Math.random() * 20)),
              checkOut: new Date(logDate.getFullYear(), logDate.getMonth(), logDate.getDate(), 18, Math.floor(Math.random() * 15)),
              method: 'web',
              status: 'present',
            },
          });
        }
      }

    } catch (err) {
      console.error('Seeder service failed to execute successfully:', err);
    }
  }
}
