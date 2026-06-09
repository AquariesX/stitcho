import { NextRequest } from "next/server";
import { OrderStatus, PaymentStatus, PreviewView } from "@prisma/client";
import { verifyFirebaseToken } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { estimateDelivery } from "@/lib/delivery-estimation";
import { createAuditLog } from "@/lib/audit-log";
import { apiSuccess, apiError, API_ERRORS } from "@/lib/api-response";
import {
  customizationSnapshot,
  CustomizationError,
  validateCustomization,
} from "@/lib/product-customization";
import { validateMeasurementsForProduct } from "@/lib/measurement-validation";

async function resolveCustomer(uid: string) {
  return prisma.customer.findUnique({ where: { firebaseUid: uid } });
}

export async function GET(request: NextRequest) {
  const { uid, error } = await verifyFirebaseToken(request);
  if (error || !uid) return apiError(API_ERRORS.INVALID_TOKEN, 401);
  const customer = await resolveCustomer(uid);
  if (!customer) return apiError(API_ERRORS.CUSTOMER_NOT_FOUND, 404);

  try {
    const orders = await prisma.order.findMany({
      where: { customerId: customer.id },
      include: {
        product: true,
        fabric: true,
        color: true,
        measurement: true,
        payment: true,
        tailor: { include: { shopProfile: true } },
        orderStyles: {
          include: { styleOption: { include: { style: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return apiSuccess(orders);
  } catch (err) {
    console.error("[API] mobile/orders GET error:", err);
    return apiError(API_ERRORS.SERVER_ERROR, 500);
  }
}

export async function POST(request: NextRequest) {
  const { uid, error } = await verifyFirebaseToken(request);
  if (error || !uid) return apiError(API_ERRORS.INVALID_TOKEN, 401);
  const customer = await resolveCustomer(uid);
  if (!customer) return apiError(API_ERRORS.CUSTOMER_NOT_FOUND, 404);

  try {
    const body = await request.json();
    const {
      productId,
      fabricId,
      colorId,
      measurementId,
      tailorId,
      addressId,
      notes,
      referenceImageUrl,
      paymentMethod = "STRIPE",
      styleOptionIds = [],
    } = body;

    if (!productId || !fabricId || !colorId || !measurementId || !tailorId) {
      return apiError(
        "productId, fabricId, colorId, measurementId, and tailorId are required",
        400
      );
    }
    if (!["STRIPE", "COD"].includes(paymentMethod)) {
      return apiError("paymentMethod must be STRIPE or COD", 400);
    }

    const customization = await validateCustomization({
      productId: Number(productId),
      fabricId: Number(fabricId),
      colorId: Number(colorId),
      styleOptionIds: Array.isArray(styleOptionIds)
        ? styleOptionIds.map(Number)
        : [],
      view: PreviewView.FRONT,
    });

    const [measurement, tailor, address] = await Promise.all([
      prisma.measurement.findUnique({ where: { id: Number(measurementId) } }),
      prisma.user.findUnique({ where: { id: Number(tailorId) } }),
      addressId
        ? prisma.address.findFirst({
            where: { id: Number(addressId), customerId: customer.id },
          })
        : null,
    ]);
    if (!measurement) return apiError("Measurement not found", 404);
    if (!tailor || tailor.role !== "TAILOR" || !tailor.isActive) {
      return apiError("Tailor not found or invalid", 404);
    }
    if (addressId && !address) return apiError("Delivery address not found", 404);

    const measurementValidation = validateMeasurementsForProduct(
      customization.product.productType!,
      {
        scale: measurement.scale,
        neck: measurement.neck?.toNumber(),
        chest: measurement.chest?.toNumber(),
        stomach: measurement.stomach?.toNumber(),
        length: measurement.length?.toNumber(),
        shoulder: measurement.shoulder?.toNumber(),
        sleeve: measurement.sleeve?.toNumber(),
        waist: measurement.waist?.toNumber(),
        hip: measurement.hip?.toNumber(),
        inseam: measurement.inseam?.toNumber(),
        thigh: measurement.thigh?.toNumber(),
        wrist: measurement.wrist?.toNumber(),
      }
    );
    if (!measurementValidation.valid) {
      return apiError(measurementValidation.warnings.join("; "), 400);
    }

    const delivery = await estimateDelivery(Number(tailorId));
    const paymentStatus =
      paymentMethod === "COD"
        ? PaymentStatus.COD_PENDING
        : PaymentStatus.REQUIRES_PAYMENT;

    const order = await prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          customerId: customer.id,
          productId: customization.product.id,
          fabricId: customization.fabricLink.fabricId,
          colorId: customization.colorLink.colorId,
          measurementId: Number(measurementId),
          tailorId: Number(tailorId),
          addressId: address?.id,
          totalPrice: customization.price.total,
          status: OrderStatus.PENDING,
          notes: notes ?? undefined,
          referenceImageUrl: referenceImageUrl ?? undefined,
          paymentMethod,
          estimatedDeliveryDate: delivery.estimatedDeliveryDate,
          previewType: customization.product.previewType,
          previewFrontUrl: customization.product.frontPreviewAsset,
          previewBackUrl: customization.product.backPreviewAsset,
          previewGeneratedAt: new Date(),
          customizationSnapshot: customizationSnapshot(customization),
          statusHistory: {
            create: {
              status: OrderStatus.PENDING,
              note: "Order placed by customer",
            },
          },
          orderStyles: {
            create: customization.selected.map(({ styleOption }) => ({
              styleOptionId: styleOption.id,
            })),
          },
          payment: {
            create: {
              stripePaymentIntentId: "PENDING",
              amount: customization.price.total,
              currency: "PKR",
              status: paymentStatus,
            },
          },
        },
      });
      return created;
    });

    await createAuditLog({
      action: "CREATE_ORDER",
      module: "Orders",
      entityId: order.id,
      newValue: {
        customerId: customer.id,
        tailorId,
        totalPrice: customization.price.total.toFixed(2),
        paymentMethod,
      },
    });

    return apiSuccess(
      {
        orderId: order.id,
        status: order.status,
        totalPrice: customization.price.total.toFixed(2),
        estimatedDelivery: {
          date: delivery.estimatedDeliveryDate,
          label: delivery.label,
        },
        paymentMethod,
        paymentStatus,
      },
      201
    );
  } catch (err) {
    if (err instanceof CustomizationError) return apiError(err.message, err.status);
    console.error("[API] mobile/orders POST error:", err);
    return apiError(API_ERRORS.SERVER_ERROR, 500);
  }
}
