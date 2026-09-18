import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

const run = async () => {
  const employees = await p.employee.findMany({
    where: { workingDaysPerWeek: 6 },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      employeeCode: true,
      companyId: true,
      status: true,
      workingDaysPerWeek: true,
    },
  });

  if (employees.length === 0) {
    console.log('No employee has workingDaysPerWeek = 6');
    return;
  }

  const companyIds = [...new Set(employees.map((e) => e.companyId))];

  const companies = await p.company.findMany({
    where: { id: { in: companyIds } },
    select: { id: true, name: true },
  });

  const policies = await p.attendancePolicy.findMany({
    where: {
      companyId: { in: companyIds },
      key: { in: ['custom.secondSaturdayOff', 'custom.secondSaturdayCompOffCredit'] },
    },
    select: { companyId: true, key: true, value: true },
  });

  const byCompany = new Map();
  for (const e of employees) {
    const arr = byCompany.get(e.companyId) ?? [];
    arr.push(e);
    byCompany.set(e.companyId, arr);
  }

  const val = (cid, key) => {
    const found = policies.filter((x) => x.companyId === cid && x.key === key);
    return found.length ? `'${found[0].value}'` : '(MISSING)';
  };

  for (const c of companies) {
    const list = byCompany.get(c.id) ?? [];
    if (list.length === 0) continue;
    console.log(`\n== ${c.name} ==`);
    console.log(`  custom.secondSaturdayOff       = ${val(c.id, 'custom.secondSaturdayOff')}`);
    console.log(`  custom.secondSaturdayCompOffCredit = ${val(c.id, 'custom.secondSaturdayCompOffCredit')}`);
    for (const e of list) {
      console.log(
        `  - ${e.employeeCode} ${e.firstName} ${e.lastName ?? ''} | status=${e.status} | wdpw=${e.workingDaysPerWeek}`,
      );
    }
  }
};

run()
  .catch((e) => {
    console.error(e?.message);
    process.exit(1);
  })
  .finally(() => p.$disconnect());
