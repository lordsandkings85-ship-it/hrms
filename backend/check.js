const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const roles = await prisma.role.findMany({ include: { permissions: true } });
  
  // Find System Admin or similar roles and add ALL permissions if they don't have them
  for (const role of roles) {
    if (role.isSystem || role.name.toLowerCase().includes('admin') || role.name.toLowerCase().includes('hr')) {
      console.log(`Checking role: ${role.name}`);
      
      const hasAll = role.permissions.some(p => p.module === 'ALL' && p.action === 'ALL');
      if (!hasAll) {
        await prisma.permission.create({
          data: {
            roleId: role.id,
            module: 'ALL',
            action: 'ALL'
          }
        });
        console.log(`Added ALL:ALL permission to role ${role.name}`);
      }
    }
  }
  
  console.log("Done updating permissions.");
}

main().finally(() => prisma.$disconnect());
