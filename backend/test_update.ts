import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const employee = await prisma.employee.findFirst({
    include: {
      contactInfo: true,
      adminInfo: true,
      personalInfo: true,
      paymentInfo: true,
    }
  });
  if (!employee) {
    console.log('No employee found');
    return;
  }

  const { id } = employee;
  console.log('Updating employee', id);

  try {
    const contactInfo = employee.contactInfo ? { ...employee.contactInfo } : undefined;
    const adminInfo = employee.adminInfo ? { ...employee.adminInfo } : undefined;

    await prisma.employee.update({
      where: { id },
      data: {
        workingDaysPerWeek: 5,
        contactInfo: contactInfo ? { upsert: { create: contactInfo, update: contactInfo } } : undefined,
        adminInfo: adminInfo ? { upsert: { create: adminInfo, update: adminInfo } } : undefined,
      } as any,
    });
    console.log('Update successful');
  } catch (err) {
    console.error('Update failed:', err);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
