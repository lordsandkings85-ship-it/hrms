-- AlterTable Announcement
ALTER TABLE `Announcement` ADD COLUMN `category` VARCHAR(191) NOT NULL DEFAULT 'Company';
ALTER TABLE `Announcement` ADD COLUMN `author` VARCHAR(191) NOT NULL DEFAULT 'HR Team';
ALTER TABLE `Announcement` ADD COLUMN `isPinned` BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE `Announcement` ADD COLUMN `isActive` BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE `Announcement` ADD COLUMN `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);

-- CreateIndex Announcement_companyId
CREATE INDEX `Announcement_companyId_idx` ON `Announcement`(`companyId`);
