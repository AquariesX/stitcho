import { verifyFirebaseToken } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { OrderStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

// GET /api/orders
// Returns all orders for the logged-in customer.
export async function GET(request: NextRequest) {
  const { uid, error: authError } = await verifyFirebaseToken(request);
  if (authError || !uid) {
    return NextResponse.json({ error: authError }, { status: 401 });
  }

  const customer = await prisma.customer.findUnique({ where: { firebaseUid: uid } });
  if (!customer) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }

  const orders = await prisma.order.findMany({
    where: { customerId: customer.id },
    include: {
      product: { select: { id: true, name: true, imageUrl: true, basePrice: true } },
      fabric: { select: { id: true, name: true, imageUrl: true, price: true } },
      color: { select: { id: true, name: true, hexCode: true } },
      measurement: { select: { id: true, label: true, type: true, scale: true } },
      address: true,
      payment: { select: { id: true, status: true, amount: true, currency: true } },
      statusHistory: { orderBy: { createdAt: "asc" } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ success: true, data: orders });
}

// POST /api/orders
// Body: { productId, fabricId, colorId, measurementId, addressId?, totalPrice, notes?, styleOptionIds? }
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
  const { productId, fabricId, colorId, measurementId, addressId, totalPrice, notes, styleOptionIds } = body;

  if (!productId || !fabricId || !colorId || !measurementId || totalPrice == null) {
    return NextResponse.json(
      { error: "productId, fabricId, colorId, measurementId, and totalPrice are required" },
      { status: 400 }
    );
  }

  const order = await prisma.$transaction(async (tx) => {
    const newOrder = await tx.order.create({
      data: {
        customerId: customer.id,
        productId: Number(productId),
        fabricId: Number(fabricId),
        colorId: Number(colorId),
        measurementId: Number(measurementId),
        addressId: addressId ? Number(addressId) : null,
        totalPrice: Number(totalPrice),
        status: OrderStatus.PENDING,
        notes: notes || null,
      },
      include: {
        product: { select: { id: true, name: true, imageUrl: true } },
        fabric: { select: { id: true, name: true } },
        color: { select: { id: true, name: true, hexCode: true } },
        measurement: { select: { id: true, label: true, type: true } },
      },
    });

    await tx.orderStatusHistory.create({
      data: {
        orderId: newOrder.id,
        status: OrderStatus.PENDING,
        note: "Order placed by customer",
      },
    });

    if (Array.isArray(styleOptionIds) && styleOptionIds.length > 0) {
      await tx.orderStyle.createMany({
        data: styleOptionIds.map((optionId: number) => ({
          orderId: newOrder.id,
          styleOptionId: Number(optionId),
        })),
        skipDuplicates: true,
      });
    }

    return newOrder;
  });

  return NextResponse.json({ success: true, data: order }, { status: 201 });
}
