import { prisma } from "@/lib/prisma";
import { verifyFirebaseToken } from "@/lib/auth-helpers";
import { NextRequest, NextResponse } from "next/server";

// GET /api/payments/history
// Header: Authorization: Bearer <firebase_id_token>
// Query: ?page=1&limit=20
//
// Returns the customer's payment history. All amounts are in USD.

export async function GET(request: NextRequest) {
  const { uid, error: authError } = await verifyFirebaseToken(request);
  if (authError || !uid) {
    return NextResponse.json({ error: authError }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));
  const skip = (page - 1) * limit;

  const customer = await prisma.customer.findUnique({ where: { firebaseUid: uid } });
  if (!customer) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }

  const [payments, total] = await prisma.$transaction([
    prisma.payment.findMany({
      where: { order: { customerId: customer.id } },
      include: {
        order: {
          select: {
            id: true,
            status: true,
            createdAt: true,
            product: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.payment.count({ where: { order: { customerId: customer.id } } }),
  ]);

  return NextResponse.json({
    data: payments.map((p) => ({
      paymentId: p.id,
      orderId: p.orderId,
      orderStatus: p.order.status,
      productName: p.order.product.name,
      amount: Number(p.amount),
      currency: p.currency,
      paymentStatus: p.status,
      stripePaymentIntentId: p.stripePaymentIntentId,
      createdAt: p.createdAt,
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}
