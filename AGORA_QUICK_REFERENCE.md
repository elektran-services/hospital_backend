# Agora Video Call Integration - Quick Reference

## Setup

1. Install dependency:
```bash
npm install agora-token
```

2. Add environment variables to `.env.local`:
```env
AGORA_APP_ID=0b0a3b554bbb4204864c5336a55194f5
AGORA_APP_CERTIFICATE=904e13ad2d824463afc96fee16a3ab96
```

## API Endpoint

**URL:** `POST /api/v1/video-calls/token`

**Authentication:** Required (DOCTOR or PATIENT role)

**Request:**
```json
{
  "branchId": "550e8400-e29b-41d4-a716-446655440000",
  "doctorId": "6ba7b810-950c-7e8c-e41d-4f0000000001",
  "patientId": "6ba7b810-950c-7e8c-e41d-4f0000000002"
}
```

**Response (200):**
```json
{
  "message": "Agora token generated successfully",
  "data": {
    "token": "006db45e77c0cba...",
    "channelName": "branch_550e8400_doctor_6ba7b810_patient_6ba7b810",
    "uid": 1234567890,
    "expiresIn": 86400,
    "expiresAt": 1706553290000
  }
}
```

## Key Features

✅ **Server-side token generation** - Certificate never exposed  
✅ **Role-based access** - Doctors publish, patients subscribe  
✅ **Multi-layer validation** - Auth, authorization, business logic  
✅ **Unique channels** - Each call pair gets own channel  
✅ **24-hour tokens** - Auto-expires for security  
✅ **CORS enabled** - Mobile app compatible  
✅ **Error handling** - Proper HTTP status codes  

## Files

- **Utilities:** [src/lib/agora.ts](src/lib/agora.ts)
- **Endpoint:** [src/app/api/v1/video-calls/route.ts](src/app/api/v1/video-calls/route.ts)
- **Full Docs:** [AGORA_INTEGRATION.md](AGORA_INTEGRATION.md)
- **Implementation Details:** [AGORA_IMPLEMENTATION_SUMMARY.md](AGORA_IMPLEMENTATION_SUMMARY.md)

## Mobile Integration

### Get Token
```javascript
const response = await fetch('/api/v1/video-calls/token', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    branchId: '550e8400-e29b-41d4-a716-446655440000',
    doctorId: '6ba7b810-950c-7e8c-e41d-4f0000000001',
    patientId: '6ba7b810-950c-7e8c-e41d-4f0000000002'
  })
});

const { data } = await response.json();
```

### Join Channel
```javascript
// iOS/Android Agora SDK
agoraEngine.joinChannel(
  data.token,           // Token from backend
  data.channelName,     // Channel name from backend
  data.uid              // User ID from backend
);
```

## Validation Rules

✓ branchId - Must be valid UUID  
✓ doctorId - Must be valid UUID, must be DOCTOR role  
✓ patientId - Must be valid UUID, must be PATIENT role  
✓ All three must be in same hospital  
✓ Doctor must be in specified branch  
✓ Requester must be doctor or patient in the call  

## Error Codes

| Code | Scenario |
|------|----------|
| 400 | Invalid request body or invalid UUIDs |
| 401 | Missing or invalid authentication token |
| 403 | User not authorized (not doctor or patient) |
| 404 | Doctor, patient, or branch not found |
| 409 | Users not in same hospital or invalid branch |
| 500 | Server error |

## Token Details

- **TTL:** 24 hours (86400 seconds)
- **Unique per:** Doctor + Patient + Branch combination
- **Doctor Role:** PUBLISHER (can send video/audio)
- **Patient Role:** SUBSCRIBER (receive-only)
- **Channel naming:** `branch_{id}_doctor_{id}_patient_{id}`

## Security

🔒 App Certificate stays on server only  
🔒 Tokens auto-expire after 24 hours  
🔒 User relationship validated in database  
🔒 Role-based access control enforced  
🔒 All inputs sanitized and validated  
🔒 CORS headers included for safety  

## Troubleshooting

**Token generation fails?**
- Check AGORA_APP_ID and AGORA_APP_CERTIFICATE in .env.local
- Verify user IDs are valid UUIDs
- Confirm users exist in database
- Ensure doctor is DOCTOR role, patient is PATIENT role

**User can't join channel?**
- Verify token hasn't expired (max 24 hours)
- Check channel name matches exactly
- Confirm UID in app matches token UID
- Verify network connectivity

**Permission denied?**
- Only doctors and patients can request tokens
- Requester must be doctor or patient in the call
- All users must be in same hospital

## Future Work

- Token refresh endpoint (extend without re-requesting)
- Call recording with consent
- Call analytics dashboard
- Push notifications for incoming calls
- Network fallback options
- Custom token TTL per request

## Support

- Agora Docs: https://docs.agora.io/
- Implementation: See AGORA_INTEGRATION.md
- Code: src/lib/agora.ts, src/app/api/v1/video-calls/route.ts
