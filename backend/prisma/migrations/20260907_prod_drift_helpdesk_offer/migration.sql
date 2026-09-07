-- Prod schema drift fixes (additive; no FK changes).
-- The HelpdeskTicket.ratings and Offer.createdAt columns existed in the Prisma
-- schema but were missing from the production DB, causing 500s on
-- GET /api/v1/helpdesk/mine and any Offer read path.

ALTER TABLE `HelpdeskTicket` ADD COLUMN `ratings` JSON NULL;
ALTER TABLE `Offer` ADD COLUMN `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);