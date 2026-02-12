'use server';

import { prisma } from '@/lib/prisma';
import { adminAuth } from '@/lib/firebase-admin';
import type admin from 'firebase-admin';
import { Customer } from '@prisma/client';

// Safer type import
type UserRecord = admin.auth.UserRecord;

export type CustomerWithStatus = {
    id: number;
    name: string;
    email: string | null;
    phoneNumber: string | null;
    photoUrl: string | null;
    isActive: boolean;
    createdAt: Date;
    firebaseUid: string;
    emailVerified: boolean;
    lastSignInTime?: string;
};

export async function fetchAndSyncCustomers() {
    try {
        let firebaseUsers: UserRecord[] = [];
        let fetchedFromFirebase = false;

        // 1. Fetch all users from Firebase
        if (adminAuth) {
            try {
                // List users in batches (default 1000)
                let nextPageToken;
                do {
                    const result = await adminAuth.listUsers(1000, nextPageToken);
                    firebaseUsers = firebaseUsers.concat(result.users);
                    nextPageToken = result.pageToken;
                } while (nextPageToken);
                fetchedFromFirebase = true;
            } catch (fbError) {
                console.error('Error listing firebase users:', fbError);
            }
        } else {
            console.warn('Firebase Admin not initialized');
        }

        // 2. Sync with Prisma Database
        if (fetchedFromFirebase && firebaseUsers.length > 0) {
            // Process in chunks to avoid exhausting DB connection pool
            const CHUNK_SIZE = 20;
            for (let i = 0; i < firebaseUsers.length; i += CHUNK_SIZE) {
                const chunk = firebaseUsers.slice(i, i + CHUNK_SIZE);

                const upsertPromises = chunk.map(async (fbUser) => {
                    const customerData = {
                        firebaseUid: fbUser.uid,
                        email: fbUser.email ?? null,
                        phoneNumber: fbUser.phoneNumber ?? null,
                        photoUrl: fbUser.photoURL ?? null,
                        name: fbUser.displayName || (fbUser.email ? fbUser.email.split('@')[0] : 'Unknown Customer'),
                        isActive: !fbUser.disabled,
                    };

                    // We use upsert to create new customers or update existing profile info
                    return prisma.customer.upsert({
                        where: { firebaseUid: fbUser.uid },
                        update: {
                            email: customerData.email,
                            phoneNumber: customerData.phoneNumber,
                            photoUrl: customerData.photoUrl,
                            isActive: customerData.isActive,
                        },
                        create: customerData
                    });
                });

                // Wait for this chunk to complete before moving to next
                await Promise.allSettled(upsertPromises);
            }
            // Removed revalidatePath here as it causes issues when called during render
        }

        // 3. Fetch consolidated list from Prisma (Source of Truth)
        const dbCustomers: Customer[] = await prisma.customer.findMany({
            orderBy: { createdAt: 'desc' }
        });

        // 4. Merge verification status
        const combinedCustomers: CustomerWithStatus[] = dbCustomers.map((dbUser) => {
            const fbUser = fetchedFromFirebase ? firebaseUsers.find(u => u.uid === dbUser.firebaseUid) : null;
            return {
                ...dbUser,
                emailVerified: fbUser?.emailVerified ?? false,
                lastSignInTime: fbUser?.metadata.lastSignInTime,
                photoUrl: dbUser.photoUrl || fbUser?.photoURL || null
            };
        });

        return {
            success: true,
            count: combinedCustomers.length,
            data: combinedCustomers
        };

    } catch (error: any) {
        console.error('Failed to sync customers:', error);
        return { success: false, error: 'Failed to sync customers: ' + error.message };
    }
}

export async function getCustomers() {
    return fetchAndSyncCustomers();
}
