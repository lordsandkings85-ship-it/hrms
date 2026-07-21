const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.user.findFirst({ where: { email: 'hr@lordsandkings.co' }, include: { role: true } })
  .then(user => console.dir(user, { depth: null }))
  .finally(() => prisma.$disconnect());
