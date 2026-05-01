import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { verifyFirebaseToken } from "@/lib/auth-helpers";
import { OrderStatus, PaymentStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

// POST /api/payments/confirm
// Body: { paymentIntentId: string }
// Header: Authorization: Bearer <firebase_id_token>
//
// Call this after the Stripe SDK confirms payment on mobile.
// It syncs the payment status from Stripe into your database.
// The webhook does the same automatically, but this is a fallback for immediate confirmation.

export async function POST(request: NextRequest) {
  const { uid, error: authError } = await verifyFirebaseToken(request);
  if (authError || !uid) {
    return NextResponse.json({ error: authError }, { status: 401 });
  }

  let body: { paymentIntentId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { paymentIntentId } = body;
  if (!paymentIntentId) {
    return NextResponse.json({ error: "paymentIntentId is required" }, { status: 400 });
  }

  const paymentRecord = await prisma.payment.findFirst({
    where: { stripePaymentIntentId: paymentIntentId },
    include: { order: { include: { customer: true } } },
  });

  if (!paymentRecord) {
    return NextResponse.json({ error: "Payment record not found" }, { status: 404 });
  }

  if (paymentRecord.order.customer.firebaseUid !== uid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

  if (paymentIntent.status === "succeeded") {
    await prisma.$transaction([
      prisma.payment.update({
        where: { id: paymentRecord.id },
        data: { status: PaymentStatus.PAID },
      }),
      prisma.order.update({
        where: { id: paymentRecord.orderId },
        data: { status: OrderStatus.PAID },
      }),
    ]);

    return NextResponse.json({
      success: true,
      status: "PAID",
      orderId: paymentRecord.orderId,
    });
  }

  if (paymentIntent.status === "canceled" || paymentIntent.last_payment_error) {
    await prisma.payment.update({
      where: { id: paymentRecord.id },
      data: { status: PaymentStatus.FAILED },
    });

    return NextResponse.json({
      success: false,
      status: "FAILED",
      stripeStatus: paymentIntent.status,
    });
  }

  return NextResponse.json({
    success: false,
    status: "PENDING",
    stripeStatus: paymentIntent.status,
  });
}
