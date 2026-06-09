CREATE TABLE `fabric_compatibilities` (
  `fabricId` INTEGER NOT NULL,
  `productType` ENUM('SHALWAR_KAMEEZ', 'T_SHIRT', 'PANTS', 'FORMAL_SHIRT') NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `fabric_compatibilities_productType_idx`(`productType`),
  PRIMARY KEY (`fabricId`, `productType`),
  CONSTRAINT `fabric_compatibilities_fabricId_fkey`
    FOREIGN KEY (`fabricId`) REFERENCES `fabrics`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Existing MySQL collation is case-insensitive, so this prevents duplicate
-- normalized hex values within one owner catalog.
CREATE UNIQUE INDEX `colors_userId_hexCode_key`
  ON `colors`(`userId`, `hexCode`);
