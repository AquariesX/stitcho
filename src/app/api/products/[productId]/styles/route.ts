import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess, API_ERRORS } from "@/lib/api-response";
import { verifyDashboardUser } from "@/lib/auth-helpers";
import { productStyleSchema } from "@/lib/catalog-validation";
import {
  assertProductOwnership,
  assertStylesMatchProduct,
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
    const product = await assertProductOwnership(id, auth.user);
    const parsed = z.array(productStyleSchema).safeParse(await request.json());
    if (!parsed.success) return apiError(parsed.error.issues[0]?.message ?? "Invalid styles", 400);
    const ids = parsed.data.map((item) => item.styleOptionId);
    if (new Set(ids).size !== ids.length) return apiError("Duplicate styles are not allowed", 400);
    const options = await assertStylesMatchProduct(product.productType, ids);
    const optionById = new Map(options.map((option) => [option.id, option]));

    for (const group of new Set(options.map((option) => option.styleId))) {
      const defaults = parsed.data.filter(
        (item) => item.isDefault && optionById.get(item.styleOptionId)?.styleId === group
      );
      const style = options.find((option) => option.styleId === group)!.style;
      if (!style.allowMultiple && defaults.length > 1) {
        return apiError(`Only one default option is allowed for ${style.name}`, 400);
      }
      if (style.isRequired && !style.allowMultiple && defaults.length !== 1) {
        return apiError(`${style.name} requires exactly one default option`, 400);
      }
    }

    await prisma.$transaction([
      prisma.productStyle.deleteMany({ where: { productId: id } }),
      prisma.productStyle.createMany({
        data: parsed.data.map((item) => ({ productId: id, ...item })),
      }),
    ]);
    return apiSuccess({ updated: parsed.data.length });
  } catch (error) {
    if (error instanceof CustomizationError) return apiError(error.message, error.status);
    console.error("[API] product styles PUT error:", error);
    return apiError(API_ERRORS.SERVER_ERROR, 500);
  }
}
