import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Next.js Middleware — lightweight dashboard protection.
 *
 * Checks for a persisted "userRole" cookie or header to guard /dashboard routes.
 * Because middleware runs on Edge Runtime (no Prisma/Firebase Admin), it only
 * checks for the presence of auth signals; the real verification happens in
 * Server Actions / API route handlers using Firebase Admin SDK.
 *
 * Flow:
 *  1. If user visits /dashboard without a session → redirect to /login.
 *  2. If user already on /login and has session → redirect to /dashboard.
 *  3. Customer role → blocked from /dashboard, redirect to /.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Read persisted auth signals (set as cookies at login time for SSR)
  const userRole = request.cookies.get("userRole")?.value;
  const hasSession = !!userRole;

  // Protect all /dashboard routes
  if (pathname.startsWith("/dashboard")) {
    if (!hasSession) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Customers must NOT access the dashboard
    if (userRole === "customer") {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  // If already logged-in admin/tailor tries to visit /login → bounce to dashboard
  if (pathname === "/login" && hasSession && userRole !== "customer") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Only run middleware on dashboard and login routes
  matcher: ["/dashboard/:path*", "/login"],
};
