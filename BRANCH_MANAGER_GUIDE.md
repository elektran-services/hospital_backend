# Branch Manager Complete Guide

---

## Table of Contents
1. [Overview](#overview)
2. [Creating a Branch Manager](#creating-a-branch-manager)
3. [Branch Manager Login](#branch-manager-login)
4. [Managing Branch Details](#managing-branch-details)
5. [Branch Manager Capabilities](#branch-manager-capabilities)
6. [Access Control & Restrictions](#access-control--restrictions)
7. [Complete Workflow Examples](#complete-workflow-examples)

---

## Overview

**Branch Managers** are users assigned to manage a specific branch within a hospital chain. They have restricted access to only their assigned branch and cannot view or modify data from other branches.

### Key Characteristics:
- **Role:** `BRANCH_MANAGER`
- **Scope:** Single branch only
- **Hospital Isolation:** Can only access data from their hospital
- **Branch Isolation:** Can only access data from their assigned branch
- **Created By:** Super Admin or System Admin

---

## Creating a Branch Manager

### Endpoint: Create Branch Manager

**Endpoint:** `POST /api/v1/users`

**Authentication:** Required (Bearer Token)

**Roles:** SUPER_ADMIN, SYSTEM_ADMIN

**Request Body:**
```json
{
  "fullName": "John Manager",
  "email": "john.manager@hospital.com",
  "password": "SecurePassword123",
  "role": "BRANCH_MANAGER",
  "branchId": "branch-uuid-123"
}
```

**Validation Rules:**
- `fullName`: Minimum 2 characters
- `email`: Valid email format
- `password`: Minimum 8 characters
- `role`: Must be "BRANCH_MANAGER"
- `branchId`: Required, must be a valid UUID of an existing branch in the hospital

**Response (201 Created):**
```json
{
  "id": "user-uuid-456",
  "hospitalId": "hospital-uuid-789",
  "branchId": "branch-uuid-123",
  "fullName": "John Manager",
  "email": "john.manager@hospital.com",
  "role": "BRANCH_MANAGER",
  "status": "ACTIVE",
  "createdAt": "2026-02-09T10:00:00.000Z"
}
```

**Error Responses:**

**400 Bad Request:**
```json
{
  "error": {
    "formErrors": [],
    "fieldErrors": {
      "email": ["Invalid email"],
      "password": ["String must contain at least 8 character(s)"],
      "branchId": ["Invalid uuid"]
    }
  }
}
```

**401 Unauthorized:**
```json
{
  "error": "Unauthorized"
}
```

**403 Forbidden:**
```json
{
  "error": "Forbidden: Insufficient permissions"
}
```

---

## Branch Manager Login

### Endpoint: Login

**Endpoint:** `POST /api/v1/auth/login`

**Authentication:** Not Required (Public)

**Request Body:**
```json
{
  "email": "john.manager@hospital.com",
  "password": "SecurePassword123"
}
```

**Response (200 OK):**
```json
{
  "message": "Authenticated",
  "user": {
    "id": "user-uuid-456",
    "role": "BRANCH_MANAGER",
    "status": "ACTIVE",
    "fullName": "John Manager",
    "email": "john.manager@hospital.com",
    "hospitalId": "hospital-uuid-789",
    "branchId": "branch-uuid-123",
    "hospital": {
      "id": "hospital-uuid-789",
      "name": "City Hospital Chain",
      "logo": "/uploads/hospitals/logo.png"
    },
    "branch": {
      "id": "branch-uuid-123",
      "name": "Downtown Branch",
      "address": "123 Main Street",
      "city": "Lagos",
      "state": "Lagos",
      "country": "Nigeria",
      "phone": "+234-123-456-7890"
    }
  },
  "tokens": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "accessTokenExpiresIn": 900,
    "refreshTokenExpiresIn": 2592000
  }
}
```

**Key Points:**
- Login returns complete branch details immediately
- Access token expires in 15 minutes (900 seconds)
- Refresh token expires in 30 days (2,592,000 seconds)
- Tokens are also set as HTTP-only cookies for web apps
- Branch information is included in the response for immediate use

**Error Response (401 Unauthorized):**
```json
{
  "error": "Invalid credentials"
}
```

**Error Response (429 Too Many Requests):**
```json
{
  "error": "Too many login attempts. Please wait and try again."
}
```
**Headers:**
```
Retry-After: 60
```

---

## Managing Branch Details

### 1. Get My Branch Details

**Endpoint:** `GET /api/v1/branches/my-branch`

**Authentication:** Required (Bearer Token)

**Roles:** BRANCH_MANAGER

**Description:**
Retrieves detailed information about the branch assigned to the currently logged-in Branch Manager, including statistics.

**Response (200 OK):**
```json
{
  "id": "branch-uuid-123",
  "hospitalId": "hospital-uuid-789",
  "name": "Downtown Branch",
  "address": "123 Main Street",
  "city": "Lagos",
  "state": "Lagos",
  "country": "Nigeria",
  "phone": "+234-123-456-7890",
  "email": "downtown@hospital.com",
  "isHeadBranch": false,
  "createdAt": "2026-01-15T10:00:00.000Z",
  "updatedAt": "2026-02-09T10:00:00.000Z",
  "deletedAt": null,
  "hospital": {
    "id": "hospital-uuid-789",
    "name": "City Hospital Chain",
    "logo": "/uploads/hospitals/logo.png",
    "logoUrl": "http://localhost:3000/uploads/hospitals/logo.png"
  },
  "statistics": {
    "totalUsers": 45,
    "totalAppointments": 230,
    "activeDoctors": 12,
    "totalPatients": 32,
    "todayAppointments": 8
  }
}
```

**Statistics Explained:**
- `totalUsers`: All users (doctors, patients, staff) in the branch
- `totalAppointments`: All appointments ever created for this branch
- `activeDoctors`: Number of active doctors assigned to this branch
- `totalPatients`: Number of patients registered at this branch
- `todayAppointments`: Appointments scheduled for today (requested or confirmed status)

**Error Response (404 Not Found - No Branch Assigned):**
```json
{
  "error": "No branch assigned to this manager"
}
```

**Error Response (404 Not Found - Branch Not Found):**
```json
{
  "error": "Branch not found"
}
```

---

### 2. Update My Branch Details

**Endpoint:** `PUT /api/v1/branches/my-branch`

**Authentication:** Required (Bearer Token)

**Roles:** BRANCH_MANAGER

**Description:**
Allows Branch Managers to update their branch information (contact details, address, etc.). All fields are optional.

**Request Body:**
```json
{
  "name": "Downtown Medical Center",
  "address": "123 Main Street, Suite 100",
  "city": "Lagos",
  "state": "Lagos State",
  "country": "Nigeria",
  "phone": "+234-123-456-7890",
  "email": "downtown@hospital.com"
}
```

**Note:** All fields are optional. Only provided fields will be updated.

**Validation Rules:**
- `name`: Minimum 2 characters if provided
- `address`: Minimum 2 characters if provided
- `phone`: Minimum 2 characters if provided
- `email`: Valid email format if provided
- `city`, `state`, `country`: Optional strings

**Response (200 OK):**
```json
{
  "id": "branch-uuid-123",
  "hospitalId": "hospital-uuid-789",
  "name": "Downtown Medical Center",
  "address": "123 Main Street, Suite 100",
  "city": "Lagos",
  "state": "Lagos State",
  "country": "Nigeria",
  "phone": "+234-123-456-7890",
  "email": "downtown@hospital.com",
  "isHeadBranch": false,
  "createdAt": "2026-01-15T10:00:00.000Z",
  "updatedAt": "2026-02-09T11:30:00.000Z",
  "deletedAt": null,
  "hospital": {
    "id": "hospital-uuid-789",
    "name": "City Hospital Chain",
    "logo": "/uploads/hospitals/logo.png",
    "logoUrl": "http://localhost:3000/uploads/hospitals/logo.png"
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
      "name": ["String must contain at least 2 character(s)"]
    }
  }
}
```

**Error Response (404 Not Found):**
```json
{
  "error": "No branch assigned to this manager"
}
```

---

## Branch Manager Capabilities

### What Branch Managers Can Do:

#### 1. Branch Management
- ✅ View their assigned branch details
- ✅ Update branch contact information (address, phone, email)
- ✅ View branch statistics
- ❌ Cannot delete branches
- ❌ Cannot create new branches
- ❌ Cannot transfer to another branch

#### 2. Doctor Management
- ✅ Create doctors in their branch
- ✅ View all doctors in their branch
- ✅ Set doctor availability schedules
- ✅ View doctor appointment slots
- ❌ Cannot view doctors from other branches
- ❌ Cannot assign doctors to other branches

**Endpoint:** `GET /api/v1/doctors?page=1&pageSize=20`
- Returns only doctors in their branch

**Endpoint:** `POST /api/v1/doctors`
- Must specify their own `branchId`
- Cannot create doctors for other branches

#### 3. Patient Management
- ✅ Create patients in their branch
- ✅ View all patients in their branch
- ❌ Cannot view patients from other branches

**Endpoint:** `GET /api/v1/patients?page=1&pageSize=20`
- Returns only patients in their branch

**Endpoint:** `POST /api/v1/patients`
- Patients automatically assigned to manager's branch

#### 4. Appointment Management
- ✅ View appointments in their branch
- ✅ Create appointments for their branch
- ✅ Cancel appointments in their branch
- ✅ View appointment history for their branch
- ❌ Cannot view appointments from other branches

**Endpoint:** `GET /api/v1/appointments`
- Automatically filtered to their branch

#### 5. User Management
- ✅ View all users in their branch
- ❌ Cannot create Branch Managers (only Super Admin can)
- ❌ Cannot create users for other branches
- ❌ Cannot view users from other branches

**Endpoint:** `GET /api/v1/users`
- Returns only users in their branch

---

## Access Control & Restrictions

### Multi-Tenant Isolation

**Hospital Level:**
```typescript
// All queries include hospitalId from JWT token
where: {
  hospitalId: ctx.hospitalId  // Always enforced
}
```

**Branch Level (for Branch Managers):**
```typescript
// Branch Managers see only their branch
where: {
  hospitalId: ctx.hospitalId,
  branchId: ctx.branchId  // Additional restriction
}
```

### JWT Token Structure

Branch Manager tokens contain:
```typescript
{
  sub: "user-uuid-456",           // User ID
  role: "BRANCH_MANAGER",         // Role
  hospital_id: "hospital-uuid-789", // Hospital ID
  branch_id: "branch-uuid-123",   // Branch ID (key field)
  exp: 1707480000                 // Expiration timestamp
}
```

### Endpoint Access Matrix

| Endpoint | Super Admin | Branch Manager | Doctor | Patient |
|----------|------------|----------------|--------|---------|
| **Branches** |
| GET /api/v1/branches | All hospital branches | Own branch only | All branches (read) | All branches (read) |
| POST /api/v1/branches | ✅ Create any | ❌ Denied | ❌ Denied | ❌ Denied |
| GET /api/v1/branches/my-branch | ❌ N/A | ✅ Own branch | ❌ N/A | ❌ N/A |
| PUT /api/v1/branches/my-branch | ❌ N/A | ✅ Update own | ❌ N/A | ❌ N/A |
| **Doctors** |
| GET /api/v1/doctors | All hospital | Own branch only | All hospital | All hospital |
| POST /api/v1/doctors | ✅ Any branch | ✅ Own branch only | ❌ Denied | ❌ Denied |
| **Appointments** |
| GET /api/v1/appointments | All hospital | Own branch only | Own appointments | Own appointments |
| POST /api/v1/appointments | ✅ Any branch | ✅ Own branch | ✅ Create | ✅ Create |
| **Users** |
| GET /api/v1/users | All hospital | Own branch only | ❌ Denied | ❌ Denied |
| POST /api/v1/users | ✅ Any user | ❌ Denied | ❌ Denied | ❌ Denied |

---

## Complete Workflow Examples

### Example 1: Super Admin Creates Branch Manager

**Step 1: Super Admin logs in**
```bash
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "admin@hospital.com",
  "password": "AdminPass123"
}
```

**Step 2: Create a new branch (if needed)**
```bash
POST /api/v1/branches
Content-Type: application/json
Authorization: Bearer <super_admin_token>

{
  "name": "Uptown Branch",
  "address": "456 North Avenue",
  "city": "Lagos",
  "state": "Lagos State",
  "country": "Nigeria",
  "phone": "+234-987-654-3210",
  "email": "uptown@hospital.com",
  "isHeadBranch": false
}
```

**Step 3: Create Branch Manager for the branch**
```bash
POST /api/v1/users
Content-Type: application/json
Authorization: Bearer <super_admin_token>

{
  "fullName": "Sarah Manager",
  "email": "sarah.manager@hospital.com",
  "password": "ManagerPass123",
  "role": "BRANCH_MANAGER",
  "branchId": "<branch-id-from-step-2>"
}
```

---

### Example 2: Branch Manager Daily Workflow

**Step 1: Branch Manager logs in**
```bash
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "sarah.manager@hospital.com",
  "password": "ManagerPass123"
}
```

**Step 2: View branch dashboard**
```bash
GET /api/v1/branches/my-branch
Authorization: Bearer <branch_manager_token>
```

Response shows branch statistics including today's appointments.

**Step 3: Check doctors in the branch**
```bash
GET /api/v1/doctors?page=1&pageSize=20
Authorization: Bearer <branch_manager_token>
```

**Step 4: Add a new doctor**
```bash
POST /api/v1/doctors
Content-Type: application/json
Authorization: Bearer <branch_manager_token>

{
  "fullName": "Dr. Michael Chen",
  "email": "michael.chen@hospital.com",
  "password": "DoctorPass123",
  "branchId": "<my-branch-id>",
  "specialty": "Orthopedics",
  "license": "MD98765"
}
```

**Step 5: Set doctor availability**
```bash
POST /api/v1/doctors/<doctor-id>/availability
Content-Type: application/json
Authorization: Bearer <branch_manager_token>

{
  "availabilities": [
    {
      "dayOfWeek": "MONDAY",
      "startTime": "08:00",
      "endTime": "16:00"
    },
    {
      "dayOfWeek": "WEDNESDAY",
      "startTime": "08:00",
      "endTime": "16:00"
    },
    {
      "dayOfWeek": "FRIDAY",
      "startTime": "09:00",
      "endTime": "17:00"
    }
  ]
}
```

**Step 6: View today's appointments**
```bash
GET /api/v1/appointments?page=1&pageSize=50
Authorization: Bearer <branch_manager_token>
```

**Step 7: Update branch contact information**
```bash
PUT /api/v1/branches/my-branch
Content-Type: application/json
Authorization: Bearer <branch_manager_token>

{
  "phone": "+234-987-654-3211",
  "email": "uptown.branch@hospital.com"
}
```

---

### Example 3: Branch Manager Attempting Unauthorized Access

**Attempt to view another branch (automatically blocked):**
```bash
GET /api/v1/branches
Authorization: Bearer <branch_manager_token>
```

**Response:**
```json
{
  "items": [
    {
      "id": "my-branch-id",
      "name": "Uptown Branch"
      // Only their own branch returned
    }
  ],
  "total": 1,
  "page": 1,
  "pageSize": 20
}
```

**Attempt to create doctor in another branch (denied):**
```bash
POST /api/v1/doctors
Content-Type: application/json
Authorization: Bearer <branch_manager_token>

{
  "fullName": "Dr. Test",
  "email": "test@hospital.com",
  "password": "TestPass123",
  "branchId": "other-branch-id",  // Different branch
  "specialty": "General"
}
```

**Response (403 Forbidden):**
```json
{
  "error": "Forbidden: branch scope"
}
```

---

## Security Best Practices

### For Super Admins:
1. ✅ Always assign a specific `branchId` when creating Branch Managers
2. ✅ Use strong passwords (min 8 characters)
3. ✅ Verify branch exists before assigning manager
4. ✅ Keep track of which manager is assigned to which branch
5. ✅ Regularly review branch manager access

### For Branch Managers:
1. ✅ Change password after first login
2. ✅ Keep access token secure
3. ✅ Logout when session is complete
4. ✅ Report any unauthorized access attempts
5. ✅ Verify branch ID matches yours when creating resources

### System Security:
1. ✅ JWT tokens contain `branchId` for automatic filtering
2. ✅ All database queries include branch scope
3. ✅ Cross-branch access prevented at API level
4. ✅ Rate limiting on login endpoint (10 attempts per minute)
5. ✅ HTTP-only cookies for web application security
6. ✅ CORS headers for mobile app compatibility

---

## Troubleshooting

### Issue: "No branch assigned to this manager"
**Cause:** Branch Manager user was created without a `branchId`
**Solution:** Super Admin must update the user record to assign a branch

### Issue: "Forbidden: branch scope"
**Cause:** Attempting to create resources in a different branch
**Solution:** Ensure `branchId` in request matches your assigned branch

### Issue: "No doctors showing in list"
**Cause:** No doctors assigned to your branch yet
**Solution:** Create doctors with your branch ID

### Issue: Cannot see appointments from other branches
**Cause:** Working as designed - branch isolation
**Solution:** This is correct behavior. Contact Super Admin if you need data from other branches

---

## API Reference Summary

### Branch Manager Specific Endpoints:
```
GET  /api/v1/branches/my-branch      - Get my branch details with statistics
PUT  /api/v1/branches/my-branch      - Update my branch information
```

### General Endpoints (Branch-Scoped):
```
GET  /api/v1/doctors                 - List doctors in my branch
POST /api/v1/doctors                 - Create doctor in my branch
GET  /api/v1/patients                - List patients in my branch
POST /api/v1/patients                - Create patient in my branch
GET  /api/v1/appointments            - List appointments in my branch
POST /api/v1/appointments            - Create appointment in my branch
GET  /api/v1/users                   - List users in my branch
```

---

## Notes

- Branch Managers are automatically activated upon creation (`status: "ACTIVE"`)
- Password hashing uses bcrypt with salt rounds of 10
- Access tokens expire in 15 minutes, refresh tokens in 30 days
- All times and dates use ISO 8601 format
- Branch isolation is enforced at both application and database levels
- No explicit "switch branch" functionality - managers are permanently assigned to one branch
- To reassign a manager to a different branch, Super Admin must update the user's `branchId`
