import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthContext, requireAuth, requireRole } from "@/lib/api-context";
import { db } from "@/lib/db";
import { getCorsHeaders } from "@/lib/cors";
import { sendIncomingCallNotification, initializeFirebase, getFirestore } from "@/lib/firebase";

const initiateCallSchema = z.object({
  fcmReceiverDeviceToken: z.string().min(10, "Invalid FCM device token"),
  receiverId: z.string().uuid("Invalid receiver ID (doctor)"),
  callerId: z.string().uuid("Invalid caller ID (patient)"),
  callerName: z.string().min(1, "Caller name is required"),
  channelId: z.string().min(1, "Channel ID is required"),
  agoraCallerToken: z.string().min(1, "Agora caller token is required"),
  agoraReceiverToken: z.string().min(1, "Agora receiver token is required"),
  hospitalId: z.string().uuid("Invalid hospital ID"),
  hospitalName: z.string().min(1, "Hospital name is required"),
  branchId: z.string().uuid("Invalid branch ID"),
  logoUrl: z.string().url("Invalid logo URL").optional(),
});

/**
 * POST /api/v1/video-calls/initiate
 * Patient initiates an incoming video call notification for a doctor
 * - Patient is the CALLER (initiates the call)
 * - Doctor is the RECEIVER (receives push notification)
 * - Stores call data in database with pre-generated tokens
 * - Sends FCM push notification to doctor's device
 *
 * Request body:
 * {
 *   "fcmReceiverDeviceToken": "device-token",
 *   "receiverId": "doctor-uuid",
 *   "callerId": "patient-uuid",
 *   "callerName": "John Doe",
 *   "channelId": "call_channel_id",
 *   "agoraCallerToken": "agora-token",
 *   "agoraReceiverToken": "agora-token",
 *   "hospitalId": "hospital-uuid",
 *   "hospitalName": "St. Ives",
 *   "branchId": "branch-uuid",
 *   "logoUrl": "https://..."
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "messageId": "fcm-message-id",
 *   "message": "Incoming call notification sent successfully"
 * }
 */
export async function POST(req: NextRequest) {
  try {
    // Initialize Firebase before using any services
    initializeFirebase();

    // ✅ Only allow POST
    if (req.method !== "POST") {
      return NextResponse.json(
        {
          success: false,
          message: "Method Not Allowed. Use POST.",
        },
        { status: 405, headers: getCorsHeaders() }
      );
    }

    const ctx = getAuthContext(req);
    requireAuth(ctx);
    requireRole(ctx, ["PATIENT"]);

    const body = await req.json();
    const parsed = initiateCallSchema.safeParse(body);

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

    const {
      fcmReceiverDeviceToken,
      receiverId,
      callerId,
      callerName,
      channelId,
      agoraCallerToken,
      agoraReceiverToken,
      hospitalId,
      hospitalName,
      branchId,
      logoUrl,
    } = parsed.data;

    // Verify authenticated user is the caller (patient)
    if (ctx!.userId !== callerId) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized - caller ID must match authenticated user",
        },
        { status: 403, headers: getCorsHeaders() }
      );
    }

    // Verify hospital matches authenticated user's hospital
    if (hospitalId !== ctx!.hospitalId) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized access - hospital mismatch",
        },
        { status: 403, headers: getCorsHeaders() }
      );
    }

    // Fetch Agora App ID from database
    const agoraConfig = await db.agoraConfig.findFirst();
    const agoraAppId = agoraConfig?.appId || process.env.AGORA_APP_ID || null;
    console.log("📞 Initiate call - Agora AppId from DB:", {
      dbAppId: agoraConfig?.appId,
      receivedAppId: agoraAppId,
      match: agoraAppId === agoraConfig?.appId,
    });

    const timestamp = new Date().toISOString();

    // Create call session for caller (patient)
    const mainData = {
      hospitalId,
      hospitalName,
      branchId,
      logoUrl,
      callerId,
      callerName,
      receiverId,
      channelId,
      agoraAppId,
      agoraCallerToken,
      agoraReceiverToken,
      fcmReceiverDeviceToken,
      sessionId: "0",
      status: "connecting",
      timestamp,
    };

    const sudoData = {
      callerId,
      receiverId,
      channelId,
      agoraAppId,
      agoraReceiverToken,
      fcmReceiverDeviceToken,
      sessionId: "0",
      status: "connecting",
      timestamp,
    };

    const firestore = getFirestore();
    if (!firestore) {
      return NextResponse.json(
        {
          success: false,
          message: "Firebase not configured",
        },
        { status: 500, headers: getCorsHeaders() }
      );
    }

    await firestore.collection("telemedicine").doc(receiverId).set(sudoData);
    await firestore.collection("telemedicine").doc(callerId).set(mainData);

    let messageId: string | null = null;

    // Send FCM notification to doctor
    try {
      messageId = await sendIncomingCallNotification({
        fcmToken: fcmReceiverDeviceToken,
        callerId: callerId,
        callerName: callerName,
        receiverId: receiverId,
        channelId: channelId,
        agoraCallerToken: agoraCallerToken,
        agoraReceiverToken: agoraReceiverToken,
        hospitalId: hospitalId,
        hospitalName: hospitalName,
        branchId: branchId,
        logoUrl: logoUrl,
      });

      console.log("✅ Notification sent successfully", { messageId });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      const errorCode = (error as any)?.code || "UNKNOWN";
      console.error("❌ Error sending FCM notification:", {
        code: errorCode,
        message: errorMsg,
        receiverId: receiverId,
        error,
      });
      // Don't fail the request if notification fails
      // The call can still proceed without notification
      // But log it for monitoring
    }

    return NextResponse.json(
      {
        success: true,
        messageId,
        message: "Incoming call notification sent successfully",
      },
      { status: 200, headers: getCorsHeaders() }
    );
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("❌ Error in initiate video call:", {
      message: errorMsg,
      error,
    });
    return NextResponse.json(
      {
        success: false,
        message: errorMsg || "Internal Server Error",
        code: (error as any)?.code,
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
