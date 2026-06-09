import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess, API_ERRORS } from "@/lib/api-response";
import { verifyCustomer } from "@/lib/customer-auth";

export async function GET(request: NextRequest) {
  const auth = await verifyCustomer(request);
  if (auth.error || !auth.customer) return apiError(API_ERRORS.INVALID_TOKEN, 401);
  const categoryParam = request.nextUrl.searchParams.get("categoryId");
  const categoryId = categoryParam ? Number(categoryParam) : null;
  if (categoryParam && (!Number.isInteger(categoryId) || Number(categoryId) <= 0)) {
    return apiError("Invalid categoryId", 400);
  }
  try {
    const products = await prisma.product.findMany({
      where: {
        isAvailable: true,
        productType: { not: null },
        ...(categoryId ? { categoryId } : {}),
      },
      select: {
        id: true,
        name: true,
        code: true,
        description: true,
        productType: true,
        previewType: true,
        categoryId: true,
        imageUrl: true,
        thumbnailUrl: true,
        modelImageUrl: true,
        topOverlayUrl: true,
        bottomOverlayUrl: true,
        overlayKey: true,
        previewEnabled: true,
        frontPreviewAsset: true,
        backPreviewAsset: true,
        previewStorageType: true,
        basePrice: true,
        estimatedDays: true,
        isAvailable: true,
        isFeatured: true,
        category: { select: { id: true, name: true, code: true } },
      },
      orderBy: [{ displayOrder: "asc" }, { createdAt: "desc" }],
    });
    return apiSuccess(
      products.map(({ imageUrl, thumbnailUrl, basePrice, ...product }) => ({
        ...product,
        imageUrl,
        thumbnailUrl: thumbnailUrl ?? imageUrl,
        catalogImageUrl: thumbnailUrl ?? imageUrl,
        basePrice: basePrice.toFixed(2),
      }))
    );
  } catch (error) {
    console.error("[API] customer/products GET error:", error);
    return apiError(API_ERRORS.SERVER_ERROR, 500);
  }
}
