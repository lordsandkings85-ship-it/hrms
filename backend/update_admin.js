const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function updateAdmin() {
  const email = '2018@lordsandkings.co';
  const password = 'lord@2018';
  
  const superAdmin = await prisma.user.findFirst({
    where: { isSuperAdmin: true }
  });
  
  if (!superAdmin) {
    console.error('No super admin found in database!');
    process.exit(1);
  }
  
  const passwordHash = await bcrypt.hash(password, 12);
  
  await prisma.user.update({
    where: { id: superAdmin.id },
    data: {
      email: email,
      passwordHash: passwordHash
    }
  });
  
  console.log(`Successfully updated admin login credentials to ${email}`);
}

updateAdmin().catch(console.error).finally(() => prisma.$disconnect());
