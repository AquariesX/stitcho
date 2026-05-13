import { NextRequest } from "next/server";
import { verifyFirebaseToken } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { estimateDelivery } from "@/lib/delivery-estimation";
import { createAuditLog } from "@/lib/audit-log";
import { apiSuccess, apiError, API_ERRORS } from "@/lib/api-response";
import { OrderStatus, PaymentStatus } from "@prisma/client";

async function resolveCustomer(uid: string) {
  return prisma.customer.findUnique({ where: { firebaseUid: uid } });
}

/**
 * GET /api/mobile/orders
 * Returns the logged-in customer's orders with full details.
 * Header: Authorization: Bearer <firebase_id_token>
 */
export async function GET(request: NextRequest) {
  const { uid, error } = await verifyFirebaseToken(request);
  if (error || !uid) return apiError(API_ERRORS.INVALID_TOKEN, 401);

  const customer = await resolveCustomer(uid);
  if (!customer) return apiError(API_ERRORS.CUSTOMER_NOT_FOUND, 404);

  try {
    const orders = await prisma.order.findMany({
      where: { customerId: customer.id }, // ownership enforced
      include: {
        product: { select: { id: true, name: true, imageUrl: true } },
        fabric: { select: { id: true, name: true, imageUrl: true } },
        color: { select: { id: true, name: true, hexCode: true } },
        measurement: true,
        payment: { select: { status: true, amount: true, currency: true } },
        tailor: {
          select: {
            id: true,
            name: true,
            shopProfile: { select: { shopName: true, phoneNumber: true } },
          },
        },
        orderStyles: {
          include: {
            styleOption: {
              include: { style: { select: { name: true } } },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const serialized = orders.map((o) => ({
      ...o,
      totalPrice: Number(o.totalPrice),
      measurement: {
        ...o.measurement,
        neck: Number(o.measurement.neck),
        chest: Number(o.measurement.chest),
        stomach: Number(o.measurement.stomach),
        length: Number(o.measurement.length),
        shoulder: Number(o.measurement.shoulder),
        sleeve: Number(o.measurement.sleeve),
      },
      payment: o.payment
        ? { ...o.payment, amount: Number(o.payment.amount) }
        : null,
    }));

    return apiSuccess(serialized);
  } catch (err) {
    console.error("[API] mobile/orders GET error:", err);
    return apiError(API_ERRORS.SERVER_ERROR, 500);
  }
}

/**
 * POST /api/mobile/orders
 * Places a new order. Validates all IDs, estimates delivery, creates payment record.
 * Header: Authorization: Bearer <firebase_id_token>
 * Body: { productId, fabricId, colorId, measurementId, tailorId, addressId?,
 *         totalPrice, notes?, referenceImageUrl?, paymentMethod? (STRIPE|COD),
 *         styleOptionIds? }
 */
export async function POST(request: NextRequest) {
  const { uid, error } = await verifyFirebaseToken(request);
  if (error || !uid) return apiError(API_ERRORS.INVALID_TOKEN, 401);

  const customer = await resolveCustomer(uid);
  if (!customer) return apiError(API_ERRORS.CUSTOMER_NOT_FOUND, 404);

  try {
    const body = await request.json();
    const {
      productId,
      fabricId,
      colorId,
      measurementId,
      tailorId,
      addressId,
      totalPrice,
      notes,
      referenceImageUrl,
      paymentMethod = "STRIPE",
      styleOptionIds = [] as number[],
    } = body;

    // ── Validate required fields ──
    if (!productId || !fabricId || !colorId || !measurementId || !tailorId || !totalPrice) {
      return apiError("productId, fabricId, colorId, measurementId, tailorId, and totalPrice are required", 400);
    }

    if (totalPrice <= 0) {
      return apiError("totalPrice must be greater than 0", 400);
    }

    // ── Verify all referenced entities exist ──
    const [product, fabric, color, measurement, tailor] = await Promise.all([
      prisma.product.findUnique({ where: { id: Number(productId) } }),
      prisma.fabric.findUnique({ where: { id: Number(fabricId) } }),
      prisma.color.findUnique({ where: { id: Number(colorId) } }),
      prisma.measurement.findUnique({ where: { id: Number(measurementId) } }),
      prisma.user.findUnique({ where: { id: Number(tailorId) } }),
    ]);

    if (!product || !product.isAvailable) return apiError("Product not found or unavailable", 404);
    if (!fabric || !fabric.isAvailable) return apiError("Fabric not found or out of stock", 404);
    if (!color) return apiError("Color not found", 404);
    if (!measurement) return apiError("Measurement not found", 404);
    if (!tailor || tailor.role !== "TAILOR") return apiError("Tailor not found or invalid", 404);

    // ── Estimate delivery date ──
    const delivery = await estimateDelivery(Number(tailorId));

    // ── Determine initial payment status ──
    const initialPaymentStatus: PaymentStatus =
      paymentMethod === "COD" ? ("COD_PENDING" as any) : PaymentStatus.REQUIRES_PAYMENT;

    // ── Create order + payment in a transaction ──
    const order = await prisma.$transaction(async (tx) => {
      const newOrder = await (tx.order as any).create({
        data: {
          customerId: customer.id,
          productId: Number(productId),
          fabricId: Number(fabricId),
          colorId: Number(colorId),
          measurementId: Number(measurementId),
          tailorId: Number(tailorId),
          addressId: addressId ? Number(addressId) : undefined,
          totalPrice: Number(totalPrice),
          status: OrderStatus.PENDING,
          notes: notes ?? undefined,
          referenceImageUrl: referenceImageUrl ?? undefined,
          paymentMethod,
          estimatedDeliveryDate: delivery.estimatedDeliveryDate,
          // Create status history entry
          statusHistory: {
            create: { status: OrderStatus.PENDING, note: "Order placed by customer" },
          },
        },
      });

      // Attach style options if provided
      if (styleOptionIds.length > 0) {
        await tx.orderStyle.createMany({
          data: styleOptionIds.map((soId: number) => ({
            orderId: newOrder.id,
            styleOptionId: soId,
          })),
        });
      }

      // Create payment record
      await tx.payment.create({
        data: {
          orderId: newOrder.id,
          stripePaymentIntentId: "PENDING",
          amount: Number(totalPrice),
          currency: "PKR",
          status: initialPaymentStatus,
        },
      });

      return newOrder;
    });

    await createAuditLog({
      action: "CREATE_ORDER",
      module: "Orders",
      entityId: order.id,
      newValue: { customerId: customer.id, tailorId, totalPrice, paymentMethod },
    });

    return apiSuccess(
      {
        orderId: order.id,
        status: order.status,
        estimatedDelivery: {
          date: delivery.estimatedDeliveryDate,
          label: delivery.label,
        },
        paymentMethod,
        paymentStatus: initialPaymentStatus,
      },
      201
    );
  } catch (err) {
    console.error("[API] mobile/orders POST error:", err);
    return apiError(API_ERRORS.SERVER_ERROR, 500);
  }
}
