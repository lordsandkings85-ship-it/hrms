import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const employee = await prisma.employee.findFirst({
    include: {
      familyMembers: true,
    }
  });
  if (!employee) {
    console.log('No employee found');
    return;
  }

  const { id } = employee;
  console.log('Updating employee', id);

  try {
    const familyMembers = employee.familyMembers.length > 0 ? employee.familyMembers : [{ relation: 'Self', name: 'Me', employeeId: id }];

    await prisma.employee.update({
      where: { id },
      data: {
        familyMembers: {
          deleteMany: {},
          create: familyMembers.map(f => {
            const { id, ...rest } = f as any;
            return rest;
          })
        }
      } as any,
    });
    console.log('Update successful');
  } catch (err) {
    console.error('Update failed:', err);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
