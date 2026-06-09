"use server";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { colorInputSchema } from "@/lib/catalog-validation";

function parsedColor(formData: FormData) {
  return colorInputSchema.safeParse({
    name: formData.get("name"),
    hexCode: formData.get("hexCode"),
    isAvailable: formData.get("isAvailable") !== "false",
    displayOrder: formData.get("displayOrder") || 0,
  });
}

export async function createColor(formData: FormData) {
  const parsed = parsedColor(formData);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message };
  try {
    const color = await prisma.color.create({
      data: {
        ...parsed.data,
        userId: formData.get("userId") ? Number(formData.get("userId")) : null,
      },
      include: { _count: { select: { supportedProducts: true } } },
    });
    revalidatePath("/dashboard/colors");
    return { success: true, data: color };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { success: false, error: "This hex color already exists in your catalog" };
    }
    return { success: false, error: "Failed to create color" };
  }
}

export async function getColors(role?: string, userId?: number) {
  try {
    const colors = await prisma.color.findMany({
      where: role === "tailor" && userId ? { userId } : {},
      include: {
        _count: { select: { supportedProducts: true } },
        ...(role === "admin"
          ? { user: { select: { name: true, shopProfile: { select: { shopName: true } } } } }
          : {}),
      },
      orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
    });
    return { success: true, data: colors };
  } catch {
    return { success: false, error: "Failed to fetch colors" };
  }
}

export async function updateColor(id: number, formData: FormData) {
  const parsed = parsedColor(formData);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message };
  try {
    const color = await prisma.color.update({
      where: { id },
      data: parsed.data,
      include: { _count: { select: { supportedProducts: true } } },
    });
    revalidatePath("/dashboard/colors");
    return { success: true, data: color };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { success: false, error: "This hex color already exists in your catalog" };
    }
    return { success: false, error: "Failed to update color" };
  }
}

export async function deleteColor(id: number) {
  if (await prisma.order.count({ where: { colorId: id } })) {
    return { success: false, error: "Color is used by orders. Mark it unavailable instead." };
  }
  await prisma.color.delete({ where: { id } });
  revalidatePath("/dashboard/colors");
  return { success: true };
}
