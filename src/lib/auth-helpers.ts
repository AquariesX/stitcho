import { adminAuth } from "@/lib/firebase-admin";
import { NextRequest } from "next/server";

export async function verifyFirebaseToken(request: NextRequest | Request) {
  const authorization = (request as Request).headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return { error: "Missing or invalid Authorization header", uid: null };
  }
  const idToken = authorization.split("Bearer ")[1];
  try {
    const decoded = await adminAuth.verifyIdToken(idToken);
    return { uid: decoded.uid, error: null };
  } catch {
    return { uid: null, error: "Invalid or expired token" };
  }
}
