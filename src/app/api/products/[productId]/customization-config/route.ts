import { NextRequest } from "next/server";
import { apiError, apiSuccess, API_ERRORS } from "@/lib/api-response";
import { verifyDashboardUser } from "@/lib/auth-helpers";
import {
  CustomizationError,
  getProductCustomizationConfig,
} from "@/lib/product-customization";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ productId: string }> }
) {
  const auth = await verifyDashboardUser(request);
  if (auth.error || !auth.user) return apiError(API_ERRORS.FORBIDDEN, 403);
  const { productId } = await context.params;
  const id = Number(productId);
  if (!Number.isInteger(id) || id <= 0) return apiError("Invalid productId", 400);
  try {
    return apiSuccess(await getProductCustomizationConfig(id));
  } catch (error) {
    if (error instanceof CustomizationError) return apiError(error.message, error.status);
    console.error("[API] product customization-config error:", error);
    return apiError(API_ERRORS.SERVER_ERROR, 500);
  }
}
