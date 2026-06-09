import { NextRequest } from "next/server";
import { apiError, apiSuccess, API_ERRORS } from "@/lib/api-response";
import { verifyCustomer } from "@/lib/customer-auth";
import { parseJsonBody, previewRequestSchema } from "@/lib/catalog-validation";
import {
  CustomizationError,
  validateCustomization,
} from "@/lib/product-customization";
import { PreviewView } from "@prisma/client";

export async function POST(request: NextRequest) {
  const auth = await verifyCustomer(request);
  if (auth.error || !auth.customer) return apiError(API_ERRORS.INVALID_TOKEN, 401);

  try {
    const parsed = parseJsonBody(previewRequestSchema, await request.json());
    if (!parsed.success) return apiError(parsed.error, 400);
    const result = await validateCustomization(parsed.data);
    return apiSuccess({
      message: "Preview configuration generated successfully.",
      previewType: result.product.previewType,
      view: parsed.data.view,
      baseAsset: result.baseAsset,
      color: {
        name: result.colorLink.color.name,
        hexCode: result.colorLink.color.hexCode,
      },
      fabricTextureUrl: result.fabricLink.fabric.textureUrl,
      overlays: result.selected.map(({ styleOption }) => ({
        group: styleOption.style.groupType,
        name: styleOption.name,
        asset:
          parsed.data.view === PreviewView.FRONT
            ? styleOption.frontOverlayAsset
            : styleOption.backOverlayAsset,
      })),
      price: {
        basePrice: result.price.basePrice.toFixed(2),
        fabricAdjustment: result.price.fabricAdjustment.toFixed(2),
        styleAdjustments: result.price.styleAdjustments.toFixed(2),
        total: result.price.total.toFixed(2),
      },
    });
  } catch (error) {
    if (error instanceof CustomizationError) return apiError(error.message, error.status);
    console.error("[API] customer/orders/preview POST error:", error);
    return apiError(API_ERRORS.SERVER_ERROR, 500);
  }
}
