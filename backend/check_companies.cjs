const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
(async () => {
  const companies = await prisma.company.findMany({ select: { id: true, name: true } });
  console.table(companies.map((c) => ({ id: c.id, name: c.name })));

  const holidays = await prisma.holiday.findMany({ select: { name: true, date: true, companyId: true }, where: { date: { gte: new Date('2026-09-01'), lt: new Date('2026-10-01') } } });
  console.table(holidays.map(h => ({ name: h.name, date: h.date.toISOString().slice(0, 10), companyId: h.companyId })));

  const counts = await prisma.employee.groupBy({ by: ['companyId'], _count: { _all: true } });
  console.table(counts.map(c => ({ companyId: c.companyId, employees: c._count._all })));
})().finally(() => prisma.$disconnect());