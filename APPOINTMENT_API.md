# Appointment Management API Documentation

---

## Table of Contents
1. [Appointment CRUD Operations](#appointment-crud-operations)
   - [List Appointments](#1-list-appointments)
   - [Create Appointment (Admin)](#2-create-appointment-admin)
   - [Create Appointment (Patient)](#3-create-appointment-patient)
2. [Appointment History](#4-appointment-history)
3. [Available Doctors](#5-available-doctors)
4. [Reschedule Appointment](#6-reschedule-appointment)
5. [Cancel Appointment](#7-cancel-appointment)
6. [Video Call Status Tracking](#8-video-call-status-tracking)
7. [Common Scenarios](#common-scenarios)

---

## Appointment CRUD Operations

### 1. List Appointments

**Endpoint:** `GET /api/v1/appointments`

**Authentication:** Required (Bearer Token)

**Roles:** All authenticated users

**Query Parameters:**
```json
{
  "page": 1,           // optional, default: 1
  "pageSize": 20       // optional, default: 20, max: 100
}
```

**Access Control:**
- **Super Admin / System Admin:** Can view all appointments in their hospital
- **Branch Manager:** Can only view appointments in their assigned branch
- **Doctor:** Can only view their own appointments
- **Patient:** Can only view their own appointments

**Response (200 OK):**
```json
{
  "items": [
    {
      "id": "uuid",
      "hospitalId": "uuid",
      "branchId": "uuid",
      "doctorId": "uuid",
      "patientId": "uuid",
      "appointmentType": "virtual",
      "scheduledAt": "2026-02-10T14:30:00.000Z",
      "status": "requested",
      "note": "Initial consultation",
      "cancelReason": null,
      "cancelledAt": null,
      "createdAt": "2026-02-09T10:00:00.000Z",
      "createdBy": "uuid",
      "doctor": {
        "id": "uuid",
        "fullName": "Dr. John Smith",
        "doctorProfile": {
          "specialty": "Cardiology"
        }
      },
      "patient": {
        "id": "uuid",
        "fullName": "Jane Doe",
        "email": "jane.doe@example.com"
      }
    }
  ],
  "total": 50,
  "page": 1,
  "pageSize": 20
}
```

**Error Response (401 Unauthorized):**
```json
{
  "error": "Unauthorized"
}
```

---

### 2. Create Appointment (Admin)

**Endpoint:** `POST /api/v1/appointments`

**Authentication:** Required (Bearer Token)

**Roles:** SYSTEM_ADMIN, SUPER_ADMIN, BRANCH_MANAGER

**Description:** Allows administrators to create appointments on behalf of patients with explicit doctor assignment.

**Request Body:**
```json
{
  "doctorId": "uuid",
  "patientId": "uuid",
  "branchId": "uuid",
  "appointmentType": "virtual",
  "appointmentDate": "2026-02-15",
  "appointmentTime": "14:30",
  "note": "Follow-up consultation"
}
```

**Validation Rules:**
- `doctorId`: Valid UUID format, must be a doctor in the hospital
- `patientId`: Valid UUID format, must be a patient in the hospital
- `branchId`: Valid UUID format, must be a branch in the hospital
- `appointmentType`: Must be either "virtual" or "physical"
- `appointmentDate`: Must be in YYYY-MM-DD format
- `appointmentTime`: Must be in HH:mm format (24-hour)
- `note`: Optional string

**Access Control:**
- **Branch Manager:** Can only create appointments in their assigned branch

**Response (201 Created):**
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

**Error Response (400 Bad Request):**
```json
{
  "error": {
    "formErrors": [],
    "fieldErrors": {
      "appointmentDate": ["Appointment date must be in YYYY-MM-DD format"]
    }
  }
}
```

**Error Response (403 Forbidden - Branch Manager):**
```json
{
  "error": "Forbidden: branch scope"
}
```

**Error Response (404 Not Found):**
```json
{
  "error": "Doctor not found"
}
```

---

### 3. Create Appointment (Patient)

**Endpoint:** `POST /api/v1/appointments`

**Authentication:** Required (Bearer Token)

**Roles:** PATIENT

**Description:** Allows patients to book appointments. If no doctor is specified, the system auto-assigns the first available doctor for the requested date.

**Request Body:**
```json
{
  "branchId": "uuid",
  "doctorId": "uuid",                    // optional
  "appointmentDate": "2026-02-15",
  "appointmentTime": "14:30",
  "appointmentType": "virtual",
  "note": "First visit"                  // optional
}
```

**Validation Rules:**
- `branchId`: Valid UUID format
- `doctorId`: Optional UUID format (auto-assigned if not provided)
- `appointmentDate`: Must be in YYYY-MM-DD format
- `appointmentTime`: Must be in HH:mm format (24-hour)
- `appointmentType`: Must be either "virtual" or "physical"
- `note`: Optional string

**Auto-Assignment Logic:**
When `doctorId` is not provided:
1. System determines day of week from `appointmentDate`
2. Finds all active doctors in the branch with availability for that day
3. Selects first available doctor
4. Returns error if no doctors are available

**Response (201 Created):**
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

**Error Response (404 Not Found - Branch):**
```json
{
  "error": "Branch not found"
}
```

**Error Response (404 Not Found - Doctor):**
```json
{
  "error": "Doctor not found or inactive"
}
```

**Error Response (409 Conflict - No Available Doctors):**
```json
{
  "error": "No available doctors for this date"
}
```

**Error Response (409 Conflict - Slot Booked):**
```json
{
  "error": "This time slot is already booked"
}
```

---

## 4. Appointment History

**Endpoint:** `GET /api/v1/appointments/history`

**Authentication:** Required (Bearer Token)

**Roles:** DOCTOR, PATIENT, BRANCH_MANAGER, SUPER_ADMIN

**Description:** Retrieve appointment history with status-based filtering and pagination.

**Query Parameters:**
```json
{
  "status": "upcoming",    // optional: "upcoming" | "completed" | "cancelled" | "all"
  "page": 1,              // optional, default: 1
  "limit": 20             // optional, default: 20, max: 100
}
```

**Status Logic:**
- `upcoming`: `scheduledAt >= now` AND `status != 'cancelled'`
- `completed`: `status = 'completed'`
- `cancelled`: `status = 'cancelled'`
- `all`: All appointments (default)

**Access Control:**
- **Doctor:** Only their appointments
- **Patient:** Only their appointments
- **Branch Manager:** All appointments in their branch
- **Super Admin:** All appointments in the hospital

**Response (200 OK):**
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
          "doctorProfile": {
            "specialty": "Cardiology"
          }
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

**Error Response (400 Bad Request):**
```json
{
  "error": "Validation error",
  "details": {
    "formErrors": [],
    "fieldErrors": {
      "status": ["Invalid enum value. Expected 'upcoming' | 'completed' | 'cancelled' | 'all'"]
    }
  }
}
```

**Error Response (401 Unauthorized):**
```json
{
  "error": "Unauthorized",
  "message": "Authentication required"
}
```

---

## 5. Available Doctors

**Endpoint:** `GET /api/v1/appointments/available-doctors`

**Authentication:** Required (Bearer Token)

**Roles:** PATIENT

**Description:** Get list of available doctors with their available time slots for a specific date in a branch. Useful for patient booking flows.

**Query Parameters:**
```json
{
  "branchId": "uuid",
  "appointmentDate": "2026-02-15",
  "slotDuration": 30              // optional, default: 30, min: 15, max: 480 (minutes)
}
```

**Slot Generation Logic:**
1. Determines day of week from appointment date (West Central African Time UTC+1)
2. Fetches all active doctors in the branch with availability for that day
3. Generates time slots based on doctor's working hours and slot duration
4. Excludes already booked slots (appointments with status "requested" or "confirmed")

**Response (200 OK):**
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
    },
    {
      "doctorId": "uuid",
      "doctorName": "Dr. Sarah Johnson",
      "specialty": "Pediatrics",
      "availableSlots": [
        "08:00-08:30",
        "08:30-09:00",
        "10:30-11:00",
        "13:00-13:30"
      ],
      "totalAvailableSlots": 4
    }
  ],
  "totalAvailableDoctors": 2
}
```

**Note:** Only doctors with at least one available slot are returned.

**Error Response (400 Bad Request):**
```json
{
  "error": {
    "formErrors": [],
    "fieldErrors": {
      "branchId": ["Branch ID must be a valid UUID"],
      "appointmentDate": ["Appointment date must be in YYYY-MM-DD format"]
    }
  }
}
```

**Error Response (404 Not Found):**
```json
{
  "error": "Branch not found"
}
```

---

## 6. Reschedule Appointment

**Endpoint:** `PATCH /api/v1/appointments/{appointmentId}/reschedule`

**Authentication:** Required (Bearer Token)

**Roles:** DOCTOR, PATIENT, BRANCH_MANAGER, SUPER_ADMIN

**Description:** Reschedule an existing appointment to a new date/time. Resets appointment status to "requested" when rescheduled.

**Path Parameters:**
- `appointmentId` (string, uuid): Appointment's ID

**Request Body:**
```json
{
  "scheduledAt": "2026-02-20T10:00:00Z",
  "note": "Rescheduling due to doctor's availability"   // optional
}
```

**Validation Rules:**
- `scheduledAt`: Must be in ISO 8601 datetime format
- Scheduled time must be in the future
- Cannot reschedule completed or cancelled appointments

**Access Control:**
- **Super Admin:** Can reschedule any appointment
- **Branch Manager:** Can reschedule appointments in their branch
- **Doctor:** Can reschedule their own appointments
- **Patient:** Can reschedule their own appointments

**Response (200 OK):**
```json
{
  "message": "Appointment rescheduled successfully",
  "data": {
    "id": "uuid",
    "status": "requested",
    "appointmentType": "virtual",
    "scheduledAt": "2026-02-20T10:00:00.000Z",
    "note": "Rescheduling due to doctor's availability",
    "cancelReason": null,
    "cancelledAt": null,
    "createdAt": "2026-02-09T10:00:00.000Z",
    "updatedAt": "2026-02-10T08:30:00.000Z",
    "doctor": {
      "id": "uuid",
      "fullName": "Dr. John Smith",
      "email": "john.smith@hospital.com",
      "doctorProfile": {
        "specialty": "Cardiology"
      }
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
}
```

**Error Response (400 Bad Request - Invalid Date):**
```json
{
  "error": "Invalid date",
  "message": "Scheduled date must be in the future"
}
```

**Error Response (400 Bad Request - Invalid Operation):**
```json
{
  "error": "Invalid operation",
  "message": "Cannot reschedule completed appointment"
}
```

**Error Response (403 Forbidden):**
```json
{
  "error": "Forbidden",
  "message": "You cannot reschedule this appointment"
}
```

**Error Response (404 Not Found):**
```json
{
  "error": "Not found",
  "message": "Appointment not found"
}
```

---

## 7. Cancel Appointment

**Endpoint:** `POST /api/v1/appointments/{appointmentId}/cancel`

**Authentication:** Required (Bearer Token)

**Roles:** DOCTOR, PATIENT, BRANCH_MANAGER, SUPER_ADMIN

**Description:** Cancel an existing appointment with a mandatory cancellation reason.

**Path Parameters:**
- `appointmentId` (string, uuid): Appointment's ID

**Request Body:**
```json
{
  "reason": "Unable to attend due to emergency"
}
```

**Validation Rules:**
- `reason`: Required, minimum 1 character, maximum 500 characters
- Cannot cancel completed or already cancelled appointments

**Access Control:**
- **Super Admin:** Can cancel any appointment
- **Branch Manager:** Can cancel appointments in their branch
- **Doctor:** Can cancel their own appointments
- **Patient:** Can cancel their own appointments

**Response (200 OK):**
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
    "createdAt": "2026-02-09T10:00:00.000Z",
    "updatedAt": "2026-02-10T09:15:00.000Z",
    "doctor": {
      "id": "uuid",
      "fullName": "Dr. John Smith",
      "email": "john.smith@hospital.com",
      "doctorProfile": {
        "specialty": "Cardiology"
      }
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
}
```

**Error Response (400 Bad Request - Validation):**
```json
{
  "error": "Validation error",
  "details": {
    "formErrors": [],
    "fieldErrors": {
      "reason": ["Cancellation reason is required"]
    }
  }
}
```

**Error Response (400 Bad Request - Invalid Operation):**
```json
{
  "error": "Invalid operation",
  "message": "Cannot cancel completed appointment"
}
```

**Error Response (403 Forbidden):**
```json
{
  "error": "Forbidden",
  "message": "You cannot cancel this appointment"
}
```

**Error Response (404 Not Found):**
```json
{
  "error": "Not found",
  "message": "Appointment not found"
}
```

---

## 8. Video Call Status Tracking

**Endpoint:** `PATCH /api/v1/appointments/{appointmentId}/video-call-status`

**Authentication:** Required (Bearer Token)

**Roles:** DOCTOR, PATIENT, BRANCH_MANAGER, SUPER_ADMIN

**Description:** Track video call session lifecycle for virtual appointments. Updates when the video call starts and ends, automatically calculating call duration. Both call participants and admins (for monitoring/oversight) can update status.

**Path Parameters:**
- `appointmentId` (string, uuid): Appointment's ID

**Request Body:**
```json
{
  "event": "started",                      // "started" or "ended"
  "timestamp": "2026-02-11T10:00:00Z",    // ISO 8601 datetime
  "doctorId": "uuid",                      // Must match appointment
  "patientId": "uuid",                     // Must match appointment
  "branchId": "uuid"                       // Must match appointment
}
```

**Validation Rules:**
- `event`: Required, must be "started" or "ended"
- `timestamp`: Required, ISO 8601 datetime format
- `doctorId`, `patientId`, `branchId`: Required, must match appointment values
- Only works for virtual appointments
- Cannot update cancelled or completed appointments
- Cannot start an already active call
- Cannot end a call that hasn't started

**Access Control:**
- **Doctor:** Can update status for their own appointments
- **Patient:** Can update status for their own appointments
- **Branch Manager:** Can update status for appointments in their branch (monitoring)
- **Super Admin:** Can update status for any appointment in their hospital (oversight)
- Both call participants and admins can trigger start/end events

**Behavior:**

**When event = "started":**
- Sets `videoCallStartedAt` to provided timestamp
- Sets `videoCallIsActive` to `true`
- Changes appointment `status` to `"in_progress"`

**When event = "ended":**
- Sets `videoCallEndedAt` to provided timestamp
- Sets `videoCallIsActive` to `false`
- Calculates `videoCallDuration` in minutes
- Appointment `status` remains `"in_progress"` (doctor completes manually)

**Response (200 OK - Call Started):**
```json
{
  "message": "Video call started successfully",
  "data": {
    "id": "uuid",
    "status": "in_progress",
    "appointmentType": "virtual",
    "scheduledAt": "2026-02-15T14:30:00.000Z",
    "videoCallStartedAt": "2026-02-15T14:32:00.000Z",
    "videoCallEndedAt": null,
    "videoCallIsActive": true,
    "videoCallDuration": null,
    "note": "Follow-up consultation",
    "createdAt": "2026-02-09T10:00:00.000Z",
    "updatedAt": "2026-02-15T14:32:00.000Z",
    "doctor": {
      "id": "uuid",
      "fullName": "Dr. John Smith",
      "email": "john.smith@hospital.com",
      "doctorProfile": {
        "specialty": "Cardiology"
      }
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
}
```

**Response (200 OK - Call Ended):**
```json
{
  "message": "Video call ended successfully",
  "data": {
    "id": "uuid",
    "status": "in_progress",
    "appointmentType": "virtual",
    "scheduledAt": "2026-02-15T14:30:00.000Z",
    "videoCallStartedAt": "2026-02-15T14:32:00.000Z",
    "videoCallEndedAt": "2026-02-15T15:02:00.000Z",
    "videoCallIsActive": false,
    "videoCallDuration": 30,
    "note": "Follow-up consultation",
    "createdAt": "2026-02-09T10:00:00.000Z",
    "updatedAt": "2026-02-15T15:02:00.000Z",
    "doctor": {
      "id": "uuid",
      "fullName": "Dr. John Smith",
      "email": "john.smith@hospital.com",
      "doctorProfile": {
        "specialty": "Cardiology"
      }
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
}
```

**Error Response (400 Bad Request - Validation):**
```json
{
  "error": "Validation error",
  "details": {
    "formErrors": [],
    "fieldErrors": {
      "event": ["event must be 'started' or 'ended'"]
    }
  }
}
```

**Error Response (400 Bad Request - Invalid Operation):**
```json
{
  "error": "Invalid operation",
  "message": "Video call is already active"
}
```

**Error Response (400 Bad Request - ID Mismatch):**
```json
{
  "error": "Invalid operation",
  "message": "Doctor ID does not match appointment"
}
```

**Error Response (403 Forbidden - Not Virtual):**
```json
{
  "error": "Forbidden",
  "message": "Video call status can only be updated for virtual appointments"
}
```

**Error Response (403 Forbidden - Wrong User):**
```json
{
  "error": "Forbidden",
  "message": "You can only update video call status for your own appointments"
}
```

**Error Response (404 Not Found):**
```json
{
  "error": "Not found",
  "message": "Appointment not found"
}
```

---

## Common Scenarios

### Scenario 1: Patient Books Appointment (With Doctor Selection)

**Step 1:** Check available doctors
```bash
GET /api/v1/appointments/available-doctors?branchId=uuid&appointmentDate=2026-02-15&slotDuration=30
```

**Step 2:** Book appointment with selected doctor and time slot
```bash
POST /api/v1/appointments
{
  "branchId": "uuid",
  "doctorId": "doctor-uuid",
  "appointmentDate": "2026-02-15",
  "appointmentTime": "14:30",
  "appointmentType": "virtual",
  "note": "First consultation"
}
```

---

### Scenario 2: Patient Books Appointment (Auto-Assign Doctor)

**Request:**
```bash
POST /api/v1/appointments
{
  "branchId": "uuid",
  "appointmentDate": "2026-02-15",
  "appointmentTime": "14:30",
  "appointmentType": "physical"
}
```

System automatically assigns first available doctor for that date/time.

---

### Scenario 3: Admin Creates Appointment for Patient

**Request:**
```bash
POST /api/v1/appointments
{
  "doctorId": "doctor-uuid",
  "patientId": "patient-uuid",
  "branchId": "branch-uuid",
  "appointmentDate": "2026-02-15",
  "appointmentTime": "14:30",
  "appointmentType": "virtual",
  "note": "Scheduled by admin"
}
```

---

### Scenario 4: Patient Views Upcoming Appointments

**Request:**
```bash
GET /api/v1/appointments/history?status=upcoming&page=1&limit=10
```

**Response:**
All future appointments for the patient, sorted by scheduled date.

---

### Scenario 5: Doctor Reschedules Appointment

**Request:**
```bash
PATCH /api/v1/appointments/{appointmentId}/reschedule
{
  "scheduledAt": "2026-02-15T16:00:00Z",
  "note": "Rescheduled due to emergency case"
}
```

**Result:** Appointment moved to new time, status reset to "requested".

---

### Scenario 6: Patient Cancels Appointment

**Request:**
```bash
POST /api/v1/appointments/{appointmentId}/cancel
{
  "reason": "Family emergency, cannot attend"
}
```

**Result:** Appointment marked as cancelled with timestamp and reason.

---

### Scenario 7: Track Virtual Appointment Video Call

**Step 1:** Start video call when patient/doctor joins
```bash
PATCH /api/v1/appointments/{appointmentId}/video-call-status
{
  "event": "started",
  "timestamp": "2026-02-15T14:32:00Z",
  "doctorId": "doctor-uuid",
  "patientId": "patient-uuid",
  "branchId": "branch-uuid"
}
```

**Result:** Appointment status changes to "in_progress", videoCallIsActive = true

**Step 2:** End video call when session completes
```bash
PATCH /api/v1/appointments/{appointmentId}/video-call-status
{
  "event": "ended",
  "timestamp": "2026-02-15T15:02:00Z",
  "doctorId": "doctor-uuid",
  "patientId": "patient-uuid",
  "branchId": "branch-uuid"
}
```

**Result:** videoCallIsActive = false, videoCallDuration = 30 minutes calculated automatically

---

## Appointment Status Flow

```
[requested] → [confirmed] → [in_progress] → [completed]
     ↓              ↓             ↓
  [cancelled]  [cancelled]   [cancelled]
```

**Status Definitions:**
- `requested`: Initial status when appointment is created
- `confirmed`: Doctor/Admin confirms appointment
- `in_progress`: Video call session is active (for virtual appointments)
- `completed`: Appointment finished successfully
- `cancelled`: Appointment cancelled by any authorized user

**Status Rules:**
- Can reschedule: `requested`, `confirmed`
- Cannot reschedule: `in_progress`, `completed`, `cancelled`
- Can cancel: `requested`, `confirmed`, `in_progress`
- Cannot cancel: `completed`, `cancelled`
- `in_progress` status is set automatically when virtual appointment video call starts

---

## Data Models

### Appointment
```typescript
{
  id: string (uuid)
  hospitalId: string (uuid)
  branchId: string (uuid)
  doctorId: string (uuid)
  patientId: string (uuid)
  appointmentType: "virtual" | "physical"
  scheduledAt: DateTime
  status: "requested" | "confirmed" | "in_progress" | "completed" | "cancelled"
  note: string | null
  cancelReason: string | null
  cancelledAt: DateTime | null
  videoCallStartedAt: DateTime | null
  videoCallEndedAt: DateTime | null
  videoCallIsActive: boolean (default: false)
  videoCallDuration: number | null (minutes)
  createdAt: DateTime
  updatedAt: DateTime
  createdBy: string (uuid)
}
```

### AppointmentStatus Enum
```typescript
enum AppointmentStatus {
  requested
  confirmed
  in_progress
  completed
  cancelled
}
```

### AppointmentType Enum
```typescript
enum AppointmentType {
  virtual    // Video call consultation
  physical   // In-person visit
}
```

---

## Multi-Tenant Isolation

All appointment endpoints enforce **hospital-level isolation**:
- `hospitalId` is extracted from JWT token
- All database queries include `hospitalId` in WHERE clause
- Branch Managers are additionally restricted to their assigned `branchId`
- Doctors see only their appointments
- Patients see only their appointments
- Cross-tenant access is prevented at the API level

---

## Time Zone Handling

**Important:** The system uses **West Central African Time (UTC+1)** for day-of-week calculations when determining doctor availability.

**Date/Time Formats:**
- `appointmentDate`: YYYY-MM-DD (e.g., "2026-02-15")
- `appointmentTime`: HH:mm (24-hour format, e.g., "14:30")
- `scheduledAt`: ISO 8601 datetime (e.g., "2026-02-15T14:30:00Z")

---

## Best Practices

1. **Slot Checking:** Always check available doctors/slots before booking
2. **Validation:** Validate date/time is in the future before submission
3. **Status Filtering:** Use history endpoint with status filter for specific views
4. **Pagination:** Always implement pagination for appointment lists
5. **Error Handling:** Handle 409 (Conflict) errors for double-booking scenarios
6. **Cancellation Reasons:** Always provide meaningful cancellation reasons
7. **Rescheduling:** Check slot availability before rescheduling
8. **Auto-Assignment:** Use auto-assignment for patient convenience when doctor doesn't matter

---

## Common Error Responses

### Authentication Errors

**401 Unauthorized:**
```json
{
  "error": "Unauthorized",
  "message": "Authentication required"
}
```

### Authorization Errors

**403 Forbidden:**
```json
{
  "error": "Forbidden",
  "message": "Access denied"
}
```

### Validation Errors

**400 Bad Request:**
```json
{
  "error": "Validation error",
  "details": {
    "formErrors": [],
    "fieldErrors": {
      "fieldName": ["Error message"]
    }
  }
}
```

### Resource Not Found

**404 Not Found:**
```json
{
  "error": "Not found",
  "message": "Appointment not found"
}
```

### Conflict Errors

**409 Conflict:**
```json
{
  "error": "This time slot is already booked"
}
```

### Server Errors

**500 Internal Server Error:**
```json
{
  "error": "Internal Server Error",
  "message": "Failed to process request"
}
```

---

## CORS Support

All endpoints include CORS headers for mobile app compatibility. Preflight OPTIONS requests are supported on all routes.

**CORS Headers Included:**
- `Access-Control-Allow-Origin: *`
- `Access-Control-Allow-Methods: GET, POST, PATCH, DELETE, OPTIONS`
- `Access-Control-Allow-Headers: Content-Type, Authorization`

---

## Related Documentation

- [DOCTOR_MANAGEMENT_API.md](DOCTOR_MANAGEMENT_API.md) - Doctor availability and scheduling
- [AGORA_INTEGRATION.md](AGORA_INTEGRATION.md) - Video calling integration for virtual appointments
- [VIDEO_CALLS_API.md] - Video call token generation

---

## Notes

- Appointment slots are determined by doctor availability schedules
- Double-booking prevention is enforced at the database level
- Appointment status cannot be manually set to "completed" (future feature)
- Auto-assignment uses first available doctor (can be enhanced with load balancing)
- All timestamps use UTC in database, converted to local time in UI
- Cancellation reasons are stored for audit and analytics purposes
