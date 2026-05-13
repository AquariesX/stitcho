import { NextResponse } from "next/server";

/** Standard success response */
export function apiSuccess<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

/** Standard error response */
export function apiError(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status });
}

export const API_ERRORS = {
  UNAUTHORIZED: "Missing or invalid Authorization header",
  FORBIDDEN: "Access denied",
  NOT_FOUND: "Resource not found",
  SERVER_ERROR: "Internal server error",
  INVALID_TOKEN: "Invalid or expired Firebase token",
  CUSTOMER_NOT_FOUND: "Customer account not found. Please register first.",
} as const;
