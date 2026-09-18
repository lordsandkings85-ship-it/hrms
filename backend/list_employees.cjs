const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  const emps = await prisma.employee.findMany({
    select: {
      employeeCode: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      designation: { select: { title: true } },
      department: { select: { name: true } },
      company: { select: { name: true } },
      status: true,
      joiningDate: true,
    },
    orderBy: { employeeCode: 'asc' },
  });
  console.table(emps.map((e) => ({
    code: e.employeeCode,
    name: `${e.firstName} ${e.lastName}`,
    email: e.email,
    phone: e.phone ?? '',
    designation: e.designation?.title ?? '',
    department: e.department?.name ?? '',
    company: e.company?.name ?? '',
    status: e.status,
    joined: e.joiningDate ? e.joiningDate.toISOString().slice(0, 10) : '',
  })));
  console.log(`\nTotal: ${emps.length} employees`);
})().finally(() => prisma.$disconnect());