import "server-only";
import { prisma } from "@/lib/prisma";
import { OrderStatus } from "@prisma/client";

// Statuses that count as "active" (occupying the tailor's time)
const ACTIVE_STATUSES: OrderStatus[] = [
  OrderStatus.PROCESSING,
  OrderStatus.CUTTING,
  OrderStatus.STITCHING,
  OrderStatus.READY,
];

export interface DeliveryEstimate {
  activeOrders: number;
  minDays: number;
  maxDays: number;
  estimatedDeliveryDate: Date;
  label: string; // Human-friendly range label e.g. "3–5 days"
}

/**
 * Estimates the delivery window for a tailor based on their current workload.
 *
 * Workload tiers:
 *  - 0–3 active orders  → 3–5 days
 *  - 4–8 active orders  → 6–9 days
 *  - 9+ active orders   → 10–14 days
 */
export async function estimateDelivery(tailorId: number): Promise<DeliveryEstimate> {
  const activeOrders = await prisma.order.count({
    where: {
      tailorId,
      status: { in: ACTIVE_STATUSES },
    },
  });

  let minDays: number;
  let maxDays: number;

  if (activeOrders <= 3) {
    minDays = 3;
    maxDays = 5;
  } else if (activeOrders <= 8) {
    minDays = 6;
    maxDays = 9;
  } else {
    minDays = 10;
    maxDays = 14;
  }

  // Use the midpoint as the stored estimated date
  const avgDays = Math.ceil((minDays + maxDays) / 2);
  const estimatedDeliveryDate = new Date();
  estimatedDeliveryDate.setDate(estimatedDeliveryDate.getDate() + avgDays);

  return {
    activeOrders,
    minDays,
    maxDays,
    estimatedDeliveryDate,
    label: `${minDays}–${maxDays} days`,
  };
}
