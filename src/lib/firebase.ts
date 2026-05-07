import * as admin from "firebase-admin";

/**
 * Initialize Firebase Admin SDK
 * Should only be called once per application lifetime
 */

function getServiceAccountJson(): string | null {
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!json) {
    console.warn(
      "⚠️  FIREBASE_SERVICE_ACCOUNT_JSON not set. Firebase features will be disabled."
    );
    return null;
  }
  return json;
}

export function initializeFirebase() {
  // Check if Firebase is already initialized
  if (admin.apps.length > 0) {
    console.log("✅ Firebase Admin already initialized");
    return admin.app();
  }

  const serviceAccountJson = getServiceAccountJson();
  if (!serviceAccountJson) {
    return null;
  }

  try {
    let serviceAccountStr = serviceAccountJson;
    
    // Remove surrounding quotes if present (from .env.local parsing)
    if (serviceAccountStr.startsWith("'") && serviceAccountStr.endsWith("'")) {
      serviceAccountStr = serviceAccountStr.slice(1, -1);
    }
    
    // Parse the JSON
    const serviceAccount = JSON.parse(serviceAccountStr);

    // Validate service account structure
    if (!serviceAccount.private_key || !serviceAccount.client_email || !serviceAccount.project_id) {
      console.error("❌ Invalid service account: missing required fields (private_key, client_email, or project_id)");
      console.error("Service account has:", Object.keys(serviceAccount).join(", "));
      return null;
    }

    // Fix: Handle escaped newlines in private_key (\n as literal characters)
    // This fixes the issue where \n in .env.local becomes literal \n instead of actual newlines
    if (typeof serviceAccount.private_key === "string") {
      serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, "\n");
      console.log("✅ Fixed private key newlines");
    }

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id,
    });

    console.log("✅ Firebase Admin initialized successfully for project:", serviceAccount.project_id);
    return admin.app();
  } catch (error) {
    console.error("❌ Failed to initialize Firebase - Details:", {
      message: error instanceof Error ? error.message : String(error),
      error,
    });
    return null;
  }
}

/**
 * Get or initialize Firebase instance
 */
export function getFirebaseApp() {
  if (admin.apps.length > 0) {
    return admin.app();
  }
  return initializeFirebase();
}

export function getFirestore() {
  const serviceAccountJson = getServiceAccountJson();
  if (!serviceAccountJson) {
    console.error("Firebase service account not configured");
    return null;
  }
  
  // Ensure Firebase is initialized first
  const app = getFirebaseApp();
  if (!app) {
    console.error("Failed to initialize Firebase app - cannot create Firestore instance");
    return null;
  }
  
  return admin.firestore(app);
}

export function getMessaging() {
  const app = getFirebaseApp();
  if (!app) {
    console.error("Firebase app not initialized - cannot create Messaging instance");
    return null;
  }
  return admin.messaging(app);
}

/**
 * Send incoming call notification via FCM
 */
export async function sendIncomingCallNotification(params: {
  fcmToken: string;
  callerId: string;
  callerName: string;
  receiverId: string;
  channelId: string;
  agoraCallerToken: string;
  agoraReceiverToken: string;
  hospitalId: string;
  hospitalName: string;
  branchId: string;
  logoUrl?: string;
}) {
  try {
    // Validate FCM token format
    if (!params.fcmToken || params.fcmToken.length < 10) {
      throw new Error("Invalid FCM token provided");
    }

    const messaging = getMessaging();
    if (!messaging) {
      throw new Error("Firebase Messaging not available - initialization may have failed");
    }

    const payload = {
      token: params.fcmToken,
      data: {
        type: "incoming_call",
        callerId: params.callerId,
        callerName: params.callerName,
        receiverId: params.receiverId,
        channelId: params.channelId,
        agoraCallerToken: params.agoraCallerToken,
        agoraReceiverToken: params.agoraReceiverToken,
        hospitalId: params.hospitalId,
        hospitalName: params.hospitalName,
        branchId: params.branchId,
        logoUrl: params.logoUrl || "",
        sessionId: "0",
        timestamp: new Date().toISOString(),
      },
      
      android: {
        priority: "high" as const,
        notification: {
          channelId: "incoming_calls",
          title: "Incoming Call",
          body: `Call from ${params.callerName}`,
          sound: "default",
          clickAction: "FLUTTER_NOTIFICATION_CLICK",
        },
      },
      apns: {
        payload: {
          aps: {
            alert: {
              title: "Incoming Call",
              body: `Call from ${params.callerName}`,
            },
            sound: "default",
            badge: 1,
            "content-available": 1,
          },
        },
      },
      webpush: {
        notification: {
          title: "Incoming Call",
          body: `Call from ${params.callerName}`,
          icon: params.logoUrl || "/default-hospital-icon.png",
        },
      },
    };

    console.log("📤 Sending FCM notification...", {
      receiverId: params.receiverId,
      tokenLength: params.fcmToken.length,
    });

    const messageId = await messaging.send(payload as any);

    console.log("✅ FCM notification sent successfully:", {
      messageId,
      receiverId: params.receiverId,
      callerName: params.callerName,
    });

    return messageId;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorCode = (error as any)?.code || "UNKNOWN";
    console.error("❌ Error sending FCM notification:", {
      code: errorCode,
      message: errorMessage,
      receiverId: params.receiverId,
      fullError: error,
    });
    throw error;
  }
}

/**
 * Send generic notification via FCM
 */
export async function sendNotification(params: {
  fcmToken: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}) {
  try {
    if (!params.fcmToken || params.fcmToken.length < 10) {
      throw new Error("Invalid FCM token provided");
    }

    const messaging = getMessaging();
    if (!messaging) {
      throw new Error("Firebase Messaging not available - initialization may have failed");
    }

    const payload = {
      token: params.fcmToken,
      notification: {
        title: params.title,
        body: params.body,
      },
      data: params.data || {},
      android: {
        priority: "high" as const,
      },
      apns: {
        payload: {
          aps: {
            alert: {
              title: params.title,
              body: params.body,
            },
            sound: "default",
          },
        },
      },
    };

    console.log("📤 Sending generic FCM notification...", {
      title: params.title,
      tokenLength: params.fcmToken.length,
    });

    const messageId = await messaging.send(payload as any);

    console.log("✅ Notification sent successfully:", {
      messageId,
      title: params.title,
    });

    return messageId;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorCode = (error as any)?.code || "UNKNOWN";
    console.error("❌ Error sending FCM notification:", {
      code: errorCode,
      message: errorMessage,
      title: params.title,
      fullError: error,
    });
    throw error;
  }
}
