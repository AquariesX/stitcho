"use server";

import { Prisma, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { notifyAdminOnTailorItemAdd } from "./notification-actions";
import { controlledCategory } from "@/lib/catalog-rules";

async function normalizeCategory(
  name: string,
  code: string,
  ownerId: number | null
) {
  if (!name || !code) throw new Error("Name and Code are required");
  if (!ownerId) return { name: name.trim(), code: code.trim().toUpperCase() };

  const owner = await prisma.user.findUnique({
    where: { id: ownerId },
    select: { role: true },
  });
  if (!owner) throw new Error("Category owner not found");
  if (owner.role !== Role.TAILOR) {
    return { name: name.trim(), code: code.trim().toUpperCase() };
  }

  const controlled = controlledCategory(code.trim().toUpperCase());
  if (!controlled) {
    throw new Error(
      "Tailors can only add SHALWAR KAMEEZ, T SHIRT, PANTS, or FORMAL SHIRT"
    );
  }
  return { name: controlled.name, code: controlled.code };
}

export async function createCategory(formData: FormData) {
  try {
    const ownerId = formData.get("userId")
      ? Number(formData.get("userId"))
      : null;
    const normalized = await normalizeCategory(
      String(formData.get("name") ?? ""),
      String(formData.get("code") ?? ""),
      ownerId
    );
    const category = await prisma.category.create({
      data: {
        ...normalized,
        imageUrl: String(formData.get("imageUrl") ?? ""),
        userId: ownerId,
      },
    });

    if (ownerId) {
      await notifyAdminOnTailorItemAdd(ownerId, "Category", category.name);
    }
    revalidatePath("/dashboard/categories");
    return { success: true, data: category };
  } catch (error: unknown) {
    console.error("Failed to create category:", error);
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return {
        success: false,
        error: "This category already exists in your catalog",
      };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create category",
    };
  }
}

export async function getCategories(role?: string, userId?: number) {
  try {
    const categories = await prisma.category.findMany({
      where: role === "tailor" && userId ? { userId } : {},
      orderBy: { createdAt: "desc" },
      include:
        role === "admin"
          ? {
              user: {
                select: {
                  name: true,
                  shopProfile: { select: { shopName: true } },
                },
              },
            }
          : undefined,
    });
    return { success: true, data: categories };
  } catch (error) {
    console.error("Failed to fetch categories:", error);
    return { success: false, error: "Failed to fetch categories" };
  }
}

export async function updateCategory(id: number, formData: FormData) {
  try {
    const existing = await prisma.category.findUnique({
      where: { id },
      select: { userId: true },
    });
    if (!existing) return { success: false, error: "Category not found" };

    const normalized = await normalizeCategory(
      String(formData.get("name") ?? ""),
      String(formData.get("code") ?? ""),
      existing.userId
    );
    const category = await prisma.category.update({
      where: { id },
      data: {
        ...normalized,
        imageUrl: String(formData.get("imageUrl") ?? ""),
      },
    });
    revalidatePath("/dashboard/categories");
    return { success: true, data: category };
  } catch (error: unknown) {
    console.error("Failed to update category:", error);
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return {
        success: false,
        error: "This category already exists in your catalog",
      };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update category",
    };
  }
}

export async function deleteCategory(id: number) {
  try {
    await prisma.category.delete({ where: { id } });
    revalidatePath("/dashboard/categories");
    return { success: true };
  } catch (error) {
    console.error("Failed to delete category:", error);
    return {
      success: false,
      error: "Cannot delete category because it is in use.",
    };
  }
}
