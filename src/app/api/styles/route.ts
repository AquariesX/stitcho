import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');

        const whereClause = userId ? { userId: parseInt(userId) } : {};

        const styles = await (prisma as any).style.findMany({
            where: whereClause,
            include: { options: true },
            orderBy: { createdAt: 'desc' },
        });

        return NextResponse.json({ success: true, data: styles });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
