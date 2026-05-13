import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError, API_ERRORS } from "@/lib/api-response";

/**
 * GET /api/mobile/fabrics
 *
 * Public — no auth required.
 * Returns available fabrics with stock info.
 * Supports optional ?categoryId= filter.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get("categoryId");

    const fabrics = await prisma.fabric.findMany({
      where: {
        isAvailable: true,
        ...(categoryId ? { categoryId: parseInt(categoryId) } : {}),
      },
      select: {
        id: true,
        name: true,
        imageUrl: true,
        price: true,
        stockQuantity: true,
        isAvailable: true,
        category: { select: { id: true, name: true } },
      },
      orderBy: { name: "asc" },
    });

    const serialized = fabrics.map((f) => ({
      ...f,
      price: Number(f.price),
    }));

    return apiSuccess(serialized);
  } catch (err) {
    console.error("[API] mobile/fabrics GET error:", err);
    return apiError(API_ERRORS.SERVER_ERROR, 500);
  }
}
