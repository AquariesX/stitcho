import { NextRequest } from "next/server";
import { verifyFirebaseToken } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

export async function verifyCustomer(request: NextRequest) {
  const auth = await verifyFirebaseToken(request);
  if (auth.error || !auth.uid) return { error: auth.error, customer: null };
  const customer = await prisma.customer.findUnique({
    where: { firebaseUid: auth.uid },
  });
  if (!customer || !customer.isActive) {
    return { error: "Customer account not found", customer: null };
  }
  return { error: null, customer };
}
