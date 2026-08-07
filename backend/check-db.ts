import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
async function main() {
  const users = await prisma.user.findMany({ include: { employee: true } });
  console.log('Users:');
  for(const u of users) console.log(u.email, u.companyId);
  
  const emps = await prisma.employee.findMany({ include: { salaryStructures: true } });
  console.log('\nEmps:');
  for(const e of emps) console.log(e.id, e.companyId, e.status, e.salaryStructures.length);
}
main().finally(() => prisma.$disconnect());
