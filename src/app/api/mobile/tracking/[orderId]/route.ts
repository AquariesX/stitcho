import { NextRequest } from "next/server";
import { verifyFirebaseToken } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError, API_ERRORS } from "@/lib/api-response";

async function resolveCustomer(uid: string) {
  return prisma.customer.findUnique({ where: { firebaseUid: uid } });
}

/**
 * GET /api/mobile/tracking/[orderId]
 *
 * Returns the order's current status and full status history timeline.
 * Security: Customer can only track their own orders.
 * Header: Authorization: Bearer <firebase_id_token>
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const { uid, error } = await verifyFirebaseToken(request);
  if (error || !uid) return apiError(API_ERRORS.INVALID_TOKEN, 401);

  const customer = await resolveCustomer(uid);
  if (!customer) return apiError(API_ERRORS.CUSTOMER_NOT_FOUND, 404);

  const { orderId } = await params;
  const id = parseInt(orderId);
  if (isNaN(id)) return apiError("Invalid orderId", 400);

  try {
    const order = await (prisma.order as any).findFirst({
      where: {
        id,
        customerId: customer.id, // ownership enforced
      },
      select: {
        id: true,
        status: true,
        estimatedDeliveryDate: true,
        paymentMethod: true,
        cancellationReason: true,
        updatedAt: true,
        tailor: {
          select: {
            name: true,
            shopProfile: { select: { shopName: true } },
          },
        },
        statusHistory: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            status: true,
            note: true,
            createdAt: true,
          },
        },
        payment: {
          select: { status: true, amount: true, currency: true },
        },
      },
    });

    if (!order) return apiError(API_ERRORS.NOT_FOUND, 404);

    return apiSuccess({
      orderId: order.id,
      currentStatus: order.status,
      estimatedDeliveryDate: order.estimatedDeliveryDate,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.payment?.status ?? null,
      cancellationReason: order.cancellationReason,
      tailor: order.tailor,
      lastUpdated: order.updatedAt,
      timeline: order.statusHistory,
    });
  } catch (err) {
    console.error("[API] mobile/tracking/[orderId] GET error:", err);
    return apiError(API_ERRORS.SERVER_ERROR, 500);
  }
}
