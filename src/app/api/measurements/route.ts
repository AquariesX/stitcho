import { verifyFirebaseToken } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { MeasurementScale, MeasurementType } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

// GET /api/measurements?type=STANDARD
// Returns measurements. Defaults to STANDARD if no type query param is given.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type")?.toUpperCase();

  const whereClause: any = {
    type: type === "CUSTOM" ? MeasurementType.CUSTOM : MeasurementType.STANDARD,
  };

  const measurements = await prisma.measurement.findMany({
    where: whereClause,
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ success: true, data: measurements });
}

// POST /api/measurements
// Body: { label, neck, chest, stomach, length, shoulder, sleeve, waist?, hip?, inseam?, thigh?, coatLength?, scale? }
// Creates a CUSTOM measurement. Requires auth token.
// Uses the first admin/tailor as createdByUserId (FYP limitation of current schema).
export async function POST(request: NextRequest) {
  const { uid, error: authError } = await verifyFirebaseToken(request);
  if (authError || !uid) {
    return NextResponse.json({ error: authError }, { status: 401 });
  }

  const body = await request.json();
  const { label, neck, chest, stomach, length, shoulder, sleeve, waist, hip, inseam, thigh, coatLength, scale } = body;

  if (!neck || !chest || !stomach || !length || !shoulder || !sleeve) {
    return NextResponse.json(
      { error: "neck, chest, stomach, length, shoulder, and sleeve are required" },
      { status: 400 }
    );
  }

  // Use any admin/tailor as the system creator for custom measurements
  const systemUser = await prisma.user.findFirst({
    where: { role: { in: ["ADMIN", "TAILOR"] } },
    orderBy: { id: "asc" },
  });

  if (!systemUser) {
    return NextResponse.json(
      { error: "No tailor/admin user found to associate with measurement" },
      { status: 500 }
    );
  }

  const measurement = await prisma.measurement.create({
    data: {
      label: label || "Custom",
      neck: parseFloat(neck),
      chest: parseFloat(chest),
      stomach: parseFloat(stomach),
      length: parseFloat(length),
      shoulder: parseFloat(shoulder),
      sleeve: parseFloat(sleeve),
      waist: waist ? parseFloat(waist) : null,
      hip: hip ? parseFloat(hip) : null,
      inseam: inseam ? parseFloat(inseam) : null,
      thigh: thigh ? parseFloat(thigh) : null,
      coatLength: coatLength ? parseFloat(coatLength) : null,
      scale: (scale as MeasurementScale) || MeasurementScale.INCH,
      type: MeasurementType.CUSTOM,
      createdByUserId: systemUser.id,
    },
  });

  return NextResponse.json({ success: true, data: measurement }, { status: 201 });
}
