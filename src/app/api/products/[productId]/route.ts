import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess, API_ERRORS } from "@/lib/api-response";
import { verifyDashboardUser } from "@/lib/auth-helpers";
import { parseJsonBody, productWriteSchema } from "@/lib/catalog-validation";
import { Prisma } from "@prisma/client";
import {
  CatalogValidationError,
  updateProductCatalog,
} from "@/lib/catalog-management";

async function resolveProductId(context: { params: Promise<{ productId: string }> }) {
  const { productId } = await context.params;
  const id = Number(productId);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ productId: string }> }
) {
  const auth = await verifyDashboardUser(request);
  if (auth.error || !auth.user) return apiError(API_ERRORS.FORBIDDEN, 403);
  const id = await resolveProductId(context);
  if (!id) return apiError("Invalid productId", 400);

  const product = await prisma.product.findFirst({
    where: {
      id,
      ...(auth.user.role === "TAILOR" ? { userId: auth.user.id } : {}),
    },
    include: {
      category: true,
      supportedFabrics: { include: { fabric: true } },
      supportedColors: { include: { color: true } },
      supportedStyles: {
        include: { styleOption: { include: { style: true } } },
      },
      previewAssets: true,
    },
  });
  return product ? apiSuccess(product) : apiError("Product not found", 404);
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ productId: string }> }
) {
  const auth = await verifyDashboardUser(request);
  if (auth.error || !auth.user) return apiError(API_ERRORS.FORBIDDEN, 403);
  const id = await resolveProductId(context);
  if (!id) return apiError("Invalid productId", 400);

  const existing = await prisma.product.findFirst({
    where: { id, ...(auth.user.role === "TAILOR" ? { userId: auth.user.id } : {}) },
  });
  if (!existing) return apiError("Product not found", 404);

  try {
    const parsed = parseJsonBody(productWriteSchema, await request.json());
    if (!parsed.success) return apiError(parsed.error, 400);
    const product = await updateProductCatalog(id, parsed.data, auth.user);
    return apiSuccess(product);
  } catch (error: unknown) {
    if (error instanceof CatalogValidationError) {
      return apiError(error.message, error.status);
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return apiError("Product code already exists", 409);
    }
    console.error("[API] products/:id PUT error:", error);
    return apiError(API_ERRORS.SERVER_ERROR, 500);
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ productId: string }> }
) {
  const auth = await verifyDashboardUser(request);
  if (auth.error || !auth.user) return apiError(API_ERRORS.FORBIDDEN, 403);
  const id = await resolveProductId(context);
  if (!id) return apiError("Invalid productId", 400);

  const existing = await prisma.product.findFirst({
    where: { id, ...(auth.user.role === "TAILOR" ? { userId: auth.user.id } : {}) },
    include: { _count: { select: { orders: true } } },
  });
  if (!existing) return apiError("Product not found", 404);
  if (existing._count.orders > 0) {
    return apiError("Products referenced by orders cannot be deleted; mark it unavailable", 409);
  }
  await prisma.product.delete({ where: { id } });
  return apiSuccess({ deleted: true });
}
