import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess, API_ERRORS } from "@/lib/api-response";
import { verifyDashboardUser } from "@/lib/auth-helpers";
import { parseJsonBody, styleGroupInputSchema } from "@/lib/catalog-validation";

export async function GET(request: NextRequest) {
  const auth = await verifyDashboardUser(request);
  if (auth.error || !auth.user) return apiError(API_ERRORS.FORBIDDEN, 403);
  const where: Prisma.StyleWhereInput =
    auth.user.role === "TAILOR" ? { userId: auth.user.id } : {};
  return apiSuccess(
    await prisma.style.findMany({
      where,
      include: {
        options: {
          orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
        },
      },
      orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
    })
  );
}

export async function POST(request: NextRequest) {
  const auth = await verifyDashboardUser(request);
  if (auth.error || !auth.user) return apiError(API_ERRORS.FORBIDDEN, 403);
  const parsed = parseJsonBody(styleGroupInputSchema, await request.json());
  if (!parsed.success) return apiError(parsed.error, 400);
  const style = await prisma.style.create({
    data: { ...parsed.data, userId: auth.user.id },
    include: { options: true },
  });
  return apiSuccess(style, 201);
}
