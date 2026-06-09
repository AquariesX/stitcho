"use server";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { notifyAdminOnTailorItemAdd } from "./notification-actions";
import { productWriteSchema } from "@/lib/catalog-validation";
import {
  CatalogValidationError,
  createProductCatalog,
  updateProductCatalog,
} from "@/lib/catalog-management";

function serialize<T>(value: T): T {
  return JSON.parse(
    JSON.stringify(value, (_key, item) =>
      item?.constructor?.name === "Decimal" ? item.toString() : item
    )
  );
}

function json(formData: FormData, primary: string, legacy: string) {
  try {
    return JSON.parse(
      String(formData.get(primary) ?? formData.get(legacy) ?? "[]")
    );
  } catch {
    return [];
  }
}

function parseProduct(formData: FormData) {
  return productWriteSchema.safeParse({
    name: formData.get("name"),
    code: formData.get("code"),
    imageUrl: formData.get("imageUrl"),
    thumbnailUrl: formData.get("thumbnailUrl") || null,
    modelImageUrl: formData.get("modelImageUrl") || null,
    topOverlayUrl: formData.get("topOverlayUrl") || null,
    bottomOverlayUrl: formData.get("bottomOverlayUrl") || null,
    overlayKey: formData.get("overlayKey") || null,
    previewEnabled: formData.get("previewEnabled") === "true",
    basePrice: formData.get("basePrice"),
    categoryId: formData.get("categoryId"),
    description: formData.get("description") || null,
    productType: formData.get("productType"),
    previewType: formData.get("previewType") || null,
    frontPreviewAsset: formData.get("frontPreviewAsset") || null,
    backPreviewAsset: formData.get("backPreviewAsset") || null,
    previewStorageType: formData.get("previewStorageType") || "LOCAL",
    estimatedDays: formData.get("estimatedDays") || null,
    measurementProfile: formData.get("measurementProfile") || null,
    isAvailable: formData.get("isAvailable") !== "false",
    isFeatured: formData.get("isFeatured") === "true",
    displayOrder: formData.get("displayOrder") || 0,
    userId: formData.get("userId") || null,
    fabricSelections: json(formData, "fabricSelections", "fabrics"),
    colorSelections: json(formData, "colorSelections", "colors"),
    styleOptionSelections: json(formData, "styleOptionSelections", "styles"),
  });
}

function owner(formData: FormData) {
  const id = Number(formData.get("userId"));
  const role = String(formData.get("role") ?? "TAILOR").toUpperCase();
  return { id, role };
}

export async function createProduct(formData: FormData) {
  const parsed = parseProduct(formData);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message };
  try {
    const actor = owner(formData);
    const product = await createProductCatalog(parsed.data, actor);
    if (actor.id) await notifyAdminOnTailorItemAdd(actor.id, "Product", product.name);
    revalidatePath("/dashboard/products");
    return { success: true, data: serialize(product) };
  } catch (error) {
    if (error instanceof CatalogValidationError) {
      return { success: false, error: error.message };
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { success: false, error: "Product code already exists" };
    }
    return { success: false, error: error instanceof Error ? error.message : "Failed to create product" };
  }
}

export async function getProducts(role?: string, userId?: number) {
  try {
    const products = await prisma.product.findMany({
      where: role === "tailor" && userId ? { userId } : {},
      orderBy: [{ displayOrder: "asc" }, { createdAt: "desc" }],
      include: {
        category: true,
        supportedFabrics: true,
        supportedColors: true,
        supportedStyles: true,
        previewAssets: true,
        ...(role === "admin"
          ? { user: { select: { name: true, shopProfile: { select: { shopName: true } } } } }
          : {}),
      },
    });
    return { success: true, data: serialize(products) };
  } catch {
    return { success: false, error: "Failed to fetch products" };
  }
}

export async function getProductFormOptions(role?: string, userId?: number) {
  const where = role === "tailor" && userId ? { userId } : {};
  const [fabrics, colors, styles] = await Promise.all([
    prisma.fabric.findMany({
      where,
      include: { compatibleTypes: true },
      orderBy: { name: "asc" },
    }),
    prisma.color.findMany({
      where,
      orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
    }),
    prisma.style.findMany({
      where,
      include: { options: { orderBy: { displayOrder: "asc" } } },
      orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
    }),
  ]);
  return { success: true, data: serialize({ fabrics, colors, styles }) };
}

export async function updateProduct(id: number, formData: FormData) {
  const parsed = parseProduct(formData);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message };
  try {
    const product = await updateProductCatalog(id, parsed.data, owner(formData));
    revalidatePath("/dashboard/products");
    return { success: true, data: serialize(product) };
  } catch (error) {
    if (error instanceof CatalogValidationError) return { success: false, error: error.message };
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { success: false, error: "Product code already exists" };
    }
    return { success: false, error: error instanceof Error ? error.message : "Failed to update product" };
  }
}

export async function setProductAvailability(id: number, isAvailable: boolean) {
  await prisma.product.update({ where: { id }, data: { isAvailable } });
  revalidatePath("/dashboard/products");
  return { success: true };
}

export async function deleteProduct(id: number) {
  if (await prisma.order.count({ where: { productId: id } })) {
    return { success: false, error: "Product is used by orders. Mark it unavailable instead." };
  }
  await prisma.product.delete({ where: { id } });
  revalidatePath("/dashboard/products");
  return { success: true };
}
