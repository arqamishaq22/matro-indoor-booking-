-- Add isActive column to PricingRule (defaults to true = 1)
ALTER TABLE `PricingRule` ADD COLUMN `isActive` BOOLEAN NOT NULL DEFAULT true;

-- Index for fast filtering of active rules
CREATE INDEX `PricingRule_isActive_idx` ON `PricingRule`(`isActive`);
