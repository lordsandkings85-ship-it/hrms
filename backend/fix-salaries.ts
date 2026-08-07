import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const employees = await prisma.employee.findMany({
    include: { salaryStructures: true }
  });
  
  let count = 0;
  for (const emp of employees) {
    if (emp.salaryStructures.length === 0) {
      // Create a default salary structure of 50,000 monthly CTC
      const monthlyCTC = 50000;
      let computedGross = 0;
      if (monthlyCTC > 32521.5) {
        computedGross = (monthlyCTC - 1800) / 1.02405;
      } else if (monthlyCTC > 22765.05) {
        computedGross = monthlyCTC / 1.08405;
      } else {
        computedGross = monthlyCTC / 1.11655;
      }

      const computedBasic = Math.round(computedGross * 0.50);
      const computedHra = Math.round(computedBasic * 0.40);
      const computedSpecial = Math.round(computedGross - (computedBasic + computedHra));

      await prisma.salaryStructure.create({
        data: {
          employeeId: emp.id,
          effectiveFrom: new Date('2024-01-01'),
          basic: computedBasic,
          hra: computedHra,
          da: 0,
          conveyance: 1600,
          medical: 1250,
          specialAllowance: Math.max(0, computedSpecial - (1600 + 1250)),
        }
      });
      count++;
    }
  }
  console.log(`Updated ${count} employees with default salary structures.`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
