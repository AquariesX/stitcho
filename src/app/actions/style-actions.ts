'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

function serialize<T>(data: T): T {
    return JSON.parse(JSON.stringify(data, (_key, value) =>
        typeof value === 'object' && value !== null && value.constructor?.name === 'Decimal'
            ? Number(value)
            : value
    ));
}

// ── Styles ──────────────────────────────────────────────────────────────────

export async function createStyle(formData: FormData) {
    try {
        const name = formData.get('name') as string;
        const imageUrl = formData.get('imageUrl') as string || '';

        const userIdRaw = formData.get('userId');
        const userId = userIdRaw ? parseInt(userIdRaw as string) : null;

        if (!name) {
            return { success: false, error: 'Style name is required' };
        }

        const newStyle = await (prisma.style as any).create({
            data: { name, imageUrl, userId },
            include: { options: true },
        });

        revalidatePath('/dashboard/styles');
        return { success: true, data: serialize(newStyle) };
    } catch (error: any) {
        console.error('Failed to create style:', error);
        return { success: false, error: 'Failed to create style: ' + error.message };
    }
}

export async function getStyles(role?: string, userId?: number) {
    try {
        const whereClause = role === 'tailor' && userId ? { userId } : {};
        const includeUser = role === 'admin' ? { user: { select: { name: true, shopProfile: { select: { shopName: true } } } } } : undefined;

        const styles = await (prisma.style as any).findMany({
            where: whereClause,
            orderBy: { createdAt: 'desc' },
            include: { options: { orderBy: { createdAt: 'asc' } }, ...includeUser },
        });
        return { success: true, data: serialize(styles) };
    } catch (error: any) {
        console.error('Failed to fetch styles:', error);
        return { success: false, error: 'Failed to fetch styles' };
    }
}

export async function updateStyle(id: number, formData: FormData) {
    try {
        const name = formData.get('name') as string;
        const imageUrl = formData.get('imageUrl') as string || '';

        if (!name) {
            return { success: false, error: 'Style name is required' };
        }

        const updated = await (prisma.style as any).update({
            where: { id },
            data: { name, imageUrl },
            include: { options: { orderBy: { createdAt: 'asc' } } },
        });

        revalidatePath('/dashboard/styles');
        return { success: true, data: serialize(updated) };
    } catch (error: any) {
        console.error('Failed to update style:', error);
        return { success: false, error: 'Failed to update style: ' + error.message };
    }
}

export async function deleteStyle(id: number) {
    try {
        await (prisma.style as any).delete({ where: { id } });
        revalidatePath('/dashboard/styles');
        return { success: true };
    } catch (error: any) {
        console.error('Failed to delete style:', error);
        return { success: false, error: 'Cannot delete style. It may be in use by orders.' };
    }
}

// ── Style Options ────────────────────────────────────────────────────────────

export async function createStyleOption(formData: FormData) {
    try {
        const styleId = parseInt(formData.get('styleId') as string);
        const name = formData.get('name') as string;
        const imageUrl = formData.get('imageUrl') as string || '';
        const additionalPrice = parseFloat(formData.get('additionalPrice') as string) || 0;

        if (!name || isNaN(styleId)) {
            return { success: false, error: 'Name and Style are required' };
        }

        const option = await (prisma.styleOption as any).create({
            data: { styleId, name, imageUrl, additionalPrice },
        });

        revalidatePath('/dashboard/styles');
        return { success: true, data: serialize(option) };
    } catch (error: any) {
        console.error('Failed to create style option:', error);
        return { success: false, error: 'Failed to create option: ' + error.message };
    }
}

export async function updateStyleOption(id: number, formData: FormData) {
    try {
        const name = formData.get('name') as string;
        const imageUrl = formData.get('imageUrl') as string || '';
        const additionalPrice = parseFloat(formData.get('additionalPrice') as string) || 0;

        if (!name) {
            return { success: false, error: 'Option name is required' };
        }

        const updated = await (prisma.styleOption as any).update({
            where: { id },
            data: { name, imageUrl, additionalPrice },
        });

        revalidatePath('/dashboard/styles');
        return { success: true, data: serialize(updated) };
    } catch (error: any) {
        console.error('Failed to update style option:', error);
        return { success: false, error: 'Failed to update option: ' + error.message };
    }
}


export async function deleteStyleOption(id: number) {
    try {
        await (prisma.styleOption as any).delete({ where: { id } });
        revalidatePath('/dashboard/styles');
        return { success: true };
    } catch (error: any) {
        console.error('Failed to delete style option:', error);
        return { success: false, error: 'Cannot delete option. It may be in use by orders.' };
    }
}
