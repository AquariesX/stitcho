ALTER TABLE `products`
  ADD COLUMN `thumbnailUrl` VARCHAR(500) NULL,
  ADD COLUMN `modelImageUrl` VARCHAR(500) NULL,
  ADD COLUMN `topOverlayUrl` VARCHAR(500) NULL,
  ADD COLUMN `bottomOverlayUrl` VARCHAR(500) NULL,
  ADD COLUMN `overlayKey` VARCHAR(100) NULL,
  ADD COLUMN `previewEnabled` BOOLEAN NOT NULL DEFAULT false;

UPDATE `products`
SET `thumbnailUrl` = `imageUrl`
WHERE `thumbnailUrl` IS NULL;

ALTER TABLE `style_options`
  ADD COLUMN `overlayImageUrl` VARCHAR(500) NULL,
  ADD COLUMN `styleType` ENUM('COLLAR', 'CUFF', 'POCKET', 'BUTTON', 'OTHER') NULL,
  ADD COLUMN `zIndex` INTEGER NOT NULL DEFAULT 30;
