import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const userId     = searchParams.get('userId');
        const categoryId = searchParams.get('categoryId');
        const productId  = searchParams.get('productId');

        // When productId is supplied, return only fabrics linked to that product (M2M)
        if (productId) {
            const product = await (prisma as any).product.findUnique({
                where: { id: parseInt(productId) },
                include: {
                    fabrics: {
                        include: { category: true },
                        orderBy: { createdAt: 'desc' },
                    },
                },
            });

            if (!product) {
                return NextResponse.json(
                    { success: false, error: 'Product not found' },
                    { status: 404 }
                );
            }

            return NextResponse.json({ success: true, data: product.fabrics });
        }

        // Otherwise filter by categoryId / userId
        const whereClause: any = {};
        if (userId)     whereClause.userId     = parseInt(userId);
        if (categoryId) whereClause.categoryId = parseInt(categoryId);

        const fabrics = await (prisma as any).fabric.findMany({
            where: whereClause,
            include: { category: true },
            orderBy: { createdAt: 'desc' },
        });

        return NextResponse.json({ success: true, data: fabrics });
    } catch (error: any) {
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
