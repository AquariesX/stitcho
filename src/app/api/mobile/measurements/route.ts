import { NextRequest } from "next/server";
import { verifyFirebaseToken } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { validateMeasurements } from "@/lib/measurement-validation";
import { apiSuccess, apiError, API_ERRORS } from "@/lib/api-response";
import { MeasurementScale, MeasurementType } from "@prisma/client";

/** Resolve Firebase uid → Customer record */
async function resolveCustomer(uid: string) {
  return prisma.customer.findUnique({ where: { firebaseUid: uid } });
}

/**
 * GET /api/mobile/measurements
 * Returns measurements created by this customer's tailor (via their orders).
 * Header: Authorization: Bearer <firebase_id_token>
 */
export async function GET(request: NextRequest) {
  const { uid, error } = await verifyFirebaseToken(request);
  if (error || !uid) return apiError(API_ERRORS.INVALID_TOKEN, 401);

  const customer = await resolveCustomer(uid);
  if (!customer) return apiError(API_ERRORS.CUSTOMER_NOT_FOUND, 404);

  try {
    // Return measurements that appear on this customer's orders
    const orders = await prisma.order.findMany({
      where: { customerId: customer.id },
      select: { measurement: true },
      distinct: ["measurementId"],
    });

    const measurements = orders.map((o) => ({
      ...o.measurement,
      neck: Number(o.measurement.neck),
      chest: Number(o.measurement.chest),
      stomach: Number(o.measurement.stomach),
      length: Number(o.measurement.length),
      shoulder: Number(o.measurement.shoulder),
      sleeve: Number(o.measurement.sleeve),
      waist: o.measurement.waist !== null ? Number(o.measurement.waist) : null,
      hip: o.measurement.hip !== null ? Number(o.measurement.hip) : null,
      inseam: o.measurement.inseam !== null ? Number(o.measurement.inseam) : null,
      thigh: o.measurement.thigh !== null ? Number(o.measurement.thigh) : null,
      coatLength: o.measurement.coatLength !== null ? Number(o.measurement.coatLength) : null,
    }));

    return apiSuccess(measurements);
  } catch (err) {
    console.error("[API] mobile/measurements GET error:", err);
    return apiError(API_ERRORS.SERVER_ERROR, 500);
  }
}

/**
 * POST /api/mobile/measurements
 * Saves a new measurement record. Validates realistic ranges before saving.
 * Header: Authorization: Bearer <firebase_id_token>
 * Body: { label, neck, chest, stomach, length, shoulder, sleeve, scale, type, waist?, hip?, inseam?, thigh?, coatLength? }
 */
export async function POST(request: NextRequest) {
  const { uid, error } = await verifyFirebaseToken(request);
  if (error || !uid) return apiError(API_ERRORS.INVALID_TOKEN, 401);

  // For measurements, we need a tailor (User) account — but customers post measurements too.
  // We store measurements under a "system" userId — find the first admin/tailor or use a special userId.
  // In practice, the tailor creates measurements; customers just reference them.
  // Here we allow customers to submit self-measurements, stored under a system record.
  // We require a tailorId in the body.
  try {
    const body = await request.json();
    const {
      label, neck, chest, stomach, length, shoulder, sleeve,
      scale = "INCH", type = "CUSTOM",
      waist, hip, inseam, thigh, coatLength,
      createdByUserId, // The tailor's userId who manages this measurement
    } = body;

    if (!label || !neck || !chest || !stomach || !length || !shoulder || !sleeve || !createdByUserId) {
      return apiError("label, neck, chest, stomach, length, shoulder, sleeve, and createdByUserId are required", 400);
    }

    // Smart measurement validation
    const validation = validateMeasurements({
      neck: Number(neck),
      chest: Number(chest),
      stomach: Number(stomach),
      shoulder: Number(shoulder),
      sleeve: Number(sleeve),
      length: Number(length),
      waist: waist ? Number(waist) : null,
      hip: hip ? Number(hip) : null,
      inseam: inseam ? Number(inseam) : null,
      thigh: thigh ? Number(thigh) : null,
      coatLength: coatLength ? Number(coatLength) : null,
      scale: scale as "INCH" | "CM",
    });

    if (!validation.valid) {
      return apiError(validation.warnings.join(" | "), 422);
    }

    const measurement = await prisma.measurement.create({
      data: {
        label,
        neck: Number(neck),
        chest: Number(chest),
        stomach: Number(stomach),
        length: Number(length),
        shoulder: Number(shoulder),
        sleeve: Number(sleeve),
        scale: scale as MeasurementScale,
        type: type as MeasurementType,
        waist: waist ? Number(waist) : undefined,
        hip: hip ? Number(hip) : undefined,
        inseam: inseam ? Number(inseam) : undefined,
        thigh: thigh ? Number(thigh) : undefined,
        coatLength: coatLength ? Number(coatLength) : undefined,
        createdByUserId: Number(createdByUserId),
      },
    });

    return apiSuccess({ measurementId: measurement.id }, 201);
  } catch (err) {
    console.error("[API] mobile/measurements POST error:", err);
    return apiError(API_ERRORS.SERVER_ERROR, 500);
  }
}
