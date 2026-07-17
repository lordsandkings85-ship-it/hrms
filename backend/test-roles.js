const { PrismaClient } = require("./node_modules/@prisma/client");
const prisma = new PrismaClient();
prisma.user.findMany({ include: { role: true, employee: true } }).then(users => {
  console.log(JSON.stringify(users.map(u => ({ email: u.email, role: u.role })), null, 2));
  prisma.$disconnect();
});
