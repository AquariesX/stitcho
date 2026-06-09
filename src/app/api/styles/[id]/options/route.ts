import { NextRequest } from "next/server";
import { AssetStorageType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess, API_ERRORS } from "@/lib/api-response";
import { verifyDashboardUser } from "@/lib/auth-helpers";
import {
  parseJsonBody,
  styleOptionInputSchema,
  validateAssetLocation,
} from "@/lib/catalog-validation";
import { PREVIEW_TYPE_BY_PRODUCT } from "@/lib/catalog-types";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await verifyDashboardUser(request);
  if (auth.error || !auth.user) return apiError(API_ERRORS.FORBIDDEN, 403);
  const styleId = Number((await context.params).id);
  const style = await prisma.style.findFirst({
    where: {
      id: styleId,
      ...(auth.user.role === "TAILOR" ? { userId: auth.user.id } : {}),
    },
  });
  if (!style || !style.productType) {
    return apiError("Typed style group not found", 404);
  }
  const parsed = parseJsonBody(styleOptionInputSchema, await request.json());
  if (!parsed.success) return apiError(parsed.error, 400);
  const previewType = PREVIEW_TYPE_BY_PRODUCT[style.productType];
  for (const [label, asset] of [
    ["Front", parsed.data.frontOverlayAsset],
    ["Back", parsed.data.backOverlayAsset],
  ] as const) {
    if (
      asset &&
      !validateAssetLocation(
        asset,
        parsed.data.assetStorageType ?? AssetStorageType.LOCAL,
        previewType
      )
    ) {
      return apiError(
        `${label} overlay does not match preview type ${previewType}`,
        400
      );
    }
  }
  if (parsed.data.isDefault && !style.allowMultiple) {
    await prisma.styleOption.updateMany({
      where: { styleId },
      data: { isDefault: false },
    });
  }
  return apiSuccess(
    await prisma.styleOption.create({
      data: { styleId, ...parsed.data },
    }),
    201
  );
}
