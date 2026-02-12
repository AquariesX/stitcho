
import { adminAuth } from '@/lib/firebase-admin';
import { prisma } from '@/lib/prisma';
import { Role } from '@prisma/client';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { idToken, name, email } = body;

        if (!idToken) {
            return NextResponse.json({ error: 'Missing ID token' }, { status: 400 });
        }

        // 1. Verify the ID token with Firebase Admin
        let decodedToken;
        try {
            decodedToken = await adminAuth.verifyIdToken(idToken);
        } catch (error) {
            console.error('Error verifying Firebase token:', error);
            return NextResponse.json({ error: 'Invalid ID token' }, { status: 401 });
        }

        const firebaseUid = decodedToken.uid;
        const finalEmail = email || decodedToken.email; // Fallback to token email if provided

        // 2. Check if user exists in database
        let user = await prisma.user.findUnique({
            where: { firebaseUid },
        });

        // 3. If not, create new user
        if (!user) {
            // Basic validation
            if (!finalEmail) {
                return NextResponse.json({ error: 'Email is required for registration' }, { status: 400 });
            }

            console.log(`Creating new user for ${finalEmail} (${firebaseUid})`);

            user = await prisma.user.create({
                data: {
                    firebaseUid,
                    name: name || 'New User', // Fallback name
                    email: finalEmail,
                    role: Role.CUSTOMER, // Default role for mobile signups
                    isActive: true,
                },
            });
        } else {
            // Optional: Update basic fields if they changed (e.g. name)
            // For now, we just return the existing user to keep it simple.
        }

        return NextResponse.json({ success: true, user }, { status: 200 });

    } catch (error: any) {
        console.error('Registration API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
