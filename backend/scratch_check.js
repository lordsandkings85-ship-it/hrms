const { PrismaClient } = require('./node_modules/@prisma/client');
const prisma = new PrismaClient();
async function test() {
  const user = await prisma.user.findFirst({ where: { email: '2018@lordsandkings.co' }, include: { role: true } });
  console.log('Superadmin user:', user);
  const allEmps = await prisma.employee.findMany({
    select: { id: true, firstName: true, isSystem: true, status: true, company: { select: { name: true } }, user: { select: { email: true, role: { select: { isSystem: true } } } } }
  });
  console.log('Total emps in DB:', allEmps.length);
  console.log('Active non-system:', allEmps.filter(e => e.status === 'active' && !e.isSystem).length);
  const allCompanies = await prisma.company.findMany({ select: { id: true } });
  const targetCompanyIds = allCompanies.map((c) => c.id);
  const totalEmployees = await prisma.employee.count({
    where: {
      companyId: { in: targetCompanyIds },
      status: 'active',
      isSystem: false,
    },
  });
  console.log('Total Active Employees across group:', totalEmployees);
}
test().finally(() => prisma.$disconnect());
