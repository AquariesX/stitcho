import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError, API_ERRORS } from "@/lib/api-response";

/**
 * GET /api/mobile/products
 *
 * Public — no auth required.
 * Returns available products with their category, fabrics, and styles.
 * Supports optional ?categoryId= filter.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get("categoryId");

    const products = await prisma.product.findMany({
      where: {
        isAvailable: true,
        ...(categoryId ? { categoryId: parseInt(categoryId) } : {}),
      },
      include: {
        category: { select: { id: true, name: true, code: true } },
        fabrics: {
          where: { isAvailable: true },
          select: { id: true, name: true, imageUrl: true, price: true },
        },
      },
      orderBy: { name: "asc" },
    });

    // Serialize Decimal fields for JSON
    const serialized = products.map((p) => ({
      ...p,
      basePrice: Number(p.basePrice),
      fabrics: p.fabrics.map((f) => ({ ...f, price: Number(f.price) })),
    }));

    return apiSuccess(serialized);
  } catch (err) {
    console.error("[API] mobile/products GET error:", err);
    return apiError(API_ERRORS.SERVER_ERROR, 500);
  }
}
