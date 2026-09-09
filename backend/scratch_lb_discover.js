const { PrismaClient } = require('./node_modules/@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const companies = await prisma.company.findMany({
    select: { id: true, name: true, displayName: true, legalName: true, status: true, createdAt: true },
  });
  for (const c of companies) {
    const active = await prisma.employee.count({ where: { companyId: c.id, status: 'active' } });
    const totalEmp = await prisma.employee.count({ where: { companyId: c.id } });
    const types = await prisma.leaveType.findMany({ where: { companyId: c.id }, select: { code: true, name: true, annualAllocation: true, accrualRate: true, carryForward: true } });
    const policies = await prisma.attendancePolicy.findMany({ where: { companyId: c.id }, select: { key: true, value: true } });
    const monthlyPolicy = { monthlyCasualLeave: null, monthlyCasualLeaveAmount: null };
    for (const p of policies) {
      if (p.key === 'custom.monthlyCasualLeave' || p.key === 'custom.monthlyCasualLeaveAmount') monthlyPolicy[p.key] = p.value;
    }
    const balances = await prisma.leaveBalance.count({ where: { employee: { companyId: c.id }, year: 2026 } });
    const monthly = await prisma.leaveMonthlyBalance.count({ where: { companyId: c.id, year: 2026 } });
    console.log(JSON.stringify({ ...c, activeEmp: active, totalEmp, types, monthlyPolicy, bal2026: balances, monthly2026: monthly }));
  }
}

main().catch(console.error).finally(async () => { await prisma.$disconnect(); });