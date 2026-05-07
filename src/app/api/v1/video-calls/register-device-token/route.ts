import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthContext, requireAuth } from "@/lib/api-context";
import { db } from "@/lib/db";
import { getCorsHeaders } from "@/lib/cors";

const registerDeviceTokenSchema = z.object({
  fcmToken: z.string().min(1, "FCM token is required"),
  deviceType: z.enum(["ios", "android", "web"]).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const ctx = getAuthContext(req);
    requireAuth(ctx);

    const body = await req.json();
    const parsed = registerDeviceTokenSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request body",
          details: parsed.error.flatten(),
        },
        { status: 400, headers: getCorsHeaders() }
      );
    }

    const { fcmToken, deviceType } = parsed.data;

    // Check if token already exists for this user
    const existingToken = await db.deviceToken.findFirst({
      where: {
        userId: ctx!.userId,
        fcmToken: fcmToken,
      },
    });

    if (existingToken) {
      // Update last used timestamp
      await db.deviceToken.update({
        where: { id: existingToken.id },
        data: {
          lastUsedAt: new Date(),
          isActive: true,
        },
      });

      return NextResponse.json(
        {
          success: true,
          message: "Device token already registered",
          data: {
            deviceTokenId: existingToken.id,
          },
        },
        { status: 200, headers: getCorsHeaders() }
      );
    }

    // Create new device token
    const newDeviceToken = await db.deviceToken.create({
      data: {
        userId: ctx!.userId,
        fcmToken: fcmToken,
        deviceType: deviceType || "unknown",
        lastUsedAt: new Date(),
        isActive: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Device token registered successfully",
        data: {
          deviceTokenId: newDeviceToken.id,
        },
      },
      { status: 201, headers: getCorsHeaders() }
    );
  } catch (error) {
    console.error("Error registering device token:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
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
