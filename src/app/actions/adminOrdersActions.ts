"use server";

import prisma from "@/lib/prisma";

export async function getAllOrders() {
    try {
        const orders = await prisma.order.findMany({
            include: {
                customer: { select: { id: true, name: true, email: true } },
                product: { select: { id: true, name: true, basePrice: true } },
            },
            orderBy: {
                createdAt: 'desc'
            }
        });
        
        // Serialize decimals to numbers safely for client
        return orders.map(order => ({
            ...order,
            totalPrice: Number(order.totalPrice),
            product: { ...order.product, basePrice: Number(order.product.basePrice) },
        }));
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
        throw new Error("Failed to fetch admin orders");
    }
}
