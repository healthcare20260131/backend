/*
  Warnings:

  - Made the column `name` on table `User` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE `User` MODIFY `name` VARCHAR(191) NOT NULL;

-- CreateTable
CREATE TABLE `CallLog` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `user1Id` INTEGER NOT NULL,
    `user2Id` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CallResult` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `callDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `callDuration` INTEGER NOT NULL,
    `opponentName` VARCHAR(191) NOT NULL,
    `mood` VARCHAR(191) NOT NULL,
    `userId` INTEGER NOT NULL,
    `callLogId` INTEGER NOT NULL,

    UNIQUE INDEX `CallResult_callLogId_userId_key`(`callLogId`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CheerMessage` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `content` VARCHAR(200) NOT NULL,
    `receivedDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `senderName` VARCHAR(191) NOT NULL,
    `senderId` INTEGER NOT NULL,
    `receiverId` INTEGER NOT NULL,
    `callLogId` INTEGER NOT NULL,

    UNIQUE INDEX `CheerMessage_callLogId_senderId_key`(`callLogId`, `senderId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `CallLog` ADD CONSTRAINT `CallLog_user1Id_fkey` FOREIGN KEY (`user1Id`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CallLog` ADD CONSTRAINT `CallLog_user2Id_fkey` FOREIGN KEY (`user2Id`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CallResult` ADD CONSTRAINT `CallResult_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CallResult` ADD CONSTRAINT `CallResult_callLogId_fkey` FOREIGN KEY (`callLogId`) REFERENCES `CallLog`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CheerMessage` ADD CONSTRAINT `CheerMessage_senderId_fkey` FOREIGN KEY (`senderId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CheerMessage` ADD CONSTRAINT `CheerMessage_receiverId_fkey` FOREIGN KEY (`receiverId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CheerMessage` ADD CONSTRAINT `CheerMessage_callLogId_fkey` FOREIGN KEY (`callLogId`) REFERENCES `CallLog`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
