'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function createCategory(formData: FormData) {
    try {
        const name = formData.get('name') as string;
        const code = formData.get('code') as string;
        const imageUrl = formData.get('imageUrl') as string || '';

        const userIdRaw = formData.get('userId');
        const userId = userIdRaw ? parseInt(userIdRaw as string) : null;

        if (!name || !code) {
            return { success: false, error: 'Name and Code are required' };
        }

        const newCategory = await (prisma.category as any).create({
            data: {
                name,
                code,
                imageUrl,
                userId
            }
        });

        revalidatePath('/dashboard/categories');
        return { success: true, data: newCategory };
    } catch (error: any) {
        console.error('Failed to create category:', error);
        if (error.code === 'P2002') {
            return { success: false, error: 'Category code already exists' };
        }
        return { success: false, error: 'Failed to create category: ' + error.message };
    }
}

export async function getCategories(role?: string, userId?: number) {
    try {
        const whereClause = role === 'tailor' && userId ? { userId } : {};
        const includeUser = role === 'admin' ? { user: { select: { name: true, shopProfile: { select: { shopName: true } } } } } : undefined;

        const categories = await (prisma.category as any).findMany({
            where: whereClause,
            orderBy: {
                createdAt: 'desc'
            },
            include: includeUser
        });
        return { success: true, data: categories };
    } catch (error: any) {
        console.error('Failed to fetch categories:', error);
        return { success: false, error: 'Failed to fetch categories' };
    }
}

export async function updateCategory(id: number, formData: FormData) {
    try {
        const name = formData.get('name') as string;
        const code = formData.get('code') as string;
        const imageUrl = formData.get('imageUrl') as string || '';

        if (!name || !code) {
            return { success: false, error: 'Name and Code are required' };
        }

        const updated = await (prisma.category as any).update({
            where: { id },
            data: {
                name,
                code,
                imageUrl,
            }
        });

        revalidatePath('/dashboard/categories');
        return { success: true, data: updated };
    } catch (error: any) {
        console.error('Failed to update category:', error);
        if (error.code === 'P2002') {
            return { success: false, error: 'Category code already exists' };
        }
        return { success: false, error: 'Failed to update category: ' + error.message };
    }
}

export async function deleteCategory(id: number) {
    try {
        await (prisma.category as any).delete({
            where: { id }
        });
        revalidatePath('/dashboard/categories');
        return { success: true };
    } catch (error: any) {
        console.error('Failed to delete category:', error);
        return { success: false, error: 'Cannot delete category because it is in use.' };
    }
}
