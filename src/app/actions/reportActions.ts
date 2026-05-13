"use server";

import prisma from "@/lib/prisma";
import { OrderStatus, PaymentStatus } from "@prisma/client";

// ────────────────────────────────────────────────
// Shared helpers
// ────────────────────────────────────────────────

function dateRange(from?: string, to?: string) {
  const filter: any = {};
  if (from) filter.gte = new Date(from);
  if (to) {
    const d = new Date(to);
    d.setHours(23, 59, 59, 999);
    filter.lte = d;
  }
  return Object.keys(filter).length > 0 ? filter : undefined;
}

// ────────────────────────────────────────────────
// ADMIN REPORTS
// ────────────────────────────────────────────────

/** Summary cards — total revenue, orders, customers, tailors */
export async function getAdminSummary() {
  const paidPayments = await prisma.payment.aggregate({
    where: { status: PaymentStatus.PAID },
    _sum: { amount: true },
  });
  const totalOrders = await prisma.order.count();
  const totalCustomers = await prisma.customer.count();
  const totalTailors = await prisma.user.count({ where: { role: "TAILOR" } });
  const recentOrders = await prisma.order.count({
    where: {
      createdAt: {
        gte: new Date(new Date().setDate(new Date().getDate() - 30)),
      },
    },
  });

  return {
    totalRevenue: Number(paidPayments._sum.amount ?? 0),
    totalOrders,
    totalCustomers,
    totalTailors,
    recentOrders,
  };
}

/** Orders grouped by status */
export async function getOrdersByStatus(dateFrom?: string, dateTo?: string) {
  const createdAt = dateRange(dateFrom, dateTo);
  const statuses = Object.values(OrderStatus);
  const counts: number[] = [];
  for (const s of statuses) {
    counts.push(
      await prisma.order.count({ where: { status: s, ...(createdAt ? { createdAt } : {}) } })
    );
  }
  return statuses.map((s, i) => ({ status: s, count: counts[i] }));
}

/** Revenue grouped by day (last N days) */
export async function getDailyRevenue(days = 30) {
  const from = new Date();
  from.setDate(from.getDate() - days);
  from.setHours(0, 0, 0, 0);

  const payments = await prisma.payment.findMany({
    where: {
      status: PaymentStatus.PAID,
      createdAt: { gte: from },
    },
    select: { amount: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  // Group by date string
  const map: Record<string, number> = {};
  for (const p of payments) {
    const day = p.createdAt.toISOString().split("T")[0];
    map[day] = (map[day] ?? 0) + Number(p.amount);
  }

  return Object.entries(map).map(([date, revenue]) => ({ date, revenue }));
}

/** Most ordered products */
export async function getTopProducts(limit = 10) {
  const results = await prisma.order.groupBy({
    by: ["productId"],
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
    take: limit,
  });

  const productIds = results.map((r) => r.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, name: true },
  });

  return results.map((r) => ({
    productId: r.productId,
    name: products.find((p) => p.id === r.productId)?.name ?? "Unknown",
    orderCount: r._count.id,
  }));
}

/** Most used fabrics */
export async function getTopFabrics(limit = 10) {
  const results = await prisma.order.groupBy({
    by: ["fabricId"],
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
    take: limit,
  });

  const fabricIds = results.map((r) => r.fabricId);
  const fabrics = await prisma.fabric.findMany({
    where: { id: { in: fabricIds } },
    select: { id: true, name: true },
  });

  return results.map((r) => ({
    fabricId: r.fabricId,
    name: fabrics.find((f) => f.id === r.fabricId)?.name ?? "Unknown",
    orderCount: r._count.id,
  }));
}

/** Tailor performance: completed, cancelled, total orders + avg days */
export async function getTailorPerformance() {
  const tailors = await prisma.user.findMany({
    where: { role: "TAILOR" },
    select: {
      id: true,
      name: true,
      shopProfile: { select: { shopName: true } },
    },
  });

  const performance: any[] = [];
  for (const t of tailors) {
    const total = await prisma.order.count({ where: { tailorId: t.id } });
    const completed = await prisma.order.count({ where: { tailorId: t.id, status: OrderStatus.COMPLETED } });
    const cancelled = await prisma.order.count({ where: { tailorId: t.id, status: OrderStatus.CANCELLED } });
    const pending = await prisma.order.count({
      where: {
        tailorId: t.id,
        status: {
          in: [OrderStatus.PENDING, OrderStatus.PROCESSING, OrderStatus.CUTTING, OrderStatus.STITCHING],
        },
      },
    });

    performance.push({
      tailorId: t.id,
      name: t.shopProfile?.shopName ?? t.name,
      total,
      completed,
      cancelled,
      pending,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
    });
  }

  return performance;
}

/** New customers over time */
export async function getCustomerGrowth(days = 30) {
  const from = new Date();
  from.setDate(from.getDate() - days);

  const customers = await prisma.customer.findMany({
    where: { createdAt: { gte: from } },
    select: { createdAt: true },
  });

  const map: Record<string, number> = {};
  for (const c of customers) {
    const day = c.createdAt.toISOString().split("T")[0];
    map[day] = (map[day] ?? 0) + 1;
  }
  return Object.entries(map).map(([date, count]) => ({ date, count }));
}

// ────────────────────────────────────────────────
// TAILOR ANALYTICS
// ────────────────────────────────────────────────

/** Tailor's own summary */
export async function getTailorAnalytics(tailorId: number) {
  const totalOrders = await prisma.order.count({ where: { tailorId } });
  const pendingOrders = await prisma.order.count({
    where: {
      tailorId,
      status: { in: [OrderStatus.PENDING, OrderStatus.PROCESSING, OrderStatus.CUTTING, OrderStatus.STITCHING] },
    },
  });
  const completedOrders = await prisma.order.count({ where: { tailorId, status: OrderStatus.COMPLETED } });
  const cancelledOrders = await prisma.order.count({ where: { tailorId, status: OrderStatus.CANCELLED } });
  const paidPayments = await prisma.payment.findMany({
    where: {
      status: PaymentStatus.PAID,
      order: { tailorId },
    },
    select: { amount: true },
  });

  const totalRevenue = paidPayments.reduce((sum, p) => sum + Number(p.amount), 0);

  return {
    totalOrders,
    pendingOrders,
    completedOrders,
    cancelledOrders,
    totalRevenue,
  };
}

/** Tailor's fabric usage */
export async function getTailorFabricUsage(tailorId: number, limit = 5) {
  const results = await prisma.order.groupBy({
    by: ["fabricId"],
    where: { tailorId },
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
    take: limit,
  });

  const fabricIds = results.map((r) => r.fabricId);
  const fabrics = await prisma.fabric.findMany({
    where: { id: { in: fabricIds } },
    select: { id: true, name: true },
  });

  return results.map((r) => ({
    name: fabrics.find((f) => f.id === r.fabricId)?.name ?? "Unknown",
    count: r._count.id,
  }));
}
