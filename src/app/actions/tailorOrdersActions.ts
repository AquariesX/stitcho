"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { OrderStatus } from "@prisma/client";

export async function getTailorOrders(tailorId: number) {
    try {
        const orders = await prisma.order.findMany({
            where: {
                product: {
                    userId: tailorId
                }
            },
            include: {
                customer: true,
                product: true,
                fabric: true,
                color: true,
                measurement: true
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
            fabric: { ...order.fabric, price: Number(order.fabric.price) },
        }));
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
        throw new Error("Failed to fetch orders");
    }
}

export async function updateOrderStatus(orderId: number, status: OrderStatus) {
    try {
        await prisma.order.update({
            where: { id: orderId },
            data: { status }
        });
        revalidatePath('/dashboard/tailor/orders');
        return { success: true };
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
        return { success: false, error: "Failed to update status" };
    }
}

export async function deleteOrder(orderId: number) {
    try {
        await prisma.order.delete({
            where: { id: orderId }
        });
        revalidatePath('/dashboard/tailor/orders');
        return { success: true };
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
        return { success: false, error: "Failed to delete order" };
    }
}

export async function getOrderDependencies(tailorId: number) {
    try {
        const [customers, products, fabrics, colors, measurements] = await Promise.all([
            prisma.customer.findMany({ select: { id: true, name: true } }),
            prisma.product.findMany({ where: { userId: tailorId }, select: { id: true, name: true, basePrice: true } }),
            prisma.fabric.findMany({ select: { id: true, name: true } }),
            prisma.color.findMany({ select: { id: true, name: true, hexCode: true } }),
            prisma.measurement.findMany({ select: { id: true, label: true } })
        ]);
        
        return {
            customers,
            products: products.map(p => ({ ...p, basePrice: Number(p.basePrice) })),
            fabrics,
            colors,
            measurements
        };
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
        throw new Error("Failed to fetch order dependencies");
    }
}

export async function createOrder(data: {
    customerId: number;
    productId: number;
    fabricId: number;
    colorId: number;
    measurementId: number;
    totalPrice: number;
    status: OrderStatus;
}) {
    try {
        await prisma.order.create({
            data: {
                customerId: data.customerId,
                productId: data.productId,
                fabricId: data.fabricId,
                colorId: data.colorId,
                measurementId: data.measurementId,
                totalPrice: data.totalPrice,
                status: data.status
            }
        });
        revalidatePath('/dashboard/tailor/orders');
        return { success: true };
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
        return { success: false, error: "Failed to create order" };
    }
}
