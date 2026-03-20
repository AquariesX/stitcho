'use server';

import { prisma } from '@/lib/prisma';
import { NotificationType } from '@prisma/client';
import { revalidatePath } from 'next/cache';

export type SerializedNotification = {
    id: number;
    type: NotificationType;
    title: string;
    message: string;
    isRead: boolean;
    metadata: any;
    createdAt: string; // serialized Date
};

/**
 * Create a new notification. Called internally from other server actions.
 */
export async function createNotification(
    type: NotificationType,
    title: string,
    message: string,
    metadata?: Record<string, any>
) {
    try {
        const notification = await prisma.notification.create({
            data: {
                type,
                title,
                message,
                metadata: metadata || undefined,
            },
        });
        return { success: true, data: notification };
    } catch (error: any) {
        console.error('Failed to create notification:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Helper to notify admins when a tailor adds a new inventory item.
 */
export async function notifyAdminOnTailorItemAdd(
    userId: number,
    itemType: 'Category' | 'Product' | 'Fabric' | 'Color' | 'Style' | 'Design',
    itemName: string
) {
    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { shopProfile: true }
        });

        if (!user || user.role !== 'TAILOR') return;

        const shopName = user.shopProfile?.shopName || user.name;

        await createNotification(
            'INVENTORY_ALERT',
            `New ${itemType} Added`,
            `Tailor "${shopName}" has added a new ${itemType.toLowerCase()}: ${itemName}`,
            { userId, itemType, itemName }
        );
    } catch (error) {
        console.error('Failed to notify admin on tailor item add:', error);
    }
}

/**
 * Fetch notifications with pagination. Returns newest first.
 */
export async function getNotifications(limit: number = 30, offset: number = 0) {
    try {
        const [notifications, totalCount, unreadCount] = await Promise.all([
            prisma.notification.findMany({
                orderBy: { createdAt: 'desc' },
                take: limit,
                skip: offset,
            }),
            prisma.notification.count(),
            prisma.notification.count({ where: { isRead: false } }),
        ]);

        // Serialize dates for client components
        const serialized: SerializedNotification[] = notifications.map((n) => ({
            ...n,
            createdAt: n.createdAt.toISOString(),
        }));

        return {
            success: true,
            data: serialized,
            totalCount,
            unreadCount,
        };
    } catch (error: any) {
        console.error('Failed to fetch notifications:', error);
        return { success: false, error: error.message, data: [], totalCount: 0, unreadCount: 0 };
    }
}

/**
 * Get unread notification count (lightweight for polling).
 */
export async function getUnreadCount() {
    try {
        const count = await prisma.notification.count({
            where: { isRead: false },
        });
        return { success: true, count };
    } catch (error: any) {
        console.error('Failed to get unread count:', error);
        return { success: false, count: 0 };
    }
}

/**
 * Mark a single notification as read.
 */
export async function markNotificationAsRead(id: number) {
    try {
        await prisma.notification.update({
            where: { id },
            data: { isRead: true },
        });
        return { success: true };
    } catch (error: any) {
        console.error('Failed to mark notification as read:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Mark all notifications as read.
 */
export async function markAllNotificationsAsRead() {
    try {
        await prisma.notification.updateMany({
            where: { isRead: false },
            data: { isRead: true },
        });
        return { success: true };
    } catch (error: any) {
        console.error('Failed to mark all as read:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Delete old notifications (older than 30 days). Useful for cleanup.
 */
export async function deleteOldNotifications(daysOld: number = 30) {
    try {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - daysOld);

        const result = await prisma.notification.deleteMany({
            where: {
                createdAt: { lt: cutoff },
                isRead: true,
            },
        });
        return { success: true, deleted: result.count };
    } catch (error: any) {
        console.error('Failed to delete old notifications:', error);
        return { success: false, error: error.message };
    }
}
