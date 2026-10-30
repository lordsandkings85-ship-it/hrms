-- Per-employee Saturday weekly-off override.
-- NULL saturdayOffRule = inherit the company policy `custom.secondSaturdayOff` (current behaviour).
-- Allowed values: 'SECOND' | 'FOURTH' | 'NONE'.
ALTER TABLE `Employee` ADD COLUMN `saturdayOffRule` VARCHAR(191) NULL;
ALTER TABLE `Employee` ADD COLUMN `saturdayOffEffectiveFrom` DATETIME(3) NULL;

-- Move LAK1816 / LAK1802 / LAK1801 from the 2nd-Saturday weekly off to the 4th Saturday,
-- effective 1 Nov 2026. Earlier months stay on the company default.
UPDATE `Employee`
SET `saturdayOffRule` = 'FOURTH',
    `saturdayOffEffectiveFrom` = '2026-11-01 00:00:00.000'
WHERE UPPER(`employeeCode`) IN ('LAK1816', 'LAK1802', 'LAK1801');
