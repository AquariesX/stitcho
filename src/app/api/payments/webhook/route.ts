import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { OrderStatus, PaymentStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

// POST /api/payments/webhook
// No auth header — Stripe signs the request with STRIPE_WEBHOOK_SECRET.
//
// Setup:
// 1. Go to Stripe Dashboard → Developers → Webhooks
// 2. Add endpoint: https://yourdomain.com/api/payments/webhook
// 3. Select events: payment_intent.succeeded, payment_intent.payment_failed, payment_intent.canceled
// 4. Copy the Signing Secret and set it as STRIPE_WEBHOOK_SECRET in .env
//
// For local testing: stripe listen --forward-to localhost:3000/api/payments/webhook

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET is not configured");
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 });
  }

  const paymentIntent = event.data.object as Stripe.PaymentIntent;

  switch (event.type) {
    case "payment_intent.succeeded": {
      const payment = await prisma.payment.findFirst({
        where: { stripePaymentIntentId: paymentIntent.id },
      });
      if (payment) {
        await prisma.$transaction([
          prisma.payment.update({
            where: { id: payment.id },
            data: { status: PaymentStatus.PAID },
          }),
          prisma.order.update({
            where: { id: payment.orderId },
            data: { status: OrderStatus.PAID },
          }),
        ]);
      }
      break;
    }

    case "payment_intent.payment_failed":
    case "payment_intent.canceled": {
      const payment = await prisma.payment.findFirst({
        where: { stripePaymentIntentId: paymentIntent.id },
      });
      if (payment) {
        await prisma.payment.update({
          where: { id: payment.id },
          data: { status: PaymentStatus.FAILED },
        });
      }
      break;
    }

    default:
      // Unhandled event type — return 200 so Stripe doesn't retry
      break;
  }

  return NextResponse.json({ received: true });
}
