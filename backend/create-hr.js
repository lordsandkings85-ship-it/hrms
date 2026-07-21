const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const email = 'hr@lordsandkings.co';
  const password = 'lke00000';

  console.log('Creating HR user...');

  // 1. Get any existing company or create one
  let company = await prisma.company.findFirst();
  if (!company) {
    company = await prisma.company.create({ data: { name: 'Lords and Kings' } });
    console.log('Created default company:', company.name);
  } else {
    console.log('Using company:', company.name);
  }

  // 2. Ensure HR role exists
  let role = await prisma.role.findFirst({
    where: { companyId: company.id, name: 'HR Admin' }
  });
  if (!role) {
    role = await prisma.role.create({
      data: { companyId: company.id, name: 'HR Admin', isSystem: false }
    });
    console.log('Created HR Admin role');
  }

  // 3. Ensure a default department exists
  let dept = await prisma.department.findFirst({ where: { companyId: company.id } });
  if (!dept) {
    dept = await prisma.department.create({
      data: { companyId: company.id, name: 'Human Resources' }
    });
    console.log('Created HR Department');
  }

  // 4. Create Employee record
  let employee = await prisma.employee.findFirst({ where: { email } });
  if (!employee) {
    employee = await prisma.employee.create({
      data: {
        companyId: company.id,
        firstName: 'Team',
        lastName: 'HR',
        email,
        employeeCode: 'HR-001',
        departmentId: dept.id,
        joiningDate: new Date(),
        status: 'active'
      }
    });
    console.log('Created employee record');
  } else {
    console.log('Employee record already exists');
  }

  // 5. Create or Update User record
  const passwordHash = await bcrypt.hash(password, 10);
  let user = await prisma.user.findUnique({ where: { email } });
  
  if (!user) {
    user = await prisma.user.create({
      data: {
        companyId: company.id,
        email,
        passwordHash,
        employeeId: employee.id,
        roleId: role.id,
        isSuperAdmin: false
      }
    });
    console.log('Created HR user account successfully');
  } else {
    await prisma.user.update({
      where: { email },
      data: { passwordHash, roleId: role.id, employeeId: employee.id }
    });
    console.log('Updated existing HR user account successfully');
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
