const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const now = new Date();
const y = now.getFullYear();
const m = now.getMonth() + 1;
const dateKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const start = new Date(y, m - 1, 1);
const end = new Date(y, m, 1);
const isSecondSaturday = (d) => d.getDay() === 6 && d.getDate() >= 8 && d.getDate() <= 14;

(async () => {
  const emps = await prisma.employee.findMany({
    where: { status: 'active', isSystem: false },
    select: { id: true, firstName: true, lastName: true, employeeCode: true, workingDaysPerWeek: true, companyId: true },
    orderBy: { employeeCode: 'asc' },
  });

  const companyIds = [...new Set(emps.map((e) => e.companyId))];
  const policies = await prisma.attendancePolicy.findMany({
    where: { companyId: { in: companyIds }, key: 'custom.secondSaturdayOff' },
    select: { companyId: true, value: true },
  });
  const secondSatOff = new Set(policies.filter((p) => p.value === 'true').map((p) => p.companyId));

  const holidays = await prisma.holiday.findMany({ select: { date: true, companyId: true } });
  const holidaysByCompany = new Map();
  const allHolidaySet = new Set();
  for (const h of holidays) {
    const arr = holidaysByCompany.get(h.companyId) ?? [];
    arr.push(dateKey(h.date));
    holidaysByCompany.set(h.companyId, arr);
    allHolidaySet.add(dateKey(h.date));
  }

  const logs = await prisma.attendanceLog.findMany({
    where: { date: { gte: start, lt: end } },
    select: { employeeId: true, date: true, status: true },
  });
  const logsByEmployee = new Map();
  for (const log of logs) {
    const arr = logsByEmployee.get(log.employeeId);
    if (arr) arr.push(log);
    else logsByEmployee.set(log.employeeId, [log]);
  }

  const daysInMonth = new Date(y, m, 0).getDate();
  const rows = [];
  for (const emp of emps) {
    const wdpw = emp.workingDaysPerWeek ?? 5;
    // Mirror backend monthlyWorkdaySummaries: fall back to ALL holidays when the
    // company has none of its own (holidays are registered under the parent company).
    let holidaySet = new Set(holidaysByCompany.get(emp.companyId) ?? []);
    if (holidaySet.size === 0) holidaySet = allHolidaySet;
    let totalWorkingDays = 0;
    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(y, m - 1, i);
      const dow = d.getDay();
      if (dow === 0) continue;
      if (dow === 6) {
        if (wdpw !== 6) continue;
        if (isSecondSaturday(d) && secondSatOff.has(emp.companyId)) continue;
      }
      if (holidaySet.has(dateKey(d))) continue;
      totalWorkingDays++;
    }

    const uniqueDays = new Map();
    for (const log of logsByEmployee.get(emp.id) ?? []) {
      const k = dateKey(log.date);
      const existing = uniqueDays.get(k);
      if (!existing) uniqueDays.set(k, log.status);
      else if ((log.status === 'late' || log.status === 'half_day') && existing === 'present') uniqueDays.set(k, log.status);
    }
    let present = 0, late = 0, halfDay = 0, onLeave = 0;
    for (const status of uniqueDays.values()) {
      if (status === 'present') present++;
      else if (status === 'late') late++;
      else if (status === 'half_day') halfDay++;
      else if (status === 'on_leave') onLeave++;
    }
    const absent = Math.max(0, totalWorkingDays - present - late - halfDay - onLeave);
    rows.push({
      code: emp.employeeCode,
      name: `${emp.firstName} ${emp.lastName}`,
      workDaysPerWeek: wdpw,
      totalWorkingDays,
      present: present + late,
      late,
      halfDay,
      onLeave,
      absent,
    });
  }
  console.log(`Working days for ${y}-${String(m).padStart(2, '0')} (through ${now.getDate()}):`);
  console.table(rows);
})().finally(() => prisma.$disconnect());