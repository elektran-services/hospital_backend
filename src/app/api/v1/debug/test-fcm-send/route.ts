import { NextRequest, NextResponse } from "next/server";
import { getCorsHeaders } from "@/lib/cors";

export async function POST(req: NextRequest) {
  const logs: string[] = [];

  try {
    logs.push("1. Getting request body...");
    const { fcmToken } = await req.json();

    if (!fcmToken) {
      logs.push("❌ fcmToken is required");
      return NextResponse.json(
        { logs, error: "fcmToken required" },
        { status: 400, headers: getCorsHeaders() }
      );
    }

    logs.push(`✅ FCM Token received (${fcmToken.length} chars)`);
    logs.push(`   Token start: ${fcmToken.substring(0, 50)}...`);

    logs.push("2. Initializing Firebase...");
    const { initializeFirebase, getMessaging } = await import("@/lib/firebase");

    const app = initializeFirebase();
    logs.push(app ? "✅ Firebase initialized" : "❌ Firebase init failed");

    const messaging = getMessaging();
    logs.push(messaging ? "✅ Got messaging instance" : "❌ Failed to get messaging");

    if (!messaging) {
      return NextResponse.json(
        { logs, error: "Messaging not available" },
        { status: 500, headers: getCorsHeaders() }
      );
    }

    logs.push("3. Preparing test message...");
    const payload = {
      token: fcmToken,
      notification: {
        title: "Test from Hospital SaaS",
        body: "Firebase is working!",
      },
      data: {
        test: "true",
        timestamp: new Date().toISOString(),
      },
    };

    logs.push("4. Sending message...");
    console.log("📤 About to send FCM message...",{
      token: fcmToken.substring(0, 50),
      hasNotification: !!payload.notification,
      hasData: !!payload.data,
    });

    let messageId: string;
    try {
      messageId = await messaging.send(payload as any);
      logs.push(`✅ Message sent successfully!`);
      logs.push(`   Message ID: ${messageId}`);
    } catch (sendError) {
      const err = sendError as any;
      const errorCode = err?.code || err?.errorInfo?.code || "UNKNOWN";
      const errorMsg = err?.message || err?.errorInfo?.message || String(sendError);

      logs.push(`❌ Error sending message:`);
      logs.push(`   Code: ${errorCode}`);
      logs.push(`   Message: ${errorMsg}`);
      logs.push(`   Full error: ${JSON.stringify(err, null, 2).substring(0, 500)}`);

      // Provide specific guidance based on error code
      if (errorCode.includes("UNAUTHENTICATED") || errorCode.includes("authentication")) {
        logs.push("\n🔍 DEBUGGING UNAUTHENTICATED ERROR:");
        logs.push("   This means the service account lacks FCM permissions.");
        logs.push("   Fix:");
        logs.push("   1. Go to Google Cloud Console");
        logs.push("   2. Project: healthique-bf625");
        logs.push("   3. IAM → firebase-adminsdk-fbsvc@... service account");
        logs.push("   4. Edit → Grant 'Firebase Admin' or 'Editor' role");
        logs.push("   5. Save and wait 30 seconds for permissions to propagate");
      } else if (errorCode.includes("INVALID_ARGUMENT")) {
        logs.push("\n🔍 ERROR: Invalid FCM token");
        logs.push("   Possible causes:");
        logs.push("   - Token is malformed");
        logs.push("   - Token is for a different Firebase project");
        logs.push("   - Device has unregistered");
      }

      throw sendError;
    }

    return NextResponse.json(
      {
        logs,
        status: "Message sent successfully",
        messageId,
      },
      { headers: getCorsHeaders() }
    );
  } catch (error) {
    logs.push(`\n❌ Exception: ${error instanceof Error ? error.message : String(error)}`);
    return NextResponse.json(
      { logs, error: String(error) },
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
