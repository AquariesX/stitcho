'use server';

import { prisma } from '@/lib/prisma';
import { Role } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { adminAuth } from '@/lib/firebase-admin';

export async function getAdmins() {
    try {
        const admins = await prisma.user.findMany({
            where: {
                role: Role.ADMIN,
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
        return { success: true, data: admins };
    } catch (error) {
        console.error('Failed to fetch admins:', error);
        return { success: false, error: 'Failed to fetch admins' };
    }
}

export async function createAdmin(formData: FormData) {
    try {
        const name = formData.get('name') as string;
        const email = formData.get('email') as string;
        const phoneNumber = formData.get('phoneNumber') as string;
        const password = formData.get('password') as string;

        let firebaseUid = '';

        if (!adminAuth) {
            console.error('Firebase Admin SDK not initialized');
            // Check if we can proceed with a placeholder for testing (if user doesn't have credentials yet)
            // But for "functionality", we should probably fail or warn.
            // For now, let's throw to indicate requirement
            return { success: false, error: 'Server configuration error: Firebase Admin not ready.' };
        }

        try {
            // Firebase requires E.164 format for phone numbers (e.g. +15555550100)
            // If the user didn't provide a valid international format, we skip sending it to Firebase to avoid errors.
            // We still save the raw number in our database.
            const formattedPhone = phoneNumber && phoneNumber.startsWith('+') ? phoneNumber : undefined;

            const firebaseUser = await adminAuth.createUser({
                email,
                password,
                displayName: name,
                phoneNumber: formattedPhone,
            });
            firebaseUid = firebaseUser.uid;
        } catch (firebaseError: any) {
            console.error('Firebase Auth Create Error:', JSON.stringify(firebaseError, null, 2));
            // Return more specific error message if available
            const errorCode = firebaseError.errorInfo?.code || firebaseError.code;
            const errorMessage = firebaseError.errorInfo?.message || firebaseError.message;
            return { success: false, error: `Firebase Error (${errorCode}): ${errorMessage}` };
        }

        try {
            const newAdmin = await prisma.user.create({
                data: {
                    name,
                    email,
                    phoneNumber,
                    role: Role.ADMIN,
                    firebaseUid: firebaseUid,
                    isActive: true,
                },
            });

            revalidatePath('/dashboard/users/admins');
            return { success: true, data: newAdmin };
        } catch (dbError: any) {
            console.error('Failed to create admin in DB, rolling back Firebase user:', dbError);

            // Rollback: Delete the user from Firebase since DB creation failed
            if (firebaseUid && adminAuth) {
                try {
                    await adminAuth.deleteUser(firebaseUid);
                    console.log('Rollback successful: Deleted Firebase user', firebaseUid);
                } catch (rollbackError) {
                    console.error('CRITICAL: Failed to rollback Firebase user after DB failure:', rollbackError);
                    // This is a bad state; manual cleanup might be required.
                }
            }

            return { success: false, error: 'Database creation failed: ' + dbError.message };
        }
    } catch (error: any) {
        console.error('Unexpected error in createAdmin:', error);
        return { success: false, error: 'Unexpected error: ' + error.message };
    }
}

export async function updateAdmin(id: number, formData: FormData) {
    try {
        const name = formData.get('name') as string;
        const email = formData.get('email') as string;
        const phoneNumber = formData.get('phoneNumber') as string;

        const currentAdmin = await prisma.user.findUnique({
            where: { id },
            select: { firebaseUid: true },
        });

        if (currentAdmin && currentAdmin.firebaseUid && adminAuth) {
            try {
                await adminAuth.updateUser(currentAdmin.firebaseUid, {
                    email: email,
                    displayName: name,
                    // Phone number updates can be tricky due to formatting, skipping for now to avoid errors
                });
            } catch (firebaseError: any) {
                console.error('Failed to update user in Firebase:', firebaseError);
                return { success: false, error: 'Failed to update Firebase Sync: ' + firebaseError.message };
            }
        }

        const updatedAdmin = await prisma.user.update({
            where: { id },
            data: {
                name,
                email,
                phoneNumber,
            },
        });

        revalidatePath('/dashboard/users/admins');
        return { success: true, data: updatedAdmin };
    } catch (error) {
        console.error('Failed to update admin:', error);
        return { success: false, error: 'Failed to update admin' };
    }
}

export async function deleteAdmin(id: number) {
    try {
        const user = await prisma.user.findUnique({
            where: { id },
            select: { firebaseUid: true },
        });

        if (user && user.firebaseUid && adminAuth) {
            try {
                await adminAuth.deleteUser(user.firebaseUid);
            } catch (firebaseError) {
                console.error('Failed to delete user from Firebase:', firebaseError);
                // Continue with DB delete even if Firebase fails? Or fail? 
                // Usually better to ensure cleanup, but we can log and proceed or return error.
                // Choosing to proceed but log, as DB is source of truth for app.
            }
        }

        await prisma.user.delete({
            where: { id },
        });

        revalidatePath('/dashboard/users/admins');
        return { success: true };
    } catch (error) {
        console.error('Failed to delete admin:', error);
        return { success: false, error: 'Failed to delete admin' };
    }
}

export async function toggleAdminStatus(id: number, currentStatus: boolean) {
    try {
        const updatedAdmin = await prisma.user.update({
            where: { id },
            data: {
                isActive: !currentStatus,
            },
        });

        revalidatePath('/dashboard/users/admins');
        return { success: true, data: updatedAdmin };
    } catch (error) {
        console.error('Failed to toggle admin status:', error);
        return { success: false, error: 'Failed to toggle status' };
    }
}
