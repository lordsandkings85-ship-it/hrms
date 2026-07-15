const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();
async function check() {
  const user = await prisma.user.findUnique({ where: { email: '2018@lordsandkings.co' } });
  console.log(user);
  if(user) {
    const valid = await bcrypt.compare('lord@2018', user.passwordHash);
    console.log("Password valid:", valid);
  }
}
check().finally(() => prisma.$disconnect());
