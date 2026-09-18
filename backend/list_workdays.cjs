const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  const emps = await prisma.employee.findMany({
    select: {
      employeeCode: true,
      firstName: true,
      lastName: true,
      workingDaysPerWeek: true,
      employmentType: true,
      status: true,
      company: { select: { name: true } },
    },
    orderBy: { employeeCode: 'asc' },
  });
  console.table(emps.map((e) => ({
    code: e.employeeCode,
    name: `${e.firstName} ${e.lastName}`,
    workingDaysPerWeek: e.workingDaysPerWeek,
    employmentType: e.employmentType ?? '',
    company: e.company?.name ?? '',
    status: e.status,
  })));
})().finally(() => prisma.$disconnect());