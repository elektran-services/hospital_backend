# Firebase FCM Integration - Quick Setup & Testing Guide

## ⚡ Quick Start (5 Minutes)

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Firebase Environment Variable

Get your Firebase service account JSON:
1. Go to Firebase Console → Your Project → Project Settings
2. Click "Service Accounts" tab
3. Click "Generate New Private Key"
4. Copy the entire JSON

Add to `.env.local`:
```
FIREBASE_SERVICE_ACCOUNT_JSON='{"type":"service_account","project_id":"...","private_key":"...","...":"..."}'
```

### 3. Run Database Migration
```bash
npx prisma migrate dev --name add_fcm_and_call_sessions
```

This creates:
- `DeviceToken` table - stores device FCM tokens
- `CallSession` table - tracks video call sessions

### 4. Restart Server
```bash
npm run dev
```

✅ **Setup Complete!** Firebase integration is now ready.

---

## 🧪 Testing the Integration

### Test 1: Register Device Token

**Scenario:** User installs mobile app and needs to register their device for push notifications

```bash
# Step 1: Get access token (login as patient)
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "patient@example.com",
    "password": "password123"
  }'

# Response: { "accessToken": "eyJhb..." }
# Save this token as TOKEN_PATIENT
```

**Step 2: Register device FCM token**
```bash
TOKEN_PATIENT="eyJhb..."

curl -X POST http://localhost:3000/api/v1/video-calls/register-device-token \
  -H "Authorization: Bearer $TOKEN_PATIENT" \
  -H "Content-Type: application/json" \
  -d '{
    "fcmToken": "eGVtcDpMeC8yRjU2OkFQQTkxYlFBQmlBaW...",
    "deviceType": "ios"
  }'

# Expected Response (201):
# {
#   "success": true,
#   "message": "Device token registered successfully",
#   "data": { "deviceTokenId": "3fa85f64-5717-4562-b3fc-2c963f66afa6" }
# }
```

✅ **Pass:** Device token successfully stored in database

---

### Test 2: Create an Appointment

**Prerequisite:** You need a doctor and patient in the same hospital and branch

```bash
# Get doctor and patient tokens
TOKEN_DOCTOR="doctor_token_here"
TOKEN_PATIENT="patient_token_here"

# Create an appointment as admin
TOKEN_ADMIN="admin_token_here"

curl -X POST http://localhost:3000/api/v1/appointments \
  -H "Authorization: Bearer $TOKEN_ADMIN" \
  -H "Content-Type: application/json" \
  -d '{
    "doctorId": "doctor-uuid",
    "patientId": "patient-uuid",
    "branchId": "branch-uuid",
    "appointmentDate": "2024-03-10",
    "appointmentTime": "14:00",
    "appointmentType": "virtual",
    "reason": "General Consultation"
  }'

# Response includes appointmentId
```

**Confirm the appointment** (doctor accepts it):
```bash
APPOINTMENT_ID="appointment-uuid"

curl -X PUT http://localhost:3000/api/v1/appointments/$APPOINTMENT_ID/confirm \
  -H "Authorization: Bearer $TOKEN_DOCTOR" \
  -H "Content-Type: application/json" \
  -d '{}'

# Status should change to "confirmed"
```

✅ **Pass:** Appointment is confirmed and ready for video call

---

### Test 3: Initiate Incoming Call (Core Test)

**Scenario:** Doctor initiates a video call, patient receives push notification

```bash
APPOINTMENT_ID="appointment-uuid"
PATIENT_ID="patient-uuid"
TOKEN_DOCTOR="doctor_token_here"

curl -X POST http://localhost:3000/api/v1/video-calls/initiate \
  -H "Authorization: Bearer $TOKEN_DOCTOR" \
  -H "Content-Type: application/json" \
  -d '{
    "appointmentId": "'$APPOINTMENT_ID'",
    "receiverId": "'$PATIENT_ID'"
  }'

# Expected Response (201):
# {
#   "success": true,
#   "message": "Call initiated successfully",
#   "data": {
#     "sessionId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
#     "channelId": "branch_123_doctor_456_patient_789",
#     "callerToken": "006d40e63ef01d0...",
#     "notificationSent": true,
#     "messageId": "projects/my-project/messages/1234567890"
#   }
# }
```

**What happens:**
1. ✅ CallSession created in database
2. ✅ Patient's device token found
3. ✅ Agora tokens generated (PUBLISHER for doctor, SUBSCRIBER for patient)
4. ✅ FCM push notification sent to patient's phone
5. ✅ Session ID returned for caller

**Common Errors:**
- `"error": "Appointment not found"` → Check appointmentId
- `"error": "Appointment must be confirmed and virtual type"` → Confirm appointment first
- `"error": "FCM token not found"` → Patient hasn't registered device token
- `"error": "Active call session already exists"` → Call already in progress (end first)

---

### Test 4: Get Call Session Details

**Scenario:** Mobile app needs call details to join video call

```bash
SESSION_ID="session-uuid"
TOKEN_PATIENT="patient_token_here"

curl -X GET http://localhost:3000/api/v1/video-calls/session/$SESSION_ID \
  -H "Authorization: Bearer $TOKEN_PATIENT"

# Expected Response (200):
# {
#   "success": true,
#   "data": {
#     "sessionId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
#     "channelId": "branch_123_doctor_456_patient_789",
#     "token": "006d40e63ef01d0...",        ← Patient gets SUBSCRIBER token
#     "uid": "patient-uuid",
#     "userRole": "receiver",
#     "sessionStatus": "CONNECTING",
#     "callStatus": "confirmed",
#     "doctor": {
#       "id": "doctor-uuid",
#       "name": "Dr. Smith",
#       "email": "doctor@hospital.com"
#     },
#     "patient": {
#       "id": "patient-uuid",
#       "name": "John Doe",
#       "email": "patient@hospital.com"
#     },
#     "hospital": {
#       "id": "hospital-uuid",
#       "name": "General Hospital",
#       "logo": "https://..."
#     },
#     "branch": {
#       "id": "branch-uuid",
#       "name": "Downtown Branch"
#     }
#   }
# }
```

**Key Features:**
- Patient gets their own `receiverToken` (not caller's)
- Includes all call metadata needed by mobile app
- Doctor would get different response with their token

---

### Test 5: End Call Session

**Scenario:** Call ends, need to record duration and close session

```bash
SESSION_ID="session-uuid"
TOKEN_PATIENT="patient_token_here"

curl -X POST http://localhost:3000/api/v1/video-calls/end \
  -H "Authorization: Bearer $TOKEN_PATIENT" \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "'$SESSION_ID'",
    "callStatus": "COMPLETED"
  }'

# Expected Response (200):
# {
#   "success": true,
#   "message": "Call ended successfully",
#   "data": {
#     "sessionId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
#     "duration": 1245,              ← Call duration in seconds
#     "status": "COMPLETED"
#   }
# }
```

**What happens:**
1. ✅ CallSession updated with status "COMPLETED"
2. ✅ Call end time recorded
3. ✅ Duration calculated (in seconds)
4. ✅ Appointment marked as "completed"
5. ✅ Video call metrics stored

---

## 🔄 Complete End-to-End Test Flow

Run all tests in sequence:

### Setup Phase
```bash
#!/bin/bash

# 1. User logins (patient and doctor)
TOKEN_PATIENT=$(curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "patient@hospital.com", "password": "pass"}' | jq -r '.accessToken')

TOKEN_DOCTOR=$(curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "doctor@hospital.com", "password": "pass"}' | jq -r '.accessToken')

echo "Patient token: $TOKEN_PATIENT"
echo "Doctor token: $TOKEN_DOCTOR"

# 2. Patient registers device token
curl -X POST http://localhost:3000/api/v1/video-calls/register-device-token \
  -H "Authorization: Bearer $TOKEN_PATIENT" \
  -H "Content-Type: application/json" \
  -d '{
    "fcmToken": "eGVtcDpMeC8yRjU2OkFQQTkxYlFBQmlBaW...",
    "deviceType": "ios"
  }' | jq .

# 3. Create and confirm appointment (use existing IDs)
DOCTOR_ID="doctor-uuid"
PATIENT_ID="patient-uuid"
BRANCH_ID="branch-uuid"
HOSPITAL_ID="hospital-uuid"

# Create appointment (as admin)
APPOINTMENT_ID=$(curl -s -X POST http://localhost:3000/api/v1/appointments \
  -H "Authorization: Bearer $TOKEN_DOCTOR" \
  -H "Content-Type: application/json" \
  -d '{
    "doctorId": "'$DOCTOR_ID'",
    "patientId": "'$PATIENT_ID'",
    "branchId": "'$BRANCH_ID'",
    "appointmentDate": "2024-03-15",
    "appointmentTime": "14:00",
    "appointmentType": "virtual",
    "reason": "Consultation"
  }' | jq -r '.data.appointmentId')

echo "Appointment ID: $APPOINTMENT_ID"

# 4. Doctor confirms appointment
curl -X PUT http://localhost:3000/api/v1/appointments/$APPOINTMENT_ID/confirm \
  -H "Authorization: Bearer $TOKEN_DOCTOR" \
  -H "Content-Type: application/json" \
  -d '{}' | jq .
```

### Call Phase
```bash
# 5. Doctor initiates call
SESSION_ID=$(curl -s -X POST http://localhost:3000/api/v1/video-calls/initiate \
  -H "Authorization: Bearer $TOKEN_DOCTOR" \
  -H "Content-Type: application/json" \
  -d '{
    "appointmentId": "'$APPOINTMENT_ID'",
    "receiverId": "'$PATIENT_ID'"
  }' | jq -r '.data.sessionId')

echo "Session ID: $SESSION_ID"

# 6. Patient joins (simulating)
curl -X GET http://localhost:3000/api/v1/video-calls/session/$SESSION_ID \
  -H "Authorization: Bearer $TOKEN_PATIENT" | jq .

# 7. Simulate 30-second call...
echo "Call in progress for 30 seconds..."
sleep 30

# 8. End call
curl -X POST http://localhost:3000/api/v1/video-calls/end \
  -H "Authorization: Bearer $TOKEN_PATIENT" \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "'$SESSION_ID'",
    "callStatus": "COMPLETED"
  }' | jq .

echo "✅ Test Complete!"
```

---

## 📊 Verify Database State

After running tests, verify data was stored:

```bash
# Using Prisma Studio
npx prisma studio

# Or query directly via database client:
# SELECT * FROM public."DeviceToken" LIMIT 5;
# SELECT * FROM public."CallSession" LIMIT 5;
```

Expected data:
- DeviceToken with `fcmToken`, `userId`, `deviceType`
- CallSession with `appointmentId`, `channelId`, `agoraCallerToken`, `agoraReceiverToken`

---

## 🚨 Troubleshooting Tests

### Problem: "Firebase not initialized"
```
Solution: Check .env.local has FIREBASE_SERVICE_ACCOUNT_JSON
          Restart server with: npm run dev
```

### Problem: "Device token not found"
```
Solution: Run Test 1 first to register device token
          Verify deviceType is lowercase: "ios", "android", or "web"
```

### Problem: "Appointment not found"
```
Solution: Create appointment first using proper UUIDs
          Verify appointmentId format: "550e8400-e29b-41d4-a716-446655440000"
```

### Problem: "Unauthorized to access"
```
Solution: Verify user is part of call (doctor or patient)
          Check hospitalId matches (tenancy)
```

---

## 📱 Mobile App Integration Checklist

After backend is tested:

- [ ] Mobile app has Firebase Firebase Messaging SDK integrated
- [ ] Mobile app calls `/register-device-token` on login
- [ ] Mobile app handles `incoming_call` notification type
- [ ] Mobile app joins Agora channel with received token
- [ ] Mobile app calls `/session/{sessionId}` to get call details
- [ ] Mobile app calls `/end` when call is finished
- [ ] Test on physical device (emulator may not receive FCM)
- [ ] Test with airplane mode then re-enable (network toggle)

---

## 🎯 Key Metrics to Monitor

1. **Device Token Registration Rate** - % of users who register
2. **Notification Delivery Rate** - % of sent notifications that arrive
3. **Call Setup Time** - Time from initiate to join
4. **Call Duration** - Average length of video calls
5. **Session Errors** - Failed call sessions

---

## ✅ Success Criteria

All tests pass when:

1. ✅ Device tokens register without errors
2. ✅ Call initiates and creates CallSession
3. ✅ FCM notification sent (check Firebase logs)
4. ✅ Both users get their respective tokens
5. ✅ Call ends and duration is recorded
6. ✅ Database contains complete call history
7. ✅ Multi-tenant isolation is enforced
8. ✅ Unauthorized users cannot access calls

---

**Ready to test?** Start with Test 1 and work through sequentially!
