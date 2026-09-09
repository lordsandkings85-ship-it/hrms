const { PrismaClient } = require('./node_modules/@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const companies = await prisma.company.findMany();
  console.table(companies.map(c => ({
    id: c.id,
    name: c.name,
    legalName: c.legalName,
    displayName: c.displayName,
    address: c.address,
    gst: c.gstNumber,
    pan: c.panNumber,
    cin: c.cinNumber,
    logoUrl: c.logoUrl,
  })));
}

main().catch(console.error).finally(async () => {
  await prisma.$disconnect();
});
