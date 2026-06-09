import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess, API_ERRORS } from "@/lib/api-response";
import { verifyDashboardUser } from "@/lib/auth-helpers";
import {
  parseJsonBody,
  styleOptionInputSchema,
  validateAssetLocation,
} from "@/lib/catalog-validation";
import { PREVIEW_TYPE_BY_PRODUCT } from "@/lib/catalog-types";

async function owned(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await verifyDashboardUser(request);
  if (auth.error || !auth.user) return { response: apiError(API_ERRORS.FORBIDDEN, 403) };
  const id = Number((await context.params).id);
  const option = await prisma.styleOption.findFirst({
    where: {
      id,
      style: auth.user.role === "TAILOR" ? { userId: auth.user.id } : {},
    },
    include: { style: true },
  });
  return option ? { id, option } : { response: apiError("Style option not found", 404) };
}

export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const result = await owned(request, context);
  if ("response" in result) return result.response;
  const parsed = parseJsonBody(styleOptionInputSchema, await request.json());
  if (!parsed.success) return apiError(parsed.error, 400);
  if (!result.option.style.productType) return apiError("Style group requires a product type", 400);
  const previewType = PREVIEW_TYPE_BY_PRODUCT[result.option.style.productType];
  for (const asset of [parsed.data.frontOverlayAsset, parsed.data.backOverlayAsset]) {
    if (asset && !validateAssetLocation(asset, parsed.data.assetStorageType, previewType)) {
      return apiError(`Overlay does not match preview type ${previewType}`, 400);
    }
  }
  if (parsed.data.isDefault && !result.option.style.allowMultiple) {
    await prisma.styleOption.updateMany({
      where: { styleId: result.option.styleId, id: { not: result.id } },
      data: { isDefault: false },
    });
  }
  return apiSuccess(
    await prisma.styleOption.update({ where: { id: result.id }, data: parsed.data })
  );
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const result = await owned(request, context);
  if ("response" in result) return result.response;
  const used = await prisma.orderStyle.count({ where: { styleOptionId: result.id } });
  if (used) return apiError("Style option is used by orders; mark it unavailable", 409);
  await prisma.styleOption.delete({ where: { id: result.id } });
  return apiSuccess({ deleted: true });
}
