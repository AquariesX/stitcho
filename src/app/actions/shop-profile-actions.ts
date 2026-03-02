'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { createNotification } from './notification-actions';

export async function getShopProfile(userId: number) {
    try {
        const profile = await prisma.shopProfile.findUnique({
            where: { userId },
        });
        return { success: true, data: profile };
    } catch (error) {
        console.error('Error fetching shop profile:', error);
        return { success: false, error: 'Failed to fetch shop profile' };
    }
}

export async function upsertShopProfile(userId: number, formData: FormData) {
    try {
        const shopName = formData.get('shopName') as string;
        const shopAddress = formData.get('shopAddress') as string;
        const workingHours = formData.get('workingHours') as string;
        const specialization = formData.get('specialization') as string;
        const yearsOfExperience = parseInt(formData.get('yearsOfExperience') as string);
        const shopLogoUrl = formData.get('shopLogoUrl') as string | null;
        const description = formData.get('description') as string | null;
        const priceRange = formData.get('priceRange') as string | null;
        const currency = formData.get('currency') as string || 'PKR';

        if (!shopName || !shopAddress || !workingHours || !specialization || isNaN(yearsOfExperience)) {
            return { success: false, error: 'Missing required fields' };
        }

        const profile = await prisma.shopProfile.upsert({
            where: { userId },
            update: {
                shopName,
                shopAddress,
                workingHours,
                specialization,
                yearsOfExperience,
                shopLogoUrl: shopLogoUrl || null,
                description: description || null,
                priceRange: priceRange || null,
                currency,
            },
            create: {
                userId,
                shopName,
                shopAddress,
                workingHours,
                specialization,
                yearsOfExperience,
                shopLogoUrl: shopLogoUrl || null,
                description: description || null,
                priceRange: priceRange || null,
                currency,
            },
        });

        // Create notification for shop profile update
        try {
            const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
            await createNotification(
                'SHOP_UPDATE',
                `Shop Profile Updated: ${shopName}`,
                `${user?.name || 'A tailor'} has updated their shop profile "${shopName}".`,
                { userId, shopName, shopId: profile.id }
            );
        } catch (notifError) {
            console.error('Failed to create notification:', notifError);
        }

        revalidatePath('/dashboard/tailor/profile');
        revalidatePath('/dashboard/tailor/profile/edit');
        return { success: true, data: profile };
    } catch (error: any) {
        console.error('Error updating shop profile:', error);
        return { success: false, error: 'Failed to update shop profile: ' + error.message };
    }
}

export async function updateShopAddressInfo(userId: number, formData: FormData) {
    try {
        const shopAddress = formData.get('shopAddress') as string;
        const city = formData.get('city') as string | null;
        const state = formData.get('state') as string | null;
        const postalCode = formData.get('postalCode') as string | null;
        const country = formData.get('country') as string | null;
        const landmark = formData.get('landmark') as string | null;
        const phoneNumber = formData.get('phoneNumber') as string | null;
        const whatsappNumber = formData.get('whatsappNumber') as string | null;
        const shopEmail = formData.get('shopEmail') as string | null;
        const website = formData.get('website') as string | null;
        const facebookUrl = formData.get('facebookUrl') as string | null;
        const instagramUrl = formData.get('instagramUrl') as string | null;
        const deliveryAvailable = formData.get('deliveryAvailable') === 'true';
        const deliveryRadius = formData.get('deliveryRadius') as string | null;

        if (!shopAddress) {
            return { success: false, error: 'Shop address is required' };
        }

        // Check if a profile exists first
        const existing = await prisma.shopProfile.findUnique({ where: { userId } });
        if (!existing) {
            return { success: false, error: 'Please set up your basic shop profile first before updating address info.' };
        }

        const profile = await prisma.shopProfile.update({
            where: { userId },
            data: {
                shopAddress,
                city: city || null,
                state: state || null,
                postalCode: postalCode || null,
                country: country || null,
                landmark: landmark || null,
                phoneNumber: phoneNumber || null,
                whatsappNumber: whatsappNumber || null,
                shopEmail: shopEmail || null,
                website: website || null,
                facebookUrl: facebookUrl || null,
                instagramUrl: instagramUrl || null,
                deliveryAvailable,
                deliveryRadius: deliveryRadius || null,
            },
        });

        // Create notification for address info update
        try {
            const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
            const shop = await prisma.shopProfile.findUnique({ where: { userId }, select: { shopName: true } });
            await createNotification(
                'SHOP_UPDATE',
                `Shop Address Updated: ${shop?.shopName}`,
                `${user?.name || 'A tailor'} has updated their shop address and contact information.`,
                { userId, shopName: shop?.shopName }
            );
        } catch (notifError) {
            console.error('Failed to create notification:', notifError);
        }

        revalidatePath('/dashboard/tailor/profile');
        revalidatePath('/dashboard/tailor/profile/edit');
        return { success: true, data: profile };
    } catch (error: any) {
        console.error('Error updating shop address info:', error);
        return { success: false, error: 'Failed to update: ' + error.message };
    }
}
