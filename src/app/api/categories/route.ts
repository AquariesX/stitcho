import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');

        const whereClause = userId ? { userId: parseInt(userId) } : {};

        const categories = await (prisma as any).category.findMany({
            where: whereClause,
            orderBy: { createdAt: 'desc' },
            include: {
                _count: {
                    select: { products: true, fabrics: true },
                },
            },
        });

        return NextResponse.json({ success: true, data: categories });
    } catch (error: any) {
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { name, code, imageUrl, userId } = body;

        if (!name || !code) {
            return NextResponse.json(
                { success: false, error: 'Name and code are required' },
                { status: 400 }
            );
        }

        const category = await (prisma as any).category.create({
            data: {
                name,
                code,
                imageUrl: imageUrl || '',
                userId: userId ? parseInt(userId) : null,
            },
        });

        return NextResponse.json({ success: true, data: category }, { status: 201 });
    } catch (error: any) {
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
