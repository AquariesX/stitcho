import { verifyFirebaseToken } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// GET /api/orders/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { uid, error: authError } = await verifyFirebaseToken(request);
  if (authError || !uid) {
    return NextResponse.json({ error: authError }, { status: 401 });
  }

  const { id } = await params;
  const orderId = parseInt(id, 10);
  if (isNaN(orderId)) {
    return NextResponse.json({ error: "Invalid order ID" }, { status: 400 });
  }

  const customer = await prisma.customer.findUnique({ where: { firebaseUid: uid } });
  if (!customer) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      product: true,
      fabric: true,
      color: true,
      measurement: true,
      address: true,
      payment: true,
      orderStyles: {
        include: {
          styleOption: { include: { style: true } },
        },
      },
      statusHistory: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  if (order.customerId !== customer.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  return NextResponse.json({ success: true, data: order });
}
