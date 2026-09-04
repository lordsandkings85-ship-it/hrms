-- Idempotent additive migration for the Workora HRMS Notification table.
-- Safe to run repeatedly: creates the table + indexes only if absent.
-- Uses MySQL prepared-statement idiom because MySQL stored procedures are
-- required for dynamic DDL inside IF blocks.

SET @exists := (
  SELECT COUNT(*) FROM information_schema.tables
  WHERE table_schema = DATABASE() AND table_name = 'Notification'
);

SET @sql := IF(@exists = 0,
  'CREATE TABLE `Notification` (
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
    `priority` VARCHAR(191) NOT NULL DEFAULT \'normal\',
    `isRead` BOOLEAN NOT NULL DEFAULT false,
    `readAt` DATETIME(3) NULL,
    `audience` VARCHAR(191) NOT NULL DEFAULT \'PERSONAL\',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`id`)
  ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx1 := IF(
  (SELECT COUNT(*) FROM information_schema.statistics
   WHERE table_schema = DATABASE() AND table_name = 'Notification' AND index_name = 'Notification_companyId_idx') = 0,
  'CREATE INDEX `Notification_companyId_idx` ON `Notification`(`companyId`)',
  'SELECT 1'
);
PREPARE stmt1 FROM @idx1; EXECUTE stmt1; DEALLOCATE PREPARE stmt1;

SET @idx2 := IF(
  (SELECT COUNT(*) FROM information_schema.statistics
   WHERE table_schema = DATABASE() AND table_name = 'Notification' AND index_name = 'Notification_recipientUserId_idx') = 0,
  'CREATE INDEX `Notification_recipientUserId_idx` ON `Notification`(`recipientUserId`)',
  'SELECT 1'
);
PREPARE stmt2 FROM @idx2; EXECUTE stmt2; DEALLOCATE PREPARE stmt2;

SET @idx3 := IF(
  (SELECT COUNT(*) FROM information_schema.statistics
   WHERE table_schema = DATABASE() AND table_name = 'Notification' AND index_name = 'Notification_isRead_createdAt_idx') = 0,
  'CREATE INDEX `Notification_isRead_createdAt_idx` ON `Notification`(`isRead`, `createdAt`)',
  'SELECT 1'
);
PREPARE stmt3 FROM @idx3; EXECUTE stmt3; DEALLOCATE PREPARE stmt3;
