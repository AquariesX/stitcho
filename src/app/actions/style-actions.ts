"use server";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import {
  styleGroupInputSchema,
  styleOptionInputSchema,
  validateAssetLocation,
} from "@/lib/catalog-validation";
import { PREVIEW_TYPE_BY_PRODUCT } from "@/lib/catalog-types";

function serialize<T>(value: T): T {
  return JSON.parse(
    JSON.stringify(value, (_key, item) =>
      item?.constructor?.name === "Decimal" ? item.toString() : item
    )
  );
}

function parseGroup(formData: FormData) {
  return styleGroupInputSchema.safeParse({
    name: formData.get("name"),
    imageUrl: formData.get("imageUrl") || null,
    productType: formData.get("productType"),
    groupType: formData.get("groupType"),
    isRequired: formData.get("isRequired") === "true",
    allowMultiple: formData.get("allowMultiple") === "true",
    displayOrder: formData.get("displayOrder") || 0,
    isAvailable: formData.get("isAvailable") !== "false",
  });
}

function parseOption(formData: FormData) {
  return styleOptionInputSchema.safeParse({
    name: formData.get("name"),
    imageUrl: formData.get("imageUrl"),
    additionalPrice: formData.get("additionalPrice") || "0.00",
    overlayKey: formData.get("overlayKey") || null,
    overlayImageUrl: formData.get("overlayImageUrl") || null,
    styleType: formData.get("styleType") || null,
    zIndex: formData.get("zIndex") || 30,
    frontOverlayAsset: formData.get("frontOverlayAsset") || null,
    backOverlayAsset: formData.get("backOverlayAsset") || null,
    assetStorageType: formData.get("assetStorageType") || "LOCAL",
    isDefault: formData.get("isDefault") === "true",
    isAvailable: formData.get("isAvailable") !== "false",
    displayOrder: formData.get("displayOrder") || 0,
  });
}

export async function createStyle(formData: FormData) {
  const parsed = parseGroup(formData);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message };
  const style = await prisma.style.create({
    data: {
      ...parsed.data,
      userId: formData.get("userId") ? Number(formData.get("userId")) : null,
    },
    include: { options: true },
  });
  revalidatePath("/dashboard/styles");
  return { success: true, data: serialize(style) };
}

export async function getStyles(role?: string, userId?: number) {
  const styles = await prisma.style.findMany({
    where: role === "tailor" && userId ? { userId } : {},
    include: {
      options: { orderBy: [{ displayOrder: "asc" }, { name: "asc" }] },
      ...(role === "admin"
        ? { user: { select: { name: true, shopProfile: { select: { shopName: true } } } } }
        : {}),
    },
    orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
  });
  return { success: true, data: serialize(styles) };
}

export async function updateStyle(id: number, formData: FormData) {
  const parsed = parseGroup(formData);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message };
  const style = await prisma.style.update({
    where: { id },
    data: parsed.data,
    include: { options: { orderBy: { displayOrder: "asc" } } },
  });
  revalidatePath("/dashboard/styles");
  return { success: true, data: serialize(style) };
}

export async function deleteStyle(id: number) {
  if (await prisma.orderStyle.count({ where: { styleOption: { styleId: id } } })) {
    return { success: false, error: "Style group is used by orders. Mark it unavailable." };
  }
  await prisma.style.delete({ where: { id } });
  revalidatePath("/dashboard/styles");
  return { success: true };
}

async function validateOption(styleId: number, formData: FormData) {
  const parsed = parseOption(formData);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message);
  const style = await prisma.style.findUnique({ where: { id: styleId } });
  if (!style?.productType) throw new Error("Style group requires a product type");
  const previewType = PREVIEW_TYPE_BY_PRODUCT[style.productType];
  for (const asset of [
    parsed.data.frontOverlayAsset,
    parsed.data.backOverlayAsset,
  ]) {
    if (
      asset &&
      !validateAssetLocation(asset, parsed.data.assetStorageType, previewType)
    ) {
      throw new Error(`Overlay does not match preview type ${previewType}`);
    }
  }
  return { data: parsed.data, style };
}

export async function createStyleOption(formData: FormData) {
  try {
    const styleId = Number(formData.get("styleId"));
    const validated = await validateOption(styleId, formData);
    const option = await prisma.$transaction(async (tx) => {
      if (validated.data.isDefault && !validated.style.allowMultiple) {
        await tx.styleOption.updateMany({
          where: { styleId },
          data: { isDefault: false },
        });
      }
      return tx.styleOption.create({ data: { styleId, ...validated.data } });
    });
    revalidatePath("/dashboard/styles");
    return { success: true, data: serialize(option) };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to create option" };
  }
}

export async function updateStyleOption(id: number, formData: FormData) {
  try {
    const existing = await prisma.styleOption.findUnique({ where: { id } });
    if (!existing) return { success: false, error: "Style option not found" };
    const validated = await validateOption(existing.styleId, formData);
    const option = await prisma.$transaction(async (tx) => {
      if (validated.data.isDefault && !validated.style.allowMultiple) {
        await tx.styleOption.updateMany({
          where: { styleId: existing.styleId, id: { not: id } },
          data: { isDefault: false },
        });
      }
      return tx.styleOption.update({ where: { id }, data: validated.data });
    });
    revalidatePath("/dashboard/styles");
    return { success: true, data: serialize(option) };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to update option" };
  }
}

export async function deleteStyleOption(id: number) {
  if (await prisma.orderStyle.count({ where: { styleOptionId: id } })) {
    return { success: false, error: "Style option is used by orders. Mark it unavailable." };
  }
  try {
    await prisma.styleOption.delete({ where: { id } });
    revalidatePath("/dashboard/styles");
    return { success: true };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return { success: false, error: "Style option is still referenced by products." };
    }
    return { success: false, error: "Failed to delete option" };
  }
}
