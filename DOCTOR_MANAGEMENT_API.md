# Doctor Management API Documentation

---

## Table of Contents
1. [Doctor CRUD Operations](#doctor-crud-operations)
   - [List Doctors](#1-list-doctors)
   - [Create Doctor](#2-create-doctor)
   - [Get Doctor Details](#3-get-doctor-details)
   - [Update Doctor Profile](#4-update-doctor-profile)
   - [Delete Doctor](#5-delete-doctor)
2. [Doctor Availability Management](#doctor-availability-management)
3. [Doctor Availability Slots](#doctor-availability-slots)
4. [Days of Week Utility](#days-of-week-utility)

---

## Doctor CRUD Operations

### 1. List Doctors

**Endpoint:** `GET /api/v1/doctors`

**Authentication:** Required (Bearer Token)

**Roles:** SYSTEM_ADMIN, SUPER_ADMIN, BRANCH_MANAGER, DOCTOR, PATIENT

**Query Parameters:**
```json
{
  "page": 1,           // optional, default: 1
  "pageSize": 20       // optional, default: 20, max: 100
}
```

**Access Control:**
- **Super Admin / System Admin:** Can view all doctors in their hospital
- **Branch Manager:** Can only view doctors in their assigned branch
- **Doctor / Patient:** Can view all doctors (for appointment booking)

**Response (200 OK):**
```json
{
  "items": [
    {
      "id": "uuid",
      "hospitalId": "uuid",
      "branchId": "uuid",
      "role": "DOCTOR",
      "status": "ACTIVE",
      "fullName": "Dr. John Smith",
      "email": "john.smith@hospital.com",
      "emailVerifiedAt": "2026-02-01T10:00:00.000Z",
      "createdAt": "2026-02-01T10:00:00.000Z",
      "updatedAt": "2026-02-01T10:00:00.000Z",
      "doctorProfile": {
        "id": "uuid",
        "userId": "uuid",
        "specialty": "Cardiology",
        "license": "MD12345",
        "createdAt": "2026-02-01T10:00:00.000Z",
        "updatedAt": "2026-02-01T10:00:00.000Z"
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

**Error Response (403 Forbidden):**
```json
{
  "error": "Forbidden: Insufficient permissions"
}
```

---

### 2. Create Doctor

**Endpoint:** `POST /api/v1/doctors`

**Authentication:** Required (Bearer Token)

**Roles:** SYSTEM_ADMIN, SUPER_ADMIN, BRANCH_MANAGER

**Request Body:**
```json
{
  "fullName": "Dr. Jane Doe",
  "email": "jane.doe@hospital.com",
  "password": "SecurePassword123",
  "branchId": "uuid",
  "specialty": "Pediatrics",      // optional
  "license": "MD67890"            // optional
}
```

**Validation Rules:**
- `fullName`: Minimum 2 characters
- `email`: Valid email format
- `password`: Minimum 8 characters
- `branchId`: Valid UUID format
- `specialty`: Optional string
- `license`: Optional string

**Access Control:**
- **Branch Manager:** Can only create doctors in their assigned branch (branchId must match their branchId)
- **Super Admin / System Admin:** Can create doctors in any branch within their hospital

**Response (201 Created):**
```json
{
  "id": "uuid",
  "hospitalId": "uuid",
  "branchId": "uuid",
  "role": "DOCTOR",
  "status": "ACTIVE",
  "fullName": "Dr. Jane Doe",
  "email": "jane.doe@hospital.com",
  "emailVerifiedAt": "2026-02-09T10:00:00.000Z",
  "createdAt": "2026-02-09T10:00:00.000Z",
  "updatedAt": "2026-02-09T10:00:00.000Z",
  "doctorProfile": {
    "id": "uuid",
    "userId": "uuid",
    "specialty": "Pediatrics",
    "license": "MD67890",
    "createdAt": "2026-02-09T10:00:00.000Z",
    "updatedAt": "2026-02-09T10:00:00.000Z"
  }
}
```

**Error Response (400 Bad Request):**
```json
{
  "error": {
    "formErrors": [],
    "fieldErrors": {
      "email": ["Invalid email"],
      "password": ["String must contain at least 8 character(s)"]
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
  "error": "Branch not found"
}
```

---

### 3. Get Doctor Details

**Endpoint:** `GET /api/v1/doctors/{doctorId}`

**Authentication:** Required (Bearer Token)

**Roles:** SYSTEM_ADMIN, SUPER_ADMIN, BRANCH_MANAGER, DOCTOR, PATIENT

**Path Parameters:**
- `doctorId` (string, uuid): Doctor's user ID

**Access Control:**
- **Super Admin / System Admin:** Can view any doctor in their hospital
- **Branch Manager:** Can only view doctors in their assigned branch
- **Doctor / Patient:** Can view any doctor (for appointment booking)

**Response (200 OK):**
```json
{
  "id": "uuid",
  "hospitalId": "uuid",
  "branchId": "uuid",
  "role": "DOCTOR",
  "status": "ACTIVE",
  "fullName": "Dr. John Smith",
  "email": "john.smith@hospital.com",
  "emailVerifiedAt": "2026-02-01T10:00:00.000Z",
  "createdAt": "2026-02-01T10:00:00.000Z",
  "updatedAt": "2026-02-01T10:00:00.000Z",
  "doctorProfile": {
    "id": "uuid",
    "userId": "uuid",
    "specialty": "Cardiology",
    "license": "MD12345",
    "createdAt": "2026-02-01T10:00:00.000Z",
    "updatedAt": "2026-02-01T10:00:00.000Z"
  },
  "branch": {
    "id": "uuid",
    "name": "Downtown Branch",
    "address": "123 Main St",
    "city": "New York",
    "state": "NY",
    "phone": "+1234567890",
    "email": "downtown@hospital.com"
  }
}
```

**Error Response (404 Not Found):**
```json
{
  "error": "Doctor not found"
}
```

---

### 4. Update Doctor Profile

**Endpoint:** `PUT /api/v1/doctors/{doctorId}`

**Authentication:** Required (Bearer Token)

**Roles:** SYSTEM_ADMIN, SUPER_ADMIN, BRANCH_MANAGER

**Path Parameters:**
- `doctorId` (string, uuid): Doctor's user ID

**Request Body:**
```json
{
  "fullName": "Dr. John Smith Jr.",  // optional
  "status": "SUSPENDED",              // optional: ACTIVE, PENDING, SUSPENDED
  "specialty": "Cardiology",          // optional
  "license": "MD12345-UPDATED"        // optional
}
```

**Validation Rules:**
- `fullName`: Minimum 2 characters (if provided)
- `status`: Must be one of: ACTIVE, PENDING, SUSPENDED (if provided)
- `specialty`: String (if provided)
- `license`: String (if provided)
- At least one field must be provided

**Access Control:**
- **Branch Manager:** Can only update doctors in their assigned branch
- **Super Admin / System Admin:** Can update any doctor in their hospital

**Response (200 OK):**
```json
{
  "id": "uuid",
  "hospitalId": "uuid",
  "branchId": "uuid",
  "role": "DOCTOR",
  "status": "SUSPENDED",
  "fullName": "Dr. John Smith Jr.",
  "email": "john.smith@hospital.com",
  "emailVerifiedAt": "2026-02-01T10:00:00.000Z",
  "createdAt": "2026-02-01T10:00:00.000Z",
  "updatedAt": "2026-02-09T14:30:00.000Z",
  "doctorProfile": {
    "id": "uuid",
    "userId": "uuid",
    "specialty": "Cardiology",
    "license": "MD12345-UPDATED",
    "createdAt": "2026-02-01T10:00:00.000Z",
    "updatedAt": "2026-02-09T14:30:00.000Z"
  }
}
```

**Error Response (400 Bad Request):**
```json
{
  "error": {
    "formErrors": [],
    "fieldErrors": {
      "fullName": ["String must contain at least 2 character(s)"],
      "status": ["Invalid enum value. Expected 'ACTIVE' | 'PENDING' | 'SUSPENDED'"]
    }
  }
}
```

**Error Response (404 Not Found):**
```json
{
  "error": "Doctor not found"
}
```

---

### 5. Delete Doctor

**Endpoint:** `DELETE /api/v1/doctors/{doctorId}`

**Authentication:** Required (Bearer Token)

**Roles:** SYSTEM_ADMIN, SUPER_ADMIN, BRANCH_MANAGER

**Path Parameters:**
- `doctorId` (string, uuid): Doctor's user ID

**Access Control:**
- **Branch Manager:** Can only delete doctors in their assigned branch
- **Super Admin / System Admin:** Can delete any doctor in their hospital

**Note:** This is a **soft delete** operation. The doctor record is not physically removed from the database but marked as deleted by setting the `deletedAt` timestamp.

**Response (200 OK):**
```json
{
  "message": "Doctor deleted successfully"
}
```

**Error Response (404 Not Found):**
```json
{
  "error": "Doctor not found"
}
```

**Error Response (403 Forbidden - Branch Manager):**
```json
{
  "error": "Doctor not found"
}
```

---

## Doctor Availability Management

### 6. Get Doctor Availability

**Endpoint:** `GET /api/v1/doctors/{doctorId}/availability`

**Authentication:** Required (Bearer Token)

**Roles:** SUPER_ADMIN, SYSTEM_ADMIN, BRANCH_MANAGER

**Path Parameters:**
- `doctorId` (string, uuid): Doctor's user ID

**Response (200 OK):**
```json
{
  "doctorId": "uuid",
  "availabilities": [
    {
      "id": "uuid",
      "doctorId": "uuid",
      "dayOfWeek": "MONDAY",
      "startTime": "09:00",
      "endTime": "17:00",
      "isActive": true,
      "createdAt": "2026-02-01T10:00:00.000Z",
      "updatedAt": "2026-02-01T10:00:00.000Z"
    },
    {
      "id": "uuid",
      "doctorId": "uuid",
      "dayOfWeek": "TUESDAY",
      "startTime": "08:00",
      "endTime": "16:00",
      "isActive": true,
      "createdAt": "2026-02-01T10:00:00.000Z",
      "updatedAt": "2026-02-01T10:00:00.000Z"
    }
  ]
}
```

**Error Response (404 Not Found):**
```json
{
  "error": "Doctor not found"
}
```

---

### 7. Create Doctor Availability

**Endpoint:** `POST /api/v1/doctors/{doctorId}/availability`

**Authentication:** Required (Bearer Token)

**Roles:** SUPER_ADMIN, SYSTEM_ADMIN, BRANCH_MANAGER

**Path Parameters:**
- `doctorId` (string, uuid): Doctor's user ID

**Request Body:**
```json
{
  "availabilities": [
    {
      "dayOfWeek": "MONDAY",
      "startTime": "09:00",
      "endTime": "17:00"
    },
    {
      "dayOfWeek": "WEDNESDAY",
      "startTime": "08:00",
      "endTime": "16:00"
    },
    {
      "dayOfWeek": "FRIDAY",
      "startTime": "10:00",
      "endTime": "18:00"
    }
  ]
}
```

**Validation Rules:**
- `availabilities`: Array with at least 1 item
- `dayOfWeek`: Must be one of: MONDAY, TUESDAY, WEDNESDAY, THURSDAY, FRIDAY, SATURDAY, SUNDAY
- `startTime`: Must be in HH:mm format (24-hour)
- `endTime`: Must be in HH:mm format (24-hour)
- Start time must be before end time
- Time values must be valid (hour: 0-23, minute: 0-59)

**Response (201 Created):**
```json
[
  {
    "id": "uuid",
    "doctorId": "uuid",
    "dayOfWeek": "MONDAY",
    "startTime": "09:00",
    "endTime": "17:00",
    "isActive": true,
    "createdAt": "2026-02-09T10:00:00.000Z",
    "updatedAt": "2026-02-09T10:00:00.000Z"
  },
  {
    "id": "uuid",
    "doctorId": "uuid",
    "dayOfWeek": "WEDNESDAY",
    "startTime": "08:00",
    "endTime": "16:00",
    "isActive": true,
    "createdAt": "2026-02-09T10:00:00.000Z",
    "updatedAt": "2026-02-09T10:00:00.000Z"
  },
  {
    "id": "uuid",
    "doctorId": "uuid",
    "dayOfWeek": "FRIDAY",
    "startTime": "10:00",
    "endTime": "18:00",
    "isActive": true,
    "createdAt": "2026-02-09T10:00:00.000Z",
    "updatedAt": "2026-02-09T10:00:00.000Z"
  }
]
```

**Error Response (400 Bad Request):**
```json
{
  "error": {
    "formErrors": [],
    "fieldErrors": {
      "availabilities": ["At least one day must be selected"]
    }
  }
}
```

**Error Response (400 Bad Request - Validation Failed):**
```json
{
  "error": "Validation failed for some days",
  "details": [
    {
      "dayOfWeek": "MONDAY",
      "error": "Start time must be before end time"
    }
  ]
}
```

**Error Response (409 Conflict):**
```json
{
  "error": "Availability already exists for some of the selected days",
  "details": {
    "conflictingDays": ["MONDAY", "WEDNESDAY"]
  }
}
```

**Error Response (404 Not Found):**
```json
{
  "error": "Doctor not found"
}
```

---

### 8. Update Doctor Availability

**Endpoint:** `PUT /api/v1/doctors/{doctorId}/availability/{availabilityId}`

**Authentication:** Required (Bearer Token)

**Roles:** SUPER_ADMIN, SYSTEM_ADMIN, BRANCH_MANAGER

**Path Parameters:**
- `doctorId` (string, uuid): Doctor's user ID
- `availabilityId` (string, uuid): Availability record ID

**Request Body:**
```json
{
  "startTime": "10:00",    // optional
  "endTime": "18:00",      // optional
  "isActive": true         // optional
}
```

**Note:** All fields are optional. Only provided fields will be updated.

**Validation Rules:**
- `startTime`: Must be in HH:mm format if provided
- `endTime`: Must be in HH:mm format if provided
- `isActive`: Boolean value
- Start time must be before end time
- Time values must be valid (hour: 0-23, minute: 0-59)

**Response (200 OK):**
```json
{
  "id": "uuid",
  "doctorId": "uuid",
  "dayOfWeek": "MONDAY",
  "startTime": "10:00",
  "endTime": "18:00",
  "isActive": true,
  "createdAt": "2026-02-01T10:00:00.000Z",
  "updatedAt": "2026-02-09T10:00:00.000Z"
}
```

**Error Response (400 Bad Request):**
```json
{
  "error": "Start time must be before end time"
}
```

**Error Response (404 Not Found):**
```json
{
  "error": "Doctor not found"
}
```

**Error Response (404 Not Found):**
```json
{
  "error": "Availability not found"
}
```

---

### 9. Delete Doctor Availability

**Endpoint:** `DELETE /api/v1/doctors/{doctorId}/availability/{availabilityId}`

**Authentication:** Required (Bearer Token)

**Roles:** SUPER_ADMIN, SYSTEM_ADMIN, BRANCH_MANAGER

**Path Parameters:**
- `doctorId` (string, uuid): Doctor's user ID
- `availabilityId` (string, uuid): Availability record ID

**Response (200 OK):**
```json
{
  "message": "Availability deleted successfully"
}
```

**Error Response (404 Not Found):**
```json
{
  "error": "Doctor not found"
}
```

**Error Response (404 Not Found):**
```json
{
  "error": "Availability not found"
}
```

---

## Doctor Availability Slots

### 10. Get Available Time Slots

**Endpoint:** `GET /api/v1/doctors/{doctorId}/availability-slots`

**Authentication:** Required (Bearer Token)

**Roles:** SYSTEM_ADMIN, BRANCH_MANAGER, DOCTOR

**Path Parameters:**
- `doctorId` (string, uuid): Doctor's user ID

**Query Parameters:**
```json
{
  "appointmentDate": "2026-02-15",   // required, format: YYYY-MM-DD
  "slotDuration": 30                 // optional, default: 30, min: 15, max: 480 (minutes)
}
```

**Description:**
This endpoint generates available time slots for a specific doctor on a given date. It:
1. Determines the day of week from the appointment date (uses West Central African Time UTC+1)
2. Fetches doctor's availability schedule for that day
3. Generates time slots based on working hours and slot duration
4. Excludes already booked slots (appointments with status 'requested' or 'confirmed')

**Response (200 OK - Doctor Available):**
```json
{
  "doctorId": "uuid",
  "doctorName": "Dr. John Smith",
  "specialty": "Cardiology",
  "date": "2026-02-15",
  "dayOfWeek": "SATURDAY",
  "slotDuration": 30,
  "workingHours": {
    "startTime": "09:00",
    "endTime": "17:00"
  },
  "availableSlots": [
    "09:00-09:30",
    "09:30-10:00",
    "10:00-10:30",
    "10:30-11:00",
    "11:00-11:30",
    "11:30-12:00",
    "13:00-13:30",
    "14:00-14:30",
    "15:00-15:30",
    "16:00-16:30",
    "16:30-17:00"
  ],
  "totalAvailableSlots": 11,
  "bookedSlots": 5
}
```

**Response (200 OK - Doctor Not Available):**
```json
{
  "doctorId": "uuid",
  "doctorName": "Dr. John Smith",
  "date": "2026-02-16",
  "dayOfWeek": "SUNDAY",
  "availableSlots": [],
  "message": "Doctor not available on this day"
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

**Error Response (404 Not Found):**
```json
{
  "error": "Doctor not found or inactive"
}
```

---

## Days of Week Utility

### 11. Get Days of Week

**Endpoint:** `GET /api/v1/doctors/{doctorId}/days-of-week`

**Authentication:** Not Required (Public endpoint with CORS)

**Path Parameters:**
- `doctorId` (string, uuid): Doctor's user ID (informational, not validated)

**Description:**
Returns a list of all days of the week in a standardized format. Useful for UI selection components when creating doctor availability schedules.

**Response (200 OK):**
```json
{
  "days": [
    { "id": "MONDAY", "label": "Monday", "value": "MONDAY" },
    { "id": "TUESDAY", "label": "Tuesday", "value": "TUESDAY" },
    { "id": "WEDNESDAY", "label": "Wednesday", "value": "WEDNESDAY" },
    { "id": "THURSDAY", "label": "Thursday", "value": "THURSDAY" },
    { "id": "FRIDAY", "label": "Friday", "value": "FRIDAY" },
    { "id": "SATURDAY", "label": "Saturday", "value": "SATURDAY" },
    { "id": "SUNDAY", "label": "Sunday", "value": "SUNDAY" }
  ],
  "totalDays": 7
}
```

---

## Common Error Responses

### Authentication Errors

**401 Unauthorized:**
```json
{
  "error": "Unauthorized"
}
```

### Authorization Errors

**403 Forbidden:**
```json
{
  "error": "Forbidden: Insufficient permissions"
}
```

### Validation Errors

**400 Bad Request:**
```json
{
  "error": {
    "formErrors": ["Global validation errors"],
    "fieldErrors": {
      "fieldName": ["Field-specific error messages"]
    }
  }
}
```

### Server Errors

**500 Internal Server Error:**
```json
{
  "error": "Internal server error message"
}
```

---

## Multi-Tenant Isolation

All doctor management endpoints enforce **hospital-level isolation**:
- `hospitalId` is extracted from JWT token
- All database queries include `hospitalId` in WHERE clause
- Branch Managers are additionally restricted to their assigned `branchId`
- Cross-tenant access is prevented at the API level

---

## Authentication

All protected endpoints require a Bearer token in the Authorization header:

```
Authorization: Bearer <access_token>
```

Tokens contain:
- `userId`: User's unique ID
- `hospitalId`: Hospital ID (for multi-tenant isolation)
- `role`: User's role (SUPER_ADMIN, BRANCH_MANAGER, DOCTOR, etc.)
- `branchId`: Branch ID (for Branch Managers)

---

## CORS Support

All endpoints include CORS headers for mobile app compatibility. Preflight OPTIONS requests are supported on all routes.

**CORS Headers Included:**
- `Access-Control-Allow-Origin: *`
- `Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS`
- `Access-Control-Allow-Headers: Content-Type, Authorization`

---

## Data Models

### User (Doctor)
```typescript
{
  id: string (uuid)
  hospitalId: string (uuid)
  branchId: string (uuid)
  role: "DOCTOR"
  status: "ACTIVE" | "PENDING" | "SUSPENDED"
  fullName: string
  email: string
  passwordHash: string
  emailVerifiedAt: Date | null
  createdAt: Date
  updatedAt: Date
  deletedAt: Date | null
}
```

### Doctor Profile
```typescript
{
  id: string (uuid)
  userId: string (uuid)
  specialty: string | null
  license: string | null
  createdAt: Date
  updatedAt: Date
}
```

### Doctor Availability
```typescript
{
  id: string (uuid)
  doctorId: string (uuid)
  dayOfWeek: "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY" | "SATURDAY" | "SUNDAY"
  startTime: string (HH:mm format)
  endTime: string (HH:mm format)
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}
```

---

## Usage Examples

### Example 1: Create a Doctor and Set Availability

**Step 1: Create Doctor**
```bash
POST /api/v1/doctors
Content-Type: application/json
Authorization: Bearer <token>

{
  "fullName": "Dr. Sarah Johnson",
  "email": "sarah.johnson@hospital.com",
  "password": "SecurePass123",
  "branchId": "branch-uuid-123",
  "specialty": "Dermatology",
  "license": "MD54321"
}
```

**Step 2: Set Availability**
```bash
POST /api/v1/doctors/doctor-uuid-456/availability
Content-Type: application/json
Authorization: Bearer <token>

{
  "availabilities": [
    {
      "dayOfWeek": "MONDAY",
      "startTime": "09:00",
      "endTime": "17:00"
    },
    {
      "dayOfWeek": "WEDNESDAY",
      "startTime": "09:00",
      "endTime": "17:00"
    },
    {
      "dayOfWeek": "FRIDAY",
      "startTime": "10:00",
      "endTime": "16:00"
    }
  ]
}
```

### Example 2: Check Available Slots for Appointment Booking

```bash
GET /api/v1/doctors/doctor-uuid-456/availability-slots?appointmentDate=2026-02-17&slotDuration=30
Authorization: Bearer <token>
```

Response will show available 30-minute slots for Monday, February 17, 2026.

### Example 3: Update Doctor Availability

```bash
PUT /api/v1/doctors/doctor-uuid-456/availability/availability-uuid-789
Content-Type: application/json
Authorization: Bearer <token>

{
  "startTime": "08:00",
  "endTime": "16:00"
}
```

---

## Best Practices

1. **Slot Duration:** Use 30-minute slots for most specialties, adjust based on consultation requirements
2. **Time Zone:** All times use West Central African Time (UTC+1)
3. **Availability Creation:** Create availability for multiple days in a single request for efficiency
4. **Conflict Handling:** Check existing availability before creating new schedules
5. **Branch Scope:** Branch Managers should always verify branchId matches their assignment
6. **Active Status:** Use `isActive` flag to temporarily disable availability without deletion
7. **Pagination:** Always use pagination when listing doctors (especially for large hospitals)

---

## Notes

- Doctor accounts are auto-activated upon creation (`status: "ACTIVE"`, `emailVerifiedAt: <current_time>`)
- Password hashing uses bcrypt with salt rounds of 10
- Soft delete is supported (via `deletedAt` field) but deletion endpoints are not yet implemented
- Doctor availability is stored per day, allowing different hours for each day of the week
- Slot generation algorithm ensures no overlapping appointments
- All times are stored and processed in 24-hour format (HH:mm)
