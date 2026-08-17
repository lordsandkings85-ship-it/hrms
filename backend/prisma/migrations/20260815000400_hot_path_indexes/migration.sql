-- Hot-path composite indexes (P9): attendance/leave/payslip query patterns
CREATE INDEX `Holiday_companyId_date_idx` ON `Holiday`(`companyId`, `date`);
CREATE INDEX `LeaveRequest_employeeId_status_idx` ON `LeaveRequest`(`employeeId`, `status`);
CREATE INDEX `LeaveRequest_status_idx` ON `LeaveRequest`(`status`);
CREATE INDEX `Payslip_employeeId_payrollCycleId_idx` ON `Payslip`(`employeeId`, `payrollCycleId`);