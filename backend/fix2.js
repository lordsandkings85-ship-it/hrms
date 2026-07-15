const fs = require('fs');
let c = fs.readFileSync('prisma/schema.prisma', 'utf8');

// The code expects documents on Employee
c = c.replace(/employeeDocument\s+EmployeeDocument\[\]/g, 'documents EmployeeDocument[]');

// Looking at error: Property 'documents' does not exist
// What else?
fs.writeFileSync('prisma/schema.prisma', c);
