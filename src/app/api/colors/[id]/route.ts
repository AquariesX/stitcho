import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess, API_ERRORS } from "@/lib/api-response";
import { verifyDashboardUser } from "@/lib/auth-helpers";
import { colorInputSchema, parseJsonBody } from "@/lib/catalog-validation";

async function owned(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await verifyDashboardUser(request);
  if (auth.error || !auth.user) return { response: apiError(API_ERRORS.FORBIDDEN, 403) };
  const id = Number((await context.params).id);
  const color = await prisma.color.findFirst({
    where: { id, ...(auth.user.role === "TAILOR" ? { userId: auth.user.id } : {}) },
    include: { _count: { select: { supportedProducts: true, orders: true } } },
  });
  return color ? { id, color } : { response: apiError("Color not found", 404) };
}

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const result = await owned(request, context);
  return "response" in result ? result.response : apiSuccess(result.color);
}

export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const result = await owned(request, context);
  if ("response" in result) return result.response;
  const parsed = parseJsonBody(colorInputSchema, await request.json());
  if (!parsed.success) return apiError(parsed.error, 400);
  try {
    return apiSuccess(await prisma.color.update({ where: { id: result.id }, data: parsed.data }));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return apiError("This hex color already exists in your catalog", 409);
    }
    throw error;
  }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const result = await owned(request, context);
  if ("response" in result) return result.response;
  if (result.color._count.orders) return apiError("Color is used by orders; mark it unavailable", 409);
  await prisma.color.delete({ where: { id: result.id } });
  return apiSuccess({ deleted: true });
}
