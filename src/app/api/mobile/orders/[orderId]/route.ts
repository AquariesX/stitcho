import { NextRequest } from "next/server";
import { verifyFirebaseToken } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError, API_ERRORS } from "@/lib/api-response";

async function resolveCustomer(uid: string) {
  return prisma.customer.findUnique({ where: { firebaseUid: uid } });
}

/**
 * GET /api/mobile/orders/[orderId]
 *
 * Returns detailed info for a single order.
 * Security: Customer can only fetch their own orders.
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
    const order = await prisma.order.findFirst({
      where: {
        id,
        customerId: customer.id, // ownership check
      },
      include: {
        product: true,
        fabric: true,
        color: true,
        measurement: true,
        address: true,
        payment: true,
        tailor: {
          select: {
            id: true,
            name: true,
            shopProfile: {
              select: { shopName: true, phoneNumber: true, whatsappNumber: true },
            },
          },
        },
        orderStyles: {
          include: {
            styleOption: {
              include: { style: { select: { id: true, name: true } } },
            },
          },
        },
        statusHistory: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!order) return apiError(API_ERRORS.NOT_FOUND, 404);

    // Serialize Decimals
    const serialized = {
      ...order,
      totalPrice: Number(order.totalPrice),
      product: { ...order.product, basePrice: Number(order.product.basePrice) },
      fabric: { ...order.fabric, price: Number(order.fabric.price) },
      measurement: {
        ...order.measurement,
        neck: Number(order.measurement.neck),
        chest: Number(order.measurement.chest),
        stomach: Number(order.measurement.stomach),
        length: Number(order.measurement.length),
        shoulder: Number(order.measurement.shoulder),
        sleeve: Number(order.measurement.sleeve),
      },
      payment: order.payment
        ? { ...order.payment, amount: Number(order.payment.amount) }
        : null,
    };

    return apiSuccess(serialized);
  } catch (err) {
    console.error("[API] mobile/orders/[orderId] GET error:", err);
    return apiError(API_ERRORS.SERVER_ERROR, 500);
  }
}
