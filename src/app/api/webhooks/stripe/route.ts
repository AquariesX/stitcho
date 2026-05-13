import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit-log";
import { PaymentStatus, OrderStatus } from "@prisma/client";

/**
 * POST /api/webhooks/stripe
 *
 * Handles Stripe webhook events to keep payment/order status in sync.
 * Verifies Stripe signature before processing any event.
 *
 * Required env: STRIPE_WEBHOOK_SECRET
 * Set up in Stripe Dashboard > Developers > Webhooks
 */
export async function POST(request: NextRequest) {
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error("[Webhook] STRIPE_WEBHOOK_SECRET is not set");
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
  }

  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  // Read raw body for signature verification
  const rawBody = await request.text();

  let event: import("stripe").Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err: any) {
    console.error("[Webhook] Signature verification failed:", err.message);
    return NextResponse.json({ error: "Webhook signature verification failed" }, { status: 400 });
  }

  try {
    switch (event.type) {
      // ── Payment succeeded ──
      case "payment_intent.succeeded": {
        const intent = event.data.object as import("stripe").Stripe.PaymentIntent;
        const orderId = intent.metadata?.orderId
          ? parseInt(intent.metadata.orderId)
          : null;

        if (!orderId) break;

        const payment = await prisma.payment.findUnique({ where: { orderId } });
        if (!payment) break;

        await prisma.payment.update({
          where: { orderId },
          data: { status: PaymentStatus.PAID },
        });

        // Also advance order to PROCESSING
        await prisma.order.update({
          where: { id: orderId },
          data: { status: OrderStatus.PROCESSING },
        });

        // Append to status history
        await prisma.orderStatusHistory.create({
          data: {
            orderId,
            status: OrderStatus.PROCESSING,
            note: "Payment confirmed via Stripe",
          },
        });

        // Notify admin
        await prisma.notification.create({
          data: {
            type: "ORDER_STATUS",
            title: `Payment Received — Order #${orderId}`,
            message: `Stripe payment confirmed for order #${orderId}. Order is now in PROCESSING.`,
            metadata: { orderId, stripeIntentId: intent.id },
          },
        });

        await createAuditLog({
          action: "STRIPE_PAYMENT_SUCCEEDED",
          module: "Payments",
          entityId: orderId,
          oldValue: { paymentStatus: "REQUIRES_PAYMENT", orderStatus: "PENDING" },
          newValue: { paymentStatus: "PAID", orderStatus: "PROCESSING" },
        });

        console.log(`[Webhook] Payment succeeded for order #${orderId}`);
        break;
      }

      // ── Payment failed ──
      case "payment_intent.payment_failed": {
        const intent = event.data.object as import("stripe").Stripe.PaymentIntent;
        const orderId = intent.metadata?.orderId
          ? parseInt(intent.metadata.orderId)
          : null;

        if (!orderId) break;

        await prisma.payment.update({
          where: { orderId },
          data: { status: PaymentStatus.FAILED },
        });

        await createAuditLog({
          action: "STRIPE_PAYMENT_FAILED",
          module: "Payments",
          entityId: orderId,
          newValue: { paymentStatus: "FAILED", stripeError: intent.last_payment_error?.message },
        });

        console.log(`[Webhook] Payment failed for order #${orderId}`);
        break;
      }

      // ── Charge refunded ──
      case "charge.refunded": {
        const charge = event.data.object as import("stripe").Stripe.Charge;
        const intentId = charge.payment_intent as string;

        if (!intentId) break;

        const payment = await prisma.payment.findFirst({
          where: { stripePaymentIntentId: intentId },
        });

        if (!payment) break;

        await prisma.payment.update({
          where: { id: payment.id },
          data: { status: "REFUNDED" as any },
        });

        // Advance order to REFUNDED if it was CANCEL_REQUESTED
        const order = await prisma.order.findUnique({ where: { id: payment.orderId } });
        if (order && order.status === ("CANCEL_REQUESTED" as any)) {
          await prisma.order.update({
            where: { id: payment.orderId },
            data: { status: "REFUNDED" as any },
          });

          await prisma.orderStatusHistory.create({
            data: {
              orderId: payment.orderId,
              status: "REFUNDED" as any,
              note: "Refund confirmed via Stripe",
            },
          });
        }

        await createAuditLog({
          action: "STRIPE_REFUND_CONFIRMED",
          module: "Payments",
          entityId: payment.orderId,
          newValue: { paymentStatus: "REFUNDED", chargeId: charge.id },
        });

        console.log(`[Webhook] Refund confirmed for order #${payment.orderId}`);
        break;
      }

      default:
        console.log(`[Webhook] Unhandled event type: ${event.type}`);
    }
  } catch (err) {
    console.error("[Webhook] Handler error:", err);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
