import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess, API_ERRORS } from "@/lib/api-response";
import { verifyDashboardUser } from "@/lib/auth-helpers";
import { fabricInputSchema, parseJsonBody } from "@/lib/catalog-validation";

async function resolve(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await verifyDashboardUser(request);
  if (auth.error || !auth.user) return { response: apiError(API_ERRORS.FORBIDDEN, 403) };
  const id = Number((await context.params).id);
  if (!Number.isInteger(id) || id <= 0) return { response: apiError("Invalid fabric id", 400) };
  const fabric = await prisma.fabric.findFirst({
    where: { id, ...(auth.user.role === "TAILOR" ? { userId: auth.user.id } : {}) },
    include: { category: true, compatibleTypes: true },
  });
  if (!fabric) return { response: apiError("Fabric not found", 404) };
  return { auth, id, fabric };
}

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const result = await resolve(request, context);
  return "response" in result ? result.response : apiSuccess(result.fabric);
}

export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const result = await resolve(request, context);
  if ("response" in result) return result.response;
  const parsed = parseJsonBody(fabricInputSchema, await request.json());
  if (!parsed.success) return apiError(parsed.error, 400);
  const { productTypes, ...data } = parsed.data;
  const fabric = await prisma.$transaction(async (tx) => {
    await tx.fabric.update({ where: { id: result.id }, data });
    await tx.fabricCompatibility.deleteMany({ where: { fabricId: result.id } });
    await tx.fabricCompatibility.createMany({
      data: productTypes.map((productType) => ({ fabricId: result.id, productType })),
    });
    return tx.fabric.findUniqueOrThrow({
      where: { id: result.id },
      include: { category: true, compatibleTypes: true },
    });
  });
  return apiSuccess(fabric);
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const result = await resolve(request, context);
  if ("response" in result) return result.response;
  const orders = await prisma.order.count({ where: { fabricId: result.id } });
  if (orders) return apiError("Fabric is used by orders; mark it unavailable", 409);
  await prisma.fabric.delete({ where: { id: result.id } });
  return apiSuccess({ deleted: true });
}
