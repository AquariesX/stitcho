'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { notifyAdminOnTailorItemAdd } from './notification-actions';

function serialize<T>(data: T): T {
    return JSON.parse(JSON.stringify(data, (_key, value) =>
        typeof value === 'object' && value !== null && value.constructor?.name === 'Decimal'
            ? Number(value)
            : value
    ));
}

export async function createFabric(formData: FormData) {
    try {
        const name = formData.get('name') as string;
        const imageUrl = formData.get('imageUrl') as string || '';
        const price = parseFloat(formData.get('price') as string);
        const categoryId = parseInt(formData.get('categoryId') as string);

        const userIdRaw = formData.get('userId');
        const userId = userIdRaw ? parseInt(userIdRaw as string) : null;

        if (!name || isNaN(price) || isNaN(categoryId)) {
            return { success: false, error: 'Name, Price, and Category are required' };
        }

        const newFabric = await (prisma.fabric as any).create({
            data: { name, imageUrl, price, categoryId, userId },
            include: { category: true },
        });

        if (userId) {
            await notifyAdminOnTailorItemAdd(userId, 'Fabric', name);
        }

        revalidatePath('/dashboard/fabrics');
        return { success: true, data: serialize(newFabric) };
    } catch (error: any) {
        console.error('Failed to create fabric:', error);
        return { success: false, error: 'Failed to create fabric: ' + error.message };
    }
}

export async function getFabrics(role?: string, userId?: number) {
    try {
        const whereClause = role === 'tailor' && userId ? { userId } : {};
        const includeUser = role === 'admin' ? { user: { select: { name: true, shopProfile: { select: { shopName: true } } } } } : undefined;

        const fabrics = await (prisma.fabric as any).findMany({
            where: whereClause,
            orderBy: { createdAt: 'desc' },
            include: { category: true, ...includeUser },
        });
        return { success: true, data: serialize(fabrics) };
    } catch (error: any) {
        console.error('Failed to fetch fabrics:', error);
        return { success: false, error: 'Failed to fetch fabrics' };
    }
}

export async function updateFabric(id: number, formData: FormData) {
    try {
        const name = formData.get('name') as string;
        const imageUrl = formData.get('imageUrl') as string || '';
        const price = parseFloat(formData.get('price') as string);
        const categoryId = parseInt(formData.get('categoryId') as string);

        if (!name || isNaN(price) || isNaN(categoryId)) {
            return { success: false, error: 'Name, Price, and Category are required' };
        }

        const updated = await (prisma.fabric as any).update({
            where: { id },
            data: { name, imageUrl, price, categoryId },
            include: { category: true },
        });

        revalidatePath('/dashboard/fabrics');
        return { success: true, data: serialize(updated) };
    } catch (error: any) {
        console.error('Failed to update fabric:', error);
        return { success: false, error: 'Failed to update fabric: ' + error.message };
    }
}

export async function deleteFabric(id: number) {
    try {
        await (prisma.fabric as any).delete({ where: { id } });
        revalidatePath('/dashboard/fabrics');
        return { success: true };
    } catch (error: any) {
        console.error('Failed to delete fabric:', error);
        return { success: false, error: 'Cannot delete fabric because it is in use by orders.' };
    }
}
