import { verifyFirebaseToken } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// GET /api/customers/profile
// Header: Authorization: Bearer <firebase_id_token>
export async function GET(request: NextRequest) {
  const { uid, error: authError } = await verifyFirebaseToken(request);
  if (authError || !uid) {
    return NextResponse.json({ error: authError }, { status: 401 });
  }

  const customer = await prisma.customer.findUnique({ where: { firebaseUid: uid } });
  if (!customer) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true, data: customer });
}

// PATCH /api/customers/profile
// Body: { name?, phoneNumber?, photoUrl? }
export async function PATCH(request: NextRequest) {
  const { uid, error: authError } = await verifyFirebaseToken(request);
  if (authError || !uid) {
    return NextResponse.json({ error: authError }, { status: 401 });
  }

  const customer = await prisma.customer.findUnique({ where: { firebaseUid: uid } });
  if (!customer) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }

  const body = await request.json();
  const { name, phoneNumber, photoUrl } = body;

  const updated = await prisma.customer.update({
    where: { id: customer.id },
    data: {
      ...(name && { name }),
      ...(phoneNumber !== undefined && { phoneNumber }),
      ...(photoUrl !== undefined && { photoUrl }),
    },
  });

  return NextResponse.json({ success: true, data: updated });
}
