const { PrismaClient } = require('./node_modules/@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const companies = await prisma.company.findMany();
  console.log('=== ALL COMPANY DETAILS IN DB ===');
  console.log(JSON.stringify(companies, null, 2));
}

main().catch(console.error).finally(async () => {
  await prisma.$disconnect();
});
