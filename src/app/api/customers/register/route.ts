import { adminAuth } from "@/lib/firebase-admin";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// POST /api/customers/register
// Body: { idToken, name, email, phoneNumber? }
// Creates or returns the Customer record for the mobile app user.
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { idToken, name, email, phoneNumber } = body;

    if (!idToken) {
      return NextResponse.json({ error: "Missing ID token" }, { status: 400 });
    }

    let decoded;
    try {
      decoded = await adminAuth.verifyIdToken(idToken);
    } catch {
      return NextResponse.json({ error: "Invalid or expired ID token" }, { status: 401 });
    }

    const firebaseUid = decoded.uid;
    const finalEmail = email || decoded.email || null;

    let customer = await prisma.customer.findUnique({ where: { firebaseUid } });

    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          firebaseUid,
          name: name || "Customer",
          email: finalEmail,
          phoneNumber: phoneNumber || null,
          isActive: true,
        },
      });
    }

    return NextResponse.json({ success: true, data: customer }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
