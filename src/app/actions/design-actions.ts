'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function createDesign(formData: FormData) {
    try {
        const name = formData.get('name') as string;
        const description = formData.get('description') as string | null;
        const imageUrl = formData.get('imageUrl') as string || '';
        const basePriceRaw = formData.get('basePrice');
        const basePrice = basePriceRaw ? parseFloat(basePriceRaw as string) : 0;

        const categoryIdRaw = formData.get('categoryId');
        const categoryId = categoryIdRaw ? parseInt(categoryIdRaw as string) : null;

        const userIdRaw = formData.get('userId');
        const userId = userIdRaw ? parseInt(userIdRaw as string) : null;

        if (!name || !categoryId) {
            return { success: false, error: 'Name and Category are required' };
        }

        const newDesign = await (prisma as any).design.create({
            data: {
                name,
                description,
                imageUrl,
                basePrice,
                categoryId,
                userId
            },
            include: { category: true }
        });

        revalidatePath('/dashboard/designs');
        return { success: true, data: newDesign };
    } catch (error: any) {
        console.error('Failed to create design:', error);
        return { success: false, error: 'Failed to create design: ' + error.message };
    }
}

export async function getDesigns(role?: string, userId?: number) {
    try {
        const whereClause = role === 'tailor' && userId ? { userId } : {};
        const includeUser = role === 'admin' ? { user: { select: { name: true, shopProfile: { select: { shopName: true } } } } } : undefined;

        const designs = await (prisma as any).design.findMany({
            where: whereClause,
            orderBy: {
                createdAt: 'desc'
            },
            include: {
                ...includeUser,
                category: true
            }
        });
        return { success: true, data: designs };
    } catch (error: any) {
        console.error('Failed to fetch designs:', error);
        return { success: false, error: 'Failed to fetch designs' };
    }
}

export async function updateDesign(id: number, formData: FormData) {
    try {
        const name = formData.get('name') as string;
        const description = formData.get('description') as string | null;
        const imageUrl = formData.get('imageUrl') as string || '';

        const basePriceRaw = formData.get('basePrice');
        const basePrice = basePriceRaw ? parseFloat(basePriceRaw as string) : 0;

        const categoryIdRaw = formData.get('categoryId');
        const categoryId = categoryIdRaw ? parseInt(categoryIdRaw as string) : null;

        if (!name || !categoryId) {
            return { success: false, error: 'Name and Category are required' };
        }

        const updated = await (prisma as any).design.update({
            where: { id },
            data: {
                name,
                description,
                imageUrl,
                basePrice,
                categoryId
            },
            include: { category: true }
        });

        revalidatePath('/dashboard/designs');
        return { success: true, data: updated };
    } catch (error: any) {
        console.error('Failed to update design:', error);
        return { success: false, error: 'Failed to update design: ' + error.message };
    }
}

export async function deleteDesign(id: number) {
    try {
        await (prisma as any).design.delete({
            where: { id }
        });
        revalidatePath('/dashboard/designs');
        return { success: true };
    } catch (error: any) {
        console.error('Failed to delete design:', error);
        return { success: false, error: 'Cannot delete design because it is in use.' };
    }
}
