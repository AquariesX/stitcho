"use server";

import prisma from "@/lib/prisma";
import { PaymentStatus } from "@prisma/client";

export async function getTailorFinances(tailorId: number) {
    try {
        const orders = await prisma.order.findMany({
            where: {
                product: { userId: tailorId }
            },
            include: {
                payment: true,
                product: { select: { name: true } },
                customer: { select: { name: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        let totalEarnings = 0;
        let pendingEarnings = 0;
        
        const payments = orders.map(order => {
            const amount = Number(order.totalPrice);
            const status = order.payment?.status || PaymentStatus.REQUIRES_PAYMENT;
            const stripeId = order.payment?.stripePaymentIntentId || "CASH_OR_PENDING";
            
            if (status === PaymentStatus.PAID) {
                totalEarnings += amount;
            } else {
                pendingEarnings += amount;
            }

            return {
                orderId: order.id,
                date: order.createdAt,
                customer: order.customer.name,
                product: order.product.name,
                amount: amount,
                currency: order.payment?.currency || "PKR",
                status: status,
                stripeId: stripeId
            };
        });

        return {
            totalEarnings,
            pendingEarnings,
            payments
        };
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
        throw new Error("Failed to fetch financial records");
    }
}
