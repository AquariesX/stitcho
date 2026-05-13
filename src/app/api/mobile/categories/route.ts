import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError, API_ERRORS } from "@/lib/api-response";

/**
 * GET /api/mobile/categories
 *
 * Public — no auth required. Returns all categories.
 * Optionally include product count.
 */
export async function GET(_request: NextRequest) {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        code: true,
        imageUrl: true,
        createdAt: true,
        _count: { select: { products: true, designs: true } },
      },
    });

    return apiSuccess(categories);
  } catch (err) {
    console.error("[API] mobile/categories GET error:", err);
    return apiError(API_ERRORS.SERVER_ERROR, 500);
  }
}
