import assert from "node:assert/strict";
import test from "node:test";
import { AssetStorageType, ProductType } from "@prisma/client";
import {
  colorInputSchema,
  fabricInputSchema,
  isPngAsset,
  productInputSchema,
  validateAssetLocation,
} from "../src/lib/catalog-validation";
import {
  isFabricAllowed,
  isStyleTypeCompatible,
} from "../src/lib/catalog-rules";
import { validateMeasurementsForProduct } from "../src/lib/measurement-validation";

test("formal shirt allows Oxford cotton but rejects T-shirt jersey", () => {
  assert.equal(isFabricAllowed("FORMAL_SHIRT", "Oxford Cotton"), true);
  assert.equal(isFabricAllowed("FORMAL_SHIRT", "Cotton Jersey"), false);
});

test("formal shirt styles cannot come from T-shirt groups", () => {
  assert.equal(isStyleTypeCompatible("FORMAL_SHIRT", "FORMAL_SHIRT"), true);
  assert.equal(isStyleTypeCompatible("FORMAL_SHIRT", "T_SHIRT"), false);
});

test("color hex validation requires #RRGGBB", () => {
  assert.equal(colorInputSchema.safeParse({ name: "Navy", hexCode: "#1F2A44" }).success, true);
  assert.equal(colorInputSchema.safeParse({ name: "Navy", hexCode: "1F2A44" }).success, false);
});

test("formal shirt product type assigns the controlled preview directory", () => {
  const result = productInputSchema.parse({
    name: "Classic Formal Shirt",
    code: "FS-TEST",
    categoryId: 1,
    imageUrl: "https://example.com/catalog.jpg",
    basePrice: "2200.00",
    productType: ProductType.FORMAL_SHIRT,
    frontPreviewAsset: "assets/previews/formal_shirt/base/front.png",
    backPreviewAsset: "assets/previews/formal_shirt/base/back.png",
  });
  assert.equal(result.previewType, "formal_shirt");
});

test("preview assets cannot escape their controlled product directory", () => {
  assert.equal(
    validateAssetLocation(
      "assets/previews/formal_shirt/base/front.png",
      AssetStorageType.LOCAL,
      "formal_shirt"
    ),
    true
  );
  assert.equal(
    validateAssetLocation(
      "assets/previews/tshirt/base/front.png",
      AssetStorageType.LOCAL,
      "formal_shirt"
    ),
    false
  );
});

test("layered preview assets reject JPG and accept PNG URLs", () => {
  assert.equal(isPngAsset("https://cdn.example.com/model.png?token=abc"), true);
  assert.equal(isPngAsset("https://cdn.example.com/overlay.jpg"), false);
});

test("enabled layered previews require a base model PNG", () => {
  const base = {
    name: "Layered Formal Shirt",
    code: "FS-LAYERED",
    categoryId: 1,
    imageUrl: "",
    thumbnailUrl: "https://cdn.example.com/thumb.jpg",
    basePrice: "2200.00",
    productType: ProductType.FORMAL_SHIRT,
    previewEnabled: true,
  };
  assert.equal(productInputSchema.safeParse(base).success, false);
  assert.equal(
    productInputSchema.safeParse({
      ...base,
      modelImageUrl: "https://cdn.example.com/male-model.png",
    }).success,
    true
  );
});

test("local fabric textures use the dedicated textures directory", () => {
  const base = {
    name: "Oxford Cotton",
    categoryId: 1,
    imageUrl: "https://example.com/oxford.jpg",
    textureStorageType: AssetStorageType.LOCAL,
    productTypes: [ProductType.FORMAL_SHIRT],
  };
  assert.equal(
    fabricInputSchema.safeParse({
      ...base,
      textureUrl: "assets/textures/oxford.png",
    }).success,
    true
  );
  assert.equal(
    fabricInputSchema.safeParse({
      ...base,
      textureUrl: "assets/previews/formal_shirt/oxford.png",
    }).success,
    false
  );
});

test("formal shirt measurements require shirt fields but not pants fields", () => {
  const result = validateMeasurementsForProduct("FORMAL_SHIRT", {
    scale: "INCH",
    neck: 16,
    chest: 40,
    stomach: 38,
    length: 30,
    shoulder: 18,
    sleeve: 25,
  });
  assert.equal(result.valid, true);
});

test("formal shirt measurements reject a missing stomach measurement", () => {
  const result = validateMeasurementsForProduct("FORMAL_SHIRT", {
    scale: "INCH",
    neck: 16,
    chest: 40,
    length: 30,
    shoulder: 18,
    sleeve: 25,
  });
  assert.equal(result.valid, false);
  assert.match(result.warnings.join(" "), /stomach is required/);
});
