import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');
        const categoryId = searchParams.get('categoryId');

        const whereClause: any = {};
        if (userId) whereClause.userId = parseInt(userId);
        if (categoryId) whereClause.categoryId = parseInt(categoryId);

        const products = await (prisma as any).product.findMany({
            where: whereClause,
            include: { category: true },
            orderBy: { createdAt: 'desc' },
        });

        return NextResponse.json({ success: true, data: products });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
