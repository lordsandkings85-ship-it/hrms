const fs = require('fs');
let c = fs.readFileSync('prisma/schema.prisma', 'utf8');

c = c.replace(/other_Employee\s+Employee\[\]/g, 'directReports Employee[]');

fs.writeFileSync('prisma/schema.prisma', c);
