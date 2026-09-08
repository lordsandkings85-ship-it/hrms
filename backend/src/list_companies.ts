import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const companies = await prisma.company.findMany({
    include: {
      _count: {
        select: {
          employees: true,
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  console.log('\n--- Active Companies in Database ---');
  for (const c of companies) {
    console.log({
      id: c.id,
      name: c.name,
      displayName: c.displayName,
      legalName: c.legalName,
      status: c.status,
      gst: c.gstNumber,
      pan: c.panNumber,
      employeesCount: c._count?.employees ?? 0,
    });
  }
}

main()
  .catch((e) => {
    console.error('Error listing companies:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
