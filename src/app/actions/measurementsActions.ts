"use server";

import prisma from "@/lib/prisma";
import { MeasurementType, MeasurementScale } from "@prisma/client";

export async function getMeasurements(userId: number) {
    try {
        const measurements = await prisma.measurement.findMany({
            where: { createdByUserId: userId },
            orderBy: { createdAt: 'desc' },
            include: {
                orders: {
                    include: { customer: true }
                }
            }
        });
        
        // Serialize decimals to numbers safely for client
        return measurements.map(m => ({
            ...m,
            neck: Number(m.neck),
            chest: Number(m.chest),
            stomach: Number(m.stomach),
            length: Number(m.length),
            shoulder: Number(m.shoulder),
            sleeve: Number(m.sleeve),
        }));
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
        throw new Error("Failed to fetch measurements");
    }
}

export async function createMeasurement(userId: number, data: any) {
    try {
        const measurement = await prisma.measurement.create({
            data: {
                label: data.label,
                neck: data.neck,
                chest: data.chest,
                stomach: data.stomach,
                length: data.length,
                shoulder: data.shoulder,
                sleeve: data.sleeve,
                scale: data.scale || MeasurementScale.INCH,
                type: data.type || MeasurementType.STANDARD,
                createdByUserId: userId
            }
        });
        return { success: true, id: measurement.id };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function updateMeasurement(id: number, data: any) {
    try {
        await prisma.measurement.update({
            where: { id },
            data: {
                label: data.label,
                neck: data.neck,
                chest: data.chest,
                stomach: data.stomach,
                length: data.length,
                shoulder: data.shoulder,
                sleeve: data.sleeve,
                scale: data.scale,
                type: data.type
            }
        });
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function deleteMeasurement(id: number) {
    try {
        // Warning: This will fail if orders are linked due to Restrict relation.
        // Usually, we should soft delete or block deletion if orders exist.
        await prisma.measurement.delete({
            where: { id }
        });
        return { success: true };
    } catch (error: any) {
        return { success: false, error: "Cannot delete measurement. It is currently locked and linked to active Orders." };
    }
}
