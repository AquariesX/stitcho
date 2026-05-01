import { prisma } from "@/lib/prisma";
import { verifyFirebaseToken } from "@/lib/auth-helpers";
import { NextRequest, NextResponse } from "next/server";

// GET /api/payments/order/[orderId]
// Header: Authorization: Bearer <firebase_id_token>
//
// Returns the payment status for a specific order.
// Payment amount is in USD. Order totalPrice is kept in PKR for display only.

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const { uid, error: authError } = await verifyFirebaseToken(request);
  if (authError || !uid) {
    return NextResponse.json({ error: authError }, { status: 401 });
  }

  const { orderId } = await params;
  const orderIdNum = parseInt(orderId, 10);
  if (isNaN(orderIdNum)) {
    return NextResponse.json({ error: "Invalid orderId" }, { status: 400 });
  }

  const customer = await prisma.customer.findUnique({ where: { firebaseUid: uid } });
  if (!customer) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }

  const order = await prisma.order.findUnique({
    where: { id: orderIdNum },
    include: {
      payment: true,
      product: { select: { name: true } },
    },
  });

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  if (order.customerId !== customer.id) {
    return NextResponse.json({ error: "Order does not belong to this customer" }, { status: 403 });
  }

  return NextResponse.json({
    orderId: order.id,
    orderStatus: order.status,
    product: order.product.name,
    payment: order.payment
      ? {
          id: order.payment.id,
          status: order.payment.status,
          stripePaymentIntentId: order.payment.stripePaymentIntentId,
          amount: Number(order.payment.amount),
          currency: order.payment.currency,
          createdAt: order.payment.createdAt,
          updatedAt: order.payment.updatedAt,
        }
      : null,
  });
}
