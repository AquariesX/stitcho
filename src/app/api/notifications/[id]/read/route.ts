import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// PATCH /api/notifications/[id]/read
// Marks a notification as read.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const notificationId = parseInt(id, 10);

  if (isNaN(notificationId)) {
    return NextResponse.json({ error: "Invalid notification ID" }, { status: 400 });
  }

  try {
    const notification = await prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });
    return NextResponse.json({ success: true, data: notification });
  } catch {
    return NextResponse.json({ error: "Notification not found" }, { status: 404 });
  }
}
