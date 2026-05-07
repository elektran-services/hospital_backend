# Agora Video Call Integration

## Overview

This document describes the Agora.io integration for enabling real-time video/audio calls between doctors and patients in the Hospital SaaS platform.

## Environment Variables

Add the following environment variables to your `.env.local` file:

```env
# Agora.io Configuration
# Get these from https://console.agora.io
AGORA_APP_ID=0b0a3b554bbb4204864c5336a55194f5
AGORA_APP_CERTIFICATE=904e13ad2d824463afc96fee16a3ab96
```

## API Endpoint

### Generate Video Call Token

**Endpoint:** `POST /api/v1/video-calls/token`

Generates an Agora RTC access token for a doctor-patient video call. The token allows the requester to join an Agora channel and participate in real-time communication.

#### Authentication

- **Required:** Yes
- **Method:** Bearer Token or HTTP-only Cookie (`access_token`)
- **Allowed Roles:** `DOCTOR`, `PATIENT`

#### Request Headers

```
Authorization: Bearer <access_token>
Content-Type: application/json
```

#### Request Body

```json
{
  "branchId": "uuid",
  "doctorId": "uuid",
  "patientId": "uuid"
}
```

| Parameter  | Type   | Required | Description                           |
| ---------- | ------ | -------- | ------------------------------------- |
| branchId   | string | Yes      | UUID of the branch                    |
| doctorId   | string | Yes      | UUID of the doctor user               |
| patientId  | string | Yes      | UUID of the patient user              |

#### Response (200 OK)

```json
{
  "message": "Agora token generated successfully",
  "data": {
    "token": "string",
    "channelName": "string",
    "uid": 123456,
    "expiresIn": 86400,
    "expiresAt": 1706466890000
  }
}
```

| Field       | Type   | Description                                          |
| ----------- | ------ | ---------------------------------------------------- |
| token       | string | Agora access token for the channel                   |
| channelName | string | Channel name to join (derived from IDs)              |
| uid         | number | Numeric user ID in Agora (derived from UUID)        |
| expiresIn   | number | Token lifetime in seconds (currently 24 hours)       |
| expiresAt   | number | Absolute expiration timestamp in milliseconds (UTC)  |

#### Error Responses

**400 Bad Request** - Invalid request body

```json
{
  "error": "Validation error",
  "details": {
    "fieldErrors": {
      "branchId": ["Branch ID must be a valid UUID"]
    }
  }
}
```

**401 Unauthorized** - Missing or invalid authentication token

```json
{
  "error": "Unauthorized",
  "message": "Authentication token is missing or invalid"
}
```

**403 Forbidden** - User does not have permission

```json
{
  "error": "Forbidden",
  "message": "You can only generate tokens for calls you are part of"
}
```

**404 Not Found** - Doctor, patient, or branch not found

```json
{
  "error": "Not found",
  "message": "Doctor not found"
}
```

**409 Conflict** - Users not in the same hospital/branch or role mismatch

```json
{
  "error": "Conflict",
  "message": "Doctor must be in the same hospital and branch as the request"
}
```

**500 Internal Server Error** - Server-side error

```json
{
  "error": "Internal Server Error",
  "message": "Failed to generate token. Please try again later."
}
```

## Implementation Details

### Channel Naming Convention

Channels are named using the following pattern:

```
branch_{branchId}_doctor_{doctorId}_patient_{patientId}
```

All special characters and hyphens are removed from UUIDs for channel name safety.

Example:
```
branch_550e8400e29b41d4a716446655440000_doctor_6ba7b81095417d4fa0c7e8c5x_patient_6ba7b810950c7e8ce41d4f0000
```

### Token Expiration

- **Default TTL:** 24 hours (86400 seconds)
- **Configurable:** Modify `expirationInSeconds` parameter in the token generation function
- **Mobile App:** Should refresh tokens before expiration or handle token refresh gracefully

### User Roles & Permissions

In Agora:
- **Doctor:** `PUBLISHER` role - Can send video/audio
- **Patient:** `SUBSCRIBER` role - Can receive video/audio (read-only)

### Security Features

1. **Server-side Secret Management:** App Certificate is never exposed to clients
2. **Role-based Authorization:** Only doctors and patients can request tokens
3. **User Relationship Validation:** 
   - Doctor must be in the requested branch
   - Patient and doctor must be in the same hospital
   - Requester must be the doctor or patient in the call
4. **Input Validation:** All UUIDs and parameters are validated
5. **CORS Protection:** Standard CORS headers applied

## Mobile Integration Example

### iOS (Swift)

```swift
import AgoraRtcKit

// 1. Request token from backend
let request = URLRequest(url: URL(string: "https://yourapi.com/api/v1/video-calls/token")!)
var request = URLRequest(url: url)
request.httpMethod = "POST"
request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")

let payload = [
    "branchId": "550e8400-e29b-41d4-a716-446655440000",
    "doctorId": "6ba7b810-950c-7e8c-e41d-4f0000000000",
    "patientId": "6ba7b810-950c-7e8c-e41d-4f0000000001"
]
request.httpBody = try JSONSerialization.data(withJSONObject: payload)

URLSession.shared.dataTask(with: request) { data, response, error in
    let tokenResponse = try JSONDecoder().decode(TokenResponse.self, from: data!)
    
    // 2. Join Agora channel with token
    let agoraKit = AgoraRtcEngineKit.sharedEngine(withAppId: "YOUR_AGORA_APP_ID", delegate: self)
    agoraKit.joinChannel(
        byToken: tokenResponse.data.token,
        channelId: tokenResponse.data.channelName,
        info: nil,
        uid: UInt32(tokenResponse.data.uid)
    ) { (channel, uid, elapsed) in
        print("User joined channel: \(channel), UID: \(uid)")
    }
}.resume()
```

### Android (Kotlin)

```kotlin
import io.agora.rtc2.RtcEngine
import io.agora.rtc2.ChannelMediaOptions

// 1. Request token from backend
val client = OkHttpClient()
val payload = jsonObject(
    "branchId" to "550e8400-e29b-41d4-a716-446655440000",
    "doctorId" to "6ba7b810-950c-7e8c-e41d-4f0000000000",
    "patientId" to "6ba7b810-950c-7e8c-e41d-4f0000000001"
)

val request = Request.Builder()
    .url("https://yourapi.com/api/v1/video-calls/token")
    .addHeader("Authorization", "Bearer $accessToken")
    .post(payload.toString().toRequestBody())
    .build()

client.newCall(request).execute().use { response ->
    val tokenResponse = JSONObject(response.body!!.string())
    val token = tokenResponse.getJSONObject("data").getString("token")
    val channelName = tokenResponse.getJSONObject("data").getString("channelName")
    val uid = tokenResponse.getJSONObject("data").getInt("uid")
    
    // 2. Join Agora channel with token
    val rtcEngine = RtcEngine.create(context, "YOUR_AGORA_APP_ID", null)
    val options = ChannelMediaOptions().apply {
        clientRoleType = Constants.CLIENT_ROLE_BROADCASTER
        autoSubscribeAudio = true
        autoSubscribeVideo = true
    }
    
    rtcEngine.joinChannel(token, channelName, uid, options)
}
```

## Agora.io Documentation References

- **Official Docs:** https://docs.agora.io/
- **Token Generation:** https://docs.agora.io/en/video-calling/develop/manage-agora-account?platform=web#get-the-app-id
- **RTC API Reference:** https://docs.agora.io/en/video-calling/reference/api?platform=web
- **Security Best Practices:** https://docs.agora.io/en/video-calling/develop/security?platform=web

## Troubleshooting

### Token Generation Fails

**Error:** `Missing required environment variable: AGORA_APP_ID`

**Solution:** Ensure `AGORA_APP_ID` and `AGORA_APP_CERTIFICATE` are set in your `.env.local` file.

### User Cannot Join Channel

**Possible Causes:**
1. Token has expired (> 24 hours old)
2. Token is for a different channel
3. UID mismatch between token generation and channel join
4. Network connectivity issues

**Solution:** Request a new token from the endpoint before attempting to join.

### Channel Name Mismatch

**Issue:** Users receive different channel names for the same call

**Solution:** Channel name is deterministically generated from `branchId`, `doctorId`, and `patientId`. Both users must request tokens with identical IDs.

## Future Enhancements

1. **Token Refresh Endpoint:** Allow clients to refresh expiring tokens without restarting calls
2. **Token Customization:** Allow clients to specify token TTL or call type (audio-only, video, etc.)
3. **Call Recording:** Implement call recording with user consent
4. **Call Analytics:** Track call duration, quality metrics, and failures
5. **Real-time Notifications:** Notify users of incoming calls via push notifications
6. **Network Fallback:** Implement alternative communication channels if Agora is unavailable

## Support

For issues with:
- **Agora Integration:** Contact Agora support at https://agora-ticket.agora.io/
- **API Implementation:** Review the code in `src/lib/agora.ts` and `src/app/api/v1/video-calls/route.ts`
