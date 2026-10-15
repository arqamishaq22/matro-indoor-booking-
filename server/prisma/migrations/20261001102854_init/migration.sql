-- CreateTable
CREATE TABLE `Venue` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `shortName` VARCHAR(191) NOT NULL,
    `city` VARCHAR(191) NOT NULL,
    `address` VARCHAR(191) NOT NULL,
    `location` VARCHAR(191) NOT NULL,
    `operatingHours` VARCHAR(191) NOT NULL,
    `badge` VARCHAR(191) NULL,
    `imageUrl` VARCHAR(191) NULL,
    `rating` DOUBLE NULL,
    `reviewsCount` INTEGER NOT NULL DEFAULT 0,
    `startingPrice` INTEGER NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Venue_city_idx`(`city`),
    INDEX `Venue_isActive_idx`(`isActive`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Court` (
    `id` VARCHAR(191) NOT NULL,
    `venueId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `sport` VARCHAR(191) NOT NULL,
    `surfaceType` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,

    INDEX `Court_venueId_idx`(`venueId`),
    INDEX `Court_sport_idx`(`sport`),
    INDEX `Court_venueId_sport_idx`(`venueId`, `sport`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PricingRule` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `courtId` VARCHAR(191) NOT NULL,
    `dayType` VARCHAR(191) NOT NULL,
    `period` VARCHAR(191) NOT NULL,
    `pricePerHour` INTEGER NOT NULL,

    INDEX `PricingRule_courtId_idx`(`courtId`),
    UNIQUE INDEX `PricingRule_courtId_dayType_period_key`(`courtId`, `dayType`, `period`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `User` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `phone` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `User_phone_key`(`phone`),
    INDEX `User_phone_idx`(`phone`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Booking` (
    `id` VARCHAR(191) NOT NULL,
    `courtId` VARCHAR(191) NOT NULL,
    `userId` INTEGER NULL,
    `playerName` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NOT NULL,
    `notes` VARCHAR(191) NOT NULL DEFAULT '',
    `date` VARCHAR(191) NOT NULL,
    `startTime` VARCHAR(191) NOT NULL,
    `endTime` VARCHAR(191) NOT NULL,
    `durationHours` INTEGER NOT NULL,
    `pricePerHour` INTEGER NOT NULL,
    `totalAmount` INTEGER NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'CONFIRMED',
    `paymentStatus` VARCHAR(191) NOT NULL DEFAULT 'UNPAID',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Booking_courtId_date_idx`(`courtId`, `date`),
    INDEX `Booking_date_idx`(`date`),
    INDEX `Booking_status_idx`(`status`),
    INDEX `Booking_phone_idx`(`phone`),
    UNIQUE INDEX `Booking_courtId_date_startTime_endTime_key`(`courtId`, `date`, `startTime`, `endTime`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Court` ADD CONSTRAINT `Court_venueId_fkey` FOREIGN KEY (`venueId`) REFERENCES `Venue`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PricingRule` ADD CONSTRAINT `PricingRule_courtId_fkey` FOREIGN KEY (`courtId`) REFERENCES `Court`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Booking` ADD CONSTRAINT `Booking_courtId_fkey` FOREIGN KEY (`courtId`) REFERENCES `Court`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Booking` ADD CONSTRAINT `Booking_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
