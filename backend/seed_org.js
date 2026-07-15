const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const user = await prisma.user.findFirst({ where: { role: { isSystem: true } } });
  const companyId = user.companyId;
  const depts = ['Engineering', 'Human Resources', 'Sales', 'Marketing', 'Finance', 'Operations', 'Design'];
  const desigs = ['Software Engineer', 'Senior Software Engineer', 'Engineering Manager', 'HR Executive', 'Sales Representative', 'Marketing Specialist', 'Financial Analyst', 'Product Designer'];
  for (const d of depts) {
    try {
      await prisma.department.create({ data: { name: d, companyId } });
    } catch(e){}
  }
  for (const t of desigs) {
    try {
      await prisma.designation.create({ data: { title: t, companyId } });
    } catch(e){}
  }
  console.log('Seeded departments and designations!');
}
main().catch(console.error).finally(() => prisma.$disconnect());
