import {
  AssetStorageType,
  PrismaClient,
  ProductType,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { PREVIEW_TYPE_BY_PRODUCT } from "@/lib/catalog-types";
import { validateAssetLocation } from "@/lib/catalog-validation";

type TransactionClient = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$extends"
>;

const productInclude = {
  category: true,
  supportedFabrics: { include: { fabric: true } },
  supportedColors: { include: { color: true } },
  supportedStyles: {
    include: { styleOption: { include: { style: true } } },
  },
  previewAssets: true,
} as const;

const transactionOptions = {
  maxWait: 10_000,
  timeout: 20_000,
} as const;

export class CatalogValidationError extends Error {
  constructor(
    message: string,
    public status = 400
  ) {
    super(message);
  }
}

export interface ProductWriteData {
  name: string;
  code: string;
  categoryId: number;
  imageUrl: string;
  thumbnailUrl?: string | null;
  modelImageUrl?: string | null;
  topOverlayUrl?: string | null;
  bottomOverlayUrl?: string | null;
  overlayKey?: string | null;
  previewEnabled: boolean;
  basePrice: string;
  description?: string | null;
  productType?: ProductType | null;
  previewType?: string | null;
  frontPreviewAsset?: string | null;
  backPreviewAsset?: string | null;
  previewStorageType: AssetStorageType;
  estimatedDays?: number | null;
  measurementProfile?: string | null;
  isAvailable: boolean;
  isFeatured: boolean;
  displayOrder: number;
  userId?: number | null;
  gender: "MEN";
  fabricSelections: Array<{
    fabricId: number;
    isDefault: boolean;
    priceAdjustment: string;
  }>;
  colorSelections: Array<{ colorId: number; isDefault: boolean }>;
  styleOptionSelections: Array<{
    styleOptionId: number;
    isDefault: boolean;
  }>;
}

function exactlyOneDefault(
  items: Array<{ isDefault: boolean }>,
  message: string
) {
  if (items.length > 0 && items.filter((item) => item.isDefault).length !== 1) {
    throw new CatalogValidationError(message);
  }
}

export async function validateProductWrite(
  data: ProductWriteData,
  owner: { id: number; role: string }
) {
  if (!data.productType) {
    throw new CatalogValidationError("Product type is required");
  }
  const previewType = PREVIEW_TYPE_BY_PRODUCT[data.productType];
  if (data.previewType !== previewType) {
    throw new CatalogValidationError(
      `Preview type must be ${previewType} for ${data.productType}`
    );
  }
  if (data.frontPreviewAsset &&
    (
    !validateAssetLocation(
      data.frontPreviewAsset,
      data.previewStorageType,
      previewType
    )
  )) {
    throw new CatalogValidationError("Front preview asset is missing or invalid");
  }
  if (data.backPreviewAsset &&
    (
    !validateAssetLocation(
      data.backPreviewAsset,
      data.previewStorageType,
      previewType
    )
  )) {
    throw new CatalogValidationError("Back preview asset is missing or invalid");
  }

  const ownerFilter = owner.role === "TAILOR" ? { userId: owner.id } : {};
  const [category, fabrics, colors, options, requiredGroups] = await Promise.all([
    prisma.category.findFirst({
      where: { id: data.categoryId, ...ownerFilter },
    }),
    prisma.fabric.findMany({
      where: {
        id: { in: data.fabricSelections.map((item) => item.fabricId) },
        ...ownerFilter,
      },
      include: { compatibleTypes: true },
    }),
    prisma.color.findMany({
      where: {
        id: { in: data.colorSelections.map((item) => item.colorId) },
        ...ownerFilter,
      },
    }),
    prisma.styleOption.findMany({
      where: {
        id: {
          in: data.styleOptionSelections.map((item) => item.styleOptionId),
        },
        style: ownerFilter,
      },
      include: { style: true },
    }),
    prisma.style.findMany({
      where: {
        productType: data.productType,
        isRequired: true,
        isAvailable: true,
        ...ownerFilter,
      },
      select: { id: true, name: true, allowMultiple: true },
    }),
  ]);

  if (!category) throw new CatalogValidationError("Category does not exist");
  if (category.code !== data.productType) {
    throw new CatalogValidationError(
      `Category ${category.name} does not match ${data.productType}`
    );
  }
  if (fabrics.length !== new Set(data.fabricSelections.map((x) => x.fabricId)).size) {
    throw new CatalogValidationError("One or more fabric IDs are invalid");
  }
  for (const fabric of fabrics) {
    if (!fabric.compatibleTypes.some((item) => item.productType === data.productType)) {
      throw new CatalogValidationError(
        `Selected fabric ${fabric.name} is not compatible with ${data.productType}`
      );
    }
  }
  if (colors.length !== new Set(data.colorSelections.map((x) => x.colorId)).size) {
    throw new CatalogValidationError("One or more color IDs are invalid");
  }
  if (
    options.length !==
    new Set(data.styleOptionSelections.map((x) => x.styleOptionId)).size
  ) {
    throw new CatalogValidationError("One or more style option IDs are invalid");
  }
  for (const option of options) {
    if (option.style.productType !== data.productType) {
      throw new CatalogValidationError(
        `${option.name} does not match ${data.productType}`
      );
    }
    for (const [label, asset] of [
      ["Front", option.frontOverlayAsset],
      ["Back", option.backOverlayAsset],
    ] as const) {
      if (
        asset &&
        !validateAssetLocation(asset, option.assetStorageType, previewType)
      ) {
        throw new CatalogValidationError(
          `${label} overlay for ${option.name} does not match ${previewType}`
        );
      }
    }
  }

  exactlyOneDefault(data.fabricSelections, "A default fabric is required");
  exactlyOneDefault(data.colorSelections, "A default color is required");
  for (const group of requiredGroups) {
    const selected = data.styleOptionSelections.filter((selection) =>
      options.some(
        (option) =>
          option.id === selection.styleOptionId && option.styleId === group.id
      )
    );
    if (selected.length === 0) {
      throw new CatalogValidationError(
        `${data.productType.replaceAll("_", " ")} requires a ${group.name} style group`
      );
    }
    if (
      !group.allowMultiple &&
      selected.filter((selection) => selection.isDefault).length !== 1
    ) {
      throw new CatalogValidationError(
        `${group.name} requires exactly one default option`
      );
    }
  }
  return { category, fabrics, colors, options };
}

async function replaceProductRelations(
  tx: TransactionClient,
  productId: number,
  data: ProductWriteData
) {
  await Promise.all([
    tx.productFabric.deleteMany({ where: { productId } }),
    tx.productColor.deleteMany({ where: { productId } }),
    tx.productStyle.deleteMany({ where: { productId } }),
  ]);
  if (data.fabricSelections.length) {
    await tx.productFabric.createMany({
      data: data.fabricSelections.map((selection) => ({
        productId,
        ...selection,
      })),
    });
  }
  if (data.colorSelections.length) {
    await tx.productColor.createMany({
      data: data.colorSelections.map((selection) => ({
        productId,
        ...selection,
      })),
    });
  }
  if (data.styleOptionSelections.length) {
    await tx.productStyle.createMany({
      data: data.styleOptionSelections.map((selection) => ({
        productId,
        ...selection,
      })),
    });
  }
  const previewWrites = [];
  if (data.frontPreviewAsset) previewWrites.push(
    tx.productPreviewAsset.upsert({
      where: {
        productId_view_assetKey: {
          productId,
          view: "FRONT",
          assetKey: "base_front",
        },
      },
      update: {
        assetUrl: data.frontPreviewAsset,
        storageType: data.previewStorageType,
        isActive: true,
      },
      create: {
        productId,
        view: "FRONT",
        assetKey: "base_front",
        assetUrl: data.frontPreviewAsset,
        storageType: data.previewStorageType,
      },
    })
  );
  if (data.backPreviewAsset) previewWrites.push(
    tx.productPreviewAsset.upsert({
      where: {
        productId_view_assetKey: {
          productId,
          view: "BACK",
          assetKey: "base_back",
        },
      },
      update: {
        assetUrl: data.backPreviewAsset,
        storageType: data.previewStorageType,
        isActive: true,
      },
      create: {
        productId,
        view: "BACK",
        assetKey: "base_back",
        assetUrl: data.backPreviewAsset,
        storageType: data.previewStorageType,
      },
    })
  );
  await Promise.all(previewWrites);
}

function productData(data: ProductWriteData, userId?: number | null) {
  const product = {
    name: data.name,
    code: data.code,
    categoryId: data.categoryId,
    imageUrl: data.imageUrl,
    thumbnailUrl: data.thumbnailUrl,
    modelImageUrl: data.modelImageUrl,
    topOverlayUrl: data.topOverlayUrl,
    bottomOverlayUrl: data.bottomOverlayUrl,
    overlayKey: data.overlayKey,
    previewEnabled: data.previewEnabled,
    basePrice: data.basePrice,
    description: data.description,
    productType: data.productType,
    gender: data.gender,
    previewType: data.previewType,
    frontPreviewAsset: data.frontPreviewAsset,
    backPreviewAsset: data.backPreviewAsset,
    previewStorageType: data.previewStorageType,
    estimatedDays: data.estimatedDays,
    measurementProfile: data.measurementProfile,
    isAvailable: data.isAvailable,
    isFeatured: data.isFeatured,
    displayOrder: data.displayOrder,
  };
  return userId === undefined ? product : { ...product, userId };
}

export async function createProductCatalog(
  data: ProductWriteData,
  owner: { id: number; role: string }
) {
  await validateProductWrite(data, owner);
  const productId = await prisma.$transaction(async (tx) => {
    const product = await tx.product.create({
      data: productData(
        data,
        owner.role === "TAILOR" ? owner.id : (data.userId ?? owner.id)
      ),
    });
    await replaceProductRelations(tx, product.id, data);
    return product.id;
  }, transactionOptions);
  return prisma.product.findUniqueOrThrow({
    where: { id: productId },
    include: productInclude,
  });
}

export async function updateProductCatalog(
  id: number,
  data: ProductWriteData,
  owner: { id: number; role: string }
) {
  await validateProductWrite(data, owner);
  await prisma.$transaction(async (tx) => {
    await tx.product.update({
      where: { id },
      data: productData(data),
    });
    await replaceProductRelations(tx, id, data);
  }, transactionOptions);
  return prisma.product.findUniqueOrThrow({
    where: { id },
    include: productInclude,
  });
}
