import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess, API_ERRORS } from "@/lib/api-response";
import { verifyCustomer } from "@/lib/customer-auth";

export async function GET(request: NextRequest) {
  const auth = await verifyCustomer(request);
  if (auth.error || !auth.customer) return apiError(API_ERRORS.INVALID_TOKEN, 401);
  const categories = await prisma.category.findMany({
    where: {
      products: { some: { isAvailable: true, productType: { not: null } } },
    },
    select: { id: true, name: true, code: true, imageUrl: true },
    orderBy: { name: "asc" },
  });
  return apiSuccess(categories);
}
