'use server';

import { prisma } from '@/lib/prisma';
import { Role } from '@prisma/client';
import { adminAuth } from '@/lib/firebase-admin';

// Tailor with their shop profile data
export type TailorWithShop = {
    id: number;
    name: string;
    email: string | null;
    phoneNumber: string | null;
    role: Role;
    isActive: boolean;
    firebaseUid: string;
    emailVerified: boolean;
    createdAt: string;
    shopProfile: {
        id: number;
        shopName: string;
        shopAddress: string;
        city: string | null;
        state: string | null;
        postalCode: string | null;
        country: string | null;
        landmark: string | null;
        workingHours: string;
        specialization: string;
        yearsOfExperience: number;
        shopLogoUrl: string | null;
        description: string | null;
        priceRange: string | null;
        currency: string;
        phoneNumber: string | null;
        whatsappNumber: string | null;
        shopEmail: string | null;
        website: string | null;
        facebookUrl: string | null;
        instagramUrl: string | null;
        deliveryAvailable: boolean;
        deliveryRadius: string | null;
        createdAt: string;
        updatedAt: string;
    } | null;
};

export async function getAllTailorsWithShops(): Promise<{
    success: boolean;
    data?: TailorWithShop[];
    error?: string;
}> {
    try {
        const tailors = await prisma.user.findMany({
            where: { role: Role.TAILOR },
            include: {
                shopProfile: true,
            },
            orderBy: { createdAt: 'desc' },
        });

        // Fetch email verification status from Firebase
        let emailVerifiedMap = new Map<string, boolean>();
        if (adminAuth) {
            const uids = tailors.map(t => t.firebaseUid).filter(uid => uid && uid.trim() !== '');
            const chunkSize = 100;
            for (let i = 0; i < uids.length; i += chunkSize) {
                const chunk = uids.slice(i, i + chunkSize);
                if (chunk.length > 0) {
                    try {
                        const result = await adminAuth.getUsers(chunk.map(uid => ({ uid })));
                        result.users.forEach(user => {
                            emailVerifiedMap.set(user.uid, user.emailVerified);
                        });
                    } catch (fbError) {
                        console.error('Error fetching firebase users:', fbError);
                    }
                }
            }
        }

        const serialized: TailorWithShop[] = tailors.map(t => ({
            id: t.id,
            name: t.name,
            email: t.email,
            phoneNumber: t.phoneNumber,
            role: t.role,
            isActive: t.isActive,
            firebaseUid: t.firebaseUid,
            emailVerified: emailVerifiedMap.get(t.firebaseUid) ?? false,
            createdAt: t.createdAt.toISOString(),
            shopProfile: t.shopProfile ? {
                ...t.shopProfile,
                createdAt: t.shopProfile.createdAt.toISOString(),
                updatedAt: t.shopProfile.updatedAt.toISOString(),
            } : null,
        }));

        return { success: true, data: serialized };
    } catch (error: any) {
        console.error('Failed to fetch tailors with shops:', error);
        return { success: false, error: 'Failed to fetch tailors: ' + error.message };
    }
}
