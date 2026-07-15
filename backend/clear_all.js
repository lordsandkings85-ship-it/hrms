const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function clean() {
  await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 0;');
  
  // Exclude Company, User, Role, RefreshToken
  const tables = [
    'Employee', 'EmployeeDocument', 'ExitChecklist', 'ExitRequest', 
    'Expense', 'FnfSettlement', 'Goal', 'LeaveBalance', 
    'LeaveRequest', 'Payslip', 'AssetAssignment', 'AttendanceLog', 
    'CourseEnrollment', 'Branch', 'Department', 'Designation',
    'PayrollConfig', 'PerformanceReview', 'RegularizationRequest',
    'SalaryStructure', 'ShiftAssignment', 'Timesheet', 'TravelRequest'
  ];
  
  for (const table of tables) {
    try {
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${table};`);
    } catch (err) {
      console.log(`Failed to truncate ${table}:`, err.message);
    }
  }
  
  await prisma.$executeRawUnsafe('DELETE FROM User WHERE employeeId IS NOT NULL;');
  await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 1;');
  
  console.log('All mock data tables truncated successfully');
}

clean().catch(console.error).finally(() => prisma.$disconnect());
