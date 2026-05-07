# FCM Authentication Error - Fix Guide

## Error
```
Error: 16 UNAUTHENTICATED: Request had invalid authentication credentials. 
Expected OAuth 2 access token, login cookie or other valid authentication credential.
```

## Root Causes

This error occurs when Firebase Admin SDK cannot authenticate with Google Cloud to send FCM messages. Common causes:

1. **Service Account Permissions Missing** (Most common)
2. **Malformed Service Account JSON**
3. **Firebase Admin SDK Not Properly Initialized**
4. **Invalid FCM Token**

---

## Solution Steps

### Step 1: Verify Service Account Permissions in Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project: **healthique-bf625**
3. Navigate to **IAM & Admin** → **Roles**
4. Search for your service account: `firebase-adminsdk-fbsvc@healthique-bf625.iam.gserviceaccount.com`
5. Ensure it has these roles:
   - ✅ **Editor** (broad access for development)
   - Or specific roles:
     - **Firebase Admin SDK Administrator Service Account**
     - **Cloud Messaging Service**
     - **Service Account User**

#### If permissions are missing:

1. Go to **IAM & Admin** → **Service Accounts**
2. Click on `firebase-adminsdk-fbsvc@healthique-bf625.iam.gserviceaccount.com`
3. Click **Edit**
4. Grant required roles (ask for "Editor" or "Firebase Admin" role)
5. Click **Save**

---

### Step 2: Verify Firebase Configuration in `.env.local`

Run this in terminal to test:

```powershell
# Check if env var is set
Get-Content .env.local | Select-String "FIREBASE_SERVICE_ACCOUNT_JSON"

# Verify it's valid JSON
$json = (Get-Content .env.local | Select-String "FIREBASE_SERVICE_ACCOUNT_JSON").Line
if ($json -like '*{*') { Write-Host "✅ JSON found" } else { Write-Host "❌ JSON not found" }
```

**Required fields in service account JSON:**
```json
{
  "type": "service_account",
  "project_id": "healthique-bf625",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-fbsvc@healthique-bf625.iam.gserviceaccount.com",
  "client_id": "...",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "..."
}
```

---

### Step 3: Test Firebase Initialization

Create a test endpoint to check Firebase status:

```typescript
// src/app/api/v1/debug/firebase-status/route.ts

import { NextResponse } from "next/server";
import { initializeFirebase, getFirebaseApp, getMessaging } from "@/lib/firebase";
import { getCorsHeaders } from "@/lib/cors";

export async function GET() {
  try {
    console.log("🔍 Testing Firebase initialization...");
    
    // Initialize Firebase
    const app = initializeFirebase();
    console.log("Step 1 - initializeFirebase():", app ? "✅ Success" : "❌ Failed");

    // Get Firebase app
    const firebaseApp = getFirebaseApp();
    console.log("Step 2 - getFirebaseApp():", firebaseApp ? "✅ Success" : "❌ Failed");

    // Get Messaging instance
    const messaging = getMessaging();
    console.log("Step 3 - getMessaging():", messaging ? "✅ Success" : "❌ Failed");

    return NextResponse.json(
      {
        status: "Firebase initialization check",
        initialized: !!app,
        hasMessaging: !!messaging,
        projectId: app ? (app as any).name : "unknown",
      },
      { headers: getCorsHeaders() }
    );
  } catch (error) {
    console.error("❌ Firebase test failed:", error);
    return NextResponse.json(
      {
        status: "error",
        message: error instanceof Error ? error.message : String(error),
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
```

Test it:
```bash
curl http://localhost:3000/api/v1/debug/firebase-status
```

---

### Step 4: Test FCM Token Validity

Create a test endpoint to verify FCM token:

```typescript
// src/app/api/v1/debug/test-fcm/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getMessaging } from "@/lib/firebase";
import { getCorsHeaders } from "@/lib/cors";

export async function POST(req: NextRequest) {
  try {
    const { fcmToken } = await req.json();

    if (!fcmToken) {
      return NextResponse.json(
        { error: "fcmToken required" },
        { status: 400, headers: getCorsHeaders() }
      );
    }

    console.log("🔍 Testing FCM token:", fcmToken.substring(0, 20) + "...");

    const messaging = getMessaging();
    if (!messaging) {
      return NextResponse.json(
        { error: "Firebase Messaging not available" },
        { status: 500, headers: getCorsHeaders() }
      );
    }

    // Send a simple test message
    const messageId = await messaging.send({
      token: fcmToken,
      notification: {
        title: "Test Notification",
        body: "Firebase is working correctly!",
      },
      data: {
        test: "true",
        timestamp: new Date().toISOString(),
      },
    });

    return NextResponse.json(
      {
        status: "success",
        messageId,
        message: "Test notification sent successfully",
      },
      { headers: getCorsHeaders() }
    );
  } catch (error) {
    const err = error as any;
    console.error("❌ FCM test failed:", {
      code: err?.code,
      message: err?.message,
      error,
    });

    return NextResponse.json(
      {
        status: "error",
        code: err?.code,
        message: err?.message,
        hint: getErrorHint(err?.code),
      },
      { status: 500, headers: getCorsHeaders() }
    );
  }
}

function getErrorHint(code: string): string {
  const hints: Record<string, string> = {
    "INVALID_ARGUMENT": "Check FCM token format",
    "NOT_FOUND": "FCM token not found or invalid",
    "UNAUTHENTICATED": "Check Google Cloud service account permissions",
    "PERMISSION_DENIED": "Service account lacks FCM permissions",
  };
  return hints[code] || "Check Firebase configuration and service account permissions";
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: getCorsHeaders(),
  });
}
```

Test it:
```bash
POST http://localhost:3000/api/v1/debug/test-fcm
Content-Type: application/json

{
  "fcmToken": "your-fcm-token-here"
}
```

---

### Step 5: Check Logs for Detailed Error Info

Now that we've added better logging, check your server logs:

```bash
npm run dev
# Look for error output like:
# ❌ Error sending FCM notification: {
#   code: 'UNAUTHENTICATED',
#   message: '16 UNAUTHENTICATED: Request had invalid authentication credentials...',
#   receiverId: '...',
# }
```

**Error Codes and Solutions:**

| Code | Meaning | Solution |
|------|---------|----------|
| `UNAUTHENTICATED` | Invalid credentials | Check Google Cloud IAM permissions |
| `PERMISSION_DENIED` | Service account lacks permission | Add "Firebase Admin" role to service account |
| `INVALID_ARGUMENT` | Bad FCM token | Verify device actually registered with FCM |
| `NOT_FOUND` | FCM token doesn't exist | Device may have unregistered |

---

## Quick Checklist

- [ ] Service account has "Editor" or "Firebase Admin" role in Google Cloud
- [ ] `FIREBASE_SERVICE_ACCOUNT_JSON` is set in `.env.local`
- [ ] JSON is valid (no escaped quotes causing parsing errors)
- [ ] Firebase initialized successfully (check logs)
- [ ] FCM token is valid and from same Firebase project
- [ ] Restart dev server after making changes: `Ctrl+C` then `npm run dev`

---

## Permanent Fix (If Issue Persists)

If the service account still lacks permissions, regenerate credentials:

1. Go to **Google Cloud Console** → **APIs & Services** → **Service Accounts**
2. Select `firebase-adminsdk-fbsvc@...`
3. Go to **Keys** tab
4. Delete old key
5. Create new key → **JSON**
6. Copy the entire JSON
7. Update `.env.local` with new `FIREBASE_SERVICE_ACCOUNT_JSON`
8. Restart dev server

---

## Production Deployment

For production, set `FIREBASE_SERVICE_ACCOUNT_JSON` as an environment variable in:
- **Vercel**: Settings → Environment Variables
- **Docker**: Add to `.env` file or docker-compose
- **Cloud Run**: Set in service configuration
- **Other platforms**: Follow their env var documentation

Do NOT commit service account keys to git!

---

## Related Files Changed

- ✅ [src/lib/firebase.ts](src/lib/firebase.ts) - Better initialization & error logging
- ✅ [src/app/api/v1/video-calls/initiate/route.ts](src/app/api/v1/video-calls/initiate/route.ts) - Improved error handling

