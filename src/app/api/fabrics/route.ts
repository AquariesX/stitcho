import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess, API_ERRORS } from "@/lib/api-response";
import { verifyDashboardUser } from "@/lib/auth-helpers";
import { fabricInputSchema, parseJsonBody } from "@/lib/catalog-validation";

export async function GET(request: NextRequest) {
  const auth = await verifyDashboardUser(request);
  if (auth.error || !auth.user) return apiError(API_ERRORS.FORBIDDEN, 403);
  const productId = Number(new URL(request.url).searchParams.get("productId"));
  const where: Prisma.FabricWhereInput =
    auth.user.role === "TAILOR" ? { userId: auth.user.id } : {};
  if (Number.isInteger(productId) && productId > 0) {
    where.supportedProducts = { some: { productId } };
  }
  const fabrics = await prisma.fabric.findMany({
    where,
    include: {
      category: true,
      compatibleTypes: true,
      _count: { select: { supportedProducts: true } },
    },
    orderBy: { name: "asc" },
  });
  return apiSuccess(fabrics);
}

export async function POST(request: NextRequest) {
  const auth = await verifyDashboardUser(request);
  if (auth.error || !auth.user) return apiError(API_ERRORS.FORBIDDEN, 403);
  const parsed = parseJsonBody(fabricInputSchema, await request.json());
  if (!parsed.success) return apiError(parsed.error, 400);
  const { productTypes, ...data } = parsed.data;
  const category = await prisma.category.findFirst({
    where: {
      id: data.categoryId,
      ...(auth.user.role === "TAILOR" ? { userId: auth.user.id } : {}),
    },
  });
  if (!category) return apiError("Category not found", 404);
  const fabric = await prisma.$transaction(async (tx) => {
    const created = await tx.fabric.create({
      data: { ...data, userId: auth.user.id },
    });
    await tx.fabricCompatibility.createMany({
      data: productTypes.map((productType) => ({
        fabricId: created.id,
        productType,
      })),
    });
    return tx.fabric.findUniqueOrThrow({
      where: { id: created.id },
      include: { category: true, compatibleTypes: true },
    });
  });
  return apiSuccess(fabric, 201);
}
