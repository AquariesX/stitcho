import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError, API_ERRORS } from "@/lib/api-response";

// Legacy public Flutter endpoint. Only classified, available products and
// explicit compatibility links are returned.
export async function GET(request: NextRequest) {
  try {
    const categoryId = new URL(request.url).searchParams.get("categoryId");
    const products = await prisma.product.findMany({
      where: {
        isAvailable: true,
        productType: { not: null },
        ...(categoryId ? { categoryId: Number(categoryId) } : {}),
      },
      include: {
        category: { select: { id: true, name: true, code: true } },
        supportedFabrics: {
          where: { fabric: { isAvailable: true, stockQuantity: { gt: 0 } } },
          include: { fabric: true },
        },
        supportedColors: {
          where: { color: { isAvailable: true } },
          include: { color: true },
        },
      },
      orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
    });

    return apiSuccess(
      products.map(({ supportedFabrics, supportedColors, ...product }) => ({
        ...product,
        thumbnailUrl: product.thumbnailUrl ?? product.imageUrl,
        basePrice: product.basePrice.toFixed(2),
        fabrics: supportedFabrics.map(({ fabric, ...link }) => ({
          ...fabric,
          price: fabric.price.toFixed(2),
          priceAdjustment: link.priceAdjustment.toFixed(2),
          isDefault: link.isDefault,
        })),
        colors: supportedColors.map(({ color, isDefault }) => ({
          ...color,
          isDefault,
        })),
      }))
    );
  } catch (error) {
    console.error("[API] mobile/products GET error:", error);
    return apiError(API_ERRORS.SERVER_ERROR, 500);
  }
}
