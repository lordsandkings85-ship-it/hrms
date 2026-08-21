-- Create ShiftType table
CREATE TABLE `ShiftType` (
  `id` VARCHAR(36) NOT NULL DEFAULT (UUID()),
  `companyId` VARCHAR(36) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `defaultStartTime` VARCHAR(191) NOT NULL,
  `defaultEndTime` VARCHAR(191) NOT NULL,
  `isFlexible` BOOLEAN NOT NULL DEFAULT false,
  `graceMinutes` INT NOT NULL DEFAULT 10,
  `coreHoursStart` VARCHAR(191) NULL,
  `coreHoursEnd` VARCHAR(191) NULL,
  `overtimeThresholdMinutes` INT NOT NULL DEFAULT 480,
  `isActive` BOOLEAN NOT NULL DEFAULT true,
  PRIMARY KEY (`id`),
  INDEX `ShiftType_companyId_idx`(`companyId`),
  CONSTRAINT `ShiftType_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Add shiftTypeId to Shift table
ALTER TABLE `Shift` ADD COLUMN `shiftTypeId` VARCHAR(36) NULL;
ALTER TABLE `Shift` ADD INDEX `Shift_shiftTypeId_idx`(`shiftTypeId`);
ALTER TABLE `Shift` ADD CONSTRAINT `Shift_shiftTypeId_fkey` FOREIGN KEY (`shiftTypeId`) REFERENCES `ShiftType`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- Add effectiveTo to ShiftAssignment table
ALTER TABLE `ShiftAssignment` ADD COLUMN `effectiveTo` DATETIME(3) NULL;
