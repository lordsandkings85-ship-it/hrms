const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
(async () => {
  const hs = await prisma.holiday.findMany({
    select: { name: true, date: true, companyId: true, company: { select: { name: true } } },
    orderBy: { date: 'asc' },
  });
  console.table(hs.map(h => ({ name: h.name, date: h.date.toISOString().slice(0, 10), company: h.company?.name ?? '' })));
})().finally(() => prisma.$disconnect());