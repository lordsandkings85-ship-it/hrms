const { PrismaClient } = require('./node_modules/@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const companies = await prisma.company.findMany();
  companies.forEach(c => {
    console.log(`\n=== Company: ${c.name} (ID: ${c.id}) ===`);
    console.log({
      legalName: c.legalName,
      displayName: c.displayName,
      address: c.address,
      city: c.city,
      state: c.state,
      pincode: c.pincode,
      gst: c.gstNumber,
      pan: c.panNumber,
      cin: c.cinNumber,
      tan: c.tanNumber,
      email: c.email,
      phone: c.phone,
      website: c.website,
      logoUrl: c.logoUrl,
    });
  });
}

main().catch(console.error).finally(async () => {
  await prisma.$disconnect();
});
