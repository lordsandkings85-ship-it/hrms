-- Notifications table (additive; no FK constraints to existing tables to avoid MySQL FK-drift risk)
-- Workora HRMS: persisted, per-user, role-scoped notifications.

CREATE TABLE `Notification` (
    `id` VARCHAR(191) NOT NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `recipientUserId` VARCHAR(191) NULL,
    `recipientEmployeeId` VARCHAR(191) NULL,
    `roleId` VARCHAR(191) NULL,
    `type` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `message` TEXT NULL,
    `referenceType` VARCHAR(191) NULL,
    `referenceId` VARCHAR(191) NULL,
    `priority` VARCHAR(191) NOT NULL DEFAULT 'normal',
    `isRead` BOOLEAN NOT NULL DEFAULT false,
    `readAt` DATETIME(3) NULL,
    `audience` VARCHAR(191) NOT NULL DEFAULT 'PERSONAL',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE INDEX `Notification_companyId_idx` ON `Notification`(`companyId`);
CREATE INDEX `Notification_recipientUserId_idx` ON `Notification`(`recipientUserId`);
CREATE INDEX `Notification_isRead_createdAt_idx` ON `Notification`(`isRead`, `createdAt`);
