-- Workora HRMS — Security hardening (Windows-only / emulator blocking)
-- Apply once against the production database. The production schema has no
-- `_prisma_migrations` history, so this file is executed directly:
--
--   npx prisma db execute --file prisma/sql/2026-11-03-security-hardening.sql --schema prisma/schema.prisma
--
-- or statement-by-statement with `prisma.$executeRawUnsafe` (see
-- prisma/scripts/apply-security-hardening.js).
--
-- All statements are additive. Re-running the ALTER statements will fail with
-- "Duplicate column name"; that is safe to ignore after a first successful run.

ALTER TABLE `User`
  ADD COLUMN `securityBlocked` BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN `securityBlockedAt` DATETIME(3) NULL,
  ADD COLUMN `securityBlockReason` TEXT NULL,
  ADD COLUMN `securityBlockedBy` VARCHAR(191) NULL,
  ADD COLUMN `securityUnblockedAt` DATETIME(3) NULL,
  ADD COLUMN `securityUnblockedBy` VARCHAR(191) NULL,
  ADD COLUMN `securityUnblockReason` TEXT NULL;

ALTER TABLE `RefreshToken`
  ADD COLUMN `sessionId` VARCHAR(191) NULL;

CREATE TABLE IF NOT EXISTS `SecurityEvent` (
  `id` VARCHAR(191) NOT NULL,
  `companyId` VARCHAR(191) NULL,
  `userId` VARCHAR(191) NULL,
  `employeeId` VARCHAR(191) NULL,
  `eventType` VARCHAR(191) NOT NULL,
  `severity` VARCHAR(191) NOT NULL DEFAULT 'high',
  `stage` VARCHAR(191) NULL,
  `platform` VARCHAR(191) NULL,
  `osName` VARCHAR(191) NULL,
  `osVersion` VARCHAR(191) NULL,
  `arch` VARCHAR(191) NULL,
  `deviceId` VARCHAR(191) NULL,
  `deviceInfo` JSON NULL,
  `detectionReason` TEXT NULL,
  `ipAddress` VARCHAR(191) NULL,
  `userAgent` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `SecurityEvent_companyId_createdAt_idx` (`companyId`, `createdAt`),
  INDEX `SecurityEvent_userId_createdAt_idx` (`userId`, `createdAt`),
  INDEX `SecurityEvent_eventType_createdAt_idx` (`eventType`, `createdAt`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `UserSession` (
  `id` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `companyId` VARCHAR(191) NULL,
  `deviceId` VARCHAR(191) NULL,
  `clientType` VARCHAR(191) NULL,
  `platform` VARCHAR(191) NULL,
  `osName` VARCHAR(191) NULL,
  `osVersion` VARCHAR(191) NULL,
  `arch` VARCHAR(191) NULL,
  `ipAddress` VARCHAR(191) NULL,
  `userAgent` TEXT NULL,
  `status` VARCHAR(191) NOT NULL DEFAULT 'ACTIVE',
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `lastSeenAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `revokedAt` DATETIME(3) NULL,
  `revokedReason` VARCHAR(191) NULL,
  PRIMARY KEY (`id`),
  INDEX `UserSession_userId_status_idx` (`userId`, `status`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `TrustedDevice` (
  `id` VARCHAR(191) NOT NULL,
  `companyId` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NULL,
  `deviceId` VARCHAR(191) NOT NULL,
  `clientType` VARCHAR(191) NULL,
  `platform` VARCHAR(191) NULL,
  `osName` VARCHAR(191) NULL,
  `osVersion` VARCHAR(191) NULL,
  `label` VARCHAR(191) NULL,
  `status` VARCHAR(191) NOT NULL DEFAULT 'APPROVED',
  `approvedBy` VARCHAR(191) NULL,
  `approvedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `lastSeenAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `TrustedDevice_companyId_deviceId_key` (`companyId`, `deviceId`),
  INDEX `TrustedDevice_userId_idx` (`userId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
