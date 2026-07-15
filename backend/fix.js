const fs = require('fs');
let c = fs.readFileSync('prisma/schema.prisma', 'utf8');
c = c.replace(/payslip\s+Payslip\[\]/g, 'payslips Payslip[]');
c = c.replace(/salaryStructure\s+SalaryStructure\[\]/g, 'salaryStructures SalaryStructure[]');
c = c.replace(/task\s+Task\[\]/g, 'tasks Task[]');
c = c.replace(/candidate\s+Candidate\[\]/g, 'candidates Candidate[]');
c = c.replace(/employee\s+Employee\[\]/g, 'employees Employee[]');
c = c.replace(/courseEnrollment\s+CourseEnrollment\[\]/g, 'enrollments CourseEnrollment[]');
c = c.replace(/assetAssignment\s+AssetAssignment\[\]/g, 'assignments AssetAssignment[]');
c = c.replace(/permission\s+Permission\[\]/g, 'permissions Permission[]');
c = c.replace(/employee\s+Employee\?\s+@relation\("EmployeeToEmployee"/g, 'manager Employee? @relation("EmployeeToEmployee"');
c = c.replace(/exitChecklist\s+ExitChecklist\[\]/g, 'checklists ExitChecklist[]');
c = c.replace(/leaveBalance\s+LeaveBalance\[\]/g, 'leaveBalances LeaveBalance[]');
c = c.replace(/user\s+User\[\]/g, 'users User[]'); // For Company -> users
fs.writeFileSync('prisma/schema.prisma', c);
