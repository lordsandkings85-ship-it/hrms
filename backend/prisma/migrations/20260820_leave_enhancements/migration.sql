-- Leave Management Enhancement Migration
-- Adds: expanded LeaveType, expanded LeaveBalance, LeaveTransaction, LeaveYear

-- 1. Expand LeaveType table
ALTER TABLE `LeaveType` ADD COLUMN `code` VARCHAR(191) NULL;
ALTER TABLE `LeaveType` ADD COLUMN `annualAllocation` DOUBLE NOT NULL DEFAULT 0;
ALTER TABLE `LeaveType` ADD COLUMN `maxConsecutiveDays` DOUBLE NULL;
ALTER TABLE `LeaveType` ADD COLUMN `halfDayAllowed` BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE `LeaveType` ADD COLUMN `carryForward` BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE `LeaveType` ADD COLUMN `carryForwardLimit` DOUBLE NULL;
ALTER TABLE `LeaveType` ADD COLUMN `encashment` BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE `LeaveType` ADD COLUMN `negativeBalanceAllowed` BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE `LeaveType` ADD COLUMN `attachmentRequired` BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE `LeaveType` ADD COLUMN `applicableAfterDays` DOUBLE NULL;
ALTER TABLE `LeaveType` ADD COLUMN `approvalRequired` BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE `LeaveType` ADD COLUMN `gender` VARCHAR(191) NULL;
ALTER TABLE `LeaveType` ADD COLUMN `isActive` BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE `LeaveType` ADD UNIQUE INDEX `LeaveType_companyId_code_key` (`companyId`, `code`);
ALTER TABLE `LeaveType` ADD INDEX `LeaveType_companyId_idx` (`companyId`);

-- 2. Expand LeaveBalance table
ALTER TABLE `LeaveBalance` ADD COLUMN `carriedOver` DOUBLE NOT NULL DEFAULT 0;
ALTER TABLE `LeaveBalance` ADD COLUMN `encashed` DOUBLE NOT NULL DEFAULT 0;
ALTER TABLE `LeaveBalance` ADD COLUMN `pending` DOUBLE NOT NULL DEFAULT 0;
ALTER TABLE `LeaveBalance` MODIFY COLUMN `allotted` DOUBLE NOT NULL DEFAULT 0;

-- 3. Create LeaveTransaction table
CREATE TABLE `LeaveTransaction` (
    `id` VARCHAR(191) NOT NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `employeeId` VARCHAR(191) NOT NULL,
    `leaveTypeId` VARCHAR(191) NOT NULL,
    `leaveRequestId` VARCHAR(191) NULL,
    `year` INT NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `amount` DOUBLE NOT NULL,
    `reason` VARCHAR(191) NULL,
    `approvedBy` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`id`),
    INDEX `LeaveTransaction_employeeId_year_idx` (`employeeId`, `year`),
    INDEX `LeaveTransaction_companyId_year_idx` (`companyId`, `year`),
    INDEX `LeaveTransaction_leaveRequestId_idx` (`leaveRequestId`),
    CONSTRAINT `LeaveTransaction_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `LeaveTransaction_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `Employee`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `LeaveTransaction_leaveTypeId_fkey` FOREIGN KEY (`leaveTypeId`) REFERENCES `LeaveType`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `LeaveTransaction_leaveRequestId_fkey` FOREIGN KEY (`leaveRequestId`) REFERENCES `LeaveRequest`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 4. Create LeaveYear table
CREATE TABLE `LeaveYear` (
    `id` VARCHAR(191) NOT NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `startDate` DATETIME(3) NOT NULL,
    `endDate` DATETIME(3) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT false,
    `carryForwardProcessed` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    PRIMARY KEY (`id`),
    UNIQUE INDEX `LeaveYear_companyId_name_key` (`companyId`, `name`),
    INDEX `LeaveYear_companyId_idx` (`companyId`),
    CONSTRAINT `LeaveYear_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
