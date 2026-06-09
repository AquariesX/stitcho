"use server";

import { Prisma, ProductType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { notifyAdminOnTailorItemAdd } from "./notification-actions";
import { fabricInputSchema } from "@/lib/catalog-validation";

function serialize<T>(value: T): T {
  return JSON.parse(
    JSON.stringify(value, (_key, item) =>
      item?.constructor?.name === "Decimal" ? item.toString() : item
    )
  );
}

function parseFabric(formData: FormData) {
  let productTypes: ProductType[] = [];
  try {
    productTypes = JSON.parse(String(formData.get("productTypes") ?? "[]"));
  } catch {}
  return fabricInputSchema.safeParse({
    name: formData.get("name"),
    categoryId: formData.get("categoryId"),
    description: formData.get("description") || null,
    imageUrl: formData.get("imageUrl"),
    textureUrl: formData.get("textureUrl") || null,
    textureStorageType: formData.get("textureStorageType") || "REMOTE",
    isSeamlessTexture: formData.get("isSeamlessTexture") === "true",
    price: formData.get("price") || "0.00",
    priceAdjustment: formData.get("priceAdjustment") || "0.00",
    stockQuantity: formData.get("stockQuantity") || 0,
    lowStockLimit: formData.get("lowStockLimit") || 0,
    unit: "METER",
    productTypes,
    isAvailable: formData.get("isAvailable") !== "false",
  });
}

export async function createFabric(formData: FormData) {
  try {
    const parsed = parseFabric(formData);
    if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message };
    const userId = formData.get("userId") ? Number(formData.get("userId")) : null;
    const { productTypes, ...data } = parsed.data;
    const fabric = await prisma.$transaction(async (tx) => {
      const created = await tx.fabric.create({ data: { ...data, userId } });
      await tx.fabricCompatibility.createMany({
        data: productTypes.map((productType) => ({ fabricId: created.id, productType })),
      });
      return tx.fabric.findUniqueOrThrow({
        where: { id: created.id },
        include: { category: true, compatibleTypes: true },
      });
    });
    if (userId) await notifyAdminOnTailorItemAdd(userId, "Fabric", fabric.name);
    revalidatePath("/dashboard/fabrics");
    return { success: true, data: serialize(fabric) };
  } catch (error) {
    console.error("Failed to create fabric:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to create fabric" };
  }
}

export async function getFabrics(role?: string, userId?: number) {
  try {
    const fabrics = await prisma.fabric.findMany({
      where: role === "tailor" && userId ? { userId } : {},
      include: {
        category: true,
        compatibleTypes: true,
        _count: { select: { supportedProducts: true } },
        ...(role === "admin"
          ? { user: { select: { name: true, shopProfile: { select: { shopName: true } } } } }
          : {}),
      },
      orderBy: { name: "asc" },
    });
    return { success: true, data: serialize(fabrics) };
  } catch (error) {
    console.error("Failed to fetch fabrics:", error);
    return { success: false, error: "Failed to fetch fabrics" };
  }
}

export async function updateFabric(id: number, formData: FormData) {
  try {
    const parsed = parseFabric(formData);
    if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message };
    const { productTypes, ...data } = parsed.data;
    const fabric = await prisma.$transaction(async (tx) => {
      await tx.fabric.update({ where: { id }, data });
      await tx.fabricCompatibility.deleteMany({ where: { fabricId: id } });
      await tx.fabricCompatibility.createMany({
        data: productTypes.map((productType) => ({ fabricId: id, productType })),
      });
      return tx.fabric.findUniqueOrThrow({
        where: { id },
        include: { category: true, compatibleTypes: true },
      });
    });
    revalidatePath("/dashboard/fabrics");
    return { success: true, data: serialize(fabric) };
  } catch (error) {
    console.error("Failed to update fabric:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to update fabric" };
  }
}

export async function deleteFabric(id: number) {
  try {
    if (await prisma.order.count({ where: { fabricId: id } })) {
      return { success: false, error: "Fabric is used by orders. Mark it unavailable instead." };
    }
    await prisma.fabric.delete({ where: { id } });
    revalidatePath("/dashboard/fabrics");
    return { success: true };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return { success: false, error: "Fabric is still referenced by catalog data." };
    }
    return { success: false, error: "Failed to delete fabric" };
  }
}
