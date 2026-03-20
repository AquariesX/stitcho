import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');

        const whereClause = userId ? { userId: parseInt(userId) } : {};

        const designs = await (prisma as any).design.findMany({
            where: whereClause,
            include: { category: true }
        });
        return NextResponse.json({ success: true, data: designs });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const data = await request.json();
        const { name, description, imageUrl, basePrice, categoryId, userId } = data;

        if (!name || !categoryId) {
            return NextResponse.json({ success: false, error: 'Name and Category are required' }, { status: 400 });
        }

        const newDesign = await (prisma as any).design.create({
            data: {
                name,
                description,
                imageUrl: imageUrl || '',
                basePrice: parseFloat(basePrice) || 0,
                categoryId: parseInt(categoryId),
                userId: userId ? parseInt(userId) : null
            },
            include: { category: true }
        });

        return NextResponse.json({ success: true, data: newDesign });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
