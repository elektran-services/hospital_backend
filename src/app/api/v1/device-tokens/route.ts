import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthContext, requireAuth, requireRole } from "@/lib/api-context";
import { db } from "@/lib/db";
import { getCorsHeaders } from "@/lib/cors";

const deviceTokenSchema = z.object({
  fcmToken: z.string().min(10, "Invalid FCM device token"),
  deviceType: z.string().optional().default("unknown"),
});

/**
 * POST /api/v1/device-tokens
 * Save or update FCM device token for authenticated user
 * - Doctors and Patients can register their device tokens
 * - Used for sending push notifications
 *
 * Request body:
 * {
 *   "fcmToken": "device-token-string",
 *   "deviceType": "ios|android|web" (optional, defaults to "unknown")
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "id": "token-id",
 *     "userId": "user-id",
 *     "fcmToken": "token-string",
 *     "deviceType": "ios",
 *     "isActive": true,
 *     "createdAt": "2025-03-10T12:00:00Z",
 *     "updatedAt": "2025-03-10T12:00:00Z"
 *   },
 *   "message": "Device token saved successfully"
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const ctx = getAuthContext(req);
    requireAuth(ctx);
    requireRole(ctx, ["DOCTOR", "PATIENT"]);

    const body = await req.json();
    const parsed = deviceTokenSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid request body",
          details: parsed.error.flatten(),
        },
        { status: 400, headers: getCorsHeaders() }
      );
    }

    const { fcmToken, deviceType } = parsed.data;

    // Check if device token already exists for this user
    const existingToken = await db.deviceToken.findFirst({
      where: {
        userId: ctx!.userId,
        fcmToken,
      },
    });

    let deviceToken;

    if (existingToken) {
      // Update existing token
      deviceToken = await db.deviceToken.update({
        where: { id: existingToken.id },
        data: {
          deviceType,
          isActive: true,
          lastUsedAt: new Date(),
        },
      });
    } else {
      // Create new device token
      deviceToken = await db.deviceToken.create({
        data: {
          userId: ctx!.userId,
          fcmToken,
          deviceType,
          isActive: true,
        },
      });
    }

    return NextResponse.json(
      {
        success: true,
        data: deviceToken,
        message: "Device token saved successfully",
      },
      { status: 200, headers: getCorsHeaders() }
    );
  } catch (error) {
    console.error("❌ Error saving device token:", error);
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : "Internal Server Error",
      },
      { status: 500, headers: getCorsHeaders() }
    );
  }
}

/**
 * DELETE /api/v1/device-tokens?fcmToken=...
 * Deactivate or remove a device token
 *
 * Query parameters:
 * - fcmToken: The FCM token to remove (required)
 *
 * Response:
 * {
 *   "success": true,
 *   "message": "Device token removed successfully"
 * }
 */
export async function DELETE(req: NextRequest) {
  try {
    const ctx = getAuthContext(req);
    requireAuth(ctx);
    requireRole(ctx, ["DOCTOR", "PATIENT"]);

    const fcmToken = req.nextUrl.searchParams.get("fcmToken");

    if (!fcmToken) {
      return NextResponse.json(
        {
          success: false,
          message: "fcmToken query parameter is required",
        },
        { status: 400, headers: getCorsHeaders() }
      );
    }

    const deviceToken = await db.deviceToken.findFirst({
      where: {
        userId: ctx!.userId,
        fcmToken,
      },
    });

    if (!deviceToken) {
      return NextResponse.json(
        {
          success: false,
          message: "Device token not found",
        },
        { status: 404, headers: getCorsHeaders() }
      );
    }

    await db.deviceToken.delete({
      where: { id: deviceToken.id },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Device token removed successfully",
      },
      { status: 200, headers: getCorsHeaders() }
    );
  } catch (error) {
    console.error("❌ Error removing device token:", error);
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : "Internal Server Error",
      },
      { status: 500, headers: getCorsHeaders() }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: getCorsHeaders(),
  });
}
