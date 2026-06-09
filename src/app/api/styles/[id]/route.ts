import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess, API_ERRORS } from "@/lib/api-response";
import { verifyDashboardUser } from "@/lib/auth-helpers";
import { parseJsonBody, styleGroupInputSchema } from "@/lib/catalog-validation";

async function owned(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await verifyDashboardUser(request);
  if (auth.error || !auth.user) return { response: apiError(API_ERRORS.FORBIDDEN, 403) };
  const id = Number((await context.params).id);
  const style = await prisma.style.findFirst({
    where: { id, ...(auth.user.role === "TAILOR" ? { userId: auth.user.id } : {}) },
    include: { options: { orderBy: { displayOrder: "asc" } } },
  });
  return style ? { id, style } : { response: apiError("Style group not found", 404) };
}

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const result = await owned(request, context);
  return "response" in result ? result.response : apiSuccess(result.style);
}

export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const result = await owned(request, context);
  if ("response" in result) return result.response;
  const parsed = parseJsonBody(styleGroupInputSchema, await request.json());
  if (!parsed.success) return apiError(parsed.error, 400);
  return apiSuccess(
    await prisma.style.update({
      where: { id: result.id },
      data: parsed.data,
      include: { options: { orderBy: { displayOrder: "asc" } } },
    })
  );
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const result = await owned(request, context);
  if ("response" in result) return result.response;
  const used = await prisma.orderStyle.count({
    where: { styleOption: { styleId: result.id } },
  });
  if (used) return apiError("Style group is used by orders; mark it unavailable", 409);
  await prisma.style.delete({ where: { id: result.id } });
  return apiSuccess({ deleted: true });
}
