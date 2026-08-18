import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { EmployeesService } from './src/modules/hr/employees/employees.service';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const employeesService = app.get(EmployeesService);
  
  try {
    const employee = await prisma.employee.findFirst({
      where: { id: '90a37c3e-73d6-41a7-9df4-7cce10ded717' },
      include: {
        contactInfo: true,
        paymentInfo: true,
        adminInfo: true,
        personalInfo: true,
        familyMembers: true,
        emergencyContacts: true,
        experiences: true,
        immigrations: true,
        documentInfos: true,
        certifications: true,
        qualifications: true,
      }
    });

    if (!employee) {
      console.log('Employee not found');
      process.exit(0);
    }

    console.log('Found employee, attempting update via EmployeesService...');
    
    // Simulate frontend payload
    const payload: any = {
      employeeCode: employee.employeeCode,
      firstName: employee.firstName,
      lastName: employee.lastName,
      email: employee.email,
      workingDaysPerWeek: 5,
      contactInfo: employee.contactInfo,
      paymentInfo: employee.paymentInfo,
      adminInfo: employee.adminInfo,
      personalInfo: employee.personalInfo,
      familyMembers: employee.familyMembers,
      emergencyContacts: employee.emergencyContacts,
      experiences: employee.experiences,
      immigrations: employee.immigrations,
      documentInfos: employee.documentInfos,
      certifications: employee.certifications,
      qualifications: employee.qualifications,
    };

    await employeesService.update(employee.companyId, 'test-user-id', employee.id, payload);
    console.log('Update succeeded without 500 error!');
  } catch (err) {
    console.error('Update failed with error:', err);
  } finally {
    await app.close();
    await prisma.$disconnect();
  }
}

bootstrap();
