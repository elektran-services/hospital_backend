# Firebase FCM Notification Integration - Implementation Guide

## Overview

This document explains the new Firebase Cloud Messaging (FCM) integration for the Hospital SaaS platform. This feature enables real-time push notifications for incoming video call notifications on mobile applications (iOS and Android).

**Date Implemented:** March 9, 2026

---

## Architecture

The new notification system integrates Firebase Admin SDK with the existing Hospital SaaS backend to:

1. **Register device tokens** from mobile apps (FCM tokens)
2. **Initiate video calls** with automatic push notifications
3. **Track call sessions** in the database
4. **Send notifications** to called users on their mobile devices
5. **Support multiple platforms** (iOS, Android, Web)

---

## Key Components

### 1. Database Models (Prisma Schema)

#### **DeviceToken**
Stores FCM tokens registered by users' mobile devices.

```prisma
model DeviceToken {
  id        String    @id @default(uuid())
  userId    String
  fcmToken  String
  deviceType String? @default("unknown")  // "ios", "android", "web"
  lastUsedAt DateTime?
  isActive  Boolean @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  user      User    @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

#### **CallSession**
Tracks ongoing and completed video call sessions.

```prisma
model CallSession {
  id                  String @id @default(uuid())
  appointmentId       String @unique
  hospitalId          String
  branchId            String
  callerId            String
  callerName          String
  receiverId          String
  channelId           String
  agoraCallerToken    String
  agoraReceiverToken  String
  sessionStatus       CallSessionStatus @default(CONNECTING)
  notificationSentAt  DateTime?
  callStartedAt       DateTime?
  callEndedAt         DateTime?
  callDuration        Int?
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt
  appointment         Appointment @relation(fields: [appointmentId], references: [id], onDelete: Cascade)
}

enum CallSessionStatus {
  CONNECTING
  ACTIVE
  COMPLETED
  FAILED
  CANCELLED
}
```

### 2. Firebase Module (src/lib/firebase.ts)

Provides utilities for Firebase operations:

```typescript
// Initialize Firebase
initializeFirebase()

// Send incoming call notification
sendIncomingCallNotification(params: {
  fcmToken: string
  callerId: string
  callerName: string
  receiverId: string
  channelId: string
  agoraReceiverToken: string
  hospitalId: string
  hospitalName: string
  branchId: string
  logoUrl?: string
})

// Send generic notification
sendNotification(params: {
  fcmToken: string
  title: string
  body: string
  data?: Record<string, string>
})
```

---

## API Endpoints

### 1. Register Device Token

**Endpoint:** `POST /api/v1/video-calls/register-device-token`

Register or update FCM token from mobile app.

**Authentication:** Required (Bearer token)

**Request Body:**
```json
{
  "fcmToken": "string (required)",
  "deviceType": "ios|android|web (optional)"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Device token registered successfully",
  "data": {
    "deviceTokenId": "uuid"
  }
}
```

**Example cURL:**
```bash
curl -X POST http://localhost:3000/api/v1/video-calls/register-device-token \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "fcmToken": "eNV...",
    "deviceType": "ios"
  }'
```

---

### 2. Initiate Call (Send Notification)

**Endpoint:** `POST /api/v1/video-calls/initiate`

Initiates a video call and sends push notification to receiver.

**Authentication:** Required (Bearer token as DOCTOR, SUPER_ADMIN, or BRANCH_MANAGER)

**Request Body:**
```json
{
  "appointmentId": "uuid (required)",
  "receiverId": "uuid (required, patient ID)"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Call initiated successfully",
  "data": {
    "sessionId": "uuid",
    "channelId": "branch_{id}_doctor_{id}_patient_{id}",
    "callerToken": "006...",
    "notificationSent": true,
    "messageId": "firebase_message_id"
  }
}
```

**Workflow:**
1. Validates appointment exists and is confirmed
2. Verifies it's a virtual appointment
3. Generates Agora tokens (publisher for doctor, subscriber for patient)
4. Creates CallSession in database
5. Retrieves patient's device token
6. Sends FCM push notification
7. Returns session details to caller

**Error Cases:**
- 400: Invalid request or appointment not virtual/confirmed
- 404: Appointment not found
- 403: Unauthorized or multi-tenant violation
- 409: Active call session already exists

**Example cURL:**
```bash
curl -X POST http://localhost:3000/api/v1/video-calls/initiate \
  -H "Authorization: Bearer <doctor_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "appointmentId": "550e8400-e29b-41d4-a716-446655440000",
    "receiverId": "patient_uuid"
  }'
```

---

### 3. Get Call Session Details

**Endpoint:** `GET /api/v1/video-calls/session/{sessionId}`

Retrieve active call session and receive appropriate token.

**Authentication:** Required (Bearer token)

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "sessionId": "uuid",
    "channelId": "string",
    "token": "006...",
    "uid": "user_id_or_uuid",
    "userRole": "caller|receiver",
    "sessionStatus": "CONNECTING|ACTIVE|COMPLETED|FAILED|CANCELLED",
    "callStatus": "confirmed|in_progress|completed",
    "appointmentId": "uuid",
    "callStartedAt": null,
    "callEndedAt": null,
    "callDuration": null,
    "doctor": { "id": "uuid", "name": "string", "email": "string" },
    "patient": { "id": "uuid", "name": "string", "email": "string" },
    "hospital": { "id": "uuid", "name": "string", "logo": "url" },
    "branch": { "id": "uuid", "name": "string" }
  }
}
```

**Features:**
- Users only get their own token (caller gets callerToken, receiver gets receiverToken)
- Respects multi-tenant isolation
- Includes all necessary call and user details

---

### 4. End Call Session

**Endpoint:** `POST /api/v1/video-calls/end`

End an active call and record session details.

**Authentication:** Required (Bearer token)

**Request Body:**
```json
{
  "sessionId": "uuid (required)",
  "callStatus": "COMPLETED|FAILED|CANCELLED (optional, defaults to COMPLETED)"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Call ended successfully",
  "data": {
    "sessionId": "uuid",
    "duration": 1234,
    "status": "COMPLETED"
  }
}
```

**Actions:**
1. Updates CallSession status
2. Records call end time
3. Calculates call duration
4. Updates Appointment status
5. Records video call metrics in Appointment

**Error Cases:**
- 404: Call session not found
- 403: User not part of call (unauthorized)

**Example cURL:**
```bash
curl -X POST http://localhost:3000/api/v1/video-calls/end \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "session_uuid",
    "callStatus": "COMPLETED"
  }'
```

---

## Setup Instructions

### 1. Install Dependencies

```bash
npm install firebase-admin
```

This has been added to `package.json`.

### 2. Generate Firebase Service Account

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Go to **Project Settings** → **Service Accounts**
4. Click **Generate New Private Key**
5. Save the JSON file securely

### 3. Set Environment Variables

Add to `.env.local`:

```bash
# Firebase Service Account (JSON as string)
FIREBASE_SERVICE_ACCOUNT_JSON='{"type":"service_account","project_id":"your-project","private_key_id":"...","private_key":"...","client_email":"...","...":"..."}'
```

**Security Tips:**
- Never commit `.env.local` to version control
- Use secrets management in production (Vercel, AWS Secrets Manager, etc.)
- Rotate keys regularly

### 4. Run Database Migration

```bash
npx prisma migrate dev --name add_call_session_and_device_token
```

This creates the new `DeviceToken` and `CallSession` tables.

### 5. Restart Development Server

```bash
npm run dev
```

---

## Mobile App Integration (React Native / Flutter)

### Step 1: Register Device Token on App Launch

```javascript
// After user login
import axios from 'axios';

async function registerDeviceToken(fcmToken, accessToken) {
  try {
    const response = await axios.post(
      'http://localhost:3000/api/v1/video-calls/register-device-token',
      {
        fcmToken: fcmToken,
        deviceType: 'ios' // or 'android'
      },
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    console.log('Device token registered:', response.data.data.deviceTokenId);
  } catch (error) {
    console.error('Failed to register device token:', error);
  }
}
```

### Step 2: Handle Incoming Call Notification

```javascript
// FCM notification handler
messaging().onMessage(async (remoteMessage) => {
  if (remoteMessage.data.type === 'incoming_call') {
    const callData = {
      callerId: remoteMessage.data.callerId,
      callerName: remoteMessage.data.callerName,
      channelId: remoteMessage.data.channelId,
      agoraReceiverToken: remoteMessage.data.agoraReceiverToken,
      hospitalName: remoteMessage.data.hospitalName,
    };
    
    // Show call incoming UI
    showIncomingCallUI(callData);
  }
});
```

### Step 3: Join Video Call

```javascript
import AgoraRTC from 'agora-rtc-sdk-ng';

async function joinCall(sessionId, accessToken) {
  try {
    // Get session details
    const response = await axios.get(
      `http://localhost:3000/api/v1/video-calls/session/${sessionId}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }
    );
    
    const { token, channelId, userRole } = response.data.data;
    
    // Join Agora channel
    await agoraClient.join(agora_app_id, channelId, token, uid);
  } catch (error) {
    console.error('Failed to join call:', error);
  }
}
```

### Step 4: End Call and Record Duration

```javascript
async function endCall(sessionId, accessToken) {
  try {
    await axios.post(
      'http://localhost:3000/api/v1/video-calls/end',
      {
        sessionId: sessionId,
        callStatus: 'COMPLETED'
      },
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }
    );
    console.log('Call ended and session recorded');
  } catch (error) {
    console.error('Failed to end call:', error);
  }
}
```

---

## Complete Call Flow

```
┌─────────────┐                          ┌──────────────┐
│  Caller     │                          │  Receiver    │
│  (Doctor)   │                          │  (Patient)   │
└─────────────┘                          └──────────────┘
      │                                        │
      │ 1. POST /initiate                      │
      │────────────────────────────────────────→
      │    (appointmentId, receiverId)         │
      │                                        │
      │                                    2. Get device token
      │                                        │
      │                                    3. Send FCM notification
      │    4. Response with sessionId      ←──────────────────
      │    ← ────────────────────────────────  │
      │                                        │ 5. Tap notification
      │                                        │    (app opens)
      │                                        │
      │                                    6. GET /session/{sessionId}
      │                                        │────────────────────────→
      │                                        │
      │                                    7. Get receiverToken
      │    8. GET /session/{sessionId}     ←──────────────────
      │    │────────────────────────────────  │
      │    │                                  │
      │    → Get callerToken                  │
      │    ↓                                  │
      │                                       │
      │ 9. Join Agora channel             10. Join Agora channel
      │ ├──────────────────────────────────────┤
      │ │       Video/Audio Stream             │
      │ │ ←──────────────────────────────────→ │
      │ │       Chat/Screen Share              │
      │ │ ←──────────────────────────────────→ │
      │                                        │
      │ 11. POST /end  (doctor hangs up)      │
      │ │────────────────────────────────────→ │
      │                                   12. Update UI
      │ 13. Both leave channel             (call ended)
      │
    Duration and logs recorded in database

```

---

## Security Considerations

### 1. Token Validation
- Only appointment doctor or super-admin can initiate calls
- Only call participants can access session details
- Multi-tenant isolation enforced at database level

### 2. FCM Token Security
- Tokens stored securely in database
- Tokens marked inactive when user logs out
- No tokens exposed in API responses

### 3. Agora Token Expiration
- Tokens expire after 24 hours
- Each call generates fresh tokens
- Tokens are role-specific (publisher vs subscriber)

### 4. Call Session Privacy
- Call data scoped to hospital (hospitalId check)
- Participants can only access their own tokens
- Call recordings only during active calls

---

## Troubleshooting

### Firebase Not Initialized

**Error:** `Firebase not initialized. Skipping FCM notification.`

**Solution:**
- Verify `FIREBASE_SERVICE_ACCOUNT_JSON` is set in `.env.local`
- Restart development server: `npm run dev`
- Check Firebase project settings

### Device Token Not Found

**Error:** `FCM token not found for receiver`

**Solution:**
- Ensure mobile app has called `register-device-token` endpoint
- Check device has internet and FCM permissions
- Verify user ID matches in database

### Agora Token Generation Failed

**Error:** `Failed to generate video call tokens`

**Solution:**
- Verify `AGORA_APP_ID` and `AGORA_APP_CERTIFICATE` in `.env.local`
- Check appointment and user exist in database
- Ensure appointment is in `confirmed` status

### Notification Not Received

**Error:** Notification sent but not delivered to device

**Solutions:**
- Check device has FCM enabled
- Verify app has notification permissions
- Check device token is still active
- Review FCM service status

---

## Performance Optimization

### Database Indexing
Device tokens and call sessions have proper indexes for fast lookups:

```sql
-- Automatic indexes created:
INDEX: DeviceToken(userId, fcmToken)
INDEX: CallSession(appointmentId, channelId)
INDEX: CallSession(callerId, receiverId)
```

### Caching Recommendations

For high-traffic deployments:

1. Cache doctor availability by branch
2. Cache hospital logo URLs
3. Cache recently active device tokens

---

## Future Enhancements

1. **Call Scheduling Notifications** - Remind users 15min before call
2. **Call Recording** - Store call metadata and optional recordings
3. **Analytics Dashboard** - Call duration, daily active users, etc.
4. **Call Forwarding** - Route calls to alternative doctors if unavailable
5. **Call Queue** - Queue overflow calls when all doctors busy

---

## Support & Questions

For issues or questions:
1. Check existing logs in `/logs` directory
2. Review Firebase Cloud Function documentation
3. Refer to Agora documentation for token validation

---

**Version:** 1.0  
**Last Updated:** March 9, 2026  
**Status:** Production Ready
