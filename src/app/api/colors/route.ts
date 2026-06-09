import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess, API_ERRORS } from "@/lib/api-response";
import { verifyDashboardUser } from "@/lib/auth-helpers";
import { colorInputSchema, parseJsonBody } from "@/lib/catalog-validation";

export async function GET(request: NextRequest) {
  const auth = await verifyDashboardUser(request);
  if (auth.error || !auth.user) return apiError(API_ERRORS.FORBIDDEN, 403);
  const where: Prisma.ColorWhereInput =
    auth.user.role === "TAILOR" ? { userId: auth.user.id } : {};
  return apiSuccess(
    await prisma.color.findMany({
      where,
      include: { _count: { select: { supportedProducts: true } } },
      orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
    })
  );
}

export async function POST(request: NextRequest) {
  const auth = await verifyDashboardUser(request);
  if (auth.error || !auth.user) return apiError(API_ERRORS.FORBIDDEN, 403);
  const parsed = parseJsonBody(colorInputSchema, await request.json());
  if (!parsed.success) return apiError(parsed.error, 400);
  try {
    return apiSuccess(
      await prisma.color.create({ data: { ...parsed.data, userId: auth.user.id } }),
      201
    );
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return apiError("This hex color already exists in your catalog", 409);
    }
    throw error;
  }
}
