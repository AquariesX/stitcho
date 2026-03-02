import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get('limit') || '20');
        const unreadOnly = searchParams.get('unread') === 'true';

        const where = unreadOnly ? { isRead: false } : {};

        const [notifications, unreadCount] = await Promise.all([
            prisma.notification.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                take: limit,
            }),
            prisma.notification.count({ where: { isRead: false } }),
        ]);

        return NextResponse.json({
            success: true,
            data: notifications,
            unreadCount,
        });
    } catch (error: any) {
        console.error('Notification API error:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
