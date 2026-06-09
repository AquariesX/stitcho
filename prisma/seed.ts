import {
  AssetStorageType,
  Gender,
  PrismaClient,
  ProductType,
  PreviewView,
  Role,
  StyleGroupType,
} from "@prisma/client";
import { PREVIEW_TYPE_BY_PRODUCT } from "../src/lib/catalog-types";

const prisma = new PrismaClient();

const productDefinitions = [
  {
    code: "SK-001",
    name: "Classic Men's Shalwar Kameez",
    type: ProductType.SHALWAR_KAMEEZ,
    categoryCode: "SHALWAR_KAMEEZ",
    price: "4500.00",
    fabrics: [
      "Premium Cotton",
      "Wash and Wear",
      "Linen",
      "Khaddar",
      "Blended Fabric",
      "Boski",
    ],
  },
  {
    code: "TS-001",
    name: "Premium Cotton T-Shirt",
    type: ProductType.T_SHIRT,
    categoryCode: "T_SHIRT",
    price: "1800.00",
    fabrics: [
      "Cotton Jersey",
      "Premium Cotton",
      "Pique Cotton",
      "Cotton-Polyester Blend",
      "Performance Polyester",
    ],
  },
  {
    code: "PT-001",
    name: "Men's Straight-Fit Pants",
    type: ProductType.PANTS,
    categoryCode: "PANTS",
    price: "3200.00",
    fabrics: [
      "Cotton Twill",
      "Gabardine",
      "Polyester Blend",
      "Wool Blend",
      "Linen Blend",
    ],
  },
  {
    code: "FS-001",
    name: "Men's Classic Formal Shirt",
    type: ProductType.FORMAL_SHIRT,
    categoryCode: "FORMAL_SHIRT",
    price: "2200.00",
    fabrics: [
      "Premium Cotton",
      "Poplin",
      "Oxford Cotton",
      "Twill Cotton",
      "Broadcloth",
      "Cotton-Polyester Blend",
      "Linen Blend",
    ],
  },
] as const;

const fabricNames = [...new Set(productDefinitions.flatMap((item) => item.fabrics))];
const colorDefinitions = [
  ["White", "#FFFFFF"],
  ["Black", "#000000"],
  ["Navy Blue", "#1F2A44"],
  ["Royal Blue", "#1B22C9"],
  ["Charcoal", "#36454F"],
  ["Grey", "#808080"],
  ["Brown", "#65403C"],
  ["Beige", "#D8C3A5"],
  ["Maroon", "#800000"],
  ["Olive", "#6B6B3D"],
  ["Light Blue", "#ADD8E6"],
] as const;

type StyleDefinition = {
  name: string;
  groupType: StyleGroupType;
  required?: boolean;
  multiple?: boolean;
  options: string[];
};

const stylesByProduct: Record<ProductType, StyleDefinition[]> = {
  T_SHIRT: [
    { name: "Neck", groupType: StyleGroupType.NECK, required: true, options: ["Round Neck", "V-Neck", "Polo Collar", "Henley Neck"] },
    { name: "Sleeve", groupType: StyleGroupType.SLEEVE, required: true, options: ["Half Sleeve", "Full Sleeve", "Three-Quarter Sleeve"] },
    { name: "Fit", groupType: StyleGroupType.FIT, required: true, options: ["Regular Fit", "Slim Fit", "Oversized Fit"] },
    { name: "Pocket", groupType: StyleGroupType.POCKET, required: true, options: ["No Pocket", "Chest Pocket"] },
  ],
  FORMAL_SHIRT: [
    { name: "Collar", groupType: StyleGroupType.COLLAR, required: true, options: ["Point Collar", "Spread Collar", "Cutaway Collar", "Button-Down Collar", "Mandarin Collar"] },
    { name: "Cuff", groupType: StyleGroupType.CUFF, required: true, options: ["Round Cuff", "Square Cuff", "Angled Cuff", "French Cuff", "Convertible Cuff"] },
    { name: "Sleeve", groupType: StyleGroupType.SLEEVE, required: true, options: ["Full Sleeve", "Half Sleeve"] },
    { name: "Pocket", groupType: StyleGroupType.POCKET, required: true, options: ["No Pocket", "One Chest Pocket", "Two Chest Pockets"] },
    { name: "Placket", groupType: StyleGroupType.PLACKET, required: true, options: ["Standard Placket", "French Placket", "Hidden Placket"] },
    { name: "Fit", groupType: StyleGroupType.FIT, required: true, options: ["Regular Fit", "Slim Fit", "Relaxed Fit"] },
  ],
  SHALWAR_KAMEEZ: [
    { name: "Collar", groupType: StyleGroupType.COLLAR, required: true, options: ["Band Collar", "Shirt Collar", "Round Collar", "Open Collar"] },
    { name: "Cuff", groupType: StyleGroupType.CUFF, required: true, options: ["Plain Cuff", "Round Cuff", "Square Cuff", "Button Cuff"] },
    { name: "Placket", groupType: StyleGroupType.PLACKET, required: true, options: ["Standard Placket", "Hidden Placket", "Long Placket", "Short Placket"] },
    { name: "Pocket", groupType: StyleGroupType.POCKET, required: true, options: ["No Chest Pocket", "One Chest Pocket", "Side Pockets", "Chest and Side Pockets"] },
    { name: "Fit", groupType: StyleGroupType.FIT, required: true, options: ["Regular Fit", "Slim Fit", "Loose Fit"] },
    { name: "Shalwar Style", groupType: StyleGroupType.SHALWAR_STYLE, required: true, options: ["Traditional Shalwar", "Straight Shalwar", "Trouser Style", "Pajama Style"] },
  ],
  PANTS: [
    { name: "Fit", groupType: StyleGroupType.FIT, required: true, options: ["Regular Fit", "Slim Fit", "Straight Fit", "Relaxed Fit"] },
    { name: "Waist", groupType: StyleGroupType.WAIST, required: true, options: ["Standard Waist", "Elastic Waist", "Adjustable Waist"] },
    { name: "Pocket", groupType: StyleGroupType.POCKET, required: true, options: ["Side Pockets", "Back Welt Pockets", "Cargo Pockets"] },
    { name: "Front", groupType: StyleGroupType.FRONT, required: true, options: ["Flat Front", "Single Pleat", "Double Pleat"] },
    { name: "Bottom", groupType: StyleGroupType.BOTTOM, required: true, options: ["Straight Bottom", "Narrow Bottom", "Cuffed Bottom"] },
  ],
};

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

async function main() {
  const admin = await prisma.user.upsert({
    where: { firebaseUid: "super-admin-seed-id" },
    update: {},
    create: {
      firebaseUid: "super-admin-seed-id",
      email: "admin",
      name: "Super Admin",
      role: Role.ADMIN,
      phoneNumber: "0000000000",
    },
  });

  const categories = new Map<string, number>();
  for (const definition of productDefinitions) {
    const existing = await prisma.category.findFirst({
      where: { code: definition.categoryCode, userId: admin.id },
    });
    const category = existing
      ? await prisma.category.update({
          where: { id: existing.id },
          data: { name: definition.name.replace(/^(Classic |Premium )/, "") },
        })
      : await prisma.category.create({
          data: {
            code: definition.categoryCode,
            name: definition.name.replace(/^(Classic |Premium )/, ""),
            imageUrl: `/images/categories/${slug(definition.categoryCode)}.jpg`,
            userId: admin.id,
          },
        });
    categories.set(definition.categoryCode, category.id);
  }

  const fabricCategoryId = categories.get("SHALWAR_KAMEEZ")!;
  const fabrics = new Map<string, number>();
  for (const [index, name] of fabricNames.entries()) {
    const existing = await prisma.fabric.findFirst({ where: { name } });
    const fabric = existing
      ? await prisma.fabric.update({
          where: { id: existing.id },
          data: {
            textureUrl: existing.textureUrl ?? `assets/textures/${slug(name)}.png`,
          },
        })
      : await prisma.fabric.create({
          data: {
            name,
            categoryId: fabricCategoryId,
            imageUrl: `/images/fabrics/${slug(name)}.jpg`,
            textureUrl: `assets/textures/${slug(name)}.png`,
            textureStorageType: AssetStorageType.LOCAL,
            isSeamlessTexture: true,
            price: (900 + index * 50).toFixed(2),
            stockQuantity: 100,
            userId: admin.id,
          },
        });
    fabrics.set(name, fabric.id);
  }

  for (const name of fabricNames) {
    const fabricId = fabrics.get(name)!;
    const compatibleProductTypes = productDefinitions
      .filter((definition) =>
        (definition.fabrics as readonly string[]).includes(name)
      )
      .map((definition) => definition.type);
    for (const productType of compatibleProductTypes) {
      await prisma.fabricCompatibility.upsert({
        where: { fabricId_productType: { fabricId, productType } },
        update: {},
        create: { fabricId, productType },
      });
    }
  }

  const colors: number[] = [];
  for (const [displayOrder, [name, hexCode]] of colorDefinitions.entries()) {
    const existing = await prisma.color.findFirst({ where: { name } });
    const color = existing
      ? await prisma.color.update({
          where: { id: existing.id },
          data: { hexCode, displayOrder, isAvailable: true },
        })
      : await prisma.color.create({
          data: { name, hexCode, displayOrder, userId: admin.id },
        });
    colors.push(color.id);
  }

  for (const [productOrder, definition] of productDefinitions.entries()) {
    const previewType = PREVIEW_TYPE_BY_PRODUCT[definition.type];
    const front = `assets/previews/${previewType}/base/front.png`;
    const back = `assets/previews/${previewType}/base/back.png`;
    const product = await prisma.product.upsert({
      where: { code: definition.code },
      update: {
        productType: definition.type,
        previewType,
        frontPreviewAsset: front,
        backPreviewAsset: back,
        measurementProfile: previewType,
      },
      create: {
        code: definition.code,
        name: definition.name,
        categoryId: categories.get(definition.categoryCode)!,
        imageUrl: `/images/products/${slug(definition.name)}.jpg`,
        basePrice: definition.price,
        productType: definition.type,
        gender: Gender.MEN,
        previewType,
        frontPreviewAsset: front,
        backPreviewAsset: back,
        measurementProfile: previewType,
        estimatedDays: 7,
        displayOrder: productOrder,
        isFeatured: true,
        userId: admin.id,
      },
    });

    for (const [index, name] of definition.fabrics.entries()) {
      await prisma.productFabric.upsert({
        where: {
          productId_fabricId: { productId: product.id, fabricId: fabrics.get(name)! },
        },
        update: {},
        create: {
          productId: product.id,
          fabricId: fabrics.get(name)!,
          isDefault: index === 0,
        },
      });
    }
    for (const [index, colorId] of colors.entries()) {
      await prisma.productColor.upsert({
        where: { productId_colorId: { productId: product.id, colorId } },
        update: {},
        create: { productId: product.id, colorId, isDefault: index === 0 },
      });
    }
    for (const asset of [
      { view: PreviewView.FRONT, key: "base_front", url: front },
      { view: PreviewView.BACK, key: "base_back", url: back },
    ]) {
      await prisma.productPreviewAsset.upsert({
        where: {
          productId_view_assetKey: {
            productId: product.id,
            view: asset.view,
            assetKey: asset.key,
          },
        },
        update: { assetUrl: asset.url, isActive: true },
        create: {
          productId: product.id,
          view: asset.view,
          assetKey: asset.key,
          assetUrl: asset.url,
          width: 1024,
          height: 1024,
        },
      });
    }

    for (const [groupOrder, definitionGroup] of stylesByProduct[definition.type].entries()) {
      const existingStyle = await prisma.style.findFirst({
        where: { name: definitionGroup.name, productType: definition.type },
      });
      const style = existingStyle
        ? await prisma.style.update({
            where: { id: existingStyle.id },
            data: {
              groupType: definitionGroup.groupType,
              isRequired: definitionGroup.required ?? false,
              allowMultiple: definitionGroup.multiple ?? false,
              displayOrder: groupOrder,
              isAvailable: true,
            },
          })
        : await prisma.style.create({
            data: {
              name: definitionGroup.name,
              productType: definition.type,
              groupType: definitionGroup.groupType,
              isRequired: definitionGroup.required ?? false,
              allowMultiple: definitionGroup.multiple ?? false,
              displayOrder: groupOrder,
              userId: admin.id,
            },
          });

      for (const [optionOrder, optionName] of definitionGroup.options.entries()) {
        const optionSlug = slug(optionName);
        const existingOption = await prisma.styleOption.findFirst({
          where: { styleId: style.id, name: optionName },
        });
        const optionData = {
          imageUrl: `/images/styles/${previewType}/${optionSlug}.png`,
          overlayKey: optionSlug,
          frontOverlayAsset: `assets/previews/${previewType}/styles/${optionSlug}_front.png`,
          backOverlayAsset: `assets/previews/${previewType}/styles/${optionSlug}_back.png`,
          isDefault: optionOrder === 0,
          displayOrder: optionOrder,
          isAvailable: true,
        };
        const option = existingOption
          ? await prisma.styleOption.update({
              where: { id: existingOption.id },
              data: optionData,
            })
          : await prisma.styleOption.create({
              data: { styleId: style.id, name: optionName, ...optionData },
            });
        await prisma.productStyle.upsert({
          where: {
            productId_styleOptionId: {
              productId: product.id,
              styleOptionId: option.id,
            },
          },
          update: { isDefault: optionOrder === 0 },
          create: {
            productId: product.id,
            styleOptionId: option.id,
            isDefault: optionOrder === 0,
          },
        });
      }
    }
  }
}

main()
  .then(() => console.log("Controlled men's catalog seed completed."))
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
