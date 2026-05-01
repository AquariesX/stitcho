"use server";

import prisma from "@/lib/prisma";
import { PaymentStatus } from "@prisma/client";

export type AdminPaymentRow = {
  paymentId: number;
  orderId: number;
  stripePaymentIntentId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  orderStatus: string;
  customerName: string;
  customerEmail: string | null;
  productName: string;
  createdAt: Date;
  updatedAt: Date;
};

export type AdminPaymentStats = {
  totalRevenue: number;
  totalCount: number;
  paidCount: number;
  pendingCount: number;
  failedCount: number;
};

export async function getAdminPayments(): Promise<{
  payments: AdminPaymentRow[];
  stats: AdminPaymentStats;
}> {
  const payments = await prisma.payment.findMany({
    include: {
      order: {
        include: {
          customer: { select: { name: true, email: true } },
          product: { select: { name: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  let totalRevenue = 0;
  let paidCount = 0;
  let pendingCount = 0;
  let failedCount = 0;

  const rows: AdminPaymentRow[] = payments.map((p) => {
    const amount = Number(p.amount);
    if (p.status === PaymentStatus.PAID) { totalRevenue += amount; paidCount++; }
    else if (p.status === PaymentStatus.REQUIRES_PAYMENT) pendingCount++;
    else failedCount++;

    return {
      paymentId: p.id,
      orderId: p.orderId,
      stripePaymentIntentId: p.stripePaymentIntentId,
      amount,
      currency: p.currency,
      status: p.status,
      orderStatus: p.order.status,
      customerName: p.order.customer.name,
      customerEmail: p.order.customer.email,
      productName: p.order.product.name,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    };
  });

  return {
    payments: rows,
    stats: {
      totalRevenue,
      totalCount: rows.length,
      paidCount,
      pendingCount,
      failedCount,
    },
  };
}
