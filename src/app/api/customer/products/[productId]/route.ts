import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess, API_ERRORS } from "@/lib/api-response";
import { verifyCustomer } from "@/lib/customer-auth";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ productId: string }> }
) {
  const auth = await verifyCustomer(request);
  if (auth.error || !auth.customer) return apiError(API_ERRORS.INVALID_TOKEN, 401);
  const { productId } = await context.params;
  const id = Number(productId);
  if (!Number.isInteger(id) || id <= 0) return apiError("Invalid productId", 400);
  const product = await prisma.product.findFirst({
    where: { id, isAvailable: true, productType: { not: null } },
    include: { category: true },
  });
  if (!product) return apiError("Product not found", 404);
  return apiSuccess({
    id: product.id,
    name: product.name,
    code: product.code,
    productType: product.productType,
    categoryId: product.categoryId,
    category: {
      id: product.category.id,
      name: product.category.name,
      code: product.category.code,
    },
    description: product.description,
    catalogImageUrl: product.imageUrl,
    basePrice: product.basePrice.toFixed(2),
    previewType: product.previewType,
    frontPreviewAsset: product.frontPreviewAsset,
    backPreviewAsset: product.backPreviewAsset,
    estimatedDays: product.estimatedDays,
    isAvailable: product.isAvailable,
    isFeatured: product.isFeatured,
  });
}
