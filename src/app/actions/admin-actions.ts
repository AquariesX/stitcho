'use server';

import { prisma } from '@/lib/prisma';
import { Role } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { adminAuth } from '@/lib/firebase-admin';
import { createNotification } from './notification-actions';

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

export async function getAdminById(id: number) {
    try {
        const admin = await prisma.user.findUnique({
            where: { id },
        });
        if (!admin) return { success: false, error: 'Admin not found' };
        return { success: true, data: admin };
    } catch (error) {
        console.error('Failed to fetch admin:', error);
        return { success: false, error: 'Failed to fetch admin' };
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
                emailVerified: true, // Auto-verify email as per request
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

            // Send notification email asynchronously (don't block response)
            // We import dynamically or just use the imported function if at top level
            // Ideally import at top, but let's assume sending runs without awaiting critical failure
            // Note: In Server Actions, background tasks without await might be terminated if runtime is serverless
            // But usually okay in standard Node env. For Vercel, need waitUntil. 
            // We will await it for now to ensure delivery feedback or catch errors, 
            // or just trigger it. Let's await to be safe.
            try {
                const { sendAccountCreatedEmail } = await import('@/lib/email-service');
                await sendAccountCreatedEmail(email, name, 'ADMIN', password);
            } catch (emailError) {
                console.error('Failed to send welcome email:', emailError);
                // Don't fail the creation just because email failed, but maybe log it
            }

            // Create notification for new admin
            try {
                await createNotification(
                    'SYSTEM',
                    `New Admin: ${name}`,
                    `A new admin account has been created for ${name} (${email}).`,
                    { userId: newAdmin.id, email, name }
                );
            } catch (notifError) {
                console.error('Failed to create notification:', notifError);
            }

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

        // Create notification for admin profile update
        try {
            await createNotification(
                'PROFILE_UPDATE',
                `Admin Updated: ${name}`,
                `Admin profile for ${name} has been updated.`,
                { userId: id, name }
            );
        } catch (notifError) {
            console.error('Failed to create notification:', notifError);
        }

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
