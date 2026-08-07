import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const activeEmployees = await prisma.employee.findMany({
    where: { status: 'active' },
    include: { salaryStructures: { orderBy: { effectiveFrom: 'desc' }, take: 1 } }
  });
  
  console.log(`Found ${activeEmployees.length} active employees`);
  let totalAnnualCTC = 0;
  const estimatedMonthlyCost = activeEmployees.reduce((sum, emp) => {
    let monthlyGross = 0;
    if (emp.salaryStructures && emp.salaryStructures.length > 0) {
      const s = emp.salaryStructures[0];
      monthlyGross = (s.basic || 0) + (s.hra || 0) + (s.da || 0) + (s.conveyance || 0) + (s.medical || 0) + (s.specialAllowance || 0);
      console.log(`Employee ${emp.id} - Gross: ${monthlyGross}`);
    } else {
      console.log(`Employee ${emp.id} has no salary structure!`);
    }
    totalAnnualCTC += (monthlyGross * 12);
    return sum + monthlyGross;
  }, 0);

  console.log(`totalAnnualCTC computed: ${totalAnnualCTC}`);
  
  // Also check if any users are system admins?
  // wait, the service filters out system admin users. Let's check this query:
  const activeEmpsForDashboard = await prisma.employee.findMany({
    where: { 
      status: 'active',
      user: {
        isNot: {
          role: {
            isSystem: true
          }
        }
      }
    }
  });
  console.log(`activeEmpsForDashboard: ${activeEmpsForDashboard.length}`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
