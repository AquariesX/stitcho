"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { OrderStatus } from "@prisma/client";
import { createAuditLog } from "@/lib/audit-log";

// ── Statuses a tailor is allowed to advance to ──
const TAILOR_ALLOWED_STATUS_TRANSITIONS: Record<string, OrderStatus[]> = {
  PENDING: [OrderStatus.PROCESSING],
  PROCESSING: [OrderStatus.CUTTING],
  CUTTING: [OrderStatus.STITCHING],
  STITCHING: [OrderStatus.READY],
  READY: [OrderStatus.DELIVERED],
  DELIVERED: [OrderStatus.COMPLETED],
  CANCEL_REQUESTED: [OrderStatus.CANCELLED],
};

/**
 * Fetch all orders assigned to this tailor.
 * Uses tailorId field — not product.userId.
 */
export async function getTailorOrders(tailorId: number) {
  try {
    const orders = await prisma.order.findMany({
      where: {
        tailorId, // ✅ correct ownership field
      },
      include: {
        customer: { select: { id: true, name: true, email: true, phoneNumber: true } },
        product: { select: { id: true, name: true, basePrice: true, imageUrl: true } },
        fabric: { select: { id: true, name: true, imageUrl: true, price: true } },
        color: { select: { id: true, name: true, hexCode: true } },
        measurement: true,
        payment: { select: { status: true, amount: true, currency: true } },
        statusHistory: { orderBy: { createdAt: "asc" }, take: 10 },
      },
      orderBy: { createdAt: "desc" },
    });

    return orders.map((order) => ({
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
    }));
  } catch {
    throw new Error("Failed to fetch orders");
  }
}

/**
 * Fetch a single order — validates it belongs to the given tailor.
 */
export async function getTailorOrderById(orderId: number, tailorId: number) {
  const order = await prisma.order.findFirst({
    where: { id: orderId, tailorId },
    include: {
      customer: true,
      product: true,
      fabric: true,
      color: true,
      measurement: true,
      payment: true,
      address: true,
      orderStyles: {
        include: { styleOption: { include: { style: true } } },
      },
      statusHistory: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!order) return null;

  return {
    ...order,
    totalPrice: Number(order.totalPrice),
    product: { ...order.product, basePrice: Number(order.product.basePrice) },
    fabric: { ...order.fabric, price: Number(order.fabric.price) },
    payment: order.payment
      ? { ...order.payment, amount: Number(order.payment.amount) }
      : null,
  };
}

/**
 * Update order status. Only allows valid transitions and only for owned orders.
 */
export async function updateOrderStatus(
  orderId: number,
  newStatus: OrderStatus,
  tailorId: number,
  note?: string
) {
  const order = await prisma.order.findFirst({
    where: { id: orderId, tailorId }, // ownership check
  });

  if (!order) return { success: false, error: "Order not found or access denied" };

  const allowedNext = TAILOR_ALLOWED_STATUS_TRANSITIONS[order.status] ?? [];
  if (!allowedNext.includes(newStatus)) {
    return {
      success: false,
      error: `Cannot transition from ${order.status} to ${newStatus}`,
    };
  }

  const oldStatus = order.status;

  await prisma.$transaction([
    prisma.order.update({ where: { id: orderId }, data: { status: newStatus } }),
    prisma.orderStatusHistory.create({
      data: { orderId, status: newStatus, note: note ?? undefined },
    }),
  ]);

  await createAuditLog({
    userId: tailorId,
    userRole: "TAILOR",
    action: "UPDATE_ORDER_STATUS",
    module: "Orders",
    entityId: orderId,
    oldValue: { status: oldStatus },
    newValue: { status: newStatus },
  });

  revalidatePath("/dashboard/tailor/orders");
  return { success: true };
}

/**
 * Customer requests order cancellation (before CUTTING stage).
 * Sets status to CANCEL_REQUESTED.
 */
export async function requestCancellation(orderId: number, customerId: number, reason: string) {
  const order = await prisma.order.findFirst({
    where: { id: orderId, customerId },
  });

  if (!order) return { success: false, error: "Order not found" };

  const nonCancellableStages: string[] = [
    "CUTTING", "STITCHING", "READY", "DELIVERED", "COMPLETED",
  ];

  if (nonCancellableStages.includes(order.status as string)) {
    return {
      success: false,
      error: "Cancellation not allowed after cutting has started",
    };
  }

  await prisma.$transaction([
    prisma.order.update({
      where: { id: orderId },
      data: {
        status: "CANCEL_REQUESTED" as any,
        cancellationReason: reason,
      } as any,
    }),
    prisma.orderStatusHistory.create({
      data: {
        orderId,
        status: "CANCEL_REQUESTED" as any,
        note: `Customer requested cancellation: ${reason}`,
      },
    }),
  ]);

  await createAuditLog({
    action: "REQUEST_CANCELLATION",
    module: "Orders",
    entityId: orderId,
    newValue: { reason },
  });

  revalidatePath("/dashboard/tailor/orders");
  return { success: true };
}

/**
 * Tailor/Admin approves cancellation.
 * Sets status to CANCELLED, marks payment as REFUND_PENDING if paid.
 */
export async function approveCancellation(
  orderId: number,
  userId: number,
  userRole: "ADMIN" | "TAILOR"
) {
  const order = await prisma.order.findFirst({
    where: {
      id: orderId,
      status: "CANCEL_REQUESTED" as any,
      ...(userRole === "TAILOR" ? { tailorId: userId } : {}),
    },
    include: { payment: true },
  });

  if (!order) return { success: false, error: "Order not found or access denied" };

  const isPaid = order.payment?.status === "PAID";

  await prisma.$transaction([
    prisma.order.update({
      where: { id: orderId },
      data: { status: OrderStatus.CANCELLED },
    }),
    prisma.orderStatusHistory.create({
      data: {
        orderId,
        status: OrderStatus.CANCELLED,
        note: "Cancellation approved by " + userRole.toLowerCase(),
      },
    }),
    ...(isPaid
      ? [
          prisma.payment.update({
            where: { orderId },
            data: { status: "REFUND_PENDING" as any },
          }),
          prisma.orderStatusHistory.create({
            data: {
              orderId,
              status: "REFUND_PENDING" as any,
              note: "Refund initiated (awaiting Stripe confirmation)",
            },
          }),
        ]
      : []),
  ]);

  await createAuditLog({
    userId,
    userRole,
    action: "APPROVE_CANCELLATION",
    module: "Orders",
    entityId: orderId,
    newValue: { newStatus: "CANCELLED", refundInitiated: isPaid },
  });

  revalidatePath("/dashboard/tailor/orders");
  return { success: true };
}

/**
 * Tailor/Admin rejects cancellation request — reverts to PROCESSING.
 */
export async function rejectCancellation(
  orderId: number,
  userId: number,
  userRole: "ADMIN" | "TAILOR"
) {
  const order = await prisma.order.findFirst({
    where: {
      id: orderId,
      status: "CANCEL_REQUESTED" as any,
      ...(userRole === "TAILOR" ? { tailorId: userId } : {}),
    },
  });

  if (!order) return { success: false, error: "Order not found or access denied" };

  await prisma.$transaction([
    prisma.order.update({
      where: { id: orderId },
      data: { status: OrderStatus.PROCESSING, cancellationReason: null } as any,
    }),
    prisma.orderStatusHistory.create({
      data: {
        orderId,
        status: OrderStatus.PROCESSING,
        note: "Cancellation request rejected by " + userRole.toLowerCase(),
      },
    }),
  ]);

  await createAuditLog({
    userId,
    userRole,
    action: "REJECT_CANCELLATION",
    module: "Orders",
    entityId: orderId,
    newValue: { revertedTo: "PROCESSING" },
  });

  revalidatePath("/dashboard/tailor/orders");
  return { success: true };
}

export async function deleteOrder(orderId: number) {
  try {
    await prisma.order.delete({ where: { id: orderId } });
    revalidatePath("/dashboard/tailor/orders");
    return { success: true };
  } catch {
    return { success: false, error: "Failed to delete order" };
  }
}

export async function getOrderDependencies(tailorId: number) {
  const [customers, products, fabrics, colors, measurements] = await Promise.all([
    prisma.customer.findMany({ select: { id: true, name: true } }),
    prisma.product.findMany({
      where: { userId: tailorId, isAvailable: true },
      select: { id: true, name: true, basePrice: true },
    }),
    prisma.fabric.findMany({
      where: { userId: tailorId, isAvailable: true },
      select: { id: true, name: true },
    }),
    prisma.color.findMany({ select: { id: true, name: true, hexCode: true } }),
    prisma.measurement.findMany({
      where: { createdByUserId: tailorId },
      select: { id: true, label: true },
    }),
  ]);

  return {
    customers,
    products: products.map((p) => ({ ...p, basePrice: Number(p.basePrice) })),
    fabrics,
    colors,
    measurements,
  };
}

export async function createOrder(data: {
  customerId: number;
  productId: number;
  fabricId: number;
  colorId: number;
  measurementId: number;
  tailorId: number;
  totalPrice: number;
  status: OrderStatus;
}) {
  try {
    const order = await prisma.order.create({
      data: {
        customerId: data.customerId,
        productId: data.productId,
        fabricId: data.fabricId,
        colorId: data.colorId,
        measurementId: data.measurementId,
        tailorId: data.tailorId,
        totalPrice: data.totalPrice,
        status: data.status,
        statusHistory: {
          create: { status: data.status, note: "Order created by tailor" },
        },
      },
    });

    await createAuditLog({
      userId: data.tailorId,
      userRole: "TAILOR",
      action: "CREATE_ORDER",
      module: "Orders",
      entityId: order.id,
      newValue: { customerId: data.customerId, totalPrice: data.totalPrice },
    });

    revalidatePath("/dashboard/tailor/orders");
    return { success: true };
  } catch {
    return { success: false, error: "Failed to create order" };
  }
}
