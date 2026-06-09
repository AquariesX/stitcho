import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess, API_ERRORS } from "@/lib/api-response";
import { verifyDashboardUser } from "@/lib/auth-helpers";
import { parseJsonBody, productWriteSchema } from "@/lib/catalog-validation";
import { Prisma, ProductType } from "@prisma/client";
import {
    CatalogValidationError,
    createProductCatalog,
} from "@/lib/catalog-management";

export async function GET(request: NextRequest) {
    const auth = await verifyDashboardUser(request);
    if (auth.error || !auth.user) return apiError(API_ERRORS.FORBIDDEN, 403);
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get("userId");
        const categoryId = searchParams.get("categoryId");
        const productType = searchParams.get("productType");
        const isAvailable = searchParams.get("isAvailable");
        const search = searchParams.get("search");

        const whereClause: Prisma.ProductWhereInput = {};
        if (auth.user.role === "TAILOR") whereClause.userId = auth.user.id;
        else if (userId) whereClause.userId = parseInt(userId);
        if (categoryId) whereClause.categoryId = parseInt(categoryId);
        if (Object.values(ProductType).includes(productType as ProductType)) {
            whereClause.productType = productType as ProductType;
        }
        if (isAvailable === "true" || isAvailable === "false") {
            whereClause.isAvailable = isAvailable === "true";
        }
        if (search) {
            whereClause.OR = [
                { name: { contains: search } },
                { code: { contains: search } },
            ];
        }

        const products = await prisma.product.findMany({
            where: whereClause,
            include: {
                category: true,
                _count: {
                    select: {
                        supportedFabrics: true,
                        supportedColors: true,
                        supportedStyles: true,
                        previewAssets: true,
                    },
                },
            },
            orderBy: [{ displayOrder: "asc" }, { createdAt: "desc" }],
        });

        return apiSuccess(products);
    } catch (error) {
        console.error("[API] products GET error:", error);
        return apiError(API_ERRORS.SERVER_ERROR, 500);
    }
}

export async function POST(request: NextRequest) {
    const auth = await verifyDashboardUser(request);
    if (auth.error || !auth.user) return apiError(API_ERRORS.FORBIDDEN, 403);

    try {
        const parsed = parseJsonBody(productWriteSchema, await request.json());
        if (!parsed.success) return apiError(parsed.error, 400);
        const product = await createProductCatalog(parsed.data, auth.user);
        return apiSuccess(product, 201);
    } catch (error: unknown) {
        if (error instanceof CatalogValidationError) {
            return apiError(error.message, error.status);
        }
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
            return apiError("Product code already exists", 409);
        }
        console.error("[API] products POST error:", error);
        return apiError(API_ERRORS.SERVER_ERROR, 500);
    }
}
