import { NextRequest } from "next/server";
import { verifyFirebaseToken } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError, API_ERRORS } from "@/lib/api-response";

/**
 * POST /api/mobile/auth/sync
 *
 * Called by Flutter after a customer signs up or logs in via Firebase.
 * Creates or fetches the Customer record in MySQL so the app can use our internal IDs.
 *
 * Body: { name: string, email?: string, phoneNumber?: string, photoUrl?: string }
 * Header: Authorization: Bearer <firebase_id_token>
 */
export async function POST(request: NextRequest) {
  const { uid, error } = await verifyFirebaseToken(request);
  if (error || !uid) return apiError(API_ERRORS.INVALID_TOKEN, 401);

  try {
    const body = await request.json().catch(() => ({}));
    const { name, email, phoneNumber, photoUrl } = body;

    if (!name) return apiError("name is required", 400);

    // Upsert: create if not exists, update if already synced
    const customer = await prisma.customer.upsert({
      where: { firebaseUid: uid },
      update: {
        name,
        email: email ?? undefined,
        phoneNumber: phoneNumber ?? undefined,
        photoUrl: photoUrl ?? undefined,
      },
      create: {
        firebaseUid: uid,
        name,
        email: email ?? undefined,
        phoneNumber: phoneNumber ?? undefined,
        photoUrl: photoUrl ?? undefined,
        isActive: true,
      },
    });

    return apiSuccess({ customerId: customer.id, name: customer.name, email: customer.email });
  } catch (err) {
    console.error("[API] auth/sync error:", err);
    return apiError(API_ERRORS.SERVER_ERROR, 500);
  }
}
