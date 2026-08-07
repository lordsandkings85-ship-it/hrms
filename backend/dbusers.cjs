const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
(async () => {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    take: 25,
    select: {
      id: true, email: true, roleId: true, employeeId: true, companyId: true,
      isSuperAdmin: true, mfaEnabled: true, passwordHash: true,
    },
  });
  for (const u of users) {
    console.log(`${u.email} | role=${u.roleId} | emp=${u.employeeId} | co=${u.companyId} | super=${u.isSuperAdmin} | mfa=${u.mfaEnabled} | hash=${u.passwordHash ? u.passwordHash.slice(0, 10) : 'NULL'}(len=${u.passwordHash ? u.passwordHash.length : 0})`);
  }
  await prisma.$disconnect();
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });
