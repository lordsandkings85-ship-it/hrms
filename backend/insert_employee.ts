import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Assuming there is at least one company in the DB.
  const company = await prisma.company.findFirst();
  if (!company) {
    console.error('No company found in the database');
    return;
  }
  const companyId = company.id;

  // Find Department
  let department = await prisma.department.findFirst({
    where: { name: { contains: 'IT & Engineering' }, companyId }
  });
  
  if (!department) {
    department = await prisma.department.create({
      data: { name: 'IT & Engineering', companyId }
    });
  }

  // Find Designation
  let designation = await prisma.designation.findFirst({
    where: { title: { contains: 'Fullstack Developer' }, companyId }
  });
  if (!designation) {
    designation = await prisma.designation.create({
      data: { title: 'Fullstack Developer', companyId }
    });
  }

  // Find Branch
  let branch = await prisma.branch.findFirst({
    where: { name: { contains: 'nungambakkam' }, companyId }
  });
  if (!branch) {
    branch = await prisma.branch.create({
      data: { name: 'nungambakkam', companyId }
    });
  }
  
  // Find Manager (HR-001)
  const manager = await prisma.employee.findFirst({
    where: { employeeCode: 'HR-001', companyId }
  });

  // Create or Update Employee
  const empData = {
    companyId: companyId,
    employeeCode: 'LKE1807',
    firstName: 'sathishkumar',
    middleName: '',
    lastName: 's',
    joiningDate: new Date('2024-01-01'), // dd-mm-yyyy placeholder since none provided
    dob: new Date('1990-01-01'), // dd-mm-yyyy placeholder
    state: 'Tamil Nadu',
    departmentId: department.id,
    subDepartment1: 'NA',
    category: 'Staff',
    designationId: designation.id,
    managerId: manager?.id || undefined,
    reportingManager: 'HR-001',
    probation: 'Manage',
    email: 'sathishkumar@company.com',
    branchId: branch.id,
    subDepartment: 'NA',
    subDepartment2: 'NA',
    subCategory: 'NA',
    grade: 'NA',
    reportingManager2: '',
    status: 'Active',
    workingDaysPerWeek: 5
  };

  const existingEmp = await prisma.employee.findFirst({ where: { employeeCode: 'LKE1807' } });
  
  if (existingEmp) {
    await prisma.employee.update({
      where: { id: existingEmp.id },
      data: empData
    });
    console.log('Employee updated successfully:', existingEmp.id);
  } else {
    const newEmp = await prisma.employee.create({
      data: empData
    });
    console.log('Employee created successfully:', newEmp.id);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
