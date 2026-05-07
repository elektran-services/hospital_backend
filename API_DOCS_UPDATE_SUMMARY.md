# ✅ API Documentation Updated with Video Call Endpoint

## Changes Made

### 1. Updated OpenAPI Specification
**File:** `src/app/api/v1/openapi/route.ts`

#### Added to Quick Start Section (Line 36-42):
- Patient mobile app workflow now includes video call step
- Doctor mobile app workflow now includes video call step

#### Added Video Calling Overview Section (Line 44-62):
```
🎥 Video Calling (Real-Time Communication)
- Explains the 3-step process: Get Token → Join Channel → Video Call
- Details about token validity (24 hours)
- Role assignment (Doctor = Publisher, Patient = Subscriber)
- Security notes about App Certificate
```

#### Added Full Endpoint Documentation (Line 1277-1374):
```
POST /api/v1/video-calls/token
├── Summary: 🎥 Generate Agora Video Call Token
├── Description: Full technical description
├── Tags: Video Calls
├── Security: Requires Bearer authentication
├── Request Body:
│   ├── branchId (uuid, required)
│   ├── doctorId (uuid, required)
│   └── patientId (uuid, required)
├── Response (200):
│   └── Agora token + channel name + uid + expiration
├── Error Responses:
│   ├── 400: Bad Request
│   ├── 401: Unauthorized
│   ├── 403: Forbidden
│   ├── 404: Not Found
│   ├── 409: Conflict
│   └── 500: Server Error
```

## What's Now Visible in API Docs

When users visit `/api-docs`, they'll see:

✅ **Video Calls section** in the endpoint listing  
✅ **Full request/response examples**  
✅ **All error scenarios documented**  
✅ **Parameter descriptions and types**  
✅ **Try it out functionality** (if authenticated)  
✅ **Security requirements** (Bearer token)  

## Access Points

### 1. Swagger UI
Visit: `http://localhost:3000/api-docs`

The video call endpoint will appear under:
- **Tag:** Video Calls
- **Operation:** POST /api/v1/video-calls/token

### 2. OpenAPI JSON
Visit: `http://localhost:3000/api/v1/openapi`

The endpoint is fully specified in the paths section.

## Testing in Swagger UI

After authentication:
1. Navigate to "Video Calls" section
2. Find "POST /api/v1/video-calls/token"
3. Click "Try it out"
4. Enter valid UUIDs for:
   - branchId
   - doctorId
   - patientId
5. Execute and see the token response

## Documentation Structure

The API documentation now flows as:

```
Quick Start (Updated)
  ├─ Patient Mobile: ... + Video Call step
  ├─ Doctor Mobile: ... + Video Call step
  └─ Video Calling Overview
  
Endpoints Section
  ├─ Health
  ├─ Hospitals (Public)
  ├─ Branches (Public)
  ├─ Auth (various)
  ├─ Doctors
  ├─ Patients
  ├─ Appointments
  └─ Video Calls ← NEW ENDPOINT
```

## Completeness Check

✅ Endpoint documented in OpenAPI spec  
✅ Request parameters fully defined  
✅ Response schema with examples  
✅ All error codes documented  
✅ Security requirements specified  
✅ Accessible in Swagger UI  
✅ Accessible via JSON endpoint  
✅ Integrated into quick start guides  

---

**The video call integration is now fully documented and visible in your API docs!**
