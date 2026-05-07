import { NextResponse } from "next/server";

const serverUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://localhost:3000";

const openapiSpec = {
  openapi: "3.1.0",
  info: {
    title: "Hospital SaaS API",
    version: "v1",
    description: `# Hospital SaaS Platform API

Enterprise-grade REST API for multi-tenant hospital management system.  
**Authentication:** JWT-based | **Tenancy:** hospital_id scoped | **RBAC:** Role-based access control

Shared across: **Web Admin** | **Doctor Mobile App** | **Patient Mobile App**

---

## 📖 Quick Start

### 🌐 For Super Admins (Web)
1. **Signup:** \`POST /api/v1/auth/super-admin/signup\` (with hospital logo)
2. **Verify:** \`POST /api/v1/auth/verify-email\` (email token)
3. **Login:** \`POST /api/v1/auth/login\`
4. **Manage:** Access hospitals, branches, doctors, patients

### 🔵 For Patients (Mobile App)
1. **Browse Hospitals:** \`GET /api/v1/hospitals/public\` (select hospital)
2. **View Branches:** \`GET /api/v1/branches/public?hospitalId=xxx\` (select preferred branch)
3. **Register:** \`POST /api/v1/auth/patients/register\` (OTP sent, expires in 10 min)
4. **Verify OTP:** \`POST /api/v1/auth/patients/verify-otp\` (6-digit code)
   - If OTP expired: \`POST /api/v1/auth/patients/resend-otp\` (get new OTP)
5. **Login:** \`POST /api/v1/auth/patients/login\`
6. **Update Profile:** \`PATCH /api/v1/patients/me\` (personal info, medical baseline, emergency contact)
7. **Book Appointment:** \`POST /api/v1/appointments\` (at any branch)
8. **View History:** \`GET /api/v1/appointments/history?status=upcoming\` (track appointments)
9. **Reschedule:** \`PATCH /api/v1/appointments/{id}/reschedule\` (change date/time)
10. **Cancel:** \`POST /api/v1/appointments/{id}/cancel\` (with reason)
11. **Start Video Call:** \`POST /api/v1/video-calls/token\` (get Agora token for real-time call)

### 🔵 For Doctors (Mobile App)
1. Created by Super Admin or Branch Manager via web admin
2. **Login:** \`POST /api/v1/auth/login\`
3. **View Appointments:** \`GET /api/v1/appointments/history?status=upcoming\` (see scheduled patients)
4. **Manage:** View appointments, patients assigned to your branch
5. **Start Video Call:** \`POST /api/v1/video-calls/token\` (get Agora token for real-time call)

---

## 🎥 Video Calling (Real-Time Communication)

Doctors and patients can conduct real-time video/audio consultations using Agora.io:

1. **Get Token:** \`POST /api/v1/video-calls/token\` 
   - Send: branchId, doctorId, patientId
   - Receive: Agora token, channel name, user ID
2. **Join Channel:** Use Agora SDK with received token
3. **Video Call:** Real-time communication enabled

**Token Details:**
- **Validity:** 24 hours
- **Role Assignment:** Patient = Publisher (broadcast), Doctor = Subscriber (receive)
- **Channel:** Unique per doctor-patient pair
- **Security:** Server-generated, never expose App Certificate

### 🎥 Video Calling Integration Guide

#### Mobile App Integration (JavaScript/React)

\`\`\`javascript
// 1. Get access token (from login endpoint)
const accessToken = userLoginResponse.tokens.accessToken;

// 2. Request video call token
const tokenResponse = await fetch('/api/v1/video-calls/token', {
  method: 'POST',
  headers: {
    'Authorization': \`Bearer \${accessToken}\`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    branchId: '550e8400-e29b-41d4-a716-446655440000',
    doctorId: '6ba7b810-950c-7e8c-e41d-4f0000000001',
    patientId: '6ba7b810-950c-7e8c-e41d-4f0000000002'
  })
});

const { data } = await tokenResponse.json();

// 3. Initialize Agora SDK with token (use agoraAppId from response)
const agoraEngine = AgoraRTC.createClient({ mode: 'rtc', codec: 'h264' });
await agoraEngine.join(data.agoraAppId, data.channelName, data.caller.account, data.caller.token);

// 3b. For doctor (subscriber role)
// await agoraEngine.join(data.agoraAppId, data.channelName, data.receiver.account, data.receiver.token);

// 4. Publish/Subscribe streams
await agoraEngine.publish(audioTrack, videoTrack);

// 5. Handle remote streams
agoraEngine.on('user-published', async (user) => {
  await agoraEngine.subscribe(user, 'video');
  videoContainer.appendChild(user.videoTrack.play('video-player'));
});
\`\`\`

#### iOS Integration (Swift)

\`\`\`swift
import AgoraRtcKit

// Request token
let url = URL(string: "https://api.example.com/api/v1/video-calls/token")!
var request = URLRequest(url: url)
request.httpMethod = "POST"
request.setValue("Bearer \\(accessToken)", forHTTPHeaderField: "Authorization")

let body = [
  "branchId": "550e8400-e29b-41d4-a716-446655440000",
  "doctorId": "6ba7b810-950c-7e8c-e41d-4f0000000001",
  "patientId": "6ba7b810-950c-7e8c-e41d-4f0000000002"
]
request.httpBody = try JSONEncoder().encode(body)

URLSession.shared.dataTask(with: request) { data, response, error in
  let tokenResponse = try JSONDecoder().decode(TokenResponse.self, from: data!)
  
  // Initialize Agora SDK with agoraAppId from response
  let agoraKit = AgoraRtcEngineKit.sharedEngine(withAppId: tokenResponse.data.agoraAppId, delegate: self)
  agoraKit.joinChannel(byToken: tokenResponse.data.caller.token,
                       channelId: tokenResponse.data.channelName,
                       info: nil,
                       uid: UInt32(tokenResponse.data.caller.account) ?? 0)
}.resume()
\`\`\`

#### Android Integration (Kotlin)

\`\`\`kotlin
import io.agora.rtc2.RtcEngine
import okhttp3.OkHttpClient

// Request token
val client = OkHttpClient()
val request = Request.Builder()
  .url("https://api.example.com/api/v1/video-calls/token")
  .post(jsonBody.toRequestBody())
  .addHeader("Authorization", "Bearer \$accessToken")
  .build()

client.newCall(request).execute().use { response ->
  val tokenResponse = JSONObject(response.body!!.string())
  val data = tokenResponse.getJSONObject("data")
  val agoraAppId = data.getString("agoraAppId")
  val token = data.getJSONObject("caller").getString("token")
  val channelName = data.getString("channelName")
  val uid = data.getJSONObject("caller").getString("account").hashCode()
  
  // Initialize Agora with agoraAppId from response
  val rtcEngine = RtcEngine.create(context, agoraAppId, null)
  rtcEngine.joinChannel(token, channelName, uid)
}
\`\`\`

#### Security & Best Practices

1. **Never Expose App Certificate**
   - Keep \`AGORA_APP_CERTIFICATE\` server-side only
   - Never include in frontend/mobile code
   - Use agoraAppId from API response, never hardcode it

2. **Token Expiration Handling**
   - Tokens expire after 24 hours
   - Request new token for fresh calls
   - For calls > 23.5 hours: Refresh token before expiration

3. **Error Handling**
   - Implement retry logic for network errors
   - Handle all 6 error codes (400, 401, 403, 404, 409, 500)
   - Display user-friendly error messages

4. **Privacy & Compliance**
   - Require user consent before video call
   - Log calls for audit trail (optional)
   - Respect GDPR/privacy regulations for call data

#### Common Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| 403 Forbidden | Not doctor/patient in call | Verify you're requesting for your own call |
| 404 Not Found | User doesn't exist | Check IDs in user database |
| 409 Conflict | Different hospital | Ensure doctor/patient in same hospital |
| Token expired | > 24 hours old | Request new token |
| Cannot join channel | Wrong channel name | Verify channel name matches exactly |

---

## 🏥 Understanding Hospital vs Branch

### 🏢 Hospital (Tenant/Organization)
**What it is:** The top-level business entity representing the entire organization.

**Purpose:** Data isolation boundary (multi-tenancy)

**Examples:**
- "City Hospital Network"
- "ABC Medical Group"
- "Downtown Family Clinic"

### 📍 Branch (Physical Location)
**What it is:** A specific physical location where medical services are delivered.

**Purpose:** Location-based operations and staff assignments

**Relationship:** Every branch belongs to exactly ONE hospital.

**Examples for "City Hospital Network":**

| Branch | Location | Type |
|--------|----------|------|
| City Hospital - Downtown | 123 Main Street | Head Office |
| City Hospital - Uptown | 456 Oak Avenue | Branch |
| City Hospital - Suburbs | 789 Park Road | Branch |

---

## 🔗 Data Model Relationship

\`\`\`
Hospital (hospital_id: abc-123)
│
├── Branch 1 (branch_id: xyz-001, hospitalId: abc-123)
│   ├── Doctor A (userId: doc-1, branchId: xyz-001)
│   └── Doctor B (userId: doc-2, branchId: xyz-001)
│
├── Branch 2 (branch_id: xyz-002, hospitalId: abc-123)
│   └── Doctor C (userId: doc-3, branchId: xyz-002)
│
└── Patient X (userId: pat-1, branchId: null)
    └── Can book appointments at ANY branch
\`\`\`

**Key Insight:** \`hospitalId\` ensures data isolation; \`branchId\` enables location-specific workflows.

---

## 📊 Real-World Scenarios

### Scenario A: Single-Location Clinic
\`\`\`
Hospital: "Downtown Family Clinic"
  └── Branch: "Main Office" (isHeadBranch: true)
      ├── 3 Doctors
      ├── 150 Patients
      └── Simple management (no branch switching)
\`\`\`

### Scenario B: Multi-Branch Hospital Chain
\`\`\`
Hospital: "MedCare Hospital Group"
  ├── Branch: "MedCare Central" (Head Office)
  │   ├── 15 Doctors | 2,000 Patients
  │   └── Admin offices
  ├── Branch: "MedCare North"
  │   ├── 8 Doctors | 800 Patients
  │   └── Emergency services
  └── Branch: "MedCare South"
      ├── 10 Doctors | 1,200 Patients
      └── Specialized care
\`\`\`

---

## 🔐 Security & Tenancy Model

### Hospital ID (Tenant Boundary)
- **Purpose:** Data isolation between organizations
- **Rule:** ALL database queries MUST include \`hospitalId\`
- **Guarantee:** Hospital A can NEVER access Hospital B's data
- **Used in:** Authentication tokens, API authorization, database queries

### Branch ID (Location Filter)
- **Purpose:** Location-based operations within a hospital
- **Optional for:** Patients (can visit any branch)
- **Required for:** Doctors, Branch Managers (assigned to specific location)
- **Used in:** Appointments, staff assignments, location-specific reports

---

## 👥 Role-Based Access Control (RBAC)

| Role | Hospital ID | Branch ID | Scope | Permissions |
|------|-------------|-----------|-------|-------------|
| **SYSTEM_ADMIN** | — | — | Platform-wide | Create/manage all hospitals |
| **SUPER_ADMIN** | ✅ Required | ❌ null | Entire hospital | Manage all branches, users, settings |
| **BRANCH_MANAGER** | ✅ Required | ✅ Required | Single branch | Manage assigned branch only |
| **DOCTOR** | ✅ Required | ✅ Required | Single branch | View patients, manage appointments |
| **PATIENT** | ✅ Required | ❌ null | Hospital-wide | Book appointments at any branch |

---

## 🔑 Authentication Flow

### Admin/Doctor Login
\`\`\`
POST /api/v1/auth/login
  → Returns: accessToken + refreshToken
  → Mobile: Store tokens securely
  → Web: Cookies set automatically
\`\`\`

### Patient Registration & Login
\`\`\`
1. GET /api/v1/hospitals/public → Select hospital
2. POST /api/v1/auth/patients/register → Receive OTP via email (expires in 10 min)
3. POST /api/v1/auth/patients/verify-otp → Activate account
   - If OTP expired: POST /api/v1/auth/patients/resend-otp → Get new OTP
4. POST /api/v1/auth/patients/login → Get access tokens
\`\`\`

### Token Refresh
\`\`\`
POST /api/v1/auth/refresh
  → Extends session without re-authentication
  → Access Token: 15 minutes
  → Refresh Token: 30 days
\`\`\`

---

## 📱 Mobile App Integration

### Patient Onboarding Flow

#### Step 1: Browse Hospitals (Public)
\`\`\`typescript
// No authentication required
const response = await fetch('https://localhost:3000/api/v1/hospitals/public?page=1&pageSize=20');
const { items, total } = await response.json();
// Display hospital list with logos
\`\`\`

#### Step 2: View Branches for Selected Hospital
\`\`\`typescript
// User selected hospital
const hospitalId = selectedHospital.id;

const response = await fetch(\`https://localhost:3000/api/v1/branches/public?hospitalId=\${hospitalId}\`);
const { hospital, branches, total } = await response.json();

// Response includes:
// - hospital: { id, name, logo, logoUrl }
// - branches: [{ id, name, address, city, state, phone, email, isHeadBranch }]
\`\`\`

#### Step 3: Register & Complete Profile
See **Auth - Mobile (Patient)** endpoints for registration, OTP verification, and login.

### Headers Required (Authenticated Requests)
\`\`\`http
Authorization: Bearer <accessToken>
Content-Type: application/json
\`\`\`

### Base URL
- **Development:** \`https://localhost:3000\`
- **Production:** Configure \`NEXT_PUBLIC_APP_URL\`

### Image URLs
All logo URLs are returned as full paths ready for mobile use:
\`\`\`json
{
  "logoUrl": "https://localhost:3000/uploads/hospitals/abc-123.png"
}
\`\`\`

---`,
  },
  servers: [
    {
      url: serverUrl,
      description: "Local/dev server",
    },
  ],
  tags: [
    { name: "Health", description: "API health check" },
    { name: "Auth - Web", description: "Authentication for Web Admin (Super Admin, Branch Manager)" },
    { name: "Auth - Mobile (Patient)", description: "🔵 MOBILE: Patient authentication with OTP verification" },
    { name: "Auth - Mobile (Doctor)", description: "🔵 MOBILE: Doctor authentication" },
    { name: "Hospitals", description: "Hospital management (Web Admin)" },
    { name: "Hospitals - Mobile", description: "🔵 MOBILE: Public hospital & branch discovery (no auth required)" },
    { name: "Branches", description: "Branch management (Web Admin)" },
    { name: "Users", description: "User management (Web Admin)" },
    { name: "Managers", description: "Branch Manager management & assignment (Web Admin)" },
    { name: "Doctors", description: "Doctor management (Web Admin)" },
    { name: "Patients - Web", description: "Patient management for admins (Web Admin)" },
    { name: "Patients - Mobile", description: "🔵 MOBILE: Patient profile management" },
    { name: "Appointments", description: "Appointment management (Web Admin & Mobile)" },
  ],
  paths: {
    "/api/v1/health": {
      get: {
        summary: "Health check",
        tags: ["Health"],
        responses: {
          200: {
            description: "API is reachable",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    status: { type: "string", example: "ok" },
                    version: { type: "string", example: "v1" },
                    message: { type: "string" },
                  },
                  required: ["status", "version"],
                },
              },
            },
          },
        },
      },
    },
    "/api/v1/hospitals/public": {
      get: {
        summary: "🔵 MOBILE: Browse Hospitals (Public)",
        description: "Returns paginated hospitals without authentication. Intended for public discovery or onboarding flows. Patients select a hospital before registration. Includes full logo URLs (logoUrl) for display in mobile apps.",
        tags: ["Hospitals - Mobile"],
        parameters: [
          { $ref: "#/components/parameters/PageParam" },
          { $ref: "#/components/parameters/PageSizeParam" },
        ],
        responses: {
          200: {
            description: "Paginated hospitals",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    items: { type: "array", items: { $ref: "#/components/schemas/Hospital" } },
                    total: { type: "integer", example: 1 },
                    page: { type: "integer", example: 1 },
                    pageSize: { type: "integer", example: 20 },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/v1/branches/public": {
      get: {
        summary: "🔵 MOBILE: Get Hospital Branches (Public)",
        description: "Returns all branches for a specific hospital. Used by mobile apps after patient selects a hospital from /api/v1/hospitals/public. No authentication required. Branches are sorted with head branch first.",
        tags: ["Hospitals - Mobile"],
        parameters: [
          {
            name: "hospitalId",
            in: "query",
            required: true,
            description: "Hospital UUID to get branches for",
            schema: { type: "string", format: "uuid" },
            example: "550e8400-e29b-41d4-a716-446655440000",
          },
          { $ref: "#/components/parameters/PageParam" },
          { $ref: "#/components/parameters/PageSizeParam" },
        ],
        responses: {
          200: {
            description: "Branches for the selected hospital",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    hospital: {
                      type: "object",
                      properties: {
                        id: { type: "string", format: "uuid" },
                        name: { type: "string", example: "City Hospital Network" },
                        logo: { type: "string", nullable: true },
                        logoUrl: { type: "string", format: "url", example: "https://localhost:3000/uploads/hospitals/logo.png" },
                      },
                    },
                    branches: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          id: { type: "string", format: "uuid" },
                          name: { type: "string", example: "City Hospital - Downtown" },
                          address: { type: "string", example: "123 Main Street" },
                          city: { type: "string", example: "Lagos", nullable: true },
                          state: { type: "string", example: "Lagos State", nullable: true },
                          country: { type: "string", example: "Nigeria", nullable: true },
                          phone: { type: "string", example: "+2348012345678" },
                          email: { type: "string", format: "email", example: "downtown@cityhospital.com" },
                          isHeadBranch: { type: "boolean", example: true },
                          createdAt: { type: "string", format: "date-time" },
                        },
                      },
                    },
                    total: { type: "integer", example: 3 },
                    page: { type: "integer", example: 1 },
                    pageSize: { type: "integer", example: 20 },
                  },
                },
              },
            },
          },
          400: { description: "Invalid hospitalId parameter" },
          404: { description: "Hospital not found" },
        },
      },
    },
    "/api/v1/auth/super-admin/signup": {
      post: {
        summary: "Super Admin signup (creates hospital + pending admin)",
        description:
          "Creates a hospital tenant with a default head office branch, pending Super Admin user, and verification token. Status stays PENDING until email verification.\n\n**Hospital logo is REQUIRED** - you must use 'multipart/form-data' and upload a logo image.\n\nAll hospitals can expand to multiple branches later.",
        tags: ["Auth - Web"],
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: { $ref: "#/components/schemas/SuperAdminSignupRequestMultipart" },
              encoding: {
                logo: {
                  contentType: "image/jpeg, image/png, image/webp"
                }
              }
            },
          },
        },
        responses: {
          200: {
            description: "Signup accepted; verification required",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/SuperAdminSignupResponse" },
              },
            },
          },
          400: { description: "Validation or business rule error" },
        },
      },
    },
    "/api/v1/auth/verify-email": {
      post: {
        summary: "Verify email token (Web)",
        tags: ["Auth - Web"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/VerifyEmailRequest" },
            },
          },
        },
        responses: {
          200: {
            description: "Email verified; account activated",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/VerifyEmailResponse" },
              },
            },
          },
          400: { description: "Invalid or expired token" },
        },
      },
    },
    "/api/v1/auth/login": {
      post: {
        summary: "🔵 MOBILE (Doctor) & Web Admin Login",
        tags: ["Auth - Web", "Auth - Mobile (Doctor)"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/LoginRequest" },
            },
          },
        },
        responses: {
          200: {
            description: "Authenticated; returns access/refresh tokens",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/LoginResponse" },
              },
            },
          },
          401: { description: "Invalid credentials" },
        },
      },
    },
    "/api/v1/auth/refresh": {
      post: {
        summary: "Refresh access token (All platforms)",
        tags: ["Auth - Web", "Auth - Mobile (Patient)", "Auth - Mobile (Doctor)"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/RefreshRequest" },
            },
          },
        },
        responses: {
          200: {
            description: "Returns new token pair",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/RefreshResponse" },
              },
            },
          },
          401: { description: "Invalid refresh token" },
        },
      },
    },
    "/api/v1/auth/patients/register": {
      post: {
        summary: "🔵 MOBILE: Patient Registration",
        description: "Register a new patient account. Patient must select a hospital first from /api/v1/hospitals/public. A 6-digit OTP will be sent to the provided email for verification. OTP expires after 10 minutes. Account status is PENDING until OTP verification.",
        tags: ["Auth - Mobile (Patient)"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/PatientRegisterRequest" },
            },
          },
        },
        responses: {
          200: {
            description: "Registration successful, OTP sent to email",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/PatientRegisterResponse" },
              },
            },
          },
          400: { description: "Validation error or email already exists" },
          404: { description: "Hospital not found" },
          429: { description: "Too many registration attempts" },
        },
      },
    },
    "/api/v1/auth/patients/verify-otp": {
      post: {
        summary: "🔵 MOBILE: Patient OTP Verification",
        description: "Verify email address with the 6-digit OTP code sent during registration. OTP expires after 10 minutes. This activates the patient account and changes status from PENDING to ACTIVE.",
        tags: ["Auth - Mobile (Patient)"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/PatientVerifyOtpRequest" },
            },
          },
        },
        responses: {
          200: {
            description: "Email verified successfully, account activated",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/PatientVerifyOtpResponse" },
              },
            },
          },
          400: { description: "Invalid or expired OTP" },
          404: { description: "User not found or already verified" },
          429: { description: "Too many verification attempts" },
        },
      },
    },
    "/api/v1/auth/patients/resend-otp": {
      post: {
        summary: "🔵 MOBILE: Resend OTP",
        description: "Resend a new OTP code to a pending patient account. OTPs expire after 10 minutes. Limited to 3 attempts per 10 minutes to prevent abuse.",
        tags: ["Auth - Mobile (Patient)"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/PatientResendOtpRequest" },
            },
          },
        },
        responses: {
          200: {
            description: "New OTP sent successfully",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/PatientResendOtpResponse" },
              },
            },
          },
          400: { description: "Validation error" },
          404: { description: "User not found or already verified" },
          429: { description: "Too many resend attempts (max 3 per 10 minutes)" },
        },
      },
    },
    "/api/v1/auth/patients/login": {
      post: {
        summary: "🔵 MOBILE: Patient Login",
        description: "Authenticate a patient and receive access/refresh tokens. Account must be verified (OTP) before login.",
        tags: ["Auth - Mobile (Patient)"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/PatientLoginRequest" },
            },
          },
        },
        responses: {
          200: {
            description: "Login successful, returns tokens",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/PatientLoginResponse" },
              },
            },
          },
          401: { description: "Invalid credentials or account not active" },
          429: { description: "Too many login attempts" },
        },
      },
    },
    "/api/v1/auth/patients/change-password": {
      post: {
        summary: "🔵 MOBILE: Change Patient Password",
        description: "Change password for logged-in patient. Requires current password verification.",
        tags: ["Auth - Mobile (Patient)"],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ChangePasswordRequest" },
            },
          },
        },
        responses: {
          200: {
            description: "Password changed successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string", example: "Password changed successfully" },
                  },
                },
              },
            },
          },
          400: { description: "Validation error or same password" },
          401: { description: "Unauthorized or incorrect current password" },
          429: { description: "Too many password change attempts" },
        },
      },
    },
    "/api/v1/auth/patients/forgot-password": {
      post: {
        summary: "🔵 MOBILE: Patient Forgot Password",
        description: "**Two-step process:** \n\n**Step 1 - Request OTP:** Provide only `email` to receive OTP code via email (expires in 10 minutes).\n\n**Step 2 - Reset Password:** Provide `email`, `otp`, and `newPassword` to reset password.",
        tags: ["Auth - Mobile (Patient)"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { 
                oneOf: [
                  { $ref: "#/components/schemas/ForgotPasswordRequestStep1" },
                  { $ref: "#/components/schemas/ForgotPasswordRequestStep2" }
                ]
              },
              examples: {
                step1: {
                  summary: "Step 1: Request OTP",
                  value: { email: "patient@example.com" }
                },
                step2: {
                  summary: "Step 2: Reset Password",
                  value: { 
                    email: "patient@example.com",
                    otp: "123456",
                    newPassword: "newpassword123"
                  }
                }
              }
            },
          },
        },
        responses: {
          200: {
            description: "Step 1: OTP sent | Step 2: Password reset successful",
            content: {
              "application/json": {
                schema: {
                  oneOf: [
                    { $ref: "#/components/schemas/ForgotPasswordResponse" },
                    { 
                      type: "object",
                      properties: {
                        message: { type: "string", example: "Password reset successful. You can now login with your new password." }
                      }
                    }
                  ]
                },
              },
            },
          },
          400: { description: "Validation error or invalid OTP" },
          404: { description: "User not found (Step 2 only)" },
          429: { description: "Too many password reset attempts (max 5 per 15 minutes)" },
        },
      },
    },
    "/api/v1/auth/doctors/change-password": {
      post: {
        summary: "🔵 MOBILE: Change Doctor Password",
        description: "Change password for logged-in doctor. Requires current password verification.",
        tags: ["Auth - Mobile (Doctor)"],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ChangePasswordRequest" },
            },
          },
        },
        responses: {
          200: {
            description: "Password changed successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string", example: "Password changed successfully" },
                  },
                },
              },
            },
          },
          400: { description: "Validation error or same password" },
          401: { description: "Unauthorized or incorrect current password" },
          429: { description: "Too many password change attempts" },
        },
      },
    },
    "/api/v1/auth/doctors/forgot-password": {
      post: {
        summary: "🔵 MOBILE: Doctor Forgot Password",
        description: "**Two-step process:** \n\n**Step 1 - Request OTP:** Provide only `email` to receive OTP code via email (expires in 10 minutes).\n\n**Step 2 - Reset Password:** Provide `email`, `otp`, and `newPassword` to reset password.",
        tags: ["Auth - Mobile (Doctor)"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { 
                oneOf: [
                  { $ref: "#/components/schemas/ForgotPasswordRequestStep1" },
                  { $ref: "#/components/schemas/ForgotPasswordRequestStep2" }
                ]
              },
              examples: {
                step1: {
                  summary: "Step 1: Request OTP",
                  value: { email: "doctor@example.com" }
                },
                step2: {
                  summary: "Step 2: Reset Password",
                  value: { 
                    email: "doctor@example.com",
                    otp: "123456",
                    newPassword: "newpassword123"
                  }
                }
              }
            },
          },
        },
        responses: {
          200: {
            description: "Step 1: OTP sent | Step 2: Password reset successful",
            content: {
              "application/json": {
                schema: {
                  oneOf: [
                    { $ref: "#/components/schemas/ForgotPasswordResponse" },
                    { 
                      type: "object",
                      properties: {
                        message: { type: "string", example: "Password reset successful. You can now login with your new password." }
                      }
                    }
                  ]
                },
              },
            },
          },
          400: { description: "Validation error or invalid OTP" },
          404: { description: "User not found (Step 2 only)" },
          429: { description: "Too many password reset attempts (max 5 per 15 minutes)" },
        },
      },
    },
    "/api/v1/patients/me": {
      get: {
        summary: "🔵 MOBILE: Get Patient Profile",
        description: "Returns the complete profile of the currently authenticated patient, including personal information, medical baseline, and emergency contact.",
        tags: ["Patients - Mobile"],
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "Patient profile retrieved successfully",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/PatientProfileResponse" },
              },
            },
          },
          401: { description: "Unauthorized - requires PATIENT role" },
          404: { description: "Patient profile not found" },
        },
      },
      patch: {
        summary: "🔵 MOBILE: Update Patient Profile",
        description: "Update personal information, medical baseline data, and emergency contact details. All fields are optional - only provided fields will be updated.",
        tags: ["Patients - Mobile"],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/PatientProfileUpdateRequest" },
            },
          },
        },
        responses: {
          200: {
            description: "Profile updated successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string", example: "Profile updated successfully" },
                    profile: { $ref: "#/components/schemas/PatientProfile" },
                  },
                },
              },
            },
          },
          400: { description: "Validation error" },
          401: { description: "Unauthorized - requires PATIENT role" },
          404: { description: "Patient profile not found" },
        },
      },
    },
    "/api/v1/hospitals/me": {
      get: {
        summary: "Get current hospital details (SUPER_ADMIN)",
        description: "Returns the hospital details for the currently authenticated Super Admin. Includes branch and user counts, plus full logo URL.",
        tags: ["Hospitals"],
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "Hospital details",
            content: {
              "application/json": {
                schema: {
                  allOf: [
                    { $ref: "#/components/schemas/Hospital" },
                    {
                      type: "object",
                      properties: {
                        _count: {
                          type: "object",
                          properties: {
                            branches: { type: "integer", description: "Total number of branches" },
                            users: { type: "integer", description: "Total number of users" },
                          },
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
          401: { description: "Unauthorized" },
          403: { description: "Forbidden (must be SUPER_ADMIN)" },
          404: { description: "Hospital not found" },
        },
      },
      patch: {
        summary: "Update current hospital (SUPER_ADMIN)",
        description: "Update hospital name and/or logo. Supports both JSON (name only) and multipart/form-data (name + logo). Old logo file is automatically deleted when a new one is uploaded.",
        tags: ["Hospitals"],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: { $ref: "#/components/schemas/HospitalUpdateRequestMultipart" },
              encoding: {
                logo: {
                  contentType: "image/jpeg, image/png, image/webp"
                }
              }
            },
            "application/json": {
              schema: { $ref: "#/components/schemas/HospitalUpdateRequest" },
            },
          },
        },
        responses: {
          200: {
            description: "Hospital updated successfully",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Hospital" },
              },
            },
          },
          400: { description: "Validation error or no fields to update" },
          401: { description: "Unauthorized" },
          403: { description: "Forbidden (must be SUPER_ADMIN)" },
          404: { description: "Hospital not found" },
        },
      },
    },
    "/api/v1/hospitals": {
      get: {
        summary: "List hospitals (SYSTEM_ADMIN only)",
        description: "Returns paginated hospitals. Includes full logo URLs (logoUrl) for display.",
        tags: ["Hospitals"],
        security: [{ bearerAuth: [] }],
        parameters: [
          { $ref: "#/components/parameters/PageParam" },
          { $ref: "#/components/parameters/PageSizeParam" },
        ],
        responses: {
          200: {
            description: "Paginated hospitals",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    items: { type: "array", items: { $ref: "#/components/schemas/Hospital" } },
                    total: { type: "integer", example: 1 },
                  },
                },
              },
            },
          },
          401: { description: "Unauthorized" },
          403: { description: "Forbidden (RBAC)" },
        },
      },
      post: {
        summary: "Create hospital (SYSTEM_ADMIN) + default branch + admin flow",
        tags: ["Hospitals"],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/HospitalCreateRequest" },
            },
          },
        },
        responses: {
          201: {
            description: "Hospital created",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/HospitalCreateResponse" },
              },
            },
          },
          401: { description: "Unauthorized" },
          403: { description: "Forbidden (RBAC)" },
        },
      },
    },
    "/api/v1/branches": {
      get: {
        summary: "List branches for current hospital",
        description: "Returns paginated branches (scoped by hospital; branch managers scoped to their branch). Includes hospital data with full logo URL (hospital.logoUrl).",
        tags: ["Branches"],
        security: [{ bearerAuth: [] }],
        parameters: [
          { $ref: "#/components/parameters/PageParam" },
          { $ref: "#/components/parameters/PageSizeParam" },
        ],
        responses: {
          200: {
            description: "Paginated branches (scoped by hospital; branch managers scoped to their branch)",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    items: { type: "array", items: { $ref: "#/components/schemas/Branch" } },
                    total: { type: "integer", example: 1 },
                  },
                },
              },
            },
          },
          401: { description: "Unauthorized" },
        },
      },
      post: {
        summary: "Create branch",
        tags: ["Branches"],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/BranchCreateRequest" },
            },
          },
        },
        responses: {
          201: {
            description: "Branch created",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Branch" },
              },
            },
          },
          401: { description: "Unauthorized" },
          403: { description: "Forbidden (RBAC)" },
        },
      },
    },
    "/api/v1/users/me": {
      get: {
        summary: "Get current user profile",
        description: "Returns the profile of the currently authenticated user.",
        tags: ["Users"],
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "User profile",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/User" },
              },
            },
          },
          401: { description: "Unauthorized" },
          404: { description: "User not found" },
        },
      },
      patch: {
        summary: "Update current user profile",
        description: "Update your own profile (name, email, password). To change password, both currentPassword and newPassword are required.",
        tags: ["Users"],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/UserUpdateMeRequest" },
            },
          },
        },
        responses: {
          200: {
            description: "Profile updated successfully",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/User" },
              },
            },
          },
          400: { description: "Validation error, no fields to update, or incorrect current password" },
          401: { description: "Unauthorized" },
          404: { description: "User not found" },
        },
      },
    },
    "/api/v1/users": {
      get: {
        summary: "List users in current hospital",
        tags: ["Users"],
        security: [{ bearerAuth: [] }],
        parameters: [
          { $ref: "#/components/parameters/PageParam" },
          { $ref: "#/components/parameters/PageSizeParam" },
        ],
        responses: {
          200: {
            description: "Paginated users (branch-scoped for branch managers)",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    items: { type: "array", items: { $ref: "#/components/schemas/User" } },
                    total: { type: "integer", example: 1 },
                  },
                },
              },
            },
          },
          401: { description: "Unauthorized" },
        },
      },
      post: {
        summary: "Create user (manager/doctor/staff)",
        tags: ["Users"],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/UserCreateRequest" },
            },
          },
        },
        responses: {
          201: {
            description: "User created",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/User" },
              },
            },
          },
          401: { description: "Unauthorized" },
          403: { description: "Forbidden (RBAC)" },
        },
      },
    },
    "/api/v1/managers": {
      get: {
        summary: "List Branch Managers",
        description: "Returns all Branch Managers in the hospital with their branch assignments. Includes statistics showing total, assigned, and unassigned managers. Super Admin can filter by branch or status.",
        tags: ["Managers"],
        security: [{ bearerAuth: [] }],
        parameters: [
          { $ref: "#/components/parameters/PageParam" },
          { $ref: "#/components/parameters/PageSizeParam" },
          {
            name: "branchId",
            in: "query",
            required: false,
            description: "Filter by specific branch",
            schema: { type: "string", format: "uuid" },
          },
          {
            name: "status",
            in: "query",
            required: false,
            description: "Filter by user status",
            schema: {
              type: "string",
              enum: ["ACTIVE", "PENDING", "SUSPENDED"],
            },
          },
        ],
        responses: {
          200: {
            description: "List of managers with statistics",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    items: {
                      type: "array",
                      items: { $ref: "#/components/schemas/Manager" },
                    },
                    total: { type: "integer", example: 5 },
                    page: { type: "integer", example: 1 },
                    pageSize: { type: "integer", example: 20 },
                    statistics: {
                      type: "object",
                      properties: {
                        totalManagers: { type: "integer", example: 5 },
                        assignedManagers: { type: "integer", example: 3 },
                        unassignedManagers: { type: "integer", example: 2 },
                      },
                    },
                  },
                },
              },
            },
          },
          401: { description: "Unauthorized" },
          403: { description: "Forbidden - Super Admin only" },
        },
      },
      post: {
        summary: "Create Branch Manager",
        description: "Creates a new Branch Manager with optional branch assignment. Managers can be created without a branch and assigned later. Prevents multiple managers per branch.",
        tags: ["Managers"],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ManagerCreateRequest" },
            },
          },
        },
        responses: {
          201: {
            description: "Manager created successfully",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Manager" },
              },
            },
          },
          400: { description: "Validation error" },
          401: { description: "Unauthorized" },
          403: { description: "Forbidden - Super Admin only" },
          404: { description: "Branch not found" },
          409: { description: "Email exists or branch already has a manager" },
        },
      },
    },
    "/api/v1/managers/{managerId}": {
      get: {
        summary: "Get Manager Details",
        description: "Retrieves detailed information about a specific Branch Manager including their branch assignment.",
        tags: ["Managers"],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "managerId",
            in: "path",
            required: true,
            description: "Manager's user ID",
            schema: { type: "string", format: "uuid" },
          },
        ],
        responses: {
          200: {
            description: "Manager details",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Manager" },
              },
            },
          },
          401: { description: "Unauthorized" },
          403: { description: "Forbidden - Super Admin only" },
          404: { description: "Manager not found" },
        },
      },
      put: {
        summary: "Update Manager Details",
        description: "Updates manager name or status. To change branch assignment, use the assign-branch endpoint.",
        tags: ["Managers"],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "managerId",
            in: "path",
            required: true,
            description: "Manager's user ID",
            schema: { type: "string", format: "uuid" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ManagerUpdateRequest" },
            },
          },
        },
        responses: {
          200: {
            description: "Manager updated successfully",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Manager" },
              },
            },
          },
          400: { description: "Validation error" },
          401: { description: "Unauthorized" },
          403: { description: "Forbidden - Super Admin only" },
          404: { description: "Manager not found" },
        },
      },
      delete: {
        summary: "Delete Manager",
        description: "Soft deletes a Branch Manager by setting deletedAt timestamp and changing status to SUSPENDED.",
        tags: ["Managers"],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "managerId",
            in: "path",
            required: true,
            description: "Manager's user ID",
            schema: { type: "string", format: "uuid" },
          },
        ],
        responses: {
          200: {
            description: "Manager deleted successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string", example: "Manager deleted successfully" },
                  },
                },
              },
            },
          },
          401: { description: "Unauthorized" },
          403: { description: "Forbidden - Super Admin only" },
          404: { description: "Manager not found" },
        },
      },
    },
    "/api/v1/managers/{managerId}/assign-branch": {
      put: {
        summary: "Assign/Reassign/Unassign Branch",
        description: "Assigns a manager to a branch, reassigns to a different branch, or unassigns from current branch (set branchId to null). Prevents multiple managers per branch. Returns previous branch info for audit trail.",
        tags: ["Managers"],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "managerId",
            in: "path",
            required: true,
            description: "Manager's user ID",
            schema: { type: "string", format: "uuid" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/AssignBranchRequest" },
            },
          },
        },
        responses: {
          200: {
            description: "Branch assignment updated successfully",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AssignBranchResponse" },
              },
            },
          },
          400: { description: "Validation error" },
          401: { description: "Unauthorized" },
          403: { description: "Forbidden - Super Admin only" },
          404: { description: "Manager or branch not found" },
          409: { description: "Branch already has an assigned manager" },
        },
      },
    },
    "/api/v1/branches/my-branch": {
      get: {
        summary: "Get My Branch Details (Branch Manager)",
        description: "Branch Manager endpoint to view their assigned branch with detailed statistics including total users, doctors, patients, and today's appointments.",
        tags: ["Branches"],
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "Branch details with statistics",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/MyBranchResponse" },
              },
            },
          },
          401: { description: "Unauthorized" },
          403: { description: "Forbidden - Branch Manager only" },
          404: { description: "No branch assigned or branch not found" },
        },
      },
      put: {
        summary: "Update My Branch (Branch Manager)",
        description: "Allows Branch Managers to update their branch contact information and address details. All fields are optional.",
        tags: ["Branches"],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/UpdateMyBranchRequest" },
            },
          },
        },
        responses: {
          200: {
            description: "Branch updated successfully",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Branch" },
              },
            },
          },
          400: { description: "Validation error" },
          401: { description: "Unauthorized" },
          403: { description: "Forbidden - Branch Manager only" },
          404: { description: "No branch assigned or branch not found" },
        },
      },
    },
    "/api/v1/doctors": {
      get: {
        summary: "List doctors",
        tags: ["Doctors"],
        security: [{ bearerAuth: [] }],
        parameters: [
          { $ref: "#/components/parameters/PageParam" },
          { $ref: "#/components/parameters/PageSizeParam" },
        ],
        responses: {
          200: {
            description: "Paginated doctors (branch scoped unless Super Admin)",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    items: { type: "array", items: { $ref: "#/components/schemas/Doctor" } },
                    total: { type: "integer", example: 1 },
                  },
                },
              },
            },
          },
          401: { description: "Unauthorized" },
        },
      },
      post: {
        summary: "Create doctor profile",
        tags: ["Doctors"],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/DoctorCreateRequest" },
            },
          },
        },
        responses: {
          201: {
            description: "Doctor created",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Doctor" },
              },
            },
          },
          401: { description: "Unauthorized" },
          403: { description: "Forbidden (RBAC)" },
        },
      },
    },
    "/api/v1/doctors/{doctorId}": {
      get: {
        summary: "Get doctor details",
        tags: ["Doctors"],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "doctorId",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
            description: "Doctor's user ID",
          },
        ],
        responses: {
          200: {
            description: "Doctor details with profile and branch info",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Doctor" },
              },
            },
          },
          401: { description: "Unauthorized" },
          404: { description: "Doctor not found" },
        },
      },
      put: {
        summary: "Update doctor profile",
        tags: ["Doctors"],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "doctorId",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
            description: "Doctor's user ID",
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/DoctorUpdateRequest" },
            },
          },
        },
        responses: {
          200: {
            description: "Doctor updated successfully",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Doctor" },
              },
            },
          },
          400: { description: "Bad Request - Validation failed" },
          401: { description: "Unauthorized" },
          403: { description: "Forbidden (Branch Manager can only update doctors in their branch)" },
          404: { description: "Doctor not found" },
        },
      },
      delete: {
        summary: "Delete doctor (soft delete)",
        tags: ["Doctors"],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "doctorId",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
            description: "Doctor's user ID",
          },
        ],
        responses: {
          200: {
            description: "Doctor deleted successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string", example: "Doctor deleted successfully" },
                  },
                },
              },
            },
          },
          401: { description: "Unauthorized" },
          403: { description: "Forbidden (Branch Manager can only delete doctors in their branch)" },
          404: { description: "Doctor not found" },
        },
      },
    },
    "/api/v1/patients": {
      get: {
        summary: "List patients (Admin)",
        tags: ["Patients - Web"],
        security: [{ bearerAuth: [] }],
        parameters: [
          { $ref: "#/components/parameters/PageParam" },
          { $ref: "#/components/parameters/PageSizeParam" },
        ],
        responses: {
          200: {
            description: "Paginated patients scoped to hospital/branch",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    items: { type: "array", items: { $ref: "#/components/schemas/Patient" } },
                    total: { type: "integer", example: 1 },
                  },
                },
              },
            },
          },
          401: { description: "Unauthorized" },
        },
      },
      post: {
        summary: "Register patient (Admin)",
        tags: ["Patients - Web"],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/PatientCreateRequest" },
            },
          },
        },
        responses: {
          201: {
            description: "Patient created",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Patient" },
              },
            },
          },
          401: { description: "Unauthorized" },
        },
      },
    },
    "/api/v1/appointments": {
      get: {
        summary: "List appointments",
        tags: ["Appointments"],
        security: [{ bearerAuth: [] }],
        parameters: [
          { $ref: "#/components/parameters/PageParam" },
          { $ref: "#/components/parameters/PageSizeParam" },
        ],
        responses: {
          200: {
            description: "Paginated appointments (scoped by hospital/branch; filters TBD)",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    items: { type: "array", items: { $ref: "#/components/schemas/Appointment" } },
                    total: { type: "integer", example: 1 },
                  },
                },
              },
            },
          },
          401: { description: "Unauthorized" },
        },
      },
      post: {
        summary: "Create appointment",
        tags: ["Appointments"],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/AppointmentCreateRequest" },
            },
          },
        },
        responses: {
          201: {
            description: "Appointment created",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Appointment" },
              },
            },
          },
          401: { description: "Unauthorized" },
          403: { description: "Forbidden (RBAC/tenancy)" },
        },
      },
    },
    "/api/v1/video-calls/token": {
      post: {
        summary: "🎥 MOBILE: Generate Agora Video Call Token",
        description: `# Real-Time Video Calling with Agora.io

Generates an Agora RTC access token for initiating secure video/audio calls between doctors and patients.
Also returns FCM device tokens for both participants to enable push notification delivery.

## Overview

This endpoint implements production-grade video calling using **Agora.io**, a real-time communication platform. It handles:
- ✅ Secure token generation (server-side only)
- ✅ Role-based access control (Patient = Publisher, Doctor = Subscriber)
- ✅ Multi-layer validation (auth + authorization + business logic)
- ✅ 24-hour token expiration for security
- ✅ Unique channel creation per doctor-patient pair
- ✅ FCM device token retrieval for push notifications

## Device Token Integration

The response includes FCM device tokens for both participants:
- **caller.fcmDeviceToken** — Patient's registered device token (if available)
- **receiver.fcmDeviceToken** — Doctor's registered device token (if available)

These tokens can be used to send push notifications:
- To notify doctor that patient initiated a call
- To notify patient of doctor's response
- To notify of call drops or disconnections

> **Note:** Tokens are null if the mobile app hasn't registered a device token via \`POST /api/v1/device-tokens\`

## How It Works

**1. Request Token**
\`\`\`bash
POST /api/v1/video-calls/token
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "branchId": "550e8400-e29b-41d4-a716-446655440000",
  "doctorId": "6ba7b810-950c-7e8c-e41d-4f0000000001",
  "patientId": "6ba7b810-950c-7e8c-e41d-4f0000000002"
}
\`\`\`

**2. Get Response with Agora Credentials & Device Tokens**
\`\`\`json
{
  "message": "Agora tokens generated successfully",
  "data": {
    "agoraAppId": "0b0a3b554bbb4204864c5336a55194f5",
    "channelName": "branch_550e8400_doctor_6ba7b810_patient_6ba7b810",
    "caller": {
      "role": "publisher",
      "token": "006db45e77c0cba...",
      "fcmDeviceToken": "e9qTfPvOqRuXaYsZ...",
      "expiresAt": 1706553290000
    },
    "receiver": {
      "role": "subscriber",
      "token": "006db45e77c0cba...",
      "fcmDeviceToken": "c7bJtKpMqRsUvWxY...",
      "expiresAt": 1706553290000
    }
  }
}
\`\`\`

**3. Send Push Notification (optional)**
Use the FCM device tokens to notify participants:
\`\`\`bash
curl https://fcm.googleapis.com/fcm/send \\
  -H "Authorization: key=YOUR_FCM_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "to": "c7bJtKpMqRsUvWxY...",
    "notification": {
      "title": "Incoming Video Call",
      "body": "John is calling...",
      "sound": "default"
    }
  }'
\`\`\`

**4. Join Agora Channel**
Use token in mobile app's Agora SDK:
\`\`\`swift
// iOS
agoraEngine.joinChannel(token, channelName, uid: uid)
\`\`\`
\`\`\`kotlin
// Android
rtcEngine.joinChannel(token, channelName, uid)
\`\`\`

**5. Start Video Call**
Real-time communication established!

## Security & Validation

### Authentication
- Requires: Valid JWT token (Bearer or HTTP-only cookie)
- Roles: DOCTOR or PATIENT only

### Authorization
- User must be the doctor OR patient in the call
- Cannot request tokens for other users

### Data Validation
- All UUIDs must be valid format
- Doctor must have DOCTOR role
- Patient must have PATIENT role
- Doctor in specified branch
- All users in same hospital
- User accounts must be ACTIVE

### Token Security
- App Certificate never exposed to client
- Generated server-side using secret credentials
- Each token unique per doctor-patient pair
- Auto-expires after 24 hours
- Cannot be revoked (expiration only)

## Role Assignment

| Role | Patient | Doctor |
|------|---------|--------|
| Agora Role | PUBLISHER | SUBSCRIBER |
| Can Send Video | ✓ Yes | ✗ No |
| Can Send Audio | ✓ Yes | ✗ No |
| Can Receive Video | ✓ Yes | ✓ Yes |
| Can Receive Audio | ✓ Yes | ✓ Yes |

## Channel Naming Convention

Channels follow pattern: \`branch_{branchId}_doctor_{doctorId}_patient_{patientId}\`

Example: \`branch_550e8400e29b41d4a716446655440000_doctor_6ba7b8109..._patient_6ba7b8109...\`

Both users use the same channel name and credentials to join.

## Token Lifecycle

| Stage | Duration | Action |
|-------|----------|--------|
| **Generated** | Now | Token is valid for use |
| **Valid** | 0-24 hours | Can join channel |
| **Expiring Soon** | 23.5-24 hours | Request new token for long calls |
| **Expired** | After 24 hours | Must request new token |

## Common Integration Patterns

### Pattern 1: Fresh Token per Call
- Request new token each time call starts
- Simplest, most secure
- Recommended for most cases

### Pattern 2: Token Refresh
- Refresh token 30 min before expiration
- For calls lasting > 23.5 hours
- Use Agora SDK's \`renewToken()\` method

### Pattern 3: Cached Token
- Reuse token within 24-hour window
- Efficient for frequent calls
- Monitor expiration server-side

## Error Handling

| Code | Cause | Action |
|------|-------|--------|
| 400 | Invalid UUIDs | Verify format: \`xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx\` |
| 401 | Missing/invalid token | Re-authenticate and get new JWT |
| 403 | Not in call | Only doctor/patient in call can request |
| 404 | User/branch missing | Verify IDs exist in database |
| 409 | Different hospital | Doctor/patient must be in same hospital |
| 500 | Server error | Retry after 30 seconds |

## Integration Checklist

- [ ] Install Agora SDK in mobile app
- [ ] Store access token securely
- [ ] Register device token via \`POST /api/v1/device-tokens\`
- [ ] Request video call token before joining call
- [ ] Use FCM tokens to send push notifications
- [ ] Handle token expiration (refresh at 23.5 hours)
- [ ] Implement error handling for all 6 error codes
- [ ] Test with real doctor-patient accounts
- [ ] Verify video/audio streaming works
- [ ] Monitor call quality metrics

## References

- **Agora Docs:** https://docs.agora.io/
- **iOS SDK:** https://docs.agora.io/en/video-calling/sdk-reference/ios
- **Android SDK:** https://docs.agora.io/en/video-calling/sdk-reference/android
- **Token Generation:** https://docs.agora.io/en/video-calling/develop/manage-agora-account
- **FCM Device Tokens:** \`POST /api/v1/device-tokens\` (register token after login)`,
        tags: ["Video Calls"],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/VideoCallTokenRequest" },
            },
          },
        },
        responses: {
          200: {
            description: "Agora token generated successfully - Ready to join video call",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/VideoCallTokenResponse" },
                examples: {
                  success: {
                    summary: "Successful token generation with device tokens",
                    value: {
                      message: "Agora tokens generated successfully",
                      data: {
                        agoraAppId: "0b0a3b554bbb4204864c5336a55194f5",
                        channelName: "branch_550e8400_doctor_6ba7b810_patient_6ba7b810",
                        caller: {
                          role: "publisher",
                          account: "550e8400-e29b-41d4-a716-446655440000",
                          token: "006db45e77c0cba4bf1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0",
                          expiresIn: 86400,
                          expiresAt: 1706553290000,
                          fcmDeviceToken: "e9qTfPvOqRuXaYsZ2x5hJ3k9m1c7vBjL4nWqY8pD6zH2",
                        },
                        receiver: {
                          role: "subscriber",
                          account: "6ba7b810-950c-7e8c-e41d-4f0000000001",
                          token: "006db45e77c0cba4bf1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0",
                          expiresIn: 86400,
                          expiresAt: 1706553290000,
                          fcmDeviceToken: "c7bJtKpMqRsUvWxYzA3dE5fG7hI9jK1lM3nO5pQ7r",
                        },
                        requesterRole: "patient",
                      },
                    },
                  },
                },
              },
            },
          },
          400: {
            description: "Bad Request - Invalid request body or UUID format",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    error: { type: "string", example: "Validation error" },
                    details: {
                      type: "object",
                      example: { fieldErrors: { branchId: ["Branch ID must be a valid UUID"] } },
                    },
                  },
                },
              },
            },
          },
          401: {
            description: "Unauthorized - Missing or invalid authentication token",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    error: { type: "string", example: "Unauthorized" },
                    message: { type: "string", example: "Authentication token is missing or invalid" },
                  },
                },
              },
            },
          },
          403: {
            description: "Forbidden - User not authorized to request this token (must be doctor or patient in the call)",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    error: { type: "string", example: "Forbidden" },
                    message: { type: "string", example: "You can only generate tokens for calls you are part of" },
                  },
                },
              },
            },
          },
          404: {
            description: "Not Found - Doctor, patient, or branch does not exist in database",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    error: { type: "string", example: "Not found" },
                    message: { type: "string", example: "Doctor not found" },
                  },
                },
              },
            },
          },
          409: {
            description: "Conflict - Users not in same hospital, wrong branch, or role mismatch",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    error: { type: "string", example: "Conflict" },
                    message: { type: "string", example: "Doctor must be in the same hospital and branch as the request" },
                  },
                },
              },
            },
          },
          500: {
            description: "Internal Server Error - Failed to generate token",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    error: { type: "string", example: "Internal Server Error" },
                    message: { type: "string", example: "Failed to generate token. Please try again later." },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/v1/video-calls/initiate": {
      post: {
        summary: "🔵 MOBILE: Patient Initiates Video Call (Send Notification to Doctor)",
        description: `# Patient Initiates Video Call

Patient initiates a video call and sends a push notification to the doctor's device.

## Overview

This endpoint is called by the **patient** to initiate a video call:
- ✅ Patient is the CALLER (initiates the video call)
- ✅ Doctor is the RECEIVER (receives push notification)
- ✅ Accepts pre-generated Agora tokens from client
- ✅ Stores call session data in database
- ✅ Sends FCM push notification to doctor automatically
- ✅ Returns messageId confirmation

## Call Flow

1. Patient (caller) initiates video call from mobile app
2. Client app generates channel ID
3. Client generates Agora tokens (caller + receiver)
4. Patient sends request with tokens + doctor's FCM device token
5. Call session created in database with status "connecting"
6. FCM push notification sent to doctor's device
7. Doctor receives notification and taps to join
8. Both users join Agora channel using same channelId

## Request Parameters

All fields are required:

| Parameter | Type | Description |
|-----------|------|-------------|
| fcmReceiverDeviceToken | string | Doctor's FCM device token (for push notification) |
| receiverId | uuid | Doctor ID (receiver of the call) |
| callerId | uuid | Patient ID (must match authenticated user) |
| callerName | string | Patient's full name (shown in doctor's notification) |
| channelId | string | Unique Agora channel ID for this call |
| agoraCallerToken | string | Patient's Agora token (PUBLISHER role) |
| agoraReceiverToken | string | Doctor's Agora token (SUBSCRIBER role) |
| hospitalId | uuid | Hospital ID (must match authenticated user's hospital) |
| hospitalName | string | Hospital name (shown in notification) |
| branchId | uuid | Branch ID where the call is happening |
| logoUrl | string | Hospital logo URL (shown in notification) |

## Response

**Success (200):**
\`\`\`json
{
  "success": true,
  "messageId": "projects/xxx/messages/xxx",
  "message": "Incoming call notification sent successfully"
}
\`\`\`

**Call Session Status:**
- Status: "connecting" (initial state)
- SessionId: "0" (placeholder)

## Doc-Side Notification Payload

Doctor receives push notification with:
\`\`\`json
{
  "type": "incoming_call",
  "callerId": "patient-uuid",
  "callerName": "Michael",
  "receiverId": "doctor-uuid",
  "channelId": "call_channel_id",
  "agoraReceiverToken": "agora-token",
  "hospitalId": "hospital-uuid",
  "hospitalName": "St. Ives",
  "branchId": "branch-uuid",
  "sessionId": "0"
}
\`\`\`

## Error Codes

| Code | Cause | Solution |
|------|-------|----------|
| 400 | Invalid request format or missing required fields | Verify all parameters present and valid format |
| 401 | Unauthorized or invalid token | Patient must be authenticated |
| 403 | Caller mismatch or cross-tenancy violation | Ensure authenticated user is the caller |
| 405 | Invalid HTTP method (not POST) | Use POST method only |
| 500 | Server error | Retry after 30 seconds |`,
        tags: ["Video Calls"],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: [
                  "fcmReceiverDeviceToken",
                  "receiverId",
                  "callerId",
                  "callerName",
                  "channelId",
                  "agoraCallerToken",
                  "agoraReceiverToken",
                  "hospitalId",
                  "hospitalName",
                  "branchId",
                  "logoUrl",
                ],
                properties: {
                  fcmReceiverDeviceToken: {
                    type: "string",
                    description: "Doctor's FCM device token (for push notification)",
                    example: "fyev9ZJzTfaMLs56eusU-b:APA91bEmtjZ1G8q6...",
                  },
                  receiverId: {
                    type: "string",
                    format: "uuid",
                    description: "Doctor ID (receiver of the call)",
                    example: "eb4e41e9-7da8-4091-b6a6-b6ee9a94e2f4",
                  },
                  callerId: {
                    type: "string",
                    format: "uuid",
                    description: "Patient ID (caller/initiator) - must match authenticated user",
                    example: "ad973520-c7bd-4243-a095-f6874a7ed20e",
                  },
                  callerName: {
                    type: "string",
                    description: "Patient's full name (shown in doctor's notification)",
                    example: "Michael",
                  },
                  channelId: {
                    type: "string",
                    description: "Unique Agora channel ID for this call",
                    example: "call349a619d",
                  },
                  agoraCallerToken: {
                    type: "string",
                    description: "Patient's Agora token (PUBLISHER role) - generated client-side",
                    example: "007eJxTYPi3oH7hOtGvlQc21sVs3bBk4XTnxxblG24p7X23RE2lK99OgcEgySDROMnU1CQpKcnEyMDEwswk2dTY2CzR1NTQ0iTN9MnEdZkNgYwM2x5OZWBkYGRgYWBkSHm8PpMJTDKDSRYwycOQnJiTY2ximWhmaJmiwpCYYmlubGpkoJtsnpSia2JkYqybaGBpqptmZmFukmiemmJkkAoAbwE2Wg==",
                  },
                  agoraReceiverToken: {
                    type: "string",
                    description: "Doctor's Agora token (SUBSCRIBER role) - sent in notification",
                    example: "007eJxTYIgy3p35p+mV0mSZ90YMf1Yt2F2edmdxi86bXTbvZ2UeEwpUYDBIMkg0TjI1NUlKSjIxMjCxMDNJNjU2Nks0NTW0NEkzfTJxXWZDICPDropljIwMEJjyeH0mD0NyYk6OsYllopmhZYoKQ6qZqZmFqaGFrqVZopGuSWKKqW6iYbKhrqFRopFxWlqiYZqFBQDLhi4k",
                  },
                  hospitalId: {
                    type: "string",
                    format: "uuid",
                    description: "Hospital ID (must match authenticated user's hospital)",
                    example: "721f5ad8-f395-4489-8f8c-20ed554b34bd",
                  },
                  hospitalName: {
                    type: "string",
                    description: "Hospital name (shown in notification)",
                    example: "St. Ives",
                  },
                  branchId: {
                    type: "string",
                    format: "uuid",
                    description: "Branch ID where the call is happening",
                    example: "708d5094-a8c1-451e-8a96-fca3f15cff5d",
                  },
                  logoUrl: {
                    type: "string",
                    format: "url",
                    description: "Hospital logo URL (shown in notification)",
                    example: "https://unflagging-lupita-sixthly.ngrok-free.dev/uploads/hospitals/9e629218-696c-4da6-b4fb-6c1e43cc6e90.png",
                  },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Incoming call notification sent successfully to doctor",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    messageId: {
                      type: "string",
                      description: "FCM message ID (for tracking)",
                      example: "projects/hospital-saas/messages/1234567890",
                    },
                    message: {
                      type: "string",
                      example: "Incoming call notification sent successfully",
                    },
                  },
                },
              },
            },
          },
          400: {
            description: "Bad Request - Invalid request format or missing required fields",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: false },
                    message: { type: "string", example: "Invalid request body" },
                    details: { type: "object" },
                  },
                },
              },
            },
          },
          401: {
            description: "Unauthorized - Invalid or missing token",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: false },
                    message: { type: "string", example: "Missing or invalid Authorization header" },
                  },
                },
              },
            },
          },
          403: {
            description: "Forbidden - Caller mismatch or cross-tenancy violation",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: false },
                    message: { type: "string", example: "Unauthorized - caller ID must match authenticated user" },
                  },
                },
              },
            },
          },
          405: {
            description: "Method Not Allowed - Use POST only",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: false },
                    message: { type: "string", example: "Method Not Allowed. Use POST." },
                  },
                },
              },
            },
          },
          500: {
            description: "Internal Server Error",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: false },
                    message: { type: "string", example: "Internal Server Error" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/v1/video-calls/end": {
      post: {
        summary: "🎥 MOBILE: End Video Call Session",
        description: `# End Video Call Session

Terminates an active video call session and records call metrics (duration, status).

## Overview

Called by either the doctor or patient to end the video call:
- ✅ Validates caller is part of the call (doctor or patient)
- ✅ Calculates call duration (in seconds)
- ✅ Updates call session status
- ✅ Updates appointment with call metrics
- ✅ Records call end time

## When to Call

- Patient hangs up
- Doctor hangs up
- Call disconnected unexpectedly
- Call timeout

## Call Status Values

| Status | Meaning |
|--------|---------|
| COMPLETED | Successful call - appointment marked as completed |
| FAILED | Call failed - appointment stays confirmed |
| CANCELLED | Call cancelled by user - appointment stays confirmed |

## What Gets Updated

**CallSession:**
- sessionStatus (COMPLETED/FAILED/CANCELLED)
- callEndedAt (timestamp)
- callDuration (total seconds)

**Appointment:**
- videoCallIsActive = false
- videoCallEndedAt (timestamp)
- videoCallDuration (minutes, calculated from seconds)
- status = "completed" (if COMPLETED), else "confirmed"

## Authorization

- Only doctor or patient in the call can end it
- Cross-tenancy check enforced
- Each user can only end their own calls`,
        tags: ["Video Calls"],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["sessionId"],
                properties: {
                  sessionId: {
                    type: "string",
                    format: "uuid",
                    description: "Call session ID (returned from initiate endpoint)",
                    example: "550e8400-e29b-41d4-a716-446655440000",
                  },
                  callStatus: {
                    type: "string",
                    enum: ["COMPLETED", "FAILED", "CANCELLED"],
                    default: "COMPLETED",
                    description: "Final status of the call (optional, defaults to COMPLETED)",
                    example: "COMPLETED",
                  },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Call ended successfully - Metrics recorded",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: { type: "string", example: "Call ended successfully" },
                    data: {
                      type: "object",
                      properties: {
                        sessionId: {
                          type: "string",
                          format: "uuid",
                          description: "Call session ID",
                        },
                        duration: {
                          type: "integer",
                          example: 1247,
                          description: "Total call duration in seconds",
                        },
                        status: {
                          type: "string",
                          enum: ["COMPLETED", "FAILED", "CANCELLED"],
                          example: "COMPLETED",
                          description: "Final call status",
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          400: {
            description: "Bad Request - Invalid session ID format",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: false },
                    error: { type: "string", example: "Invalid request body" },
                    details: { type: "object" },
                  },
                },
              },
            },
          },
          401: { description: "Unauthorized - Invalid or missing token" },
          403: {
            description: "Forbidden - User not part of this call",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: false },
                    error: { type: "string", example: "Unauthorized to end this call" },
                  },
                },
              },
            },
          },
          404: {
            description: "Not Found - Session not found",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: false },
                    error: { type: "string", example: "Call session not found" },
                  },
                },
              },
            },
          },
          500: { description: "Internal Server Error" },
        },
      },
    },
    "/api/v1/appointments/history": {
      get: {
        summary: "Get appointment history",
        description: `Get appointment history filtered by status. Status options:
- **upcoming**: scheduledAt >= now AND status != cancelled
- **completed**: status = 'completed'
- **cancelled**: status = 'cancelled'
- **all**: No filter (default)

Supports role-based filtering:
- Doctors see only their appointments
- Patients see only their appointments
- Branch Managers see branch appointments
- Super Admins see hospital appointments`,
        tags: ["Appointments"],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "status",
            in: "query",
            required: false,
            schema: {
              type: "string",
              enum: ["upcoming", "completed", "cancelled", "all"],
              default: "all",
            },
            description: "Filter by appointment status",
          },
          { $ref: "#/components/parameters/PageParam" },
          { $ref: "#/components/parameters/PageSizeParam" },
        ],
        responses: {
          200: {
            description: "Appointment history retrieved",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string", example: "Appointment history retrieved successfully" },
                    data: {
                      type: "object",
                      properties: {
                        appointments: {
                          type: "array",
                          items: { $ref: "#/components/schemas/Appointment" },
                        },
                        pagination: {
                          type: "object",
                          properties: {
                            total: { type: "integer", example: 25 },
                            page: { type: "integer", example: 1 },
                            limit: { type: "integer", example: 10 },
                            totalPages: { type: "integer", example: 3 },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          401: { description: "Unauthorized" },
        },
      },
    },
    "/api/v1/appointments/{appointmentId}/reschedule": {
      patch: {
        summary: "Reschedule an appointment",
        description: "Allows rescheduling of an appointment to a new date/time. Resets status to 'requested'. Cannot reschedule completed or cancelled appointments.",
        tags: ["Appointments"],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "appointmentId",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
            description: "Appointment ID",
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["scheduledAt"],
                properties: {
                  scheduledAt: {
                    type: "string",
                    format: "date-time",
                    example: "2025-02-15T14:30:00Z",
                    description: "New scheduled date/time (must be in future)",
                  },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Appointment rescheduled successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string", example: "Appointment rescheduled successfully" },
                    data: { $ref: "#/components/schemas/Appointment" },
                  },
                },
              },
            },
          },
          400: {
            description: "Bad Request - Invalid date format or past date",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    error: { type: "string", example: "scheduledAt must be a valid future datetime" },
                  },
                },
              },
            },
          },
          401: { description: "Unauthorized" },
          403: { description: "Forbidden - Cannot reschedule completed or cancelled appointments" },
          404: { description: "Appointment not found" },
        },
      },
    },
    "/api/v1/appointments/{appointmentId}/cancel": {
      post: {
        summary: "Cancel an appointment",
        description: "Cancels an appointment with a required reason. Cannot cancel completed or already cancelled appointments.",
        tags: ["Appointments"],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "appointmentId",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
            description: "Appointment ID",
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["reason"],
                properties: {
                  reason: {
                    type: "string",
                    minLength: 1,
                    maxLength: 500,
                    example: "Patient requested to reschedule to next week",
                    description: "Cancellation reason (required, 1-500 characters)",
                  },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Appointment cancelled successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string", example: "Appointment cancelled successfully" },
                    data: {
                      type: "object",
                      properties: {
                        id: { type: "string", format: "uuid" },
                        status: { type: "string", example: "cancelled" },
                        cancelReason: { type: "string", example: "Patient requested to reschedule to next week" },
                        cancelledAt: { type: "string", format: "date-time" },
                      },
                    },
                  },
                },
              },
            },
          },
          400: {
            description: "Bad Request - Missing or invalid reason",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    error: { type: "string", example: "reason is required and must be 1-500 characters" },
                  },
                },
              },
            },
          },
          401: { description: "Unauthorized" },
          403: { description: "Forbidden - Cannot cancel completed or already cancelled appointments" },
          404: { description: "Appointment not found" },
        },
      },
    },
    "/api/v1/appointments/{appointmentId}/video-call-status": {
      patch: {
        summary: "🔵 MOBILE: Update video call status",
        description: "Track video call session lifecycle for virtual appointments. When started, appointment status changes to 'in_progress'. When ended, call duration is calculated but appointment remains in_progress (manual completion by doctor). Both call participants (doctor/patient) and admins (for monitoring) can update status.",
        tags: ["Appointments"],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "appointmentId",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
            description: "Appointment ID",
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["event", "timestamp", "doctorId", "patientId", "branchId"],
                properties: {
                  event: {
                    type: "string",
                    enum: ["started", "ended"],
                    example: "started",
                    description: "Video call event type"
                  },
                  timestamp: {
                    type: "string",
                    format: "date-time",
                    example: "2026-02-11T10:00:00Z",
                    description: "Event timestamp in ISO 8601 format"
                  },
                  doctorId: {
                    type: "string",
                    format: "uuid",
                    description: "Doctor's user ID (must match appointment)"
                  },
                  patientId: {
                    type: "string",
                    format: "uuid",
                    description: "Patient's user ID (must match appointment)"
                  },
                  branchId: {
                    type: "string",
                    format: "uuid",
                    description: "Branch ID (must match appointment)"
                  },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Video call status updated successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string", example: "Video call started successfully" },
                    data: {
                      type: "object",
                      properties: {
                        id: { type: "string", format: "uuid" },
                        status: { type: "string", example: "in_progress" },
                        appointmentType: { type: "string", example: "virtual" },
                        scheduledAt: { type: "string", format: "date-time" },
                        videoCallStartedAt: { type: "string", format: "date-time", nullable: true },
                        videoCallEndedAt: { type: "string", format: "date-time", nullable: true },
                        videoCallIsActive: { type: "boolean", example: true },
                        videoCallDuration: { type: "integer", nullable: true, description: "Duration in minutes" },
                        doctor: { type: "object" },
                        patient: { type: "object" },
                        branch: { type: "object" },
                      },
                    },
                  },
                },
              },
            },
          },
          400: {
            description: "Bad Request - Validation error or invalid operation",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    error: { type: "string", example: "Invalid operation" },
                    message: { type: "string", example: "Video call is already active" },
                  },
                },
              },
            },
          },
          401: { description: "Unauthorized" },
          403: { description: "Forbidden - Only doctor or patient can update, and for virtual appointments only" },
          404: { description: "Appointment not found" },
        },
      },
    },
    "/api/v1/appointments/available-doctors": {
      get: {
        summary: "🔵 MOBILE: Browse available doctors by date",
        description: "Patient endpoint to view all doctors available on a specific date with their open time slots",
        tags: ["Appointments"],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "branchId",
            in: "query",
            required: true,
            schema: { type: "string", format: "uuid" },
            description: "Branch ID to search for available doctors",
          },
          {
            name: "appointmentDate",
            in: "query",
            required: true,
            schema: { type: "string", format: "date" },
            example: "2026-02-15",
            description: "Date to check availability (YYYY-MM-DD)",
          },
          {
            name: "slotDuration",
            in: "query",
            required: false,
            schema: { type: "integer", minimum: 15, default: 30 },
            description: "Appointment slot duration in minutes (default: 30)",
          },
        ],
        responses: {
          200: {
            description: "List of available doctors with time slots for the given date",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    date: { type: "string", format: "date", example: "2026-01-29" },
                    dayOfWeek: { type: "string", enum: ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"] },
                    branchId: { type: "string", format: "uuid" },
                    slotDuration: { type: "integer", example: 30 },
                    availableDoctors: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          doctorId: { type: "string", format: "uuid" },
                          doctorName: { type: "string" },
                          specialty: { type: "string" },
                          availableSlots: {
                            type: "array",
                            items: { type: "string", example: "09:00-09:30" },
                          },
                          totalAvailableSlots: { type: "integer" },
                        },
                      },
                    },
                    totalAvailableDoctors: { type: "integer" },
                  },
                },
              },
            },
          },
          400: { description: "Invalid date format or missing parameters" },
          401: { description: "Unauthorized" },
        },
      },
    },
    "/api/v1/doctors/{doctorId}/availability": {
      get: {
        summary: "List doctor availability schedules",
        description: "Admin endpoint to list all availability schedules for a specific doctor",
        tags: ["Doctors"],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "doctorId",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
            description: "Doctor ID",
          },
        ],
        responses: {
          200: {
            description: "List of availability schedules",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/DoctorAvailability" },
                },
              },
            },
          },
          401: { description: "Unauthorized" },
          403: { description: "Forbidden - Only admins can manage availability" },
          404: { description: "Doctor not found" },
        },
      },
      post: {
        summary: "Create doctor availability schedule",
        description: "Admin endpoint to add working hours for multiple days with flexible hours per day",
        tags: ["Doctors"],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "doctorId",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
            description: "Doctor ID",
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  availabilities: {
                    type: "array",
                    minItems: 1,
                    items: {
                      type: "object",
                      properties: {
                        dayOfWeek: {
                          type: "string",
                          enum: ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"],
                          description: "Day of the week",
                        },
                        startTime: {
                          type: "string",
                          pattern: "^\\d{2}:\\d{2}$",
                          example: "09:00",
                          description: "Work start time (HH:mm)",
                        },
                        endTime: {
                          type: "string",
                          pattern: "^\\d{2}:\\d{2}$",
                          example: "17:00",
                          description: "Work end time (HH:mm)",
                        },
                      },
                      required: ["dayOfWeek", "startTime", "endTime"],
                    },
                    description: "Array of availability schedules with different hours per day",
                  },
                },
                required: ["availabilities"],
              },
            },
          },
        },
        responses: {
          201: {
            description: "Availability schedules created",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/DoctorAvailability" },
                },
              },
            },
          },
          400: { description: "Invalid time format, validation errors, or duplicate days" },
          401: { description: "Unauthorized" },
          403: { description: "Forbidden - Only admins can manage availability" },
          404: { description: "Doctor not found" },
          409: { description: "Availability already exists for some of the selected days" },
        },
      },
    },
    "/api/v1/doctors/{doctorId}/availability/{availabilityId}": {
      put: {
        summary: "Update doctor availability schedule",
        description: "Admin endpoint to update working hours or toggle active status",
        tags: ["Doctors"],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "doctorId",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
            description: "Doctor ID",
          },
          {
            name: "availabilityId",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
            description: "Availability schedule ID",
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  startTime: {
                    type: "string",
                    pattern: "^\\d{2}:\\d{2}$",
                    example: "09:00",
                    description: "Work start time (HH:mm)",
                  },
                  endTime: {
                    type: "string",
                    pattern: "^\\d{2}:\\d{2}$",
                    example: "17:00",
                    description: "Work end time (HH:mm)",
                  },
                  isActive: {
                    type: "boolean",
                    description: "Toggle availability on/off",
                  },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Availability updated",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/DoctorAvailability" },
              },
            },
          },
          400: { description: "Invalid time format" },
          401: { description: "Unauthorized" },
          403: { description: "Forbidden - Only admins can manage availability" },
          404: { description: "Availability or doctor not found" },
        },
      },
      delete: {
        summary: "Delete doctor availability schedule",
        description: "Admin endpoint to remove a specific availability schedule",
        tags: ["Doctors"],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "doctorId",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
            description: "Doctor ID",
          },
          {
            name: "availabilityId",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
            description: "Availability schedule ID",
          },
        ],
        responses: {
          200: {
            description: "Availability deleted",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string", example: "Availability deleted successfully" },
                  },
                },
              },
            },
          },
          401: { description: "Unauthorized" },
          403: { description: "Forbidden - Only admins can manage availability" },
          404: { description: "Availability or doctor not found" },
        },
      },
    },
    "/api/v1/doctors/{doctorId}/availability-slots": {
      get: {
        summary: "🔵 MOBILE: View doctor's available slots for a date",
        description: "Patient endpoint to view specific doctor's working hours and available appointment slots on a given date",
        tags: ["Appointments"],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "doctorId",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
            description: "Doctor ID",
          },
          {
            name: "appointmentDate",
            in: "query",
            required: true,
            schema: { type: "string", format: "date" },
            example: "2026-02-15",
            description: "Date to check availability (YYYY-MM-DD)",
          },
          {
            name: "slotDuration",
            in: "query",
            required: false,
            schema: { type: "integer", minimum: 15, default: 30 },
            description: "Appointment slot duration in minutes (default: 30)",
          },
        ],
        responses: {
          200: {
            description: "Doctor's available slots for the date",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    doctorId: { type: "string", format: "uuid" },
                    doctorName: { type: "string" },
                    specialty: { type: "string" },
                    date: { type: "string", format: "date" },
                    dayOfWeek: { type: "string" },
                    slotDuration: { type: "integer" },
                    workingHours: {
                      type: "object",
                      properties: {
                        startTime: { type: "string", example: "09:00" },
                        endTime: { type: "string", example: "17:00" },
                      },
                    },
                    availableSlots: {
                      type: "array",
                      items: { type: "string", example: "09:00-09:30" },
                    },
                    totalAvailableSlots: { type: "integer" },
                    bookedSlots: { type: "integer" },
                  },
                },
              },
            },
          },
          400: { description: "Invalid date format" },
          401: { description: "Unauthorized" },
          404: { description: "Doctor not found or not available on that day" },
        },
      },
    },
    "/api/v1/reports": {
      get: {
        tags: ["Reports & Analytics"],
        summary: "List all available reports",
        description: "Get a list of all available report types with descriptions and endpoints.",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "List of available reports",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string" },
                    data: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          id: { type: "string", example: "appointments" },
                          name: { type: "string", example: "Appointment Analytics" },
                          description: { type: "string" },
                          endpoint: { type: "string" },
                          timeframes: { type: "array", items: { type: "string" } },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          401: { description: "Unauthorized" },
        },
      },
    },
    "/api/v1/reports/appointments": {
      get: {
        tags: ["Reports & Analytics"],
        summary: "Get appointment analytics report",
        description: "Generate comprehensive appointment metrics including trends, completion rates, and doctor performance.",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "timeframe",
            in: "query",
            schema: { type: "string", enum: ["week", "month", "year"], default: "month" },
            description: "Time period for the report",
          },
        ],
        responses: {
          200: {
            description: "Appointment analytics data",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string" },
                    data: {
                      type: "object",
                      properties: {
                        totalAppointments: { type: "integer", example: 1284 },
                        completedAppointments: { type: "integer", example: 930 },
                        cancelledAppointments: { type: "integer", example: 24 },
                        virtualAppointments: { type: "integer", example: 856 },
                        physicalAppointments: { type: "integer", example: 428 },
                        averageCompletionRate: { type: "number", example: 72.4 },
                        completionRateByDoctor: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              doctorId: { type: "string" },
                              doctorName: { type: "string" },
                              completedCount: { type: "integer" },
                              totalCount: { type: "integer" },
                              completionRate: { type: "number" },
                            },
                          },
                        },
                        peakAppointmentHours: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              hour: { type: "integer" },
                              appointmentCount: { type: "integer" },
                            },
                          },
                        },
                        cancelReasons: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              reason: { type: "string" },
                              count: { type: "integer" },
                              percentage: { type: "number" },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          401: { description: "Unauthorized" },
        },
      },
    },
    "/api/v1/reports/doctors": {
      get: {
        tags: ["Reports & Analytics"],
        summary: "Get doctor performance report",
        description: "Generate doctor performance metrics including utilization, specialties, and completion rates.",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "Doctor performance data",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string" },
                    data: {
                      type: "object",
                      properties: {
                        totalDoctors: { type: "integer", example: 312 },
                        activeDoctors: { type: "integer", example: 298 },
                        inactiveDoctors: { type: "integer", example: 14 },
                        doctorStats: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              doctorId: { type: "string" },
                              doctorName: { type: "string" },
                              specialty: { type: "string" },
                              status: { type: "string" },
                              totalAppointments: { type: "integer" },
                              completedAppointments: { type: "integer" },
                              appointmentCompletionRate: { type: "number" },
                              branchCount: { type: "integer" },
                              branches: { type: "array", items: { type: "string" } },
                            },
                          },
                        },
                        specialtyDistribution: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              specialty: { type: "string" },
                              doctorCount: { type: "integer" },
                              appointmentCount: { type: "integer" },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          401: { description: "Unauthorized" },
        },
      },
    },
    "/api/v1/reports/branches": {
      get: {
        tags: ["Reports & Analytics"],
        summary: "Get branch performance report",
        description: "Generate branch-level metrics including patient count, appointments, and operational data.",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "Branch performance data",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string" },
                    data: {
                      type: "object",
                      properties: {
                        totalBranches: { type: "integer", example: 18 },
                        activeBranches: { type: "integer", example: 18 },
                        branches: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              branchId: { type: "string" },
                              branchName: { type: "string" },
                              address: { type: "string" },
                              doctorCount: { type: "integer" },
                              patientCount: { type: "integer" },
                              totalAppointments: { type: "integer" },
                              completedAppointments: { type: "integer" },
                              completionRate: { type: "number" },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          401: { description: "Unauthorized" },
        },
      },
    },
    "/api/v1/reports/patients": {
      get: {
        tags: ["Reports & Analytics"],
        summary: "Get patient analytics report",
        description: "Generate patient registration trends, retention patterns, and booking analytics.",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "Patient analytics data",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string" },
                    data: {
                      type: "object",
                      properties: {
                        totalPatients: { type: "integer", example: 2456 },
                        newPatientsThisMonth: { type: "integer", example: 184 },
                        returningPatients: { type: "integer", example: 1248 },
                        newVsReturning: {
                          type: "object",
                          properties: {
                            new: { type: "integer" },
                            returning: { type: "integer" },
                          },
                        },
                        patientsByBranch: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              branchId: { type: "string" },
                              branchName: { type: "string" },
                              patientCount: { type: "integer" },
                              newThisMonth: { type: "integer" },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          401: { description: "Unauthorized" },
        },
      },
    },
    "/api/v1/reports/system-health": {
      get: {
        tags: ["Reports & Analytics"],
        summary: "Get system health report",
        description: "Generate system health metrics including video call performance and database statistics.",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "System health data",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string" },
                    data: {
                      type: "object",
                      properties: {
                        videoCallMetrics: {
                          type: "object",
                          properties: {
                            totalVideoSessions: { type: "integer", example: 856 },
                            successfulSessions: { type: "integer", example: 823 },
                            failedSessions: { type: "integer", example: 33 },
                            averageSessionDuration: { type: "number", example: 32.5 },
                            successRate: { type: "number", example: 96.1 },
                          },
                        },
                        databaseMetrics: {
                          type: "object",
                          properties: {
                            totalRecords: { type: "integer", example: 125486 },
                            recordsByModel: {
                              type: "object",
                              properties: {
                                users: { type: "integer" },
                                appointments: { type: "integer" },
                                branches: { type: "integer" },
                                doctors: { type: "integer" },
                                patients: { type: "integer" },
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          401: { description: "Unauthorized" },
        },
      },
    },
    "/api/v1/reports/export": {
      get: {
        tags: ["Reports & Analytics"],
        summary: "Export report as CSV or JSON",
        description: "Export any report data in CSV or JSON format for external analysis.",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "reportType",
            in: "query",
            required: true,
            schema: { type: "string", enum: ["appointments", "doctors", "branches", "patients", "system-health"] },
            description: "Type of report to export",
          },
          {
            name: "format",
            in: "query",
            schema: { type: "string", enum: ["csv", "json"], default: "json" },
            description: "Export format",
          },
          {
            name: "timeframe",
            in: "query",
            schema: { type: "string", enum: ["week", "month", "year"], default: "month" },
            description: "Timeframe for appointment reports",
          },
        ],
        responses: {
          200: {
            description: "File download (CSV or JSON)",
            content: {
              "text/csv": {
                schema: { type: "string", format: "binary" },
              },
              "application/json": {
                schema: { type: "object" },
              },
            },
          },
          400: { description: "Invalid parameters" },
          401: { description: "Unauthorized" },
        },
      },
    },
    "/api/v1/device-tokens": {
      post: {
        summary: "🎲 MOBILE: Register Device Token for Push Notifications",
        description: `# Register or Update Device FCM Token

Saves or updates the FCM (Firebase Cloud Messaging) device token for the authenticated user.
Used for receiving push notifications for incoming calls and appointment updates.

## Overview

- ✅ Accepts FCM token from mobile device
- ✅ Auto-detects user type (Doctor or Patient) from JWT
- ✅ Saves token to database for push notification delivery
- ✅ Updates last used timestamp if token already exists
- ✅ Marks token as active

## When to Call

- On app launch (if token not previously registered)
- When receiving new FCM token from Firebase (token refresh)
- When user re-authenticates

## User Type Mapping

- **DOCTOR role** → Can receive incoming call notifications
- **PATIENT role** → Can receive incoming call notifications
- Other roles are rejected

## Token Reuse

If the same FCM token is registered again:
- Last used timestamp is updated
- Device type can be updated
- Token is marked active
- No error is thrown`,
        tags: ["Device & Notifications"],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["fcmToken"],
                properties: {
                  fcmToken: {
                    type: "string",
                    minLength: 10,
                    description: "Firebase Cloud Messaging device token from mobile app",
                    example: "e9qTfPvOqRuXaYsZ2x5hJ3k9m1c7vBjL4nWqY8pD6zH2",
                  },
                  deviceType: {
                    type: "string",
                    enum: ["ios", "android", "web", "unknown"],
                    default: "unknown",
                    description: "Type of device (optional, defaults to unknown)",
                    example: "android",
                  },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Device token saved successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: {
                      type: "object",
                      properties: {
                        id: { type: "string", format: "uuid", example: "550e8400-e29b-41d4-a716-446655440000" },
                        userId: { type: "string", format: "uuid", example: "550e8400-e29b-41d4-a716-446655440000" },
                        fcmToken: { type: "string", example: "e9qTfPvOqRuXaYsZ2x5hJ3k9m1c7vBjL4nWqY8pD6zH2" },
                        deviceType: { type: "string", example: "android" },
                        isActive: { type: "boolean", example: true },
                        createdAt: { type: "string", format: "date-time", example: "2025-03-10T12:00:00Z" },
                        updatedAt: { type: "string", format: "date-time", example: "2025-03-10T12:00:00Z" },
                      },
                    },
                    message: { type: "string", example: "Device token saved successfully" },
                  },
                },
              },
            },
          },
          400: {
            description: "Bad Request - Invalid FCM token",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: false },
                    message: { type: "string", example: "Invalid request body" },
                    details: { type: "object" },
                  },
                },
              },
            },
          },
          401: { description: "Unauthorized - Missing or invalid token" },
          403: { description: "Forbidden - Only Doctor and Patient roles allowed" },
          500: { description: "Internal Server Error" },
        },
      },
      delete: {
        summary: "🎲 MOBILE: Unregister Device Token",
        description: `# Unregister and Deactivate Device Token

Removes or deactivates an FCM device token by its value.
Call this when the user logs out or wants to stop receiving notifications on a device.

## Overview

- ✅ Finds and deletes device token by FCM value
- ✅ Validates user ownership (user can only delete their own tokens)
- ✅ Returns 404 if token not found or doesn't belong to user
- ✅ Prevents cross-user token access

## When to Call

- User logs out
- User uninstalls app
- User wants to disable notifications on specific device
- Token is compromised`,
        tags: ["Device & Notifications"],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "fcmToken",
            in: "query",
            required: true,
            schema: { type: "string", minLength: 10 },
            description: "The FCM token to unregister/delete",
            example: "e9qTfPvOqRuXaYsZ2x5hJ3k9m1c7vBjL4nWqY8pD6zH2",
          },
        ],
        responses: {
          200: {
            description: "Device token removed successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: { type: "string", example: "Device token removed successfully" },
                  },
                },
              },
            },
          },
          400: {
            description: "Bad Request - Missing fcmToken query parameter",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: false },
                    message: { type: "string", example: "fcmToken query parameter is required" },
                  },
                },
              },
            },
          },
          401: { description: "Unauthorized - Missing or invalid token" },
          403: { description: "Forbidden - Only Doctor and Patient roles allowed" },
          404: {
            description: "Not Found - Device token not found or does not belong to user",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: false },
                    message: { type: "string", example: "Device token not found" },
                  },
                },
              },
            },
          },
          500: { description: "Internal Server Error" },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
    },
    parameters: {
      PageParam: {
        name: "page",
        in: "query",
        schema: { type: "integer", minimum: 1, default: 1 },
        description: "Page number (1-based)",
      },
      PageSizeParam: {
        name: "pageSize",
        in: "query",
        schema: { type: "integer", minimum: 1, maximum: 100, default: 20 },
        description: "Items per page",
      },
    },
    schemas: {
      SuperAdminSignupRequestMultipart: {
        type: "object",
        required: ["hospital_name", "admin_name", "admin_email", "password", "logo"],
        properties: {
          hospital_name: { type: "string", example: "Acme Hospital", description: "Hospital or clinic name" },
          admin_name: { type: "string", example: "Jane Doe", description: "Super Admin full name" },
          admin_email: { type: "string", format: "email", example: "jane@acme.com", description: "Super Admin email (globally unique)" },
          password: { type: "string", format: "password", minLength: 8, description: "Password (min 8 characters)" },
          logo: { 
            type: "string", 
            format: "binary", 
            description: "REQUIRED: Hospital logo image file (JPEG, PNG, WebP; max 5MB). Will be accessible via logoUrl in responses."
          },
        },
      },
      SuperAdminSignupResponse: {
        type: "object",
        properties: {
          message: { type: "string", example: "Signup created. Verify email to activate account." },
          verificationToken: { type: "string", description: "Email verification token (included only in non-production for testing)" },
          verificationExpires: { type: "string", format: "date-time", description: "Verification token expiry timestamp" },
          hospitalId: { type: "string", format: "uuid", description: "Created hospital ID" },
          userId: { type: "string", format: "uuid", description: "Created Super Admin user ID" },
        },
        description: "The uploaded logo is saved and will be accessible via logoUrl in GET /hospitals and /branches endpoints",
      },
      VerifyEmailRequest: {
        type: "object",
        required: ["token"],
        properties: {
          token: { type: "string", minLength: 10 },
        },
      },
      VerifyEmailResponse: {
        type: "object",
        properties: {
          message: { type: "string" },
          userId: { type: "string", format: "uuid" },
        },
      },
      LoginRequest: {
        type: "object",
        required: ["email", "password"],
        properties: {
          email: { type: "string", format: "email" },
          password: { type: "string", format: "password" },
        },
      },
      TokenPair: {
        type: "object",
        properties: {
          accessToken: { type: "string" },
          refreshToken: { type: "string" },
          accessTokenExpiresIn: { type: "integer", example: 900 },
          refreshTokenExpiresIn: { type: "integer", example: 2592000 },
        },
      },
      LoginResponse: {
        type: "object",
        properties: {
          message: { type: "string" },
          user: {
            type: "object",
            properties: {
              id: { type: "string", format: "uuid" },
              role: { $ref: "#/components/schemas/UserRole" },
              hospitalId: { type: "string", format: "uuid" },
              branchId: { type: "string", format: "uuid", nullable: true },
            },
          },
          tokens: { $ref: "#/components/schemas/TokenPair" },
        },
      },
      RefreshRequest: {
        type: "object",
        required: ["refreshToken"],
        properties: {
          refreshToken: { type: "string", minLength: 10 },
        },
      },
      RefreshResponse: {
        type: "object",
        properties: {
          message: { type: "string" },
          tokens: { $ref: "#/components/schemas/TokenPair" },
        },
      },
      PatientRegisterRequest: {
        type: "object",
        required: ["hospital_id", "first_name", "last_name", "email", "password"],
        properties: {
          hospital_id: { type: "string", format: "uuid", description: "Hospital ID selected from /api/v1/hospitals/public" },
          first_name: { type: "string", minLength: 2, example: "John" },
          last_name: { type: "string", minLength: 2, example: "Doe" },
          email: { type: "string", format: "email", example: "john.doe@example.com", description: "Must be unique within the selected hospital" },
          password: { type: "string", format: "password", minLength: 8, description: "Password (min 8 characters)" },
        },
      },
      PatientRegisterResponse: {
        type: "object",
        properties: {
          message: { type: "string", example: "Registration successful. Please verify your email with the OTP sent to you." },
          userId: { type: "string", format: "uuid" },
          email: { type: "string", format: "email" },
          otpSent: { type: "boolean", example: true },
          otp: { type: "string", description: "6-digit OTP (only included in non-production for testing)" },
        },
      },
      PatientVerifyOtpRequest: {
        type: "object",
        required: ["email", "otp"],
        properties: {
          email: { type: "string", format: "email", description: "Email used during registration" },
          otp: { type: "string", minLength: 6, maxLength: 6, example: "123456", description: "6-digit OTP code received via email" },
        },
      },
      PatientVerifyOtpResponse: {
        type: "object",
        properties: {
          message: { type: "string", example: "Email verified successfully. You can now login." },
          user: {
            type: "object",
            properties: {
              id: { type: "string", format: "uuid" },
              email: { type: "string", format: "email" },
              fullName: { type: "string" },
              role: { type: "string", example: "PATIENT" },
              status: { type: "string", example: "ACTIVE" },
              emailVerifiedAt: { type: "string", format: "date-time" },
            },
          },
        },
      },
      PatientResendOtpRequest: {
        type: "object",
        required: ["email"],
        properties: {
          email: { type: "string", format: "email", description: "Email of the pending patient account" },
        },
      },
      PatientResendOtpResponse: {
        type: "object",
        properties: {
          message: { type: "string", example: "OTP has been resent to your email." },
          email: { type: "string", format: "email" },
          otpSent: { type: "boolean", example: true },
          expiresIn: { type: "integer", example: 600, description: "OTP expiration time in seconds (10 minutes)" },
          otp: { type: "string", description: "6-digit OTP (only included in non-production for testing)" },
        },
      },
      PatientLoginRequest: {
        type: "object",
        required: ["email", "password", "hospital_id"],
        properties: {
          email: { type: "string", format: "email" },
          password: { type: "string", format: "password" },
          hospital_id: { type: "string", format: "uuid", description: "Hospital ID where patient is registered" },
        },
      },
      PatientLoginResponse: {
        type: "object",
        properties: {
          message: { type: "string", example: "Login successful" },
          user: {
            type: "object",
            properties: {
              id: { type: "string", format: "uuid" },
              fullName: { type: "string" },
              email: { type: "string", format: "email" },
              role: { type: "string", example: "PATIENT" },
              hospitalId: { type: "string", format: "uuid" },
              status: { type: "string", enum: ["ACTIVE", "INACTIVE", "PENDING"], description: "Account status - indicates if user is active" },
              emailVerifiedAt: { type: "string", format: "date-time", nullable: true, description: "Timestamp when email was verified, null if not verified" },
            },
          },
          tokens: { $ref: "#/components/schemas/TokenPair" },
        },
      },
      ChangePasswordRequest: {
        type: "object",
        required: ["currentPassword", "newPassword"],
        properties: {
          currentPassword: { type: "string", description: "Current password" },
          newPassword: { type: "string", minLength: 8, description: "New password (min 8 characters)" },
        },
      },
      ForgotPasswordRequestStep1: {
        type: "object",
        required: ["email"],
        properties: {
          email: { type: "string", format: "email", description: "Email address of the account" },
        },
        description: "Step 1: Request OTP - provide only email"
      },
      ForgotPasswordRequestStep2: {
        type: "object",
        required: ["email", "otp", "newPassword"],
        properties: {
          email: { type: "string", format: "email", description: "Email address of the account" },
          otp: { type: "string", minLength: 6, maxLength: 6, example: "123456", description: "6-digit OTP code received via email" },
          newPassword: { type: "string", minLength: 8, description: "New password (min 8 characters)" },
        },
        description: "Step 2: Reset password - provide email, OTP, and new password"
      },
      ForgotPasswordResponse: {
        type: "object",
        properties: {
          message: { type: "string", example: "Password reset OTP has been sent to your email." },
          email: { type: "string", format: "email" },
          expiresIn: { type: "integer", example: 600, description: "OTP expiration time in seconds (10 minutes)" },
          otp: { type: "string", description: "6-digit OTP (only included in non-production for testing)" },
        },
        description: "Response for Step 1 (OTP request)"
      },
      HospitalCreateRequest: {
        type: "object",
        required: ["name"],
        properties: {
          name: { type: "string", description: "Hospital or clinic name" },
        },
      },
      HospitalUpdateRequest: {
        type: "object",
        properties: {
          name: { type: "string", minLength: 2, description: "Hospital or clinic name" },
        },
        description: "At least one field must be provided",
      },
      HospitalUpdateRequestMultipart: {
        type: "object",
        properties: {
          name: { type: "string", minLength: 2, description: "Hospital or clinic name" },
          logo: { 
            type: "string", 
            format: "binary", 
            description: "New hospital logo image file (JPEG, PNG, WebP; max 5MB). Old logo will be automatically deleted."
          },
        },
        description: "At least one field must be provided",
      },
      HospitalCreateResponse: {
        type: "object",
        properties: {
          hospital: { $ref: "#/components/schemas/Hospital" },
          defaultBranch: { $ref: "#/components/schemas/Branch" },
          adminUserId: { type: "string", format: "uuid", nullable: true },
        },
      },
      BranchCreateRequest: {
        type: "object",
        required: ["name", "address", "phone", "email"],
        properties: {
          name: { type: "string", example: "Main Branch" },
          address: { type: "string" },
          city: { type: "string", nullable: true },
          state: { type: "string", nullable: true },
          country: { type: "string", nullable: true },
          phone: { type: "string" },
          email: { type: "string", format: "email" },
          isHeadBranch: { type: "boolean", default: false },
        },
      },
      UserCreateRequest: {
        type: "object",
        required: ["fullName", "email", "role", "password"],
        properties: {
          fullName: { type: "string" },
          email: { type: "string", format: "email" },
          role: { $ref: "#/components/schemas/UserRole" },
          password: { type: "string", format: "password", minLength: 8 },
          branchId: { type: "string", format: "uuid", nullable: true },
        },
      },
      UserUpdateMeRequest: {
        type: "object",
        properties: {
          fullName: { type: "string", minLength: 2, description: "Updated full name" },
          email: { type: "string", format: "email", description: "Updated email (must be unique)" },
          currentPassword: { type: "string", format: "password", minLength: 8, description: "Current password (required to change password)" },
          newPassword: { type: "string", format: "password", minLength: 8, description: "New password (requires currentPassword)" },
        },
        description: "At least one field must be provided. To change password, both currentPassword and newPassword are required.",
      },
      ManagerCreateRequest: {
        type: "object",
        required: ["fullName", "email", "password"],
        properties: {
          fullName: { type: "string", minLength: 2, description: "Manager's full name" },
          email: { type: "string", format: "email", description: "Must be unique" },
          password: { type: "string", format: "password", minLength: 8, description: "Minimum 8 characters" },
          branchId: { 
            type: "string", 
            format: "uuid", 
            nullable: true, 
            description: "Optional - branch assignment. Can be assigned later via assign-branch endpoint" 
          },
        },
      },
      ManagerUpdateRequest: {
        type: "object",
        properties: {
          fullName: { type: "string", minLength: 2, description: "Updated name" },
          status: { 
            type: "string", 
            enum: ["ACTIVE", "PENDING", "SUSPENDED"], 
            description: "Updated status" 
          },
        },
        description: "All fields are optional. Only provided fields will be updated.",
      },
      AssignBranchRequest: {
        type: "object",
        required: ["branchId"],
        properties: {
          branchId: { 
            type: "string", 
            format: "uuid", 
            nullable: true, 
            description: "Branch ID to assign, or null to unassign from current branch" 
          },
        },
      },
      AssignBranchResponse: {
        type: "object",
        properties: {
          message: { 
            type: "string", 
            example: "Manager assigned to branch \"Downtown Branch\"" 
          },
          manager: { $ref: "#/components/schemas/Manager" },
          previousBranch: {
            type: "object",
            nullable: true,
            properties: {
              id: { type: "string", format: "uuid" },
              name: { type: "string" },
            },
            description: "Previous branch information (for audit trail)",
          },
        },
      },
      UpdateMyBranchRequest: {
        type: "object",
        properties: {
          name: { type: "string", minLength: 2, description: "Branch name" },
          address: { type: "string", minLength: 2, description: "Street address" },
          city: { type: "string", description: "City" },
          state: { type: "string", description: "State/Province" },
          country: { type: "string", description: "Country" },
          phone: { type: "string", minLength: 2, description: "Contact phone" },
          email: { type: "string", format: "email", description: "Contact email" },
        },
        description: "All fields are optional. Branch Managers can update their branch contact information.",
      },
      MyBranchResponse: {
        allOf: [
          { $ref: "#/components/schemas/Branch" },
          {
            type: "object",
            properties: {
              hospital: {
                type: "object",
                properties: {
                  id: { type: "string", format: "uuid" },
                  name: { type: "string" },
                  logo: { type: "string", nullable: true },
                  logoUrl: { type: "string", nullable: true },
                },
              },
              statistics: {
                type: "object",
                properties: {
                  totalUsers: { type: "integer", example: 45, description: "All users in branch" },
                  totalAppointments: { type: "integer", example: 230, description: "All appointments ever created" },
                  activeDoctors: { type: "integer", example: 12, description: "Active doctors in branch" },
                  totalPatients: { type: "integer", example: 32, description: "Registered patients" },
                  todayAppointments: { type: "integer", example: 8, description: "Today's scheduled appointments" },
                },
              },
            },
          },
        ],
      },
      Manager: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          hospitalId: { type: "string", format: "uuid" },
          branchId: { type: "string", format: "uuid", nullable: true, description: "Null if unassigned" },
          fullName: { type: "string" },
          email: { type: "string", format: "email" },
          status: { $ref: "#/components/schemas/UserStatus" },
          emailVerifiedAt: { type: "string", format: "date-time", nullable: true },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
          branch: {
            type: "object",
            nullable: true,
            properties: {
              id: { type: "string", format: "uuid" },
              name: { type: "string" },
              address: { type: "string" },
              city: { type: "string", nullable: true },
              state: { type: "string", nullable: true },
              phone: { type: "string" },
              email: { type: "string", format: "email" },
              isHeadBranch: { type: "boolean" },
            },
            description: "Branch details (null if unassigned)",
          },
        },
      },
      DoctorCreateRequest: {
        type: "object",
        required: ["fullName", "email", "password", "branchId"],
        properties: {
          fullName: { type: "string" },
          email: { type: "string", format: "email" },
          password: { type: "string", format: "password", minLength: 8 },
          branchId: { type: "string", format: "uuid" },
          specialty: { type: "string", nullable: true },
          license: { type: "string", nullable: true },
        },
      },
      DoctorUpdateRequest: {
        type: "object",
        properties: {
          fullName: { type: "string", minLength: 2, description: "Updated name" },
          status: {
            type: "string",
            enum: ["ACTIVE", "PENDING", "SUSPENDED"],
            description: "Updated status",
          },
          specialty: { type: "string", description: "Medical specialty" },
          license: { type: "string", description: "Medical license number" },
        },
        description: "All fields are optional. Only provided fields will be updated.",
      },
      PatientCreateRequest: {
        type: "object",
        required: ["fullName", "email"],
        properties: {
          fullName: { type: "string" },
          email: { type: "string", format: "email" },
          dateOfBirth: { type: "string", format: "date", nullable: true },
        },
      },
      AppointmentCreateRequest: {
        type: "object",
        required: ["doctorId", "patientId", "branchId", "appointmentType", "appointmentDate", "appointmentTime"],
        properties: {
          doctorId: { type: "string", format: "uuid" },
          patientId: { type: "string", format: "uuid" },
          branchId: { type: "string", format: "uuid" },
          appointmentType: { $ref: "#/components/schemas/AppointmentType" },
          appointmentDate: { type: "string", format: "date", description: "Appointment date in YYYY-MM-DD format" },
          appointmentTime: { type: "string", pattern: "^\\d{2}:\\d{2}$", description: "Appointment time in HH:mm format" },
          note: { type: "string", nullable: true },
        },
      },
      Hospital: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          name: { type: "string" },
          logo: { type: "string", nullable: true, description: "Relative path to logo file" },
          logoUrl: { type: "string", nullable: true, description: "Full URL to logo image" },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      Branch: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          hospitalId: { type: "string", format: "uuid" },
          name: { type: "string" },
          address: { type: "string" },
          phone: { type: "string" },
          email: { type: "string", format: "email" },
          isHeadBranch: { type: "boolean" },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      User: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          hospitalId: { type: "string", format: "uuid" },
          branchId: { type: "string", format: "uuid", nullable: true },
          fullName: { type: "string" },
          email: { type: "string", format: "email" },
          role: { $ref: "#/components/schemas/UserRole" },
          status: { $ref: "#/components/schemas/UserStatus" },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      Doctor: {
        allOf: [
          { $ref: "#/components/schemas/User" },
          {
            type: "object",
            properties: {
              specialty: { type: "string", nullable: true },
              license: { type: "string", nullable: true },
            },
          },
        ],
      },
      Patient: {
        allOf: [
          { $ref: "#/components/schemas/User" },
          {
            type: "object",
            properties: {
              dateOfBirth: { type: "string", format: "date", nullable: true },
            },
          },
        ],
      },
      PatientProfile: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          userId: { type: "string", format: "uuid" },
          // Personal & Demographic
          dateOfBirth: { type: "string", format: "date-time", nullable: true, description: "Patient's date of birth" },
          gender: { 
            type: "string", 
            enum: ["MALE", "FEMALE", "OTHER"], 
            nullable: true,
            description: "Patient's gender"
          },
          maritalStatus: { 
            type: "string", 
            enum: ["SINGLE", "MARRIED", "DIVORCED", "WIDOWED", "OTHER"], 
            nullable: true,
            description: "Patient's marital status"
          },
          nationality: { type: "string", nullable: true, description: "Patient's nationality" },
          stateOfResidence: { type: "string", nullable: true, description: "State where patient resides" },
          city: { type: "string", nullable: true, description: "City where patient resides" },
          address: { type: "string", nullable: true, description: "Full address" },
          // Medical Baseline
          bloodGroup: { 
            type: "string", 
            enum: ["A_POSITIVE", "A_NEGATIVE", "B_POSITIVE", "B_NEGATIVE", "AB_POSITIVE", "AB_NEGATIVE", "O_POSITIVE", "O_NEGATIVE"], 
            nullable: true,
            description: "Patient's blood group"
          },
          genotype: { 
            type: "string", 
            enum: ["AA", "AS", "AC", "SS", "SC", "CC"], 
            nullable: true,
            description: "Patient's genotype"
          },
          knownAllergies: { type: "string", nullable: true, description: "Known allergies (comma-separated or free text)" },
          existingConditions: { type: "string", nullable: true, description: "Pre-existing medical conditions (e.g. asthma, diabetes)" },
          disabilities: { type: "string", nullable: true, description: "Any disabilities (optional)" },
          // Emergency Contact
          emergencyContactName: { type: "string", nullable: true, description: "Emergency contact full name" },
          emergencyContactPhone: { type: "string", nullable: true, description: "Emergency contact phone number" },
          emergencyContactRelationship: { type: "string", nullable: true, description: "Relationship to patient (e.g. spouse, parent, sibling)" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      PatientProfileUpdateRequest: {
        type: "object",
        description: "Update patient profile. All fields are optional - only provided fields will be updated.",
        properties: {
          // Personal & Demographic
          dateOfBirth: { 
            type: "string", 
            format: "date-time", 
            example: "1990-05-15T00:00:00.000Z",
            description: "Date of birth in ISO 8601 format"
          },
          gender: { 
            type: "string", 
            enum: ["MALE", "FEMALE", "OTHER"],
            example: "FEMALE"
          },
          maritalStatus: { 
            type: "string", 
            enum: ["SINGLE", "MARRIED", "DIVORCED", "WIDOWED", "OTHER"],
            example: "SINGLE"
          },
          nationality: { type: "string", example: "Nigerian", minLength: 2, maxLength: 100 },
          stateOfResidence: { type: "string", example: "Lagos", minLength: 2, maxLength: 100 },
          city: { type: "string", example: "Ikeja", minLength: 2, maxLength: 100 },
          address: { type: "string", example: "123 Allen Avenue, Ikeja", minLength: 5, maxLength: 500 },
          // Medical Baseline
          bloodGroup: { 
            type: "string", 
            enum: ["A_POSITIVE", "A_NEGATIVE", "B_POSITIVE", "B_NEGATIVE", "AB_POSITIVE", "AB_NEGATIVE", "O_POSITIVE", "O_NEGATIVE"],
            example: "O_POSITIVE",
            description: "Patient's blood group"
          },
          genotype: { 
            type: "string", 
            enum: ["AA", "AS", "AC", "SS", "SC", "CC"],
            example: "AA",
            description: "Patient's genotype"
          },
          knownAllergies: { 
            type: "string", 
            example: "Penicillin, Peanuts",
            maxLength: 1000,
            description: "List known allergies (comma-separated or free text)"
          },
          existingConditions: { 
            type: "string", 
            example: "Asthma, Hypertension",
            maxLength: 1000,
            description: "Pre-existing medical conditions"
          },
          disabilities: { 
            type: "string", 
            example: "None",
            maxLength: 500,
            description: "Any disabilities (optional)"
          },
          // Emergency Contact
          emergencyContactName: { 
            type: "string", 
            example: "John Doe",
            minLength: 2,
            maxLength: 200,
            description: "Full name of emergency contact"
          },
          emergencyContactPhone: { 
            type: "string", 
            example: "+2348012345678",
            minLength: 7,
            maxLength: 20,
            description: "Phone number of emergency contact"
          },
          emergencyContactRelationship: { 
            type: "string", 
            example: "Spouse",
            minLength: 2,
            maxLength: 100,
            description: "Relationship to patient"
          },
        },
      },
      PatientProfileResponse: {
        type: "object",
        properties: {
          user: {
            type: "object",
            properties: {
              id: { type: "string", format: "uuid" },
              fullName: { type: "string" },
              email: { type: "string", format: "email" },
              emailVerifiedAt: { type: "string", format: "date-time", nullable: true },
              status: { type: "string", enum: ["PENDING", "ACTIVE", "SUSPENDED"] },
            },
          },
          hospital: {
            type: "object",
            properties: {
              id: { type: "string", format: "uuid" },
              name: { type: "string" },
              logo: { type: "string", nullable: true },
            },
          },
          profile: { $ref: "#/components/schemas/PatientProfile" },
        },
      },
      Appointment: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          hospitalId: { type: "string", format: "uuid" },
          branchId: { type: "string", format: "uuid" },
          doctorId: { type: "string", format: "uuid" },
          patientId: { type: "string", format: "uuid" },
          status: { $ref: "#/components/schemas/AppointmentStatus" },
          appointmentType: { $ref: "#/components/schemas/AppointmentType" },
          scheduledAt: { type: "string", format: "date-time" },
          cancelReason: { type: "string", nullable: true, description: "Reason for cancellation (if status is cancelled)" },
          cancelledAt: { type: "string", format: "date-time", nullable: true, description: "Timestamp when appointment was cancelled" },
          videoCallStartedAt: { type: "string", format: "date-time", nullable: true, description: "Timestamp when video call session started" },
          videoCallEndedAt: { type: "string", format: "date-time", nullable: true, description: "Timestamp when video call session ended" },
          videoCallIsActive: { type: "boolean", default: false, description: "Whether the video call session is currently active" },
          videoCallDuration: { type: "integer", nullable: true, description: "Video call duration in minutes (calculated when call ends)" },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      DoctorAvailability: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          doctorId: { type: "string", format: "uuid" },
          dayOfWeek: {
            type: "string",
            enum: ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"],
          },
          startTime: { type: "string", pattern: "^\\d{2}:\\d{2}$", example: "09:00" },
          endTime: { type: "string", pattern: "^\\d{2}:\\d{2}$", example: "17:00" },
          isActive: { type: "boolean", default: true },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      VideoCallTokenRequest: {
        type: "object",
        required: ["branchId", "doctorId", "patientId"],
        description: "Request to generate Agora video call token",
        properties: {
          branchId: {
            type: "string",
            format: "uuid",
            description: "UUID of the branch where the video call will take place",
            example: "550e8400-e29b-41d4-a716-446655440000",
          },
          doctorId: {
            type: "string",
            format: "uuid",
            description: "UUID of the doctor (must have DOCTOR role, must be in the specified branch)",
            example: "6ba7b810-950c-7e8c-e41d-4f0000000001",
          },
          patientId: {
            type: "string",
            format: "uuid",
            description: "UUID of the patient (must have PATIENT role, must be in same hospital)",
            example: "6ba7b810-950c-7e8c-e41d-4f0000000002",
          },
        },
      },
      VideoCallTokenResponse: {
        type: "object",
        description: "Agora video call token response with FCM device tokens - ready to join video call",
        properties: {
          message: {
            type: "string",
            example: "Agora tokens generated successfully",
          },
          data: {
            type: "object",
            required: ["agoraAppId", "channelName", "caller", "receiver"],
            properties: {
              agoraAppId: {
                type: "string",
                description: "Agora App ID needed to initialize the Agora SDK (stored in database and returned from .env)",
                example: "0b0a3b554bbb4204864c5336a55194f5",
              },
              channelName: {
                type: "string",
                description: "Unique channel name for this video call (doctor and patient use same channel)",
                example: "branch_550e8400e29b41d4a716446655440000_doctor_6ba7b8109_patient_6ba7b8109",
              },
              caller: {
                type: "object",
                description: "Patient information (call initiator) - Publisher role",
                required: ["role", "account", "token", "expiresIn", "expiresAt"],
                properties: {
                  role: {
                    type: "string",
                    enum: ["publisher"],
                    description: "Agora role: can send/receive video and audio",
                    example: "publisher",
                  },
                  account: {
                    type: "string",
                    format: "uuid",
                    description: "Patient user ID",
                    example: "550e8400-e29b-41d4-a716-446655440000",
                  },
                  token: {
                    type: "string",
                    description: "Agora RTC access token for patient",
                    example: "006db45e77c0cba4bf1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0",
                  },
                  expiresIn: {
                    type: "integer",
                    description: "Token lifetime in seconds (86400 = 24 hours)",
                    example: 86400,
                  },
                  expiresAt: {
                    type: "number",
                    description: "Absolute token expiration timestamp in milliseconds",
                    example: 1706553290000,
                  },
                  fcmDeviceToken: {
                    type: "string",
                    nullable: true,
                    description: "FCM device token registered for the patient (for push notifications)",
                    example: "e9qTfPvOqRuXaYsZ2x5hJ3k9m1c7vBjL4nWqY8pD6zH2",
                  },
                },
              },
              receiver: {
                type: "object",
                description: "Doctor information (call receiver) - Subscriber role",
                required: ["role", "account", "token", "expiresIn", "expiresAt"],
                properties: {
                  role: {
                    type: "string",
                    enum: ["subscriber"],
                    description: "Agora role: can receive video and audio only",
                    example: "subscriber",
                  },
                  account: {
                    type: "string",
                    format: "uuid",
                    description: "Doctor user ID",
                    example: "6ba7b810-950c-7e8c-e41d-4f0000000001",
                  },
                  token: {
                    type: "string",
                    description: "Agora RTC access token for doctor",
                    example: "006db45e77c0cba4bf1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0",
                  },
                  expiresIn: {
                    type: "integer",
                    description: "Token lifetime in seconds (86400 = 24 hours)",
                    example: 86400,
                  },
                  expiresAt: {
                    type: "number",
                    description: "Absolute token expiration timestamp in milliseconds",
                    example: 1706553290000,
                  },
                  fcmDeviceToken: {
                    type: "string",
                    nullable: true,
                    description: "FCM device token registered for the doctor (for push notifications)",
                    example: "c7bJtKpMqRsUvWxYzA3dE5fG7hI9jK1lM3nO5pQ7r",
                  },
                },
              },
              requesterRole: {
                type: "string",
                enum: ["patient", "doctor"],
                description: "Role of the user who requested this token",
                example: "patient",
              },
            },
          },
        },
      },
      DeviceToken: {
        type: "object",
        description: "Firebase Cloud Messaging (FCM) device token for push notifications",
        properties: {
          id: {
            type: "string",
            format: "uuid",
            description: "Unique identifier for the device token record",
            example: "550e8400-e29b-41d4-a716-446655440000",
          },
          userId: {
            type: "string",
            format: "uuid",
            description: "User ID of the device owner (doctor or patient)",
            example: "550e8400-e29b-41d4-a716-446655440000",
          },
          fcmToken: {
            type: "string",
            minLength: 10,
            description: "Firebase Cloud Messaging token from mobile device",
            example: "e9qTfPvOqRuXaYsZ2x5hJ3k9m1c7vBjL4nWqY8pD6zH2",
          },
          deviceType: {
            type: "string",
            enum: ["ios", "android", "web", "unknown"],
            description: "Type of device (iOS, Android, Web, or Unknown)",
            example: "android",
          },
          isActive: {
            type: "boolean",
            description: "Whether the token is active and can receive notifications",
            example: true,
          },
          lastUsedAt: {
            type: "string",
            format: "date-time",
            nullable: true,
            description: "Timestamp of the last time this token was used",
            example: null,
          },
          createdAt: {
            type: "string",
            format: "date-time",
            description: "Timestamp when the device token was registered",
            example: "2025-03-10T12:00:00Z",
          },
          updatedAt: {
            type: "string",
            format: "date-time",
            description: "Timestamp when the device token was last updated",
            example: "2025-03-10T12:00:00Z",
          },
        },
      },
      UserRole: {
        type: "string",
        enum: ["SYSTEM_ADMIN", "SUPER_ADMIN", "BRANCH_MANAGER", "DOCTOR", "PATIENT"],
      },
      UserStatus: {
        type: "string",
        enum: ["PENDING", "ACTIVE", "SUSPENDED"],
      },
      AppointmentStatus: {
        type: "string",
        enum: ["requested", "confirmed", "in_progress", "completed", "cancelled"],
      },
      AppointmentType: {
        type: "string",
        enum: ["virtual", "physical"],
      },
    },
  },
};

import { getCorsHeaders } from "@/lib/cors";

export async function GET() {
  return NextResponse.json(openapiSpec, { headers: getCorsHeaders() });
}

