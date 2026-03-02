'use server';

import { prisma } from '@/lib/prisma';
import { Role } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { adminAuth } from '@/lib/firebase-admin';
import { createNotification } from './notification-actions';

export async function createTailor(formData: FormData) {
    try {
        const name = formData.get('name') as string;
        const email = formData.get('email') as string;
        const phoneNumber = formData.get('phoneNumber') as string;
        const password = formData.get('password') as string;

        let firebaseUid = '';

        if (!adminAuth) {
            console.error('Firebase Admin SDK not initialized');
            return { success: false, error: 'Server configuration error: Firebase Admin not ready.' };
        }

        try {
            // Firebase requires E.164 format for phone numbers (e.g. +15555550100)
            const formattedPhone = phoneNumber && phoneNumber.startsWith('+') ? phoneNumber : undefined;

            const firebaseUser = await adminAuth.createUser({
                email,
                password,
                displayName: name,
                phoneNumber: formattedPhone,
                emailVerified: true, // Auto-verify email
            });
            firebaseUid = firebaseUser.uid;
        } catch (firebaseError: any) {
            console.error('Firebase Auth Create Error:', JSON.stringify(firebaseError, null, 2));
            const errorCode = firebaseError.errorInfo?.code || firebaseError.code;
            const errorMessage = firebaseError.errorInfo?.message || firebaseError.message;
            return { success: false, error: `Firebase Error (${errorCode}): ${errorMessage}` };
        }

        try {
            const newTailor = await prisma.user.create({
                data: {
                    name,
                    email,
                    phoneNumber,
                    role: Role.TAILOR,
                    firebaseUid: firebaseUid,
                    isActive: true,
                },
            });

            // Send notification email
            try {
                console.log('Triggering welcome email for:', email);
                const { sendAccountCreatedEmail } = await import('@/lib/email-service');
                const emailResult = await sendAccountCreatedEmail(email, name, 'TAILOR', password);
                if (!emailResult.success) {
                    console.error('Email service returned error:', emailResult.error);
                } else {
                    console.log('Email sent successfully');
                }
            } catch (emailError) {
                console.error('Failed to send welcome email (exception):', emailError);
            }

            // Create notification for new tailor signup
            try {
                await createNotification(
                    'TAILOR_SIGNUP',
                    `New Tailor: ${name}`,
                    `A new tailor account has been created for ${name} (${email}).`,
                    { userId: newTailor.id, email, name }
                );
            } catch (notifError) {
                console.error('Failed to create notification:', notifError);
            }

            revalidatePath('/dashboard/users/tailors');
            return { success: true, data: newTailor };
        } catch (dbError: any) {
            console.error('Failed to create tailor in DB, rolling back Firebase user:', dbError);

            if (firebaseUid && adminAuth) {
                try {
                    await adminAuth.deleteUser(firebaseUid);
                    console.log('Rollback successful: Deleted Firebase user', firebaseUid);
                } catch (rollbackError) {
                    console.error('CRITICAL: Failed to rollback Firebase user after DB failure:', rollbackError);
                }
            }

            return { success: false, error: 'Database creation failed: ' + dbError.message };
        }
    } catch (error: any) {
        console.error('Unexpected error in createTailor:', error);
        return { success: false, error: 'Unexpected error: ' + error.message };
    }
}
