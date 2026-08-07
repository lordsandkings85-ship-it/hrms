import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const result = await prisma.employee.updateMany({
    where: { status: 'Active' },
    data: { status: 'active' }
  });
  console.log(`Updated ${result.count} employees`);
}
main().finally(() => prisma.$disconnect());
