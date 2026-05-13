import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/tailors
 * Public — returns all active tailors with their shop info.
 * Used by the mobile app for tailor selection during order placement.
 */
export async function GET(_request: NextRequest) {
  try {
    const tailors = await (prisma as any).user.findMany({
      where: { role: "TAILOR" },
      select: {
        id: true,
        name: true,
        email: true,
        shopProfile: {
          select: {
            shopName: true,
            phoneNumber: true,
            city: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ success: true, data: tailors });
  } catch (error: any) {
    console.error("[API] tailors GET error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
