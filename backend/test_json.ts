import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const employee = await prisma.employee.findFirst();
  if (employee) {
    await prisma.employee.update({
      where: { id: employee.id },
      data: { experience: '0 year 0 Month' } as any
    });
    console.log('Success!');
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
