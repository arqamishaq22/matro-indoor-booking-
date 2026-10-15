-- Add authentication fields to User.
ALTER TABLE `User`
    ADD COLUMN `passwordHash` VARCHAR(191) NOT NULL,
    ADD COLUMN `role` VARCHAR(191) NOT NULL DEFAULT 'USER',
    ADD COLUMN `isActive` BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE INDEX `User_role_idx` ON `User`(`role`);
