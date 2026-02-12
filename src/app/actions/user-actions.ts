'use server';

import { prisma } from '@/lib/prisma';
import { Role } from '@prisma/client';
import { adminAuth } from '@/lib/firebase-admin';
import { UserRecord } from 'firebase-admin/auth';

export type UserWithStatus = {
    id: number;
    name: string;
    email: string | null;
    phoneNumber: string | null;
    role: Role;
    isActive: boolean;
    createdAt: Date;
    firebaseUid: string;
    emailVerified: boolean;
};

// Add optional filtering
export async function getUsers(filterRole?: Role) {
    try {
        const users = await prisma.user.findMany({
            where: filterRole ? { role: filterRole } : {},
            orderBy: {
                createdAt: 'desc',
            },
        });

        // If no users in DB, return empty
        if (!users.length) {
            return { success: true, count: 0, data: [] };
        }

        let combinedUsers: UserWithStatus[] = [];

        // If Firebase Admin is initialized, fetch email verification status
        if (adminAuth) {
            // Get all firebase UIDs from the DB users
            const uids = users.map(u => u.firebaseUid).filter(uid => uid && uid.trim() !== '');

            // Firebase getUsers supports up to 100 identifiers. 
            // If we have more than 100, we need to batch them.
            const firebaseUsersMap = new Map<string, UserRecord>();

            // Batch processing for Firebase users
            const chunkSize = 100;
            for (let i = 0; i < uids.length; i += chunkSize) {
                const chunk = uids.slice(i, i + chunkSize);
                if (chunk.length > 0) {
                    try {
                        const result = await adminAuth.getUsers(chunk.map(uid => ({ uid })));
                        result.users.forEach(user => {
                            firebaseUsersMap.set(user.uid, user);
                        });
                    } catch (fbError) {
                        console.error('Error fetching firebase users:', fbError);
                        // Continue without firebase data if it fails
                    }
                }
            }

            combinedUsers = users.map(user => {
                const fbUser = firebaseUsersMap.get(user.firebaseUid);
                return {
                    ...user,
                    emailVerified: fbUser?.emailVerified ?? false,
                };
            });
        } else {
            console.warn('Firebase Admin not initialized, email verification status will be false');
            combinedUsers = users.map(user => ({
                ...user,
                emailVerified: false,
            }));
        }

        return {
            success: true,
            count: combinedUsers.length,
            data: combinedUsers
        };
    } catch (error) {
        console.error('Failed to fetch users:', error);
        return { success: false, error: 'Failed to fetch users' };
    }
}
