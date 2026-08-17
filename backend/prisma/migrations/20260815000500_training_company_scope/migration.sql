-- Add companyId to training models (company-scoping). Existing rows backfilled to seed company.
ALTER TABLE `TrainingCourse` ADD COLUMN `companyId` VARCHAR(191) NOT NULL DEFAULT 'e87debef-a662-4fd7-b255-2e50c9f86d5b';
ALTER TABLE `CourseEnrollment` ADD COLUMN `companyId` VARCHAR(191) NOT NULL DEFAULT 'e87debef-a662-4fd7-b255-2e50c9f86d5b';

-- Backfill any existing rows to the seed company id (explicit, matching the DEFAULT above)
UPDATE `TrainingCourse` SET `companyId` = 'e87debef-a662-4fd7-b255-2e50c9f86d5b';
UPDATE `CourseEnrollment` SET `companyId` = 'e87debef-a662-4fd7-b255-2e50c9f86d5b';

-- Drop the default so future inserts must supply companyId explicitly
ALTER TABLE `TrainingCourse` ALTER COLUMN `companyId` DROP DEFAULT;
ALTER TABLE `CourseEnrollment` ALTER COLUMN `companyId` DROP DEFAULT;

CREATE INDEX `TrainingCourse_companyId_fkey` ON `TrainingCourse`(`companyId`);
CREATE INDEX `CourseEnrollment_companyId_fkey` ON `CourseEnrollment`(`companyId`);

ALTER TABLE `TrainingCourse` ADD CONSTRAINT `TrainingCourse_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `CourseEnrollment` ADD CONSTRAINT `CourseEnrollment_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;