import { NextRequest } from "next/server";
import { apiError, apiSuccess, API_ERRORS } from "@/lib/api-response";
import { verifyCustomer } from "@/lib/customer-auth";
import {
  CustomizationError,
  getProductCustomizationConfig,
} from "@/lib/product-customization";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ productId: string }> }
) {
  const auth = await verifyCustomer(request);
  if (auth.error || !auth.customer) return apiError(API_ERRORS.INVALID_TOKEN, 401);
  const { productId } = await context.params;
  const id = Number(productId);
  if (!Number.isInteger(id) || id <= 0) return apiError("Invalid productId", 400);
  try {
    return apiSuccess(await getProductCustomizationConfig(id));
  } catch (error) {
    if (error instanceof CustomizationError) return apiError(error.message, error.status);
    console.error("[API] customer customization-config error:", error);
    return apiError(API_ERRORS.SERVER_ERROR, 500);
  }
}
