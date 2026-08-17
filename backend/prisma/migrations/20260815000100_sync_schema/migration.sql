# Applied to local DB 2026-08-15 (dump import reconciliation: MariaDB FK/auto-index cleanup + Prisma schema sync)
-- 1) drop MariaDB-era FK constraints and auto-created FK indexes
SET FOREIGN_KEY_CHECKS=0;
ALTER TABLE `AdditionalPayout` DROP FOREIGN KEY `AdditionalPayout_employeeId_fkey`;
ALTER TABLE `AssetAssignment` DROP FOREIGN KEY `AssetAssignment_employeeId_fkey`;
ALTER TABLE `AttendanceLog` DROP FOREIGN KEY `AttendanceLog_employeeId_fkey`;
ALTER TABLE `CompOffRequest` DROP FOREIGN KEY `CompOffRequest_employeeId_fkey`;
ALTER TABLE `CourseEnrollment` DROP FOREIGN KEY `CourseEnrollment_employeeId_fkey`;
ALTER TABLE `Employee` DROP FOREIGN KEY `Employee_branchId_fkey`;
ALTER TABLE `Employee` DROP FOREIGN KEY `Employee_departmentId_fkey`;
ALTER TABLE `Employee` DROP FOREIGN KEY `Employee_designationId_fkey`;
ALTER TABLE `Employee` DROP FOREIGN KEY `Employee_managerId_fkey`;
ALTER TABLE `EmployeeAdminInfo` DROP FOREIGN KEY `EmployeeAdminInfo_employeeId_fkey`;
ALTER TABLE `EmployeeCertificationInfo` DROP FOREIGN KEY `EmployeeCertificationInfo_employeeId_fkey`;
ALTER TABLE `EmployeeContactInfo` DROP FOREIGN KEY `EmployeeContactInfo_employeeId_fkey`;
ALTER TABLE `EmployeeDocument` DROP FOREIGN KEY `EmployeeDocument_employeeId_fkey`;
ALTER TABLE `EmployeeDocumentInfo` DROP FOREIGN KEY `EmployeeDocumentInfo_employeeId_fkey`;
ALTER TABLE `EmployeeEmergencyContact` DROP FOREIGN KEY `EmployeeEmergencyContact_employeeId_fkey`;
ALTER TABLE `EmployeeExperienceInfo` DROP FOREIGN KEY `EmployeeExperienceInfo_employeeId_fkey`;
ALTER TABLE `EmployeeFamilyMember` DROP FOREIGN KEY `EmployeeFamilyMember_employeeId_fkey`;
ALTER TABLE `EmployeeImmigrationInfo` DROP FOREIGN KEY `EmployeeImmigrationInfo_employeeId_fkey`;
ALTER TABLE `EmployeePaymentInfo` DROP FOREIGN KEY `EmployeePaymentInfo_employeeId_fkey`;
ALTER TABLE `EmployeePersonalInfo` DROP FOREIGN KEY `EmployeePersonalInfo_employeeId_fkey`;
ALTER TABLE `EmployeeQualificationInfo` DROP FOREIGN KEY `EmployeeQualificationInfo_employeeId_fkey`;
ALTER TABLE `Evaluation360` DROP FOREIGN KEY `Evaluation360_employeeId_fkey`;
ALTER TABLE `EvaluationSetup` DROP FOREIGN KEY `EvaluationSetup_employeeId_fkey`;
ALTER TABLE `ExitChecklist` DROP FOREIGN KEY `ExitChecklist_exitRequestId_fkey`;
ALTER TABLE `ExitRequest` DROP FOREIGN KEY `ExitRequest_employeeId_fkey`;
ALTER TABLE `Expense` DROP FOREIGN KEY `Expense_employeeId_fkey`;
ALTER TABLE `FlexibleHolidayRequest` DROP FOREIGN KEY `FlexibleHolidayRequest_employeeId_fkey`;
ALTER TABLE `FnfSettlement` DROP FOREIGN KEY `FnfSettlement_employeeId_fkey`;
ALTER TABLE `Goal` DROP FOREIGN KEY `Goal_employeeId_fkey`;
ALTER TABLE `HelpdeskTicket` DROP FOREIGN KEY `HelpdeskTicket_employeeId_fkey`;
ALTER TABLE `Invoice` DROP FOREIGN KEY `Invoice_subscriptionId_fkey`;
ALTER TABLE `KPI` DROP FOREIGN KEY `KPI_kraId_fkey`;
ALTER TABLE `KPIAssignment` DROP FOREIGN KEY `KPIAssignment_employeeId_fkey`;
ALTER TABLE `KPIAssignment` DROP FOREIGN KEY `KPIAssignment_kpiId_fkey`;
ALTER TABLE `KPITarget` DROP FOREIGN KEY `KPITarget_employeeId_fkey`;
ALTER TABLE `KPITarget` DROP FOREIGN KEY `KPITarget_kpiId_fkey`;
ALTER TABLE `KRA` DROP FOREIGN KEY `KRA_kpaId_fkey`;
ALTER TABLE `LeaveBalance` DROP FOREIGN KEY `LeaveBalance_employeeId_fkey`;
ALTER TABLE `LeaveCancellationRequest` DROP FOREIGN KEY `LeaveCancellationRequest_employeeId_fkey`;
ALTER TABLE `LeaveCancellationRequest` DROP FOREIGN KEY `LeaveCancellationRequest_leaveRequestId_fkey`;
ALTER TABLE `LeaveRequest` DROP FOREIGN KEY `LeaveRequest_employeeId_fkey`;
ALTER TABLE `LoanRequest` DROP FOREIGN KEY `LoanRequest_employeeId_fkey`;
ALTER TABLE `OptionalHolidayRequest` DROP FOREIGN KEY `OptionalHolidayRequest_employeeId_fkey`;
ALTER TABLE `OvertimeRequest` DROP FOREIGN KEY `OvertimeRequest_employeeId_fkey`;
ALTER TABLE `Payslip` DROP FOREIGN KEY `Payslip_employeeId_fkey`;
ALTER TABLE `RefreshToken` DROP FOREIGN KEY `RefreshToken_userId_fkey`;
ALTER TABLE `RegularizationRequest` DROP FOREIGN KEY `RegularizationRequest_attendanceLogId_fkey`;
ALTER TABLE `RegularizationRequest` DROP FOREIGN KEY `RegularizationRequest_employeeId_fkey`;
ALTER TABLE `SalaryRevision` DROP FOREIGN KEY `SalaryRevision_employeeId_fkey`;
ALTER TABLE `SalaryStructure` DROP FOREIGN KEY `SalaryStructure_employeeId_fkey`;
ALTER TABLE `ShiftAssignment` DROP FOREIGN KEY `ShiftAssignment_employeeId_fkey`;
ALTER TABLE `ShiftChangeRequest` DROP FOREIGN KEY `ShiftChangeRequest_employeeId_fkey`;
ALTER TABLE `ShiftChangeRequest` DROP FOREIGN KEY `ShiftChangeRequest_shiftId_fkey`;
ALTER TABLE `TaxDeclaration` DROP FOREIGN KEY `TaxDeclaration_employeeId_fkey`;
ALTER TABLE `Timesheet` DROP FOREIGN KEY `Timesheet_employeeId_fkey`;
ALTER TABLE `Timesheet` DROP FOREIGN KEY `Timesheet_projectId_fkey`;
ALTER TABLE `TravelRequest` DROP FOREIGN KEY `TravelRequest_employeeId_fkey`;
ALTER TABLE `User` DROP FOREIGN KEY `User_employeeId_fkey`;
ALTER TABLE `User` DROP FOREIGN KEY `User_roleId_fkey`;
ALTER TABLE `AdditionalPayout` DROP INDEX `AdditionalPayout_employeeId_fkey`;
ALTER TABLE `EmployeeCertificationInfo` DROP INDEX `EmployeeCertificationInfo_employeeId_fkey`;
ALTER TABLE `EmployeeDocument` DROP INDEX `EmployeeDocument_employeeId_fkey`;
ALTER TABLE `EmployeeDocumentInfo` DROP INDEX `EmployeeDocumentInfo_employeeId_fkey`;
ALTER TABLE `EmployeeEmergencyContact` DROP INDEX `EmployeeEmergencyContact_employeeId_fkey`;
ALTER TABLE `EmployeeExperienceInfo` DROP INDEX `EmployeeExperienceInfo_employeeId_fkey`;
ALTER TABLE `EmployeeFamilyMember` DROP INDEX `EmployeeFamilyMember_employeeId_fkey`;
ALTER TABLE `EmployeeImmigrationInfo` DROP INDEX `EmployeeImmigrationInfo_employeeId_fkey`;
ALTER TABLE `EmployeeQualificationInfo` DROP INDEX `EmployeeQualificationInfo_employeeId_fkey`;
ALTER TABLE `ExitChecklist` DROP INDEX `ExitChecklist_exitRequestId_fkey`;
ALTER TABLE `Expense` DROP INDEX `Expense_employeeId_fkey`;
ALTER TABLE `Goal` DROP INDEX `Goal_employeeId_fkey`;
ALTER TABLE `RefreshToken` DROP INDEX `RefreshToken_userId_fkey`;
ALTER TABLE `RegularizationRequest` DROP INDEX `RegularizationRequest_attendanceLogId_fkey`;
ALTER TABLE `RegularizationRequest` DROP INDEX `RegularizationRequest_employeeId_fkey`;
ALTER TABLE `SalaryStructure` DROP INDEX `SalaryStructure_employeeId_fkey`;
ALTER TABLE `Timesheet` DROP INDEX `Timesheet_projectId_fkey`;
ALTER TABLE `Timesheet` DROP INDEX `Timesheet_employeeId_fkey`;
ALTER TABLE `TravelRequest` DROP INDEX `TravelRequest_employeeId_fkey`;
ALTER TABLE `Announcement` DROP INDEX `Announcement_companyId_fkey`;
ALTER TABLE `Asset` DROP INDEX `Asset_companyId_fkey`;
ALTER TABLE `AssetAssignment` DROP INDEX `AssetAssignment_assetId_fkey`;
ALTER TABLE `AssetAssignment` DROP INDEX `AssetAssignment_employeeId_fkey`;
ALTER TABLE `Branch` DROP INDEX `Branch_companyId_fkey`;
ALTER TABLE `Candidate` DROP INDEX `Candidate_jobId_fkey`;
ALTER TABLE `CourseEnrollment` DROP INDEX `CourseEnrollment_courseId_fkey`;
ALTER TABLE `CourseEnrollment` DROP INDEX `CourseEnrollment_employeeId_fkey`;
ALTER TABLE `Department` DROP INDEX `Department_companyId_fkey`;
ALTER TABLE `Designation` DROP INDEX `Designation_companyId_fkey`;
ALTER TABLE `ExitRequest` DROP INDEX `ExitRequest_companyId_fkey`;
ALTER TABLE `Holiday` DROP INDEX `Holiday_companyId_fkey`;
ALTER TABLE `Interview` DROP INDEX `Interview_candidateId_fkey`;
ALTER TABLE `Invoice` DROP INDEX `Invoice_companyId_fkey`;
ALTER TABLE `Invoice` DROP INDEX `Invoice_subscriptionId_fkey`;
ALTER TABLE `Job` DROP INDEX `Job_companyId_fkey`;
ALTER TABLE `LeaveBalance` DROP INDEX `LeaveBalance_leaveTypeId_fkey`;
ALTER TABLE `LeaveRequest` DROP INDEX `LeaveRequest_leaveTypeId_fkey`;
ALTER TABLE `LeaveRequest` DROP INDEX `LeaveRequest_employeeId_fkey`;
ALTER TABLE `LeaveType` DROP INDEX `LeaveType_companyId_fkey`;
ALTER TABLE `Offer` DROP INDEX `Offer_candidateId_fkey`;
ALTER TABLE `ReviewCycle` DROP INDEX `ReviewCycle_companyId_fkey`;
ALTER TABLE `PerformanceReview` DROP INDEX `PerformanceReview_employeeId_fkey`;
ALTER TABLE `PerformanceReview` DROP INDEX `PerformanceReview_reviewerId_fkey`;
ALTER TABLE `Project` DROP INDEX `Project_companyId_fkey`;
ALTER TABLE `Role` DROP INDEX `Role_companyId_fkey`;
ALTER TABLE `Shift` DROP INDEX `Shift_companyId_fkey`;
ALTER TABLE `ShiftAssignment` DROP INDEX `ShiftAssignment_shiftId_fkey`;
ALTER TABLE `ShiftAssignment` DROP INDEX `ShiftAssignment_employeeId_fkey`;
ALTER TABLE `Subscription` DROP INDEX `Subscription_companyId_fkey`;
ALTER TABLE `Task` DROP INDEX `Task_projectId_fkey`;
ALTER TABLE `User` DROP INDEX `User_companyId_fkey`;
ALTER TABLE `User` DROP INDEX `User_roleId_fkey`;
ALTER TABLE `HelpdeskTicket` DROP INDEX `HelpdeskTicket_companyId_fkey`;
ALTER TABLE `HelpdeskTicket` DROP INDEX `HelpdeskTicket_employeeId_fkey`;
ALTER TABLE `LoanRequest` DROP INDEX `LoanRequest_employeeId_fkey`;
ALTER TABLE `ShiftChangeRequest` DROP INDEX `ShiftChangeRequest_employeeId_fkey`;
ALTER TABLE `ShiftChangeRequest` DROP INDEX `ShiftChangeRequest_shiftId_fkey`;
ALTER TABLE `ShiftChangeRequest` DROP INDEX `ShiftChangeRequest_requestedShiftId_fkey`;
ALTER TABLE `CompOffRequest` DROP INDEX `CompOffRequest_employeeId_fkey`;
ALTER TABLE `FlexibleHolidayRequest` DROP INDEX `FlexibleHolidayRequest_employeeId_fkey`;
ALTER TABLE `OvertimeRequest` DROP INDEX `OvertimeRequest_employeeId_fkey`;
ALTER TABLE `OptionalHolidayRequest` DROP INDEX `OptionalHolidayRequest_employeeId_fkey`;
ALTER TABLE `LeaveCancellationRequest` DROP INDEX `LeaveCancellationRequest_leaveRequestId_fkey`;
ALTER TABLE `LeaveCancellationRequest` DROP INDEX `LeaveCancellationRequest_employeeId_fkey`;
ALTER TABLE `SalaryRevision` DROP INDEX `SalaryRevision_companyId_fkey`;
ALTER TABLE `TaxDeclaration` DROP INDEX `TaxDeclaration_companyId_fkey`;
ALTER TABLE `KPA` DROP INDEX `KPA_companyId_fkey`;
ALTER TABLE `KRA` DROP INDEX `KRA_companyId_fkey`;
ALTER TABLE `KRA` DROP INDEX `KRA_kpaId_fkey`;
ALTER TABLE `KPI` DROP INDEX `KPI_companyId_fkey`;
ALTER TABLE `KPI` DROP INDEX `KPI_kraId_fkey`;
ALTER TABLE `KPIAssignment` DROP INDEX `KPIAssignment_companyId_fkey`;
ALTER TABLE `KPIAssignment` DROP INDEX `KPIAssignment_kpiId_fkey`;
ALTER TABLE `KPITarget` DROP INDEX `KPITarget_companyId_fkey`;
ALTER TABLE `KPITarget` DROP INDEX `KPITarget_employeeId_fkey`;
ALTER TABLE `KPITarget` DROP INDEX `KPITarget_kpiId_fkey`;
ALTER TABLE `Evaluation360` DROP INDEX `Evaluation360_companyId_fkey`;
ALTER TABLE `Evaluation360` DROP INDEX `Evaluation360_employeeId_fkey`;
ALTER TABLE `ProfessionalTaxSlab` DROP INDEX `ProfessionalTaxSlab_companyId_fkey`;
ALTER TABLE `PFConfig` DROP INDEX `PFConfig_companyId_fkey`;
ALTER TABLE `ESICConfig` DROP INDEX `ESICConfig_companyId_fkey`;
ALTER TABLE `LWFConfig` DROP INDEX `LWFConfig_companyId_fkey`;
ALTER TABLE `ComplianceForm` DROP INDEX `ComplianceForm_companyId_fkey`;
ALTER TABLE `TDSSlab` DROP INDEX `TDSSlab_companyId_fkey`;
ALTER TABLE `TDSSection` DROP INDEX `TDSSection_companyId_fkey`;
ALTER TABLE `IncomeSlabCategory` DROP INDEX `IncomeSlabCategory_companyId_fkey`;
ALTER TABLE `HRMaster` DROP INDEX `HRMaster_companyId_fkey`;
ALTER TABLE `ImportMapping` DROP INDEX `ImportMapping_companyId_fkey`;
ALTER TABLE `HRForm` DROP INDEX `HRForm_companyId_fkey`;
ALTER TABLE `AuditLog` DROP INDEX `AuditLog_companyId_fkey`;
ALTER TABLE `Employee` DROP INDEX `Employee_branchId_fkey`;
ALTER TABLE `Employee` DROP INDEX `Employee_departmentId_fkey`;
ALTER TABLE `Employee` DROP INDEX `Employee_designationId_fkey`;
ALTER TABLE `Employee` DROP INDEX `Employee_managerId_fkey`;
ALTER TABLE `Payslip` DROP INDEX `Payslip_payrollCycleId_fkey`;
ALTER TABLE `Payslip` DROP INDEX `Payslip_employeeId_fkey`;
ALTER TABLE `EvaluationSetup` DROP INDEX `EvaluationSetup_companyId_fkey`;
SET FOREIGN_KEY_CHECKS=1;

-- 2) create Prisma FK indexes, widen text columns, recreate FKs






























































-- AlterTable
ALTER TABLE `AuditLog` MODIFY `metadata` longtext NULL;

-- AlterTable
ALTER TABLE `Employee` MODIFY `skills` longtext NULL,
    MODIFY `education` longtext NULL,
    MODIFY `experience` longtext NULL;

-- AlterTable
ALTER TABLE `Integration` MODIFY `config` longtext NULL;

-- AlterTable
ALTER TABLE `Payslip` MODIFY `breakdown` longtext NOT NULL;

-- AlterTable
ALTER TABLE `Setting` MODIFY `value` longtext NOT NULL;

-- AlterTable
ALTER TABLE `EvaluationSetup` MODIFY `reviewers` longtext NOT NULL;

-- CreateIndex
CREATE INDEX `Announcement_companyId_fkey` ON `Announcement`(`companyId` ASC);

-- CreateIndex
CREATE INDEX `Asset_companyId_fkey` ON `Asset`(`companyId` ASC);

-- CreateIndex
CREATE INDEX `AssetAssignment_assetId_fkey` ON `AssetAssignment`(`assetId` ASC);

-- CreateIndex
CREATE INDEX `AssetAssignment_employeeId_fkey` ON `AssetAssignment`(`employeeId` ASC);

-- CreateIndex
CREATE INDEX `RegularizationRequest_attendanceLogId_fkey` ON `RegularizationRequest`(`attendanceLogId` ASC);

-- CreateIndex
CREATE INDEX `RegularizationRequest_employeeId_fkey` ON `RegularizationRequest`(`employeeId` ASC);

-- CreateIndex
CREATE INDEX `AuditLog_companyId_fkey` ON `AuditLog`(`companyId` ASC);

-- CreateIndex
CREATE INDEX `Branch_companyId_fkey` ON `Branch`(`companyId` ASC);

-- CreateIndex
CREATE INDEX `Candidate_jobId_fkey` ON `Candidate`(`jobId` ASC);

-- CreateIndex
CREATE INDEX `CourseEnrollment_courseId_fkey` ON `CourseEnrollment`(`courseId` ASC);

-- CreateIndex
CREATE INDEX `CourseEnrollment_employeeId_fkey` ON `CourseEnrollment`(`employeeId` ASC);

-- CreateIndex
CREATE INDEX `Department_companyId_fkey` ON `Department`(`companyId` ASC);

-- CreateIndex
CREATE INDEX `Designation_companyId_fkey` ON `Designation`(`companyId` ASC);

-- CreateIndex
CREATE INDEX `Employee_branchId_fkey` ON `Employee`(`branchId` ASC);

-- CreateIndex
CREATE INDEX `Employee_departmentId_fkey` ON `Employee`(`departmentId` ASC);

-- CreateIndex
CREATE INDEX `Employee_designationId_fkey` ON `Employee`(`designationId` ASC);

-- CreateIndex
CREATE INDEX `Employee_managerId_fkey` ON `Employee`(`managerId` ASC);

-- CreateIndex
CREATE INDEX `EmployeeDocument_employeeId_fkey` ON `EmployeeDocument`(`employeeId` ASC);

-- CreateIndex
CREATE INDEX `ExitChecklist_exitRequestId_fkey` ON `ExitChecklist`(`exitRequestId` ASC);

-- CreateIndex
CREATE INDEX `ExitRequest_companyId_fkey` ON `ExitRequest`(`companyId` ASC);

-- CreateIndex
CREATE INDEX `Expense_employeeId_fkey` ON `Expense`(`employeeId` ASC);

-- CreateIndex
CREATE INDEX `Goal_employeeId_fkey` ON `Goal`(`employeeId` ASC);

-- CreateIndex
CREATE INDEX `Holiday_companyId_fkey` ON `Holiday`(`companyId` ASC);

-- CreateIndex
CREATE INDEX `Interview_candidateId_fkey` ON `Interview`(`candidateId` ASC);

-- CreateIndex
CREATE INDEX `Invoice_companyId_fkey` ON `Invoice`(`companyId` ASC);

-- CreateIndex
CREATE INDEX `Invoice_subscriptionId_fkey` ON `Invoice`(`subscriptionId` ASC);

-- CreateIndex
CREATE INDEX `Job_companyId_fkey` ON `Job`(`companyId` ASC);

-- CreateIndex
CREATE INDEX `LeaveBalance_leaveTypeId_fkey` ON `LeaveBalance`(`leaveTypeId` ASC);

-- CreateIndex
CREATE INDEX `LeaveRequest_employeeId_fkey` ON `LeaveRequest`(`employeeId` ASC);

-- CreateIndex
CREATE INDEX `LeaveRequest_leaveTypeId_fkey` ON `LeaveRequest`(`leaveTypeId` ASC);

-- CreateIndex
CREATE INDEX `LeaveType_companyId_fkey` ON `LeaveType`(`companyId` ASC);

-- CreateIndex
CREATE INDEX `Offer_candidateId_fkey` ON `Offer`(`candidateId` ASC);

-- CreateIndex
CREATE INDEX `Payslip_employeeId_fkey` ON `Payslip`(`employeeId` ASC);

-- CreateIndex
CREATE INDEX `Payslip_payrollCycleId_fkey` ON `Payslip`(`payrollCycleId` ASC);

-- CreateIndex
CREATE INDEX `AdditionalPayout_employeeId_fkey` ON `AdditionalPayout`(`employeeId` ASC);

-- CreateIndex
CREATE INDEX `ReviewCycle_companyId_fkey` ON `ReviewCycle`(`companyId` ASC);

-- CreateIndex
CREATE INDEX `PerformanceReview_employeeId_fkey` ON `PerformanceReview`(`employeeId` ASC);

-- CreateIndex
CREATE INDEX `PerformanceReview_reviewerId_fkey` ON `PerformanceReview`(`reviewerId` ASC);

-- CreateIndex
CREATE INDEX `Project_companyId_fkey` ON `Project`(`companyId` ASC);

-- CreateIndex
CREATE INDEX `RefreshToken_userId_fkey` ON `RefreshToken`(`userId` ASC);

-- CreateIndex
CREATE INDEX `Role_companyId_fkey` ON `Role`(`companyId` ASC);

-- CreateIndex
CREATE INDEX `SalaryStructure_employeeId_fkey` ON `SalaryStructure`(`employeeId` ASC);

-- CreateIndex
CREATE INDEX `Shift_companyId_fkey` ON `Shift`(`companyId` ASC);

-- CreateIndex
CREATE INDEX `ShiftAssignment_employeeId_fkey` ON `ShiftAssignment`(`employeeId` ASC);

-- CreateIndex
CREATE INDEX `ShiftAssignment_shiftId_fkey` ON `ShiftAssignment`(`shiftId` ASC);

-- CreateIndex
CREATE INDEX `Subscription_companyId_fkey` ON `Subscription`(`companyId` ASC);

-- CreateIndex
CREATE INDEX `Task_projectId_fkey` ON `Task`(`projectId` ASC);

-- CreateIndex
CREATE INDEX `Timesheet_employeeId_fkey` ON `Timesheet`(`employeeId` ASC);

-- CreateIndex
CREATE INDEX `Timesheet_projectId_fkey` ON `Timesheet`(`projectId` ASC);

-- CreateIndex
CREATE INDEX `TravelRequest_employeeId_fkey` ON `TravelRequest`(`employeeId` ASC);

-- CreateIndex
CREATE INDEX `User_companyId_fkey` ON `User`(`companyId` ASC);

-- CreateIndex
CREATE INDEX `User_roleId_fkey` ON `User`(`roleId` ASC);

-- CreateIndex
CREATE INDEX `HelpdeskTicket_companyId_fkey` ON `HelpdeskTicket`(`companyId` ASC);

-- CreateIndex
CREATE INDEX `HelpdeskTicket_employeeId_fkey` ON `HelpdeskTicket`(`employeeId` ASC);

-- CreateIndex
CREATE INDEX `EmployeeFamilyMember_employeeId_fkey` ON `EmployeeFamilyMember`(`employeeId` ASC);

-- CreateIndex
CREATE INDEX `EmployeeEmergencyContact_employeeId_fkey` ON `EmployeeEmergencyContact`(`employeeId` ASC);

-- CreateIndex
CREATE INDEX `EmployeeExperienceInfo_employeeId_fkey` ON `EmployeeExperienceInfo`(`employeeId` ASC);

-- CreateIndex
CREATE INDEX `EmployeeImmigrationInfo_employeeId_fkey` ON `EmployeeImmigrationInfo`(`employeeId` ASC);

-- CreateIndex
CREATE INDEX `EmployeeDocumentInfo_employeeId_fkey` ON `EmployeeDocumentInfo`(`employeeId` ASC);

-- CreateIndex
CREATE INDEX `EmployeeCertificationInfo_employeeId_fkey` ON `EmployeeCertificationInfo`(`employeeId` ASC);

-- CreateIndex
CREATE INDEX `EmployeeQualificationInfo_employeeId_fkey` ON `EmployeeQualificationInfo`(`employeeId` ASC);

-- CreateIndex
CREATE INDEX `LoanRequest_employeeId_fkey` ON `LoanRequest`(`employeeId` ASC);

-- CreateIndex
CREATE INDEX `ShiftChangeRequest_employeeId_fkey` ON `ShiftChangeRequest`(`employeeId` ASC);

-- CreateIndex
CREATE INDEX `ShiftChangeRequest_requestedShiftId_fkey` ON `ShiftChangeRequest`(`requestedShiftId` ASC);

-- CreateIndex
CREATE INDEX `ShiftChangeRequest_shiftId_fkey` ON `ShiftChangeRequest`(`shiftId` ASC);

-- CreateIndex
CREATE INDEX `CompOffRequest_employeeId_fkey` ON `CompOffRequest`(`employeeId` ASC);

-- CreateIndex
CREATE INDEX `FlexibleHolidayRequest_employeeId_fkey` ON `FlexibleHolidayRequest`(`employeeId` ASC);

-- CreateIndex
CREATE INDEX `OvertimeRequest_employeeId_fkey` ON `OvertimeRequest`(`employeeId` ASC);

-- CreateIndex
CREATE INDEX `OptionalHolidayRequest_employeeId_fkey` ON `OptionalHolidayRequest`(`employeeId` ASC);

-- CreateIndex
CREATE INDEX `LeaveCancellationRequest_employeeId_fkey` ON `LeaveCancellationRequest`(`employeeId` ASC);

-- CreateIndex
CREATE INDEX `LeaveCancellationRequest_leaveRequestId_fkey` ON `LeaveCancellationRequest`(`leaveRequestId` ASC);

-- CreateIndex
CREATE INDEX `SalaryRevision_companyId_fkey` ON `SalaryRevision`(`companyId` ASC);

-- CreateIndex
CREATE INDEX `TaxDeclaration_companyId_fkey` ON `TaxDeclaration`(`companyId` ASC);

-- CreateIndex
CREATE INDEX `KPA_companyId_fkey` ON `KPA`(`companyId` ASC);

-- CreateIndex
CREATE INDEX `KRA_companyId_fkey` ON `KRA`(`companyId` ASC);

-- CreateIndex
CREATE INDEX `KRA_kpaId_fkey` ON `KRA`(`kpaId` ASC);

-- CreateIndex
CREATE INDEX `KPI_companyId_fkey` ON `KPI`(`companyId` ASC);

-- CreateIndex
CREATE INDEX `KPI_kraId_fkey` ON `KPI`(`kraId` ASC);

-- CreateIndex
CREATE INDEX `KPIAssignment_companyId_fkey` ON `KPIAssignment`(`companyId` ASC);

-- CreateIndex
CREATE INDEX `KPIAssignment_kpiId_fkey` ON `KPIAssignment`(`kpiId` ASC);

-- CreateIndex
CREATE INDEX `KPITarget_companyId_fkey` ON `KPITarget`(`companyId` ASC);

-- CreateIndex
CREATE INDEX `KPITarget_employeeId_fkey` ON `KPITarget`(`employeeId` ASC);

-- CreateIndex
CREATE INDEX `KPITarget_kpiId_fkey` ON `KPITarget`(`kpiId` ASC);

-- CreateIndex
CREATE INDEX `EvaluationSetup_companyId_fkey` ON `EvaluationSetup`(`companyId` ASC);

-- CreateIndex
CREATE INDEX `Evaluation360_companyId_fkey` ON `Evaluation360`(`companyId` ASC);

-- CreateIndex
CREATE INDEX `Evaluation360_employeeId_fkey` ON `Evaluation360`(`employeeId` ASC);

-- CreateIndex
CREATE INDEX `ProfessionalTaxSlab_companyId_fkey` ON `ProfessionalTaxSlab`(`companyId` ASC);

-- CreateIndex
CREATE INDEX `PFConfig_companyId_fkey` ON `PFConfig`(`companyId` ASC);

-- CreateIndex
CREATE INDEX `ESICConfig_companyId_fkey` ON `ESICConfig`(`companyId` ASC);

-- CreateIndex
CREATE INDEX `LWFConfig_companyId_fkey` ON `LWFConfig`(`companyId` ASC);

-- CreateIndex
CREATE INDEX `ComplianceForm_companyId_fkey` ON `ComplianceForm`(`companyId` ASC);

-- CreateIndex
CREATE INDEX `TDSSlab_companyId_fkey` ON `TDSSlab`(`companyId` ASC);

-- CreateIndex
CREATE INDEX `TDSSection_companyId_fkey` ON `TDSSection`(`companyId` ASC);

-- CreateIndex
CREATE INDEX `IncomeSlabCategory_companyId_fkey` ON `IncomeSlabCategory`(`companyId` ASC);

-- CreateIndex
CREATE INDEX `HRMaster_companyId_fkey` ON `HRMaster`(`companyId` ASC);

-- CreateIndex
CREATE INDEX `ImportMapping_companyId_fkey` ON `ImportMapping`(`companyId` ASC);

-- CreateIndex
CREATE INDEX `HRForm_companyId_fkey` ON `HRForm`(`companyId` ASC);

-- AddForeignKey
ALTER TABLE `Announcement` ADD CONSTRAINT `Announcement_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Asset` ADD CONSTRAINT `Asset_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AssetAssignment` ADD CONSTRAINT `AssetAssignment_assetId_fkey` FOREIGN KEY (`assetId`) REFERENCES `Asset`(`id`) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AttendancePolicy` ADD CONSTRAINT `AttendancePolicy_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AuditLog` ADD CONSTRAINT `AuditLog_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Branch` ADD CONSTRAINT `Branch_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Candidate` ADD CONSTRAINT `Candidate_jobId_fkey` FOREIGN KEY (`jobId`) REFERENCES `Job`(`id`) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CompOffRequest` ADD CONSTRAINT `CompOffRequest_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ComplianceForm` ADD CONSTRAINT `ComplianceForm_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CourseEnrollment` ADD CONSTRAINT `CourseEnrollment_courseId_fkey` FOREIGN KEY (`courseId`) REFERENCES `TrainingCourse`(`id`) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Department` ADD CONSTRAINT `Department_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Designation` ADD CONSTRAINT `Designation_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ESICConfig` ADD CONSTRAINT `ESICConfig_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Employee` ADD CONSTRAINT `Employee_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Evaluation360` ADD CONSTRAINT `Evaluation360_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EvaluationSetup` ADD CONSTRAINT `EvaluationSetup_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ExitRequest` ADD CONSTRAINT `ExitRequest_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FlexibleHolidayRequest` ADD CONSTRAINT `FlexibleHolidayRequest_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `HRForm` ADD CONSTRAINT `HRForm_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `HRMaster` ADD CONSTRAINT `HRMaster_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `HelpdeskTicket` ADD CONSTRAINT `HelpdeskTicket_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Holiday` ADD CONSTRAINT `Holiday_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ImportMapping` ADD CONSTRAINT `ImportMapping_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `IncomeSlabCategory` ADD CONSTRAINT `IncomeSlabCategory_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Interview` ADD CONSTRAINT `Interview_candidateId_fkey` FOREIGN KEY (`candidateId`) REFERENCES `Candidate`(`id`) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Invoice` ADD CONSTRAINT `Invoice_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Job` ADD CONSTRAINT `Job_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `KPA` ADD CONSTRAINT `KPA_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `KPI` ADD CONSTRAINT `KPI_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `KPIAssignment` ADD CONSTRAINT `KPIAssignment_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `KPITarget` ADD CONSTRAINT `KPITarget_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `KRA` ADD CONSTRAINT `KRA_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LWFConfig` ADD CONSTRAINT `LWFConfig_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LeaveBalance` ADD CONSTRAINT `LeaveBalance_leaveTypeId_fkey` FOREIGN KEY (`leaveTypeId`) REFERENCES `LeaveType`(`id`) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LeaveCancellationRequest` ADD CONSTRAINT `LeaveCancellationRequest_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LeaveRequest` ADD CONSTRAINT `LeaveRequest_leaveTypeId_fkey` FOREIGN KEY (`leaveTypeId`) REFERENCES `LeaveType`(`id`) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LeaveType` ADD CONSTRAINT `LeaveType_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LoanRequest` ADD CONSTRAINT `LoanRequest_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Offer` ADD CONSTRAINT `Offer_candidateId_fkey` FOREIGN KEY (`candidateId`) REFERENCES `Candidate`(`id`) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OptionalHolidayRequest` ADD CONSTRAINT `OptionalHolidayRequest_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OvertimeRequest` ADD CONSTRAINT `OvertimeRequest_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PFConfig` ADD CONSTRAINT `PFConfig_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Payslip` ADD CONSTRAINT `Payslip_payrollCycleId_fkey` FOREIGN KEY (`payrollCycleId`) REFERENCES `PayrollCycle`(`id`) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PerformanceReview` ADD CONSTRAINT `PerformanceReview_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `Employee`(`id`) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PerformanceReview` ADD CONSTRAINT `PerformanceReview_reviewerId_fkey` FOREIGN KEY (`reviewerId`) REFERENCES `Employee`(`id`) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Permission` ADD CONSTRAINT `Permission_roleId_fkey` FOREIGN KEY (`roleId`) REFERENCES `Role`(`id`) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProfessionalTaxSlab` ADD CONSTRAINT `ProfessionalTaxSlab_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Project` ADD CONSTRAINT `Project_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ReviewCycle` ADD CONSTRAINT `ReviewCycle_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Role` ADD CONSTRAINT `Role_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SalaryRevision` ADD CONSTRAINT `SalaryRevision_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Setting` ADD CONSTRAINT `Setting_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Shift` ADD CONSTRAINT `Shift_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ShiftAssignment` ADD CONSTRAINT `ShiftAssignment_shiftId_fkey` FOREIGN KEY (`shiftId`) REFERENCES `Shift`(`id`) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ShiftChangeRequest` ADD CONSTRAINT `ShiftChangeRequest_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ShiftChangeRequest` ADD CONSTRAINT `ShiftChangeRequest_requestedShiftId_fkey` FOREIGN KEY (`requestedShiftId`) REFERENCES `Shift`(`id`) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Subscription` ADD CONSTRAINT `Subscription_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TDSSection` ADD CONSTRAINT `TDSSection_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TDSSlab` ADD CONSTRAINT `TDSSlab_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Task` ADD CONSTRAINT `Task_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TaxDeclaration` ADD CONSTRAINT `TaxDeclaration_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `User` ADD CONSTRAINT `User_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE NO ACTION ON UPDATE CASCADE;

