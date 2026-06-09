import { z } from "zod";
import {
  AssetStorageType,
  Gender,
  PreviewView,
  ProductType,
  StyleGroupType,
  StyleType,
} from "@prisma/client";
import { PREVIEW_TYPE_BY_PRODUCT } from "@/lib/catalog-types";

const money = z
  .union([z.string(), z.number()])
  .transform(String)
  .refine((value) => /^\d+(\.\d{1,2})?$/.test(value), "Use a valid non-negative amount");

const nullableText = (max: number) =>
  z
    .union([z.string().trim().max(max), z.null()])
    .optional()
    .transform((value) => (value === "" ? null : value));

const nonNegativeInt = z.coerce.number().int().min(0);
const positiveMoney = money.refine(
  (value) => Number(value) > 0,
  "Amount must be greater than zero"
);

export function isPngAsset(value: string | null | undefined) {
  if (!value) return true;
  try {
    return decodeURIComponent(new URL(value).pathname).toLowerCase().endsWith(".png");
  } catch {
    return value.split("?")[0].toLowerCase().endsWith(".png");
  }
}

export const productTypeSchema = z.nativeEnum(ProductType);

export function validateAssetLocation(
  value: string | null | undefined,
  storageType: AssetStorageType,
  previewType?: string | null
) {
  if (!value) return true;
  if (storageType === AssetStorageType.LOCAL) {
    const prefix = previewType
      ? `assets/previews/${previewType}/`
      : "assets/previews/";
    return value.startsWith(prefix) && !value.includes("..");
  }
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return false;
    const allowed = (process.env.ALLOWED_ASSET_DOMAINS ?? "")
      .split(",")
      .map((domain) => domain.trim().toLowerCase())
      .filter(Boolean);
    return allowed.length === 0 || allowed.includes(url.hostname.toLowerCase());
  } catch {
    return false;
  }
}

export const productInputSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    code: z.string().trim().min(1).max(30),
    categoryId: z.coerce.number().int().positive(),
    imageUrl: z.string().trim().max(500),
    thumbnailUrl: nullableText(500),
    modelImageUrl: nullableText(500),
    topOverlayUrl: nullableText(500),
    bottomOverlayUrl: nullableText(500),
    overlayKey: nullableText(100),
    previewEnabled: z.boolean().default(false),
    basePrice: positiveMoney,
    description: nullableText(65535),
    productType: z.nativeEnum(ProductType).nullable().optional(),
    gender: z.nativeEnum(Gender).default(Gender.MEN),
    previewType: nullableText(50),
    frontPreviewAsset: nullableText(500),
    backPreviewAsset: nullableText(500),
    previewStorageType: z.nativeEnum(AssetStorageType).default(AssetStorageType.LOCAL),
    estimatedDays: z.coerce.number().int().positive().nullable().optional(),
    measurementProfile: nullableText(50),
    isAvailable: z.boolean().default(true),
    isFeatured: z.boolean().default(false),
    displayOrder: z.coerce.number().int().default(0),
    userId: z.coerce.number().int().positive().nullable().optional(),
  })
  .superRefine((value, context) => {
    for (const [path, asset] of [
      ["modelImageUrl", value.modelImageUrl],
      ["topOverlayUrl", value.topOverlayUrl],
      ["bottomOverlayUrl", value.bottomOverlayUrl],
    ] as const) {
      if (asset && !isPngAsset(asset)) {
        context.addIssue({
          code: "custom",
          path: [path],
          message: `${path} must reference a PNG file`,
        });
      }
    }
    if (value.previewEnabled && !value.modelImageUrl) {
      context.addIssue({
        code: "custom",
        path: ["modelImageUrl"],
        message: "A base model PNG is required when preview is enabled",
      });
    }
    const previewType = value.productType
      ? PREVIEW_TYPE_BY_PRODUCT[value.productType]
      : value.previewType;
    for (const [path, asset] of [
      ["frontPreviewAsset", value.frontPreviewAsset],
      ["backPreviewAsset", value.backPreviewAsset],
    ] as const) {
      if (
        asset &&
        !validateAssetLocation(asset, value.previewStorageType, previewType)
      ) {
        context.addIssue({
          code: "custom",
          path: [path],
          message: `${path} does not match preview type ${previewType}`,
        });
      }
    }
  })
  .transform((value) => ({
    ...value,
    previewType: value.productType
      ? PREVIEW_TYPE_BY_PRODUCT[value.productType]
      : value.previewType,
  }));

export const productFabricSchema = z.object({
  fabricId: z.coerce.number().int().positive(),
  isDefault: z.boolean().default(false),
  priceAdjustment: money.default("0.00"),
});

export const productColorSchema = z.object({
  colorId: z.coerce.number().int().positive(),
  isDefault: z.boolean().default(false),
});

export const productStyleSchema = z.object({
  styleOptionId: z.coerce.number().int().positive(),
  isDefault: z.boolean().default(false),
});

export const previewAssetSchema = z.object({
  view: z.nativeEnum(PreviewView),
  assetKey: z.string().trim().min(1).max(100),
  assetUrl: z.string().trim().min(1).max(500),
  storageType: z.nativeEnum(AssetStorageType).default(AssetStorageType.LOCAL),
  width: z.coerce.number().int().positive().nullable().optional(),
  height: z.coerce.number().int().positive().nullable().optional(),
  isActive: z.boolean().default(true),
});

export const previewRequestSchema = z.object({
  productId: z.coerce.number().int().positive(),
  fabricId: z.coerce.number().int().positive(),
  colorId: z.coerce.number().int().positive(),
  styleOptionIds: z.array(z.coerce.number().int().positive()).default([]),
  view: z.nativeEnum(PreviewView).default(PreviewView.FRONT),
});

export const colorInputSchema = z.object({
  name: z.string().trim().min(1).max(60),
  hexCode: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "hexCode must use #RRGGBB")
    .transform((value) => value.toUpperCase()),
  isAvailable: z.boolean().default(true),
  displayOrder: z.coerce.number().int().default(0),
});

export const fabricInputSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    categoryId: z.coerce.number().int().positive(),
    description: nullableText(65535),
    imageUrl: z.string().trim().min(1).max(500),
    textureUrl: nullableText(500),
    textureStorageType: z
      .nativeEnum(AssetStorageType)
      .default(AssetStorageType.REMOTE),
    isSeamlessTexture: z.boolean().default(false),
    price: money.default("0.00"),
    priceAdjustment: money.default("0.00"),
    stockQuantity: nonNegativeInt.default(0),
    lowStockLimit: nonNegativeInt.default(5),
    unit: z.literal("METER").default("METER"),
    productTypes: z.array(productTypeSchema).min(1),
    isAvailable: z.boolean().default(true),
  })
  .superRefine((value, context) => {
    const validTexture =
      !value.textureUrl ||
      (value.textureStorageType === AssetStorageType.LOCAL
        ? value.textureUrl.startsWith("assets/textures/") &&
          !value.textureUrl.includes("..")
        : validateAssetLocation(value.textureUrl, value.textureStorageType));
    if (!validTexture) {
      context.addIssue({
        code: "custom",
        path: ["textureUrl"],
        message: "Texture URL or local asset path is invalid",
      });
    }
  });

export const styleGroupInputSchema = z.object({
  name: z.string().trim().min(1).max(80),
  imageUrl: nullableText(500),
  productType: productTypeSchema,
  groupType: z.nativeEnum(StyleGroupType),
  isRequired: z.boolean().default(false),
  allowMultiple: z.boolean().default(false),
  displayOrder: z.coerce.number().int().default(0),
  isAvailable: z.boolean().default(true),
});

export const styleOptionInputSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    imageUrl: z.string().trim().min(1).max(500),
    additionalPrice: money.default("0.00"),
    overlayKey: nullableText(100),
    overlayImageUrl: nullableText(500),
    styleType: z.nativeEnum(StyleType).nullable().optional(),
    zIndex: z.coerce.number().int().default(30),
    frontOverlayAsset: nullableText(500),
    backOverlayAsset: nullableText(500),
    assetStorageType: z
      .nativeEnum(AssetStorageType)
      .default(AssetStorageType.LOCAL),
    isDefault: z.boolean().default(false),
    isAvailable: z.boolean().default(true),
    displayOrder: z.coerce.number().int().default(0),
  })
  .superRefine((value, context) => {
    if (value.overlayImageUrl && !isPngAsset(value.overlayImageUrl)) {
      context.addIssue({
        code: "custom",
        path: ["overlayImageUrl"],
        message: "Transparent overlay must be a PNG file",
      });
    }
  });

export const productWriteSchema = productInputSchema.and(
  z.object({
    fabricSelections: z.array(productFabricSchema).min(1, "Select at least one fabric"),
    colorSelections: z.array(productColorSchema).min(1, "Select at least one color"),
    styleOptionSelections: z.array(productStyleSchema).default([]),
  })
);

export function parseJsonBody<T>(schema: z.ZodType<T>, body: unknown) {
  const result = schema.safeParse(body);
  if (!result.success) {
    return {
      success: false as const,
      error: result.error.issues.map((issue) => issue.message).join(", "),
    };
  }
  return { success: true as const, data: result.data };
}
