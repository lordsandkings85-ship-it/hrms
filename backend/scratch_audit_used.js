const { PrismaClient } = require('./node_modules/@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const auditLogs = await prisma.auditLog.findMany({
    where: {
      entity: 'LeaveBalance',
      action: { in: ['LEAVE_BALANCE_UPDATE', 'LEAVE_BALANCE_DELETE'] },
    },
    orderBy: { createdAt: 'asc' },
  });

  console.log(`Found ${auditLogs.length} audit logs for LeaveBalance.`);
  const empIdMap = {};
  const employees = await prisma.employee.findMany();
  employees.forEach(e => empIdMap[e.id] = e);

  for (const log of auditLogs) {
    const meta = log.metadata;
    console.log(`[${log.createdAt.toISOString()}] Action: ${log.action}`);
    console.log(meta);
  }
}

main().catch(console.error).finally(async () => {
  await prisma.$disconnect();
});
