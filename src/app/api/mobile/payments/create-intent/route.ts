import { NextRequest } from "next/server";
import { verifyFirebaseToken } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { apiSuccess, apiError, API_ERRORS } from "@/lib/api-response";
import { PaymentStatus } from "@prisma/client";

async function resolveCustomer(uid: string) {
  return prisma.customer.findUnique({ where: { firebaseUid: uid } });
}

/**
 * POST /api/mobile/payments/create-intent
 *
 * Creates a Stripe PaymentIntent for a specific order.
 * Updates the Payment record with the PaymentIntent ID.
 * Security: Customer can only pay for their own orders.
 *
 * Header: Authorization: Bearer <firebase_id_token>
 * Body: { orderId: number }
 */
export async function POST(request: NextRequest) {
  const { uid, error } = await verifyFirebaseToken(request);
  if (error || !uid) return apiError(API_ERRORS.INVALID_TOKEN, 401);

  const customer = await resolveCustomer(uid);
  if (!customer) return apiError(API_ERRORS.CUSTOMER_NOT_FOUND, 404);

  try {
    const body = await request.json();
    const { orderId } = body;

    if (!orderId) return apiError("orderId is required", 400);

    // Verify the order belongs to this customer
    const order = await prisma.order.findFirst({
      where: {
        id: Number(orderId),
        customerId: customer.id, // ownership check
      },
      include: { payment: true },
    });

    if (!order) return apiError(API_ERRORS.NOT_FOUND, 404);
    if (order.payment?.status === PaymentStatus.PAID) {
      return apiError("This order is already paid", 400);
    }

    // Create Stripe PaymentIntent (amount in smallest currency unit — PKR uses 1 unit)
    const amountInPaisa = Math.round(Number(order.totalPrice) * 100);
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInPaisa,
      currency: "pkr",
      metadata: {
        orderId: order.id.toString(),
        customerId: customer.id.toString(),
        customerName: customer.name,
      },
      description: `Stitcho Order #${order.id}`,
    });

    // Update the Payment record with the real PaymentIntent ID
    await prisma.payment.update({
      where: { orderId: order.id },
      data: {
        stripePaymentIntentId: paymentIntent.id,
        status: PaymentStatus.REQUIRES_PAYMENT,
      },
    });

    return apiSuccess({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: Number(order.totalPrice),
      currency: "PKR",
    });
  } catch (err) {
    console.error("[API] mobile/payments/create-intent error:", err);
    return apiError(API_ERRORS.SERVER_ERROR, 500);
  }
}
