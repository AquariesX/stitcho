import { verifyFirebaseToken } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// GET /api/customers/addresses
export async function GET(request: NextRequest) {
  const { uid, error: authError } = await verifyFirebaseToken(request);
  if (authError || !uid) {
    return NextResponse.json({ error: authError }, { status: 401 });
  }

  const customer = await prisma.customer.findUnique({ where: { firebaseUid: uid } });
  if (!customer) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }

  const addresses = await prisma.address.findMany({
    where: { customerId: customer.id },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
  });

  return NextResponse.json({ success: true, data: addresses });
}

// POST /api/customers/addresses
// Body: { fullName, phoneNumber, address, city, postalCode, country?, isDefault? }
export async function POST(request: NextRequest) {
  const { uid, error: authError } = await verifyFirebaseToken(request);
  if (authError || !uid) {
    return NextResponse.json({ error: authError }, { status: 401 });
  }

  const customer = await prisma.customer.findUnique({ where: { firebaseUid: uid } });
  if (!customer) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }

  const body = await request.json();
  const { fullName, phoneNumber, address, city, postalCode, country, isDefault } = body;

  if (!fullName || !phoneNumber || !address || !city || !postalCode) {
    return NextResponse.json(
      { error: "fullName, phoneNumber, address, city, and postalCode are required" },
      { status: 400 }
    );
  }

  // Unset existing default when marking new one as default
  if (isDefault) {
    await prisma.address.updateMany({
      where: { customerId: customer.id },
      data: { isDefault: false },
    });
  }

  const newAddress = await prisma.address.create({
    data: {
      customerId: customer.id,
      fullName,
      phoneNumber,
      address,
      city,
      postalCode,
      country: country || "Pakistan",
      isDefault: isDefault ?? false,
    },
  });

  return NextResponse.json({ success: true, data: newAddress }, { status: 201 });
}
