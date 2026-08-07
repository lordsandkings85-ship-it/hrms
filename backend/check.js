const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const emps = await prisma.employee.findMany({
    select: { id: true, firstName: true, ctc: true, status: true, companyId: true }
  });
  console.log(emps);
}
main().finally(() => prisma.$disconnect());
