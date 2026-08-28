-- Attendance & Leave Rules Migration
-- Adds:
--   AttendanceLog: shiftId / shift snapshot / late / worked-duration / attendanceStatus fields
--   RegularizationRequest: type (regularization | full_day) + resolutionNote
--   AttendanceAudit: audit trail for attendance corrections
--   CompOffBalance: second-Saturday comp-off credit ledger
--   LeaveMonthlyBalance: monthly casual-leave allocation ledger
--   LeaveTransaction: uniqueKey for idempotent allocations

-- 1. Expand AttendanceLog
ALTER TABLE `AttendanceLog` ADD COLUMN `shiftId` VARCHAR(191) NULL;
ALTER TABLE `AttendanceLog` ADD COLUMN `shiftStart` VARCHAR(191) NULL;
ALTER TABLE `AttendanceLog` ADD COLUMN `shiftEnd` VARCHAR(191) NULL;
ALTER TABLE `AttendanceLog` ADD COLUMN `requiredMinutes` INT NULL;
ALTER TABLE `AttendanceLog` ADD COLUMN `workedMinutes` INT NULL DEFAULT 0;
ALTER TABLE `AttendanceLog` ADD COLUMN `lateMinutes` INT NULL DEFAULT 0;
ALTER TABLE `AttendanceLog` ADD COLUMN `lateStatus` VARCHAR(191) NULL DEFAULT 'on_time';
ALTER TABLE `AttendanceLog` ADD COLUMN `attendanceStatus` VARCHAR(191) NULL;
ALTER TABLE `AttendanceLog` ADD COLUMN `isWeeklyOff` BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE `AttendanceLog` ADD COLUMN `compOffCredited` BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE `AttendanceLog` ADD INDEX `AttendanceLog_shiftId_idx` (`shiftId`);
ALTER TABLE `AttendanceLog` ADD CONSTRAINT `AttendanceLog_shiftId_fkey` FOREIGN KEY (`shiftId`) REFERENCES `Shift`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- 2. Expand RegularizationRequest
ALTER TABLE `RegularizationRequest` ADD COLUMN `type` VARCHAR(191) NOT NULL DEFAULT 'regularization';
ALTER TABLE `RegularizationRequest` ADD COLUMN `resolutionNote` VARCHAR(191) NULL;

-- 3. Create AttendanceAudit table
CREATE TABLE `AttendanceAudit` (
    `id` VARCHAR(191) NOT NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `employeeId` VARCHAR(191) NOT NULL,
    `attendanceLogId` VARCHAR(191) NULL,
    `action` VARCHAR(191) NOT NULL,
    `fromValue` VARCHAR(191) NULL,
    `toValue` VARCHAR(191) NULL,
    `actorId` VARCHAR(191) NULL,
    `actorRole` VARCHAR(191) NULL,
    `notes` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`id`),
    INDEX `AttendanceAudit_companyId_createdAt_idx` (`companyId`, `createdAt`),
    INDEX `AttendanceAudit_employeeId_createdAt_idx` (`employeeId`, `createdAt`),
    CONSTRAINT `AttendanceAudit_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `AttendanceAudit_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `Employee`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `AttendanceAudit_attendanceLogId_fkey` FOREIGN KEY (`attendanceLogId`) REFERENCES `AttendanceLog`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 4. Create CompOffBalance table
CREATE TABLE `CompOffBalance` (
    `id` VARCHAR(191) NOT NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `employeeId` VARCHAR(191) NOT NULL,
    `attendanceLogId` VARCHAR(191) NULL,
    `sourceType` VARCHAR(191) NOT NULL DEFAULT 'SECOND_SATURDAY',
    `creditAmount` DOUBLE NOT NULL DEFAULT 1,
    `consumedAmount` DOUBLE NOT NULL DEFAULT 0,
    `status` VARCHAR(191) NOT NULL DEFAULT 'AVAILABLE',
    `expiryDate` DATETIME(3) NULL,
    `consumedOn` DATETIME(3) NULL,
    `consumedBy` VARCHAR(191) NULL,
    `compOffRequestId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    PRIMARY KEY (`id`),
    INDEX `CompOffBalance_employeeId_status_idx` (`employeeId`, `status`),
    INDEX `CompOffBalance_companyId_status_idx` (`companyId`, `status`),
    CONSTRAINT `CompOffBalance_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `CompOffBalance_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `Employee`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `CompOffBalance_attendanceLogId_fkey` FOREIGN KEY (`attendanceLogId`) REFERENCES `AttendanceLog`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 5. Create LeaveMonthlyBalance table
CREATE TABLE `LeaveMonthlyBalance` (
    `id` VARCHAR(191) NOT NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `employeeId` VARCHAR(191) NOT NULL,
    `leaveTypeId` VARCHAR(191) NOT NULL,
    `year` INT NOT NULL,
    `month` INT NOT NULL,
    `openingBalance` DOUBLE NOT NULL DEFAULT 0,
    `allocated` DOUBLE NOT NULL DEFAULT 0,
    `carryForward` DOUBLE NOT NULL DEFAULT 0,
    `taken` DOUBLE NOT NULL DEFAULT 0,
    `pending` DOUBLE NOT NULL DEFAULT 0,
    `cancelled` DOUBLE NOT NULL DEFAULT 0,
    `adjusted` DOUBLE NOT NULL DEFAULT 0,
    `remaining` DOUBLE NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    PRIMARY KEY (`id`),
    UNIQUE INDEX `LeaveMonthlyBalance_employeeId_leaveTypeId_year_month_key` (`employeeId`, `leaveTypeId`, `year`, `month`),
    INDEX `LeaveMonthlyBalance_companyId_idx` (`companyId`),
    CONSTRAINT `LeaveMonthlyBalance_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `LeaveMonthlyBalance_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `Employee`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `LeaveMonthlyBalance_leaveTypeId_fkey` FOREIGN KEY (`leaveTypeId`) REFERENCES `LeaveType`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 6. Add uniqueKey to LeaveTransaction for idempotent allocations
ALTER TABLE `LeaveTransaction` ADD COLUMN `uniqueKey` VARCHAR(191) NULL;
CREATE UNIQUE INDEX `LeaveTransaction_uniqueKey_key` ON `LeaveTransaction` (`uniqueKey`);