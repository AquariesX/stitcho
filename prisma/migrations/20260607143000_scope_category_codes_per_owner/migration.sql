-- Allow every tailor to own the same controlled category codes while
-- preventing duplicate category codes within one tailor/admin catalog.
DROP INDEX `categories_code_key` ON `categories`;
CREATE UNIQUE INDEX `categories_userId_code_key`
  ON `categories`(`userId`, `code`);
