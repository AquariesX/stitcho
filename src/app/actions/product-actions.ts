'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

// Convert Prisma Decimal objects to plain serializable values
function serialize<T>(data: T): T {
    return JSON.parse(JSON.stringify(data, (_key, value) =>
        typeof value === 'object' && value !== null && value.constructor?.name === 'Decimal'
            ? Number(value)
            : value
    ));
}

export async function createProduct(formData: FormData) {
    try {
        const name = formData.get('name') as string;
        const code = formData.get('code') as string;
        const imageUrl = formData.get('imageUrl') as string || '';
        const basePrice = parseFloat(formData.get('basePrice') as string);
        const categoryId = parseInt(formData.get('categoryId') as string);

        const userIdRaw = formData.get('userId');
        const userId = userIdRaw ? parseInt(userIdRaw as string) : null;

        if (!name || !code || isNaN(basePrice) || isNaN(categoryId)) {
            return { success: false, error: 'Name, Code, Base Price, and Category are required' };
        }

        const newProduct = await (prisma.product as any).create({
            data: { name, code, imageUrl, basePrice, categoryId, userId },
            include: { category: true },
        });

        revalidatePath('/dashboard/products');
        return { success: true, data: serialize(newProduct) };
    } catch (error: any) {
        console.error('Failed to create product:', error);
        if (error.code === 'P2002') {
            return { success: false, error: 'Product code already exists' };
        }
        return { success: false, error: 'Failed to create product: ' + error.message };
    }
}

export async function getProducts(role?: string, userId?: number) {
    try {
        const whereClause = role === 'tailor' && userId ? { userId } : {};
        const includeUser = role === 'admin' ? { user: { select: { name: true, shopProfile: { select: { shopName: true } } } } } : undefined;

        const products = await (prisma.product as any).findMany({
            where: whereClause,
            orderBy: { createdAt: 'desc' },
            include: { category: true, ...includeUser },
        });
        return { success: true, data: serialize(products) };
    } catch (error: any) {
        console.error('Failed to fetch products:', error);
        return { success: false, error: 'Failed to fetch products' };
    }
}

export async function updateProduct(id: number, formData: FormData) {
    try {
        const name = formData.get('name') as string;
        const code = formData.get('code') as string;
        const imageUrl = formData.get('imageUrl') as string || '';
        const basePrice = parseFloat(formData.get('basePrice') as string);
        const categoryId = parseInt(formData.get('categoryId') as string);

        if (!name || !code || isNaN(basePrice) || isNaN(categoryId)) {
            return { success: false, error: 'Name, Code, Base Price, and Category are required' };
        }

        const updated = await (prisma.product as any).update({
            where: { id },
            data: { name, code, imageUrl, basePrice, categoryId },
            include: { category: true },
        });

        revalidatePath('/dashboard/products');
        return { success: true, data: serialize(updated) };
    } catch (error: any) {
        console.error('Failed to update product:', error);
        if (error.code === 'P2002') {
            return { success: false, error: 'Product code already exists' };
        }
        return { success: false, error: 'Failed to update product: ' + error.message };
    }
}

export async function deleteProduct(id: number) {
    try {
        await (prisma.product as any).delete({ where: { id } });
        revalidatePath('/dashboard/products');
        return { success: true };
    } catch (error: any) {
        console.error('Failed to delete product:', error);
        return { success: false, error: 'Cannot delete product because it is in use by orders.' };
    }
}
