const { PrismaClient } = require('./node_modules/@prisma/client');
const fs = require('fs');
const prisma = new PrismaClient();

async function main() {
  const companies = await prisma.company.findMany({ select: { id: true, name: true, logoUrl: true } });
  for (const c of companies) {
    console.log(c.name, 'logoUrl:', c.logoUrl ? c.logoUrl.slice(0, 50) + ' (len: ' + c.logoUrl.length + ')' : 'NULL');
    if (c.logoUrl && c.logoUrl.startsWith('data:image/')) {
      const parts = c.logoUrl.split(',');
      const base64Data = parts[1];
      const mime = parts[0];
      console.log(`  Mime: ${mime}`);
      fs.writeFileSync(`logo_${c.name.replace(/[^a-zA-Z0-9]/g, '_')}.png`, Buffer.from(base64Data, 'base64'));
      console.log(`  Saved logo_${c.name.replace(/[^a-zA-Z0-9]/g, '_')}.png for inspection`);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
