import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess, API_ERRORS } from "@/lib/api-response";
import { verifyDashboardUser } from "@/lib/auth-helpers";
import { productColorSchema } from "@/lib/catalog-validation";
import {
  assertProductOwnership,
  validateSingleDefault,
} from "@/lib/product-route-helpers";
import { CustomizationError } from "@/lib/product-customization";
import { z } from "zod";

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ productId: string }> }
) {
  const auth = await verifyDashboardUser(request);
  if (auth.error || !auth.user) return apiError(API_ERRORS.FORBIDDEN, 403);
  const { productId } = await context.params;
  const id = Number(productId);
  if (!Number.isInteger(id) || id <= 0) return apiError("Invalid productId", 400);

  try {
    await assertProductOwnership(id, auth.user);
    const parsed = z.array(productColorSchema).safeParse(await request.json());
    if (!parsed.success) return apiError(parsed.error.issues[0]?.message ?? "Invalid colors", 400);
    validateSingleDefault(parsed.data, "color");
    if (new Set(parsed.data.map((item) => item.colorId)).size !== parsed.data.length) {
      return apiError("Duplicate colors are not allowed", 400);
    }
    const existing = await prisma.color.count({
      where: { id: { in: parsed.data.map((item) => item.colorId) } },
    });
    if (existing !== parsed.data.length) return apiError("One or more colors do not exist", 400);

    await prisma.$transaction([
      prisma.productColor.deleteMany({ where: { productId: id } }),
      prisma.productColor.createMany({
        data: parsed.data.map((item) => ({ productId: id, ...item })),
      }),
    ]);
    return apiSuccess({ updated: parsed.data.length });
  } catch (error) {
    if (error instanceof CustomizationError) return apiError(error.message, error.status);
    console.error("[API] product colors PUT error:", error);
    return apiError(API_ERRORS.SERVER_ERROR, 500);
  }
}
