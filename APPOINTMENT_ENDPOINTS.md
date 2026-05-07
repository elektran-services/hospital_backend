# Appointment API Endpoints - Quick Reference

---

## Base URL
```
/api/v1/appointments
```

---

## Endpoints Summary

| Method | Endpoint | Description | Roles |
|--------|----------|-------------|-------|
| GET | `/api/v1/appointments` | List appointments | All authenticated users |
| POST | `/api/v1/appointments` | Create appointment | PATIENT (self-booking), ADMIN (for others) |
| GET | `/api/v1/appointments/history` | Get appointment history | DOCTOR, PATIENT, BRANCH_MANAGER, SUPER_ADMIN |
| GET | `/api/v1/appointments/available-doctors` | Get available doctors with slots | PATIENT |
| PATCH | `/api/v1/appointments/{appointmentId}/reschedule` | Reschedule appointment | DOCTOR, PATIENT, BRANCH_MANAGER, SUPER_ADMIN |
| POST | `/api/v1/appointments/{appointmentId}/cancel` | Cancel appointment | DOCTOR, PATIENT, BRANCH_MANAGER, SUPER_ADMIN |
| PATCH | `/api/v1/appointments/{appointmentId}/video-call-status` | 🔵 Update video call status (start/end) | DOCTOR, PATIENT |
| PATCH | `/api/v1/appointments/{appointmentId}/video-call-status` | 🔵 Update video call status (start/end) | DOCTOR, PATIENT |

---

## 1. List Appointments

**GET** `/api/v1/appointments`

**Query Parameters:**
- `page` (optional): Page number, default: 1
- `pageSize` (optional): Items per page, default: 20, max: 100

**Response:**
```json
{
  "items": [...],
  "total": 50,
  "page": 1,
  "pageSize": 20
}
```

---

## 2. Create Appointment (Patient)

**POST** `/api/v1/appointments`

**Body:**
```json
{
  "branchId": "uuid",
  "doctorId": "uuid",              // optional (auto-assigns if not provided)
  "appointmentDate": "2026-02-15",
  "appointmentTime": "14:30",
  "appointmentType": "virtual",    // "virtual" or "physical"
  "note": "First visit"            // optional
}
```

**Response (201):**
```json
{
  "message": "Connecting ...",
  "data": {
    "appointmentId": "uuid",
    "doctorId": "uuid",
    "doctorName": "Dr. John Smith",
    "patientId": "uuid",
    "branchId": "uuid",
    "appointmentType": "virtual",
    "scheduledAt": "2026-02-15T14:30:00.000Z",
    "status": "requested"
  }
}
```

---

## 3. Create Appointment (Admin)

**POST** `/api/v1/appointments`

**Body:**
```json
{
  "doctorId": "uuid",
  "patientId": "uuid",
  "branchId": "uuid",
  "appointmentType": "virtual",
  "appointmentDate": "2026-02-15",
  "appointmentTime": "14:30",
  "note": "Follow-up consultation"  // optional
}
```

**Response (201):**
```json
{
  "id": "uuid",
  "hospitalId": "uuid",
  "branchId": "uuid",
  "doctorId": "uuid",
  "patientId": "uuid",
  "appointmentType": "virtual",
  "scheduledAt": "2026-02-15T14:30:00.000Z",
  "status": "requested",
  "note": "Follow-up consultation",
  "createdAt": "2026-02-09T10:00:00.000Z",
  "createdBy": "uuid"
}
```

---

## 4. Appointment History

**GET** `/api/v1/appointments/history`

**Query Parameters:**
- `status` (optional): "upcoming" | "completed" | "cancelled" | "all" (default: "all")
- `page` (optional): Page number, default: 1
- `limit` (optional): Items per page, default: 20, max: 100

**Response (200):**
```json
{
  "message": "Appointments retrieved successfully",
  "data": {
    "appointments": [
      {
        "id": "uuid",
        "status": "confirmed",
        "appointmentType": "virtual",
        "scheduledAt": "2026-02-15T14:30:00.000Z",
        "note": "Follow-up consultation",
        "cancelReason": null,
        "cancelledAt": null,
        "createdAt": "2026-02-09T10:00:00.000Z",
        "doctor": {
          "id": "uuid",
          "fullName": "Dr. John Smith",
          "email": "john.smith@hospital.com",
          "doctorProfile": { "specialty": "Cardiology" }
        },
        "patient": {
          "id": "uuid",
          "fullName": "Jane Doe",
          "email": "jane.doe@example.com"
        },
        "branch": {
          "id": "uuid",
          "name": "Downtown Branch",
          "address": "123 Main St"
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 50,
      "totalPages": 3
    }
  }
}
```

---

## 5. Available Doctors

**GET** `/api/v1/appointments/available-doctors`

**Query Parameters:**
- `branchId` (required): Branch UUID
- `appointmentDate` (required): Date in YYYY-MM-DD format
- `slotDuration` (optional): Minutes (default: 30, min: 15, max: 480)

**Response (200):**
```json
{
  "date": "2026-02-15",
  "dayOfWeek": "SATURDAY",
  "branchId": "uuid",
  "slotDuration": 30,
  "availableDoctors": [
    {
      "doctorId": "uuid",
      "doctorName": "Dr. John Smith",
      "specialty": "Cardiology",
      "availableSlots": [
        "09:00-09:30",
        "09:30-10:00",
        "10:00-10:30",
        "11:00-11:30",
        "14:00-14:30",
        "15:00-15:30"
      ],
      "totalAvailableSlots": 6
    }
  ],
  "totalAvailableDoctors": 1
}
```

---

## 6. Reschedule Appointment

**PATCH** `/api/v1/appointments/{appointmentId}/reschedule`

**Body:**
```json
{
  "scheduledAt": "2026-02-20T10:00:00Z",
  "note": "Rescheduling due to doctor's availability"  // optional
}
```

**Response (200):**
```json
{
  "message": "Appointment rescheduled successfully",
  "data": {
    "id": "uuid",
    "status": "requested",
    "appointmentType": "virtual",
    "scheduledAt": "2026-02-20T10:00:00.000Z",
    "note": "Rescheduling due to doctor's availability",
    "doctor": { ... },
    "patient": { ... },
    "branch": { ... }
  }
}
```

**Note:** Rescheduling resets status to "requested"

---

## 7. Cancel Appointment

**POST** `/api/v1/appointments/{appointmentId}/cancel`

**Body:**
```json
{
  "reason": "Unable to attend due to emergency"
}
```

**Response (200):**
```json
{
  "message": "Appointment cancelled successfully",
  "data": {
    "id": "uuid",
    "status": "cancelled",
    "appointmentType": "virtual",
    "scheduledAt": "2026-02-15T14:30:00.000Z",
    "note": "Follow-up consultation",
    "cancelReason": "Unable to attend due to emergency",
    "cancelledAt": "2026-02-10T09:15:00.000Z",
    "doctor": { ... },
    "patient": { ... },
    "branch": { ... }
  }
}
```

---

## 8. Video Call Status Tracking (🔵 Mobile)

**PATCH** `/api/v1/appointments/{appointmentId}/video-call-status`

**Purpose:** Track when video call sessions start and end for virtual appointments.

**Body (Start Call):**
```json
{
  "event": "started",
  "timestamp": "2026-02-15T14:32:00Z",
  "doctorId": "uuid",
  "patientId": "uuid",
  "branchId": "uuid"
}
```

**Body (End Call):**
```json
{
  "event": "ended",
  "timestamp": "2026-02-15T15:02:00Z",
  "doctorId": "uuid",
  "patientId": "uuid",
  "branchId": "uuid"
}
```

**Response (200):**
```json
{
  "message": "Video call started/ended successfully",
  "data": {
    "id": "uuid",
    "status": "in_progress",
    "videoCallStartedAt": "2026-02-15T14:32:00Z",
    "videoCallEndedAt": "2026-02-15T15:02:00Z",
    "videoCallIsActive": false,
    "videoCallDuration": 30
  }
}
```

**Behavior:**
- **Started:** status → "in_progress", videoCallIsActive = true
- **Ended:** videoCallIsActive = false, duration calculated (minutes)
- Call participants (doctor/patient) AND admins can update status
- IDs must match appointment values
- Admins: for monitoring and oversight purposes

---

## Common HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request (validation error) |
| 401 | Unauthorized (not authenticated) |
| 403 | Forbidden (not authorized) |
| 404 | Not Found |
| 409 | Conflict (slot already booked, no available doctors) |
| 500 | Internal Server Error |

---

## Authentication

All endpoints require Bearer token:
```
Authorization: Bearer <access_token>
```

---

## Appointment Status Flow

```
requested → confirmed → in_progress → completed
    ↓           ↓            ↓
cancelled   cancelled    cancelled
```

**Status Values:**
- `requested` - Initial state
- `confirmed` - Doctor/Admin confirmed
- `in_progress` - Video call session active (virtual appointments only)
- `completed` - Appointment finished
- `cancelled` - Cancelled by any authorized user

---

## Appointment Types

- `virtual` - Video call consultation
- `physical` - In-person visit

---

## Quick Examples

### Patient Books Appointment
```bash
POST /api/v1/appointments
Content-Type: application/json
Authorization: Bearer <token>

{
  "branchId": "550e8400-e29b-41d4-a716-446655440000",
  "appointmentDate": "2026-02-15",
  "appointmentTime": "14:30",
  "appointmentType": "virtual"
}
```

### Check Available Doctors
```bash
GET /api/v1/appointments/available-doctors?branchId=550e8400-e29b-41d4-a716-446655440000&appointmentDate=2026-02-15&slotDuration=30
Authorization: Bearer <token>
```

### View Upcoming Appointments
```bash
GET /api/v1/appointments/history?status=upcoming&page=1&limit=10
Authorization: Bearer <token>
```

### Reschedule
```bash
PATCH /api/v1/appointments/abc123/reschedule
Content-Type: application/json
Authorization: Bearer <token>

{
  "scheduledAt": "2026-02-20T10:00:00Z"
}
```

### Cancel
```bash
POST /api/v1/appointments/abc123/cancel
Content-Type: application/json
Authorization: Bearer <token>

{
  "reason": "Family emergency"
}
```

### Video Call Status (Start)
```bash
PATCH /api/v1/appointments/abc123/video-call-status
Content-Type: application/json
Authorization: Bearer <token>

{
  "event": "started",
  "timestamp": "2026-02-15T14:32:00Z",
  "doctorId": "550e8400-e29b-41d4-a716-446655440001",
  "patientId": "550e8400-e29b-41d4-a716-446655440002",
  "branchId": "550e8400-e29b-41d4-a716-446655440000"
}
```

### Video Call Status (End)
```bash
PATCH /api/v1/appointments/abc123/video-call-status
Content-Type: application/json
Authorization: Bearer <token>

{
  "event": "ended",
  "timestamp": "2026-02-15T15:02:00Z",
  "doctorId": "550e8400-e29b-41d4-a716-446655440001",
  "patientId": "550e8400-e29b-41d4-a716-446655440002",
  "branchId": "550e8400-e29b-41d4-a716-446655440000"
}
```

---

## Role-Based Access

| Endpoint | PATIENT | DOCTOR | BRANCH_MANAGER | SUPER_ADMIN |
|----------|---------|--------|----------------|-------------|
| List appointments | Own only | Own only | Branch only | Hospital-wide |
| Create (patient flow) | ✅ | ❌ | ❌ | ❌ |
| Create (admin flow) | ❌ | ❌ | ✅ | ✅ |
| History | Own only | Own only | Branch only | Hospital-wide |
| Available doctors | ✅ | ❌ | ❌ | ❌ |
| Reschedule | Own only | Own only | Branch only | Hospital-wide |
| Cancel | Own only | Own only | Branch only | Hospital-wide |
| Video call status | Own only | Own only | Branch only | Hospital-wide |

---

## Notes

- **Auto-assignment**: If patient doesn't provide `doctorId`, system assigns first available doctor
- **Slot conflict**: 409 error if time slot already booked
- **Time format**: Use YYYY-MM-DD for dates, HH:mm for times, ISO 8601 for datetimes
- **Timezone**: System uses West Central African Time (UTC+1) for day-of-week calculations
- **Pagination**: Always use pagination for lists
- **Cancellation**: Reason is mandatory for audit trail

---

For detailed documentation, see [APPOINTMENT_API.md](APPOINTMENT_API.md)
