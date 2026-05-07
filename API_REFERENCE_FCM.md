# Firebase FCM - API Quick Reference

## 🎯 Endpoints Overview

| Endpoint | Method | Purpose | Auth |
|----------|--------|---------|------|
| `/video-calls/register-device-token` | POST | Register FCM token from mobile app | Required |
| `/video-calls/initiate` | POST | Start call & send push notification | DOCTOR/ADMIN |
| `/video-calls/session/{id}` | GET | Get call details and token | Required |
| `/video-calls/end` | POST | End call and record metrics | Required |

---

## 1️⃣ Register Device Token

Used by mobile apps to register for push notifications.

```bash
POST /api/v1/video-calls/register-device-token

Headers:
  Authorization: Bearer <access_token>
  Content-Type: application/json

Body:
{
  "fcmToken": "eGVtcDpMeC8yRjU2OkFQQTkxYlFBQmlBaW...",
  "deviceType": "ios"  // Optional: "ios", "android", or "web"
}

Response 201:
{
  "success": true,
  "message": "Device token registered successfully",
  "data": {
    "deviceTokenId": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

**When to call:** After user login on mobile app  
**Platform support:** iOS, Android, Web  
**Duplicate handling:** Idempotent (updates existing token)

---

## 2️⃣ Initiate Call

Doctor initiates a call. Automatically sends push notification to patient.

```bash
POST /api/v1/video-calls/initiate

Headers:
  Authorization: Bearer <doctor_token>
  Content-Type: application/json

Body:
{
  "appointmentId": "550e8400-e29b-41d4-a716-446655440000",
  "receiverId": "patient-uuid"
}

Response 201:
{
  "success": true,
  "message": "Call initiated successfully",
  "data": {
    "sessionId": "550e8400-e29b-41d4-a716-446655440000",
    "channelId": "branch_123_doctor_456_patient_789",
    "callerToken": "006d40e63ef01d0e5e9c4...",
    "notificationSent": true,
    "messageId": "projects/hospital-saas/messages/1234567890"
  }
}

Error Responses:
400: {
  "success": false,
  "error": "Appointment must be confirmed and virtual type"
}
404: {
  "success": false,
  "error": "Appointment not found"
}
403: {
  "success": false,
  "error": "Unauthorized access to appointment"
}
409: {
  "success": false,
  "error": "Active call session already exists"
}
```

**When to call:** Doctor clicks "Start Call" button  
**Requirements:** 
- Appointment must be confirmed
- Appointment must be virtual type
- Patient must have registered device token
- Patient must be in same hospital

**What happens:**
1. Validates appointment
2. Generates Agora PUBLISHER token (doctor)
3. Generates Agora SUBSCRIBER token (patient)
4. Creates CallSession in database
5. Sends FCM push notification
6. Returns session details

---

## 3️⃣ Get Call Session

Mobile app retrieves call details and their token.

```bash
GET /api/v1/video-calls/session/{sessionId}

Headers:
  Authorization: Bearer <token>

Parameters:
  {sessionId}: The session ID from initiate response

Response 200:
{
  "success": true,
  "data": {
    "sessionId": "550e8400-e29b-41d4-a716-446655440000",
    "channelId": "branch_123_doctor_456_patient_789",
    "token": "006d40e63ef01d0e5e9c4...",  // User's role-specific token
    "uid": "patient-uuid",
    "userRole": "receiver",  // "receiver" (patient) or "caller" (doctor)
    "sessionStatus": "CONNECTING",
    "callStatus": "confirmed",
    "appointmentId": "550e8400-e29b-41d4-a716-446655440000",
    "callStartedAt": null,
    "callEndedAt": null,
    "callDuration": null,
    "doctor": {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "name": "Dr. John Smith",
      "email": "john@hospital.com"
    },
    "patient": {
      "id": "550e8400-e29b-41d4-a716-446655440002",
      "name": "Jane Doe",
      "email": "jane@hospital.com"
    },
    "hospital": {
      "id": "550e8400-e29b-41d4-a716-446655440003",
      "name": "General Hospital",
      "logo": "https://example.com/logo.png"
    },
    "branch": {
      "id": "550e8400-e29b-41d4-a716-446655440004",
      "name": "Downtown Branch"
    }
  }
}

Error Responses:
404: {
  "success": false,
  "error": "Call session not found"
}
403: {
  "success": false,
  "error": "Unauthorized to access this call session"
}
```

**When to call:** After tapping incoming notification or accepting call  
**Token received:** Role-specific (auto-determined by system)
- Doctor gets: PUBLISHER token (can send video)
- Patient gets: SUBSCRIBER token (receive-only)

---

## 4️⃣ End Call

End the call and record duration/metrics.

```bash
POST /api/v1/video-calls/end

Headers:
  Authorization: Bearer <token>
  Content-Type: application/json

Body:
{
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "callStatus": "COMPLETED"  // Optional: "COMPLETED", "FAILED", or "CANCELLED"
}

Response 200:
{
  "success": true,
  "message": "Call ended successfully",
  "data": {
    "sessionId": "550e8400-e29b-41d4-a716-446655440000",
    "duration": 1245,  // Seconds
    "status": "COMPLETED"
  }
}

Error Responses:
404: {
  "success": false,
  "error": "Call session not found"
}
403: {
  "success": false,
  "error": "Unauthorized to end this call"
}
```

**When to call:** User clicks "End Call" or call disconnects  
**Effects:**
- Updates CallSession status
- Records call end time
- Calculates call duration (in seconds)
- Updates appointment status to "completed"
- Stores metrics in appointment

---

## 📱 Mobile App Usage Examples

### React Native Example

```javascript
import { getToken } from 'firebase/messaging';

// 1. Register device on app launch
async function setupPushNotifications(userId, accessToken) {
  try {
    // Get FCM token
    const token = await getToken(messaging, {
      vapidKey: 'YOUR_VAPID_KEY'
    });
    
    // Register with backend
    const response = await fetch(
      'http://api.hospital.local/api/v1/video-calls/register-device-token',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fcmToken: token,
          deviceType: 'ios'
        })
      }
    );
    
    const data = await response.json();
    console.log('Device registered:', data.data.deviceTokenId);
  } catch (error) {
    console.error('Failed to register device:', error);
  }
}

// 2. Handle incoming call notification
messaging.onMessage((message) => {
  if (message.data.type === 'incoming_call') {
    showIncomingCallScreen({
      callerId: message.data.callerId,
      callerName: message.data.callerName,
      hospitalName: message.data.hospitalName,
      channelId: message.data.channelId
    });
  }
});

// 3. Get call details when user taps notification
async function getCallDetails(sessionId, accessToken) {
  const response = await fetch(
    `http://api.hospital.local/api/v1/video-calls/session/${sessionId}`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    }
  );
  
  const data = await response.json();
  return data.data;  // Contains token, channelId, etc.
}

// 4. Join Agora channel
async function joinCall(callDetails) {
  const agoraEngine = createAgoraRtcEngine();
  
  await agoraEngine.initialize({
    appId: AGORA_APP_ID
  });
  
  await agoraEngine.joinChannel(
    callDetails.token,
    callDetails.channelId,
    0,  // uid (0 = auto-assign)
    {}
  );
  
  // Video/audio now transmitting
}

// 5. End call
async function endCall(sessionId, accessToken) {
  await fetch(
    'http://api.hospital.local/api/v1/video-calls/end',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        sessionId: sessionId,
        callStatus: 'COMPLETED'
      })
    }
  );
}
```

### Flutter Example

```dart
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:http/http.dart' as http;

// 1. Register device token
Future<void> registerDeviceToken(String userId, String accessToken) async {
  final messaging = FirebaseMessaging.instance;
  final token = await messaging.getToken();
  
  final response = await http.post(
    Uri.parse('http://api.hospital.local/api/v1/video-calls/register-device-token'),
    headers: {
      'Authorization': 'Bearer $accessToken',
      'Content-Type': 'application/json'
    },
    body: jsonEncode({
      'fcmToken': token,
      'deviceType': 'ios'
    })
  );
  
  if (response.statusCode == 201) {
    print('Device registered successfully');
  }
}

// 2. Handle incoming notifications
void setupForegroundNotifications() {
  FirebaseMessaging.onMessage.listen((RemoteMessage message) {
    if (message.data['type'] == 'incoming_call') {
      _showIncomingCallUI(message.data);
    }
  });
}

// 3. Get call details
Future<Map<String, dynamic>> getCallDetails(String sessionId, String accessToken) async {
  final response = await http.get(
    Uri.parse('http://api.hospital.local/api/v1/video-calls/session/$sessionId'),
    headers: {
      'Authorization': 'Bearer $accessToken'
    }
  );
  
  final data = jsonDecode(response.body);
  return data['data'];
}

// 4. End call
Future<void> endCall(String sessionId, String accessToken) async {
  await http.post(
    Uri.parse('http://api.hospital.local/api/v1/video-calls/end'),
    headers: {
      'Authorization': 'Bearer $accessToken',
      'Content-Type': 'application/json'
    },
    body: jsonEncode({
      'sessionId': sessionId,
      'callStatus': 'COMPLETED'
    })
  );
}
```

---

## 🔑 Key Points

1. **Device Token Registration**
   - Call once after login
   - Can be called multiple times (idempotent)
   - Store token securely on device

2. **Call Initiation**
   - Only doctor or admin can initiate
   - Automatically sends notification
   - Returns both doctor's token and session ID

3. **Token Distribution**
   - Never call `/initiate` twice for same call
   - Each user gets their role-specific token:
     - Doctor: PUBLISHER (can broadcast)
     - Patient: SUBSCRIBER (receive-only)

4. **Call Ending**
   - Either participant can end the call
   - Duration automatically calculated
   - Appointment status updated

---

## ⚠️ Error Handling

```javascript
// Always handle these status codes:
if (response.status === 401) {
  // Token expired, refresh and retry
}

if (response.status === 403) {
  // User not allowed for this action
}

if (response.status === 404) {
  // Resource not found (appointment/session)
}

if (response.status === 409) {
  // Conflict (active session exists)
}

if (response.status === 500) {
  // Server error (Firebase/Agora unavailable?)
}
```

---

## 📊 Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success (GET requests) |
| 201 | Created (POST requests) |
| 400 | Invalid request |
| 401 | Unauthorized (missing/invalid token) |
| 403 | Forbidden (not allowed) |
| 404 | Not found |
| 409 | Conflict (active session exists) |
| 500 | Server error |

---

## 🎯 Call Status Values

| Status | Meaning |
|--------|---------|
| CONNECTING | Call initializing |
| ACTIVE | Video/audio flowing |
| COMPLETED | Normal end |
| FAILED | Connection failed |
| CANCELLED | User cancelled |

---

## 📍 Sample UUIDs (for testing)

```
Appointment ID: 550e8400-e29b-41d4-a716-446655440000
Session ID:    550e8400-e29b-41d4-a716-446655440001
Doctor ID:     550e8400-e29b-41d4-a716-446655440002
Patient ID:    550e8400-e29b-41d4-a716-446655440003
Hospital ID:   550e8400-e29b-41d4-a716-446655440004
Branch ID:     550e8400-e29b-41d4-a716-446655440005
```

---

## 🚀 Production Deployment

Before deploying to production:

1. Set environment variables:
   - `FIREBASE_SERVICE_ACCOUNT_JSON`
   - `AGORA_APP_ID`
   - `AGORA_APP_CERTIFICATE`

2. Run database migration:
   ```bash
   npx prisma migrate deploy
   ```

3. Verify FCM:
   - Go to Firebase Console
   - Check message delivery rate
   - Verify notification payload

4. Monitor:
   - Call success rate
   - Push notification delivery rate
   - Call duration metrics
   - Error rate

---

**Last Updated:** March 9, 2026  
**Status:** ✅ Production Ready
