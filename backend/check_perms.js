const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function check() {
  const role = await prisma.role.findUnique({ where: { id: 'a0fa27f0-c3e1-4f1d-a050-0e030039cbfe' }, include: { permissions: true } });
  console.log(JSON.stringify(role, null, 2));
}
check().finally(() => prisma.$disconnect());
