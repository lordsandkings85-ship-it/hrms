const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function list() {
  const users = await prisma.user.findMany({ select: { email: true } });
  console.log(JSON.stringify(users, null, 2));
}
list().finally(() => prisma.$disconnect());
