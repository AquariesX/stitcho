-- Additive migration: existing catalog and order data is preserved.

ALTER TABLE `products`
  ADD COLUMN `description` TEXT NULL,
  ADD COLUMN `productType` ENUM('SHALWAR_KAMEEZ', 'T_SHIRT', 'PANTS', 'FORMAL_SHIRT') NULL,
  ADD COLUMN `gender` ENUM('MEN') NOT NULL DEFAULT 'MEN',
  ADD COLUMN `previewType` VARCHAR(50) NULL,
  ADD COLUMN `frontPreviewAsset` VARCHAR(500) NULL,
  ADD COLUMN `backPreviewAsset` VARCHAR(500) NULL,
  ADD COLUMN `previewStorageType` ENUM('LOCAL', 'REMOTE') NOT NULL DEFAULT 'LOCAL',
  ADD COLUMN `estimatedDays` INTEGER NULL,
  ADD COLUMN `measurementProfile` VARCHAR(50) NULL,
  ADD COLUMN `isFeatured` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `displayOrder` INTEGER NOT NULL DEFAULT 0;

CREATE INDEX `products_productType_isAvailable_idx`
  ON `products`(`productType`, `isAvailable`);
CREATE INDEX `products_displayOrder_idx` ON `products`(`displayOrder`);

ALTER TABLE `fabrics`
  ADD COLUMN `description` TEXT NULL,
  ADD COLUMN `textureUrl` VARCHAR(500) NULL,
  ADD COLUMN `textureStorageType` ENUM('LOCAL', 'REMOTE') NOT NULL DEFAULT 'REMOTE',
  ADD COLUMN `priceAdjustment` DECIMAL(8, 2) NOT NULL DEFAULT 0.00,
  ADD COLUMN `unit` VARCHAR(20) NOT NULL DEFAULT 'METER',
  ADD COLUMN `isSeamlessTexture` BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE `colors`
  ADD COLUMN `isAvailable` BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN `displayOrder` INTEGER NOT NULL DEFAULT 0;
CREATE INDEX `colors_isAvailable_displayOrder_idx`
  ON `colors`(`isAvailable`, `displayOrder`);

ALTER TABLE `styles`
  MODIFY `imageUrl` VARCHAR(500) NULL,
  ADD COLUMN `productType` ENUM('SHALWAR_KAMEEZ', 'T_SHIRT', 'PANTS', 'FORMAL_SHIRT') NULL,
  ADD COLUMN `groupType` ENUM(
    'COLLAR', 'NECK', 'SLEEVE', 'CUFF', 'POCKET', 'PLACKET',
    'FIT', 'SHALWAR_STYLE', 'WAIST', 'FRONT', 'BOTTOM'
  ) NULL,
  ADD COLUMN `isRequired` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `allowMultiple` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `displayOrder` INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN `isAvailable` BOOLEAN NOT NULL DEFAULT true;
CREATE INDEX `styles_productType_groupType_isAvailable_idx`
  ON `styles`(`productType`, `groupType`, `isAvailable`);

ALTER TABLE `style_options`
  ADD COLUMN `overlayKey` VARCHAR(100) NULL,
  ADD COLUMN `frontOverlayAsset` VARCHAR(500) NULL,
  ADD COLUMN `backOverlayAsset` VARCHAR(500) NULL,
  ADD COLUMN `assetStorageType` ENUM('LOCAL', 'REMOTE') NOT NULL DEFAULT 'LOCAL',
  ADD COLUMN `isDefault` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `isAvailable` BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN `displayOrder` INTEGER NOT NULL DEFAULT 0;
CREATE INDEX `style_options_isAvailable_displayOrder_idx`
  ON `style_options`(`isAvailable`, `displayOrder`);

ALTER TABLE `measurements`
  MODIFY `neck` DECIMAL(5, 2) NULL,
  MODIFY `chest` DECIMAL(5, 2) NULL,
  MODIFY `stomach` DECIMAL(5, 2) NULL,
  MODIFY `length` DECIMAL(5, 2) NULL,
  MODIFY `shoulder` DECIMAL(5, 2) NULL,
  MODIFY `sleeve` DECIMAL(5, 2) NULL,
  ADD COLUMN `wrist` DECIMAL(5, 2) NULL,
  ADD COLUMN `productType` ENUM('SHALWAR_KAMEEZ', 'T_SHIRT', 'PANTS', 'FORMAL_SHIRT') NULL,
  ADD COLUMN `profileName` VARCHAR(50) NULL;

ALTER TABLE `orders`
  ADD COLUMN `previewType` VARCHAR(50) NULL,
  ADD COLUMN `previewFrontUrl` VARCHAR(500) NULL,
  ADD COLUMN `previewBackUrl` VARCHAR(500) NULL,
  ADD COLUMN `customizationSnapshot` JSON NULL,
  ADD COLUMN `previewGeneratedAt` DATETIME(3) NULL;

CREATE TABLE `product_fabrics` (
  `productId` INTEGER NOT NULL,
  `fabricId` INTEGER NOT NULL,
  `isDefault` BOOLEAN NOT NULL DEFAULT false,
  `priceAdjustment` DECIMAL(8, 2) NOT NULL DEFAULT 0.00,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  INDEX `product_fabrics_fabricId_idx`(`fabricId`),
  PRIMARY KEY (`productId`, `fabricId`),
  CONSTRAINT `product_fabrics_productId_fkey`
    FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `product_fabrics_fabricId_fkey`
    FOREIGN KEY (`fabricId`) REFERENCES `fabrics`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `product_colors` (
  `productId` INTEGER NOT NULL,
  `colorId` INTEGER NOT NULL,
  `isDefault` BOOLEAN NOT NULL DEFAULT false,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `product_colors_colorId_idx`(`colorId`),
  PRIMARY KEY (`productId`, `colorId`),
  CONSTRAINT `product_colors_productId_fkey`
    FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `product_colors_colorId_fkey`
    FOREIGN KEY (`colorId`) REFERENCES `colors`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `product_styles` (
  `productId` INTEGER NOT NULL,
  `styleOptionId` INTEGER NOT NULL,
  `isDefault` BOOLEAN NOT NULL DEFAULT false,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `product_styles_styleOptionId_idx`(`styleOptionId`),
  PRIMARY KEY (`productId`, `styleOptionId`),
  CONSTRAINT `product_styles_productId_fkey`
    FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `product_styles_styleOptionId_fkey`
    FOREIGN KEY (`styleOptionId`) REFERENCES `style_options`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `product_preview_assets` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `productId` INTEGER NOT NULL,
  `view` ENUM('FRONT', 'BACK') NOT NULL,
  `assetKey` VARCHAR(100) NOT NULL,
  `assetUrl` VARCHAR(500) NOT NULL,
  `storageType` ENUM('LOCAL', 'REMOTE') NOT NULL DEFAULT 'LOCAL',
  `width` INTEGER NULL,
  `height` INTEGER NULL,
  `isActive` BOOLEAN NOT NULL DEFAULT true,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `product_preview_assets_productId_view_assetKey_key`
    (`productId`, `view`, `assetKey`),
  INDEX `product_preview_assets_productId_idx`(`productId`),
  PRIMARY KEY (`id`),
  CONSTRAINT `product_preview_assets_productId_fkey`
    FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
