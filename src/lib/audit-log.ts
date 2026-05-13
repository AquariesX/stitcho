import "server-only";
import { prisma } from "@/lib/prisma";

export interface AuditLogPayload {
  userId?: number;
  userRole?: string;
  action: string;
  module: string;
  entityId?: number;
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  ipAddress?: string;
}

/**
 * Creates an immutable audit log entry. Call this after every important
 * create / update / delete in server actions and API routes.
 *
 * @example
 * await createAuditLog({
 *   userId: 5,
 *   userRole: "TAILOR",
 *   action: "UPDATE_ORDER_STATUS",
 *   module: "Orders",
 *   entityId: 42,
 *   oldValue: { status: "CUTTING" },
 *   newValue: { status: "STITCHING" },
 * });
 */
export async function createAuditLog(payload: AuditLogPayload): Promise<void> {
  try {
    await (prisma as any).auditLog.create({
      data: {
        userId: payload.userId ?? null,
        userRole: payload.userRole ?? null,
        action: payload.action,
        module: payload.module,
        entityId: payload.entityId ?? null,
        oldValue: payload.oldValue ?? undefined,
        newValue: payload.newValue ?? undefined,
        ipAddress: payload.ipAddress ?? null,
      },
    });
  } catch (err) {
    // Never let audit logging crash the main flow — just log to server console.
    console.error("[AuditLog] Failed to write audit log:", err);
  }
}
