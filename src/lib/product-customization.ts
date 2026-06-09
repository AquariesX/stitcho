import { Prisma, PreviewView } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { validateAssetLocation } from "@/lib/catalog-validation";

export class CustomizationError extends Error {
  constructor(
    message: string,
    public status = 400
  ) {
    super(message);
  }
}

const customizationInclude = {
  category: true,
  supportedFabrics: {
    include: { fabric: true },
    orderBy: { fabric: { name: "asc" as const } },
  },
  supportedColors: {
    include: { color: true },
    orderBy: { color: { displayOrder: "asc" as const } },
  },
  supportedStyles: {
    include: {
      styleOption: {
        include: { style: true },
      },
    },
    orderBy: { styleOption: { displayOrder: "asc" as const } },
  },
  previewAssets: {
    where: { isActive: true },
    orderBy: [{ view: "asc" as const }, { assetKey: "asc" as const }],
  },
} satisfies Prisma.ProductInclude;

export async function getProductCustomizationConfig(productId: number) {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: customizationInclude,
  });

  if (!product || !product.isAvailable) {
    throw new CustomizationError("Product not found or unavailable", 404);
  }

  const styleGroups = new Map<number, {
    id: number;
    name: string;
    groupType: typeof product.supportedStyles[number]["styleOption"]["style"]["groupType"];
    isRequired: boolean;
    allowMultiple: boolean;
    displayOrder: number;
    options: unknown[];
  }>();

  for (const link of product.supportedStyles) {
    const option = link.styleOption;
    if (!option.isAvailable || !option.style.isAvailable) continue;
    const group = styleGroups.get(option.styleId) ?? {
      id: option.style.id,
      name: option.style.name,
      groupType: option.style.groupType,
      isRequired: option.style.isRequired,
      allowMultiple: option.style.allowMultiple,
      displayOrder: option.style.displayOrder,
      options: [],
    };
    group.options.push({
      id: option.id,
      name: option.name,
      thumbnailUrl: option.imageUrl,
      overlayKey: option.overlayKey,
      overlayImageUrl: option.overlayImageUrl,
      styleType: option.styleType,
      zIndex: option.zIndex,
      frontOverlayAsset: option.frontOverlayAsset,
      backOverlayAsset: option.backOverlayAsset,
      additionalPrice: option.additionalPrice.toFixed(2),
      isDefault: link.isDefault || option.isDefault,
      displayOrder: option.displayOrder,
    });
    styleGroups.set(option.styleId, group);
  }

  return {
    product: {
      id: product.id,
      name: product.name,
      productType: product.productType,
      previewType: product.previewType,
      basePrice: product.basePrice.toFixed(2),
      catalogImageUrl: product.imageUrl,
      thumbnailUrl: product.thumbnailUrl ?? product.imageUrl,
      modelImageUrl: product.modelImageUrl,
      topOverlayUrl: product.topOverlayUrl,
      bottomOverlayUrl: product.bottomOverlayUrl,
      overlayKey: product.overlayKey,
      previewEnabled: product.previewEnabled,
      frontPreviewAsset: product.frontPreviewAsset,
      backPreviewAsset: product.backPreviewAsset,
    },
    fabrics: product.supportedFabrics
      .filter(({ fabric }) => fabric.isAvailable && fabric.stockQuantity > 0)
      .map(({ fabric, ...link }) => ({
        id: fabric.id,
        name: fabric.name,
        thumbnailUrl: fabric.imageUrl,
        textureUrl: fabric.textureUrl,
        stockQuantity: fabric.stockQuantity,
        priceAdjustment: link.priceAdjustment.toFixed(2),
        isDefault: link.isDefault,
      })),
    colors: product.supportedColors
      .filter(({ color }) => color.isAvailable)
      .map(({ color, isDefault }) => ({
        id: color.id,
        name: color.name,
        hexCode: color.hexCode,
        isDefault,
      })),
    styleGroups: [...styleGroups.values()].sort(
      (a, b) => a.displayOrder - b.displayOrder
    ),
    modelImageUrl: product.modelImageUrl,
    layers: [
      product.bottomOverlayUrl && {
        type: "BOTTOM",
        overlayKey: product.overlayKey,
        imageUrl: product.bottomOverlayUrl,
        zIndex: 10,
      },
      product.topOverlayUrl && {
        type: "TOP",
        overlayKey: product.overlayKey,
        imageUrl: product.topOverlayUrl,
        zIndex: 20,
      },
    ].filter(Boolean),
    previewAssets: product.previewAssets,
  };
}

export async function validateCustomization(input: {
  productId: number;
  fabricId: number;
  colorId: number;
  styleOptionIds: number[];
  view: PreviewView;
}) {
  const product = await prisma.product.findUnique({
    where: { id: input.productId },
    include: customizationInclude,
  });
  if (!product || !product.isAvailable) {
    throw new CustomizationError("Product not found or unavailable", 404);
  }
  if (!product.productType || !product.previewType) {
    throw new CustomizationError("Product requires manual catalog classification", 409);
  }
  if (!product.frontPreviewAsset || !product.backPreviewAsset) {
    throw new CustomizationError("Product requires front and back preview assets", 409);
  }
  for (const asset of [product.frontPreviewAsset, product.backPreviewAsset]) {
    if (
      !validateAssetLocation(
        asset,
        product.previewStorageType,
        product.previewType
      )
    ) {
      throw new CustomizationError("Product preview asset path is invalid", 409);
    }
  }

  const fabricLink = product.supportedFabrics.find(
    (link) => link.fabricId === input.fabricId
  );
  if (!fabricLink) throw new CustomizationError("Fabric is not compatible with this product");
  if (!fabricLink.fabric.isAvailable || fabricLink.fabric.stockQuantity <= 0) {
    throw new CustomizationError("Fabric is unavailable or out of stock");
  }

  const colorLink = product.supportedColors.find(
    (link) => link.colorId === input.colorId
  );
  if (!colorLink || !colorLink.color.isAvailable) {
    throw new CustomizationError("Color is not compatible with this product");
  }

  const uniqueIds = [...new Set(input.styleOptionIds)];
  if (uniqueIds.length !== input.styleOptionIds.length) {
    throw new CustomizationError("Duplicate style options are not allowed");
  }
  const selectedLinks = uniqueIds.map((id) =>
    product.supportedStyles.find((link) => link.styleOptionId === id)
  );
  if (selectedLinks.some((link) => !link)) {
    throw new CustomizationError("One or more styles are not compatible with this product");
  }

  const selected = selectedLinks.map((link) => link!);
  for (const link of selected) {
    const { styleOption } = link;
    if (!styleOption.isAvailable || !styleOption.style.isAvailable) {
      throw new CustomizationError(`${styleOption.name} is unavailable`);
    }
    if (styleOption.style.productType !== product.productType) {
      throw new CustomizationError(`${styleOption.name} does not match ${product.productType}`);
    }
    const overlay =
      input.view === PreviewView.FRONT
        ? styleOption.frontOverlayAsset
        : styleOption.backOverlayAsset;
    if (!overlay) {
      throw new CustomizationError(
        `${styleOption.name} has no ${input.view.toLowerCase()} overlay`
      );
    }
    if (
      !validateAssetLocation(
        overlay,
        styleOption.assetStorageType,
        product.previewType
      )
    ) {
      throw new CustomizationError(`${styleOption.name} overlay path is invalid`);
    }
  }

  const linkedGroups = new Map<number, typeof selected>();
  for (const link of product.supportedStyles) {
    const group = linkedGroups.get(link.styleOption.styleId) ?? [];
    group.push(link);
    linkedGroups.set(link.styleOption.styleId, group);
  }
  for (const links of linkedGroups.values()) {
    const style = links[0].styleOption.style;
    const count = selected.filter(
      (link) => link.styleOption.styleId === style.id
    ).length;
    if (style.isRequired && count === 0) {
      throw new CustomizationError(`${style.name} requires one selection`);
    }
    if (!style.allowMultiple && count > 1) {
      throw new CustomizationError(`${style.name} allows only one selection`);
    }
  }

  const activeBase = product.previewAssets.find(
    (asset) => asset.view === input.view && asset.assetKey.startsWith("base")
  );
  const baseAsset =
    activeBase?.assetUrl ??
    (input.view === PreviewView.FRONT
      ? product.frontPreviewAsset
      : product.backPreviewAsset);
  if (!baseAsset) {
    throw new CustomizationError(`No active ${input.view.toLowerCase()} base asset exists`);
  }

  const styleAdjustment = selected.reduce(
    (total, link) => total.add(link.styleOption.additionalPrice),
    new Prisma.Decimal(0)
  );
  const total = product.basePrice
    .add(fabricLink.priceAdjustment)
    .add(styleAdjustment);

  return {
    product,
    fabricLink,
    colorLink,
    selected,
    baseAsset,
    price: {
      basePrice: product.basePrice,
      fabricAdjustment: fabricLink.priceAdjustment,
      styleAdjustments: styleAdjustment,
      total,
    },
  };
}

export function customizationSnapshot(
  result: Awaited<ReturnType<typeof validateCustomization>>
): Prisma.InputJsonValue {
  return {
    productType: result.product.productType!,
    previewType: result.product.previewType!,
    fabric: {
      id: result.fabricLink.fabric.id,
      name: result.fabricLink.fabric.name,
      textureUrl: result.fabricLink.fabric.textureUrl,
    },
    color: {
      id: result.colorLink.color.id,
      name: result.colorLink.color.name,
      hexCode: result.colorLink.color.hexCode,
    },
    styles: result.selected.map(({ styleOption }) => ({
      styleGroup: styleOption.style.groupType,
      styleOptionId: styleOption.id,
      name: styleOption.name,
      frontOverlayAsset: styleOption.frontOverlayAsset,
      backOverlayAsset: styleOption.backOverlayAsset,
    })),
    price: {
      basePrice: result.price.basePrice.toFixed(2),
      fabricAdjustment: result.price.fabricAdjustment.toFixed(2),
      styleAdjustments: result.price.styleAdjustments.toFixed(2),
      total: result.price.total.toFixed(2),
    },
  };
}
