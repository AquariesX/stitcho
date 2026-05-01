import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { verifyFirebaseToken } from "@/lib/auth-helpers";
import { PaymentStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

// POST /api/payments/create-intent
// Body: { orderId: number }
// Header: Authorization: Bearer <firebase_id_token>
//
// Converts order totalPrice (PKR) → USD and creates a Stripe PaymentIntent.
// All payment amounts are stored and returned in USD.
// Exchange rate: 1 USD = 280 PKR — update PKR_TO_USD_RATE as needed.

const PKR_TO_USD_RATE = 280;

function pkrToUsd(pkr: number): number {
  return Math.round((pkr / PKR_TO_USD_RATE) * 100) / 100; // round to 2 decimals
}

export async function POST(request: NextRequest) {
  const { uid, error: authError } = await verifyFirebaseToken(request);
  if (authError || !uid) {
    return NextResponse.json({ error: authError }, { status: 401 });
  }

  let body: { orderId?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { orderId } = body;
  if (!orderId) {
    return NextResponse.json({ error: "orderId is required" }, { status: 400 });
  }

  const customer = await prisma.customer.findUnique({ where: { firebaseUid: uid } });
  if (!customer) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { payment: true, product: true, customer: true },
  });

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  if (order.customerId !== customer.id) {
    return NextResponse.json({ error: "Order does not belong to this customer" }, { status: 403 });
  }

  if (order.payment?.status === PaymentStatus.PAID) {
    return NextResponse.json({ error: "Order is already paid" }, { status: 400 });
  }

  const usdAmount = pkrToUsd(Number(order.totalPrice));
  const amountInCents = Math.round(usdAmount * 100);

  if (amountInCents < 50) {
    return NextResponse.json(
      { error: "Order amount is too small for payment processing (minimum $0.50)" },
      { status: 400 }
    );
  }

  // Reuse an existing pending PaymentIntent if available
  if (order.payment?.stripePaymentIntentId && order.payment.status === PaymentStatus.REQUIRES_PAYMENT) {
    try {
      const existing = await stripe.paymentIntents.retrieve(order.payment.stripePaymentIntentId);
      if (existing.status === "requires_payment_method" || existing.status === "requires_confirmation") {
        return NextResponse.json({
          clientSecret: existing.client_secret,
          paymentIntentId: existing.id,
          amount: usdAmount,
          currency: "usd",
        });
      }
    } catch {
      // Expired or not found — create a new one below
    }
  }

  const paymentIntent = await stripe.paymentIntents.create({
    amount: amountInCents,
    currency: "usd",
    metadata: {
      orderId: order.id.toString(),
      customerId: customer.id.toString(),
      customerName: customer.name,
      productName: order.product.name,
    },
    description: `Stitcho Order #${order.id} — ${order.product.name}`,
    automatic_payment_methods: { enabled: true },
  });

  await prisma.payment.upsert({
    where: { orderId: order.id },
    create: {
      orderId: order.id,
      stripePaymentIntentId: paymentIntent.id,
      amount: usdAmount,
      currency: "USD",
      status: PaymentStatus.REQUIRES_PAYMENT,
    },
    update: {
      stripePaymentIntentId: paymentIntent.id,
      amount: usdAmount,
      currency: "USD",
      status: PaymentStatus.REQUIRES_PAYMENT,
    },
  });

  return NextResponse.json({
    clientSecret: paymentIntent.client_secret,
    paymentIntentId: paymentIntent.id,
    amount: usdAmount,
    currency: "usd",
  });
}
