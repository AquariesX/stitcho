"use server";

import prisma from "@/lib/prisma";

export async function getAuditLogs({
  userId,
  module,
  action,
  dateFrom,
  dateTo,
  limit = 50,
  offset = 0,
}: {
  userId?: number;
  module?: string;
  action?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
}) {
  try {
    const where: any = {};

    if (userId) where.userId = userId;
    if (module) where.module = module;
    if (action) where.action = { contains: action };
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) {
        const to = new Date(dateTo);
        to.setHours(23, 59, 59, 999);
        where.createdAt.lte = to;
      }
    }

    const [logs, totalCount] = await Promise.all([
      (prisma as any).auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      (prisma as any).auditLog.count({ where }),
    ]);

    // Serialize dates
    const serialized = logs.map((log: any) => ({
      ...log,
      createdAt: log.createdAt.toISOString(),
    }));

    return { success: true, data: serialized, totalCount };
  } catch (error: any) {
    console.error("Failed to fetch audit logs:", error);
    return { success: false, data: [], totalCount: 0, error: error.message };
  }
}

/** Get distinct module names for filter dropdown */
export async function getAuditModules() {
  try {
    const modules = await (prisma as any).auditLog.findMany({
      select: { module: true },
      distinct: ["module"],
    });
    return modules.map((m: any) => m.module as string);
  } catch {
    return [];
  }
}
