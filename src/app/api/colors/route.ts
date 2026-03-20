import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');

        const whereClause = userId ? { userId: parseInt(userId) } : {};

        const colors = await (prisma as any).color.findMany({
            where: whereClause,
            orderBy: { createdAt: 'desc' },
        });

        return NextResponse.json({ success: true, data: colors });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
