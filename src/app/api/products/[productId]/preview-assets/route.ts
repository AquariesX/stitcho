import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess, API_ERRORS } from "@/lib/api-response";
import { verifyDashboardUser } from "@/lib/auth-helpers";
import { previewAssetSchema } from "@/lib/catalog-validation";
import { assertProductOwnership } from "@/lib/product-route-helpers";
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
    const parsed = z.array(previewAssetSchema).safeParse(await request.json());
    if (!parsed.success) return apiError(parsed.error.issues[0]?.message ?? "Invalid assets", 400);
    const keys = parsed.data.map((asset) => `${asset.view}:${asset.assetKey}`);
    if (new Set(keys).size !== keys.length) return apiError("Duplicate preview asset keys", 400);

    await prisma.$transaction([
      prisma.productPreviewAsset.deleteMany({ where: { productId: id } }),
      prisma.productPreviewAsset.createMany({
        data: parsed.data.map((asset) => ({ productId: id, ...asset })),
      }),
    ]);
    return apiSuccess({ updated: parsed.data.length });
  } catch (error) {
    if (error instanceof CustomizationError) return apiError(error.message, error.status);
    console.error("[API] product preview-assets PUT error:", error);
    return apiError(API_ERRORS.SERVER_ERROR, 500);
  }
}
