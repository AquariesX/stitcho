'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function createColor(formData: FormData) {
    try {
        const name = formData.get('name') as string;
        const hexCode = formData.get('hexCode') as string;

        const userIdRaw = formData.get('userId');
        const userId = userIdRaw ? parseInt(userIdRaw as string) : null;

        if (!name || !hexCode) {
            return { success: false, error: 'Name and Hex Code are required' };
        }

        const newColor = await (prisma.color as any).create({
            data: { name, hexCode, userId },
        });

        revalidatePath('/dashboard/colors');
        return { success: true, data: newColor };
    } catch (error: any) {
        console.error('Failed to create color:', error);
        return { success: false, error: 'Failed to create color: ' + error.message };
    }
}

export async function getColors(role?: string, userId?: number) {
    try {
        const whereClause = role === 'tailor' && userId ? { userId } : {};
        const includeUser = role === 'admin' ? { user: { select: { name: true, shopProfile: { select: { shopName: true } } } } } : undefined;

        const colors = await (prisma.color as any).findMany({
            where: whereClause,
            orderBy: { createdAt: 'desc' },
            include: includeUser,
        });
        return { success: true, data: colors };
    } catch (error: any) {
        console.error('Failed to fetch colors:', error);
        return { success: false, error: 'Failed to fetch colors' };
    }
}

export async function updateColor(id: number, formData: FormData) {
    try {
        const name = formData.get('name') as string;
        const hexCode = formData.get('hexCode') as string;

        if (!name || !hexCode) {
            return { success: false, error: 'Name and Hex Code are required' };
        }

        const updated = await (prisma.color as any).update({
            where: { id },
            data: { name, hexCode },
        });

        revalidatePath('/dashboard/colors');
        return { success: true, data: updated };
    } catch (error: any) {
        console.error('Failed to update color:', error);
        return { success: false, error: 'Failed to update color: ' + error.message };
    }
}

export async function deleteColor(id: number) {
    try {
        await (prisma.color as any).delete({ where: { id } });
        revalidatePath('/dashboard/colors');
        return { success: true };
    } catch (error: any) {
        console.error('Failed to delete color:', error);
        return { success: false, error: 'Cannot delete color because it is in use by orders.' };
    }
}
