const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function clean() {
  await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 0;');
  
  const tables = [
    'Employee', 'EmployeeDocument', 'ExitChecklist', 'ExitRequest', 
    'Expense', 'FnfSettlement', 'Goal', 'LeaveBalance', 
    'LeaveRequest', 'Payslip', 'AssetAssignment', 'AttendanceLog', 
    'CourseEnrollment'
  ];
  
  for (const table of tables) {
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${table};`);
  }
  
  await prisma.$executeRawUnsafe('DELETE FROM User WHERE employeeId IS NOT NULL;');
  await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 1;');
  
  console.log('All employees deleted successfully');
}

clean().catch(console.error).finally(() => prisma.$disconnect());
