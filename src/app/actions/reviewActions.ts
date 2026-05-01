"use server";

import prisma from "@/lib/prisma";
import { OrderStatus } from "@prisma/client";

// MOCK ACTION: Simulates fetching reviews based on actual completed orders
export async function getTailorReviews(tailorId: number) {
    try {
        const completedOrders = await prisma.order.findMany({
            where: {
                product: { userId: tailorId },
                status: {
                    in: [OrderStatus.DELIVERED, OrderStatus.COMPLETED, OrderStatus.READY]
                }
            },
            include: {
                customer: { select: { name: true, photoUrl: true } },
                product: { select: { name: true } }
            },
            orderBy: { updatedAt: 'desc' }
        });

        // Generate realistic simulated reviews mapped to REAL orders
        const reviews = completedOrders.map((order, index) => {
            // Pseudo-random but deterministic star rating based on order ID
            const rating = 5 - (order.id % 2); // 4 or 5 stars

            const comments = [
                "Absolutely stunning craftsmanship. The measurements were spot on and the fabric quality is excellent!",
                "Very fast delivery and professional stitching. Will definitely order again.",
                "The fit is perfect! Thank you for paying attention to the custom shoulder details.",
                "Great work, beautifully packaged. Just a slight delay in delivery but totally worth it.",
                "Exceeded my expectations entirely. The gold threading is a masterpiece."
            ];
            const comment = comments[index % comments.length];

            return {
                id: `rev_${order.id}`,
                orderId: order.id,
                date: order.updatedAt,
                customerName: order.customer.name,
                customerPhoto: order.customer.photoUrl,
                productName: order.product.name,
                rating,
                comment,
                isPublished: true
            };
        });

        return reviews;
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
        throw new Error("Failed to fetch customer reviews");
    }
}
