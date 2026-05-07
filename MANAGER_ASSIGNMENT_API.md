# Branch Manager Assignment API Documentation

---

## Table of Contents
1. [Overview](#overview)
2. [Manager CRUD Operations](#manager-crud-operations)
3. [Branch Assignment](#branch-assignment)
4. [Complete Workflows](#complete-workflows)
5. [Best Practices](#best-practices)

---

## Overview

This API allows **Super Admins** to manage Branch Managers and assign them to branches. Branch Managers can be created with or without immediate branch assignment, giving flexibility in the onboarding process.

### Key Features:
- ✅ Create managers with or without branch assignment
- ✅ List all managers with their branch assignments
- ✅ Assign/reassign managers to branches
- ✅ View unassigned managers
- ✅ Filter managers by branch or status
- ✅ Prevent multiple managers per branch
- ✅ Soft delete managers

---

## Manager CRUD Operations

### 1. List Branch Managers

**Endpoint:** `GET /api/v1/managers`

**Authentication:** Required (Bearer Token)

**Roles:** SUPER_ADMIN, SYSTEM_ADMIN

**Query Parameters:**
```json
{
  "page": 1,              // optional, default: 1
  "pageSize": 20,         // optional, default: 20, max: 100
  "branchId": "uuid",     // optional, filter by specific branch
  "status": "ACTIVE"      // optional, filter by status (ACTIVE, PENDING, SUSPENDED)
}
```

**Response (200 OK):**
```json
{
  "items": [
    {
      "id": "manager-uuid-1",
      "hospitalId": "hospital-uuid",
      "branchId": "branch-uuid-1",
      "fullName": "John Manager",
      "email": "john.manager@hospital.com",
      "status": "ACTIVE",
      "emailVerifiedAt": "2026-02-09T10:00:00.000Z",
      "createdAt": "2026-02-01T10:00:00.000Z",
      "updatedAt": "2026-02-01T10:00:00.000Z",
      "branch": {
        "id": "branch-uuid-1",
        "name": "Downtown Branch",
        "address": "123 Main Street",
        "city": "Lagos",
        "state": "Lagos State",
        "phone": "+234-123-456-7890",
        "email": "downtown@hospital.com",
        "isHeadBranch": false
      }
    },
    {
      "id": "manager-uuid-2",
      "hospitalId": "hospital-uuid",
      "branchId": null,
      "fullName": "Sarah Unassigned",
      "email": "sarah.unassigned@hospital.com",
      "status": "ACTIVE",
      "emailVerifiedAt": "2026-02-08T10:00:00.000Z",
      "createdAt": "2026-02-08T10:00:00.000Z",
      "updatedAt": "2026-02-08T10:00:00.000Z",
      "branch": null
    }
  ],
  "total": 2,
  "page": 1,
  "pageSize": 20,
  "statistics": {
    "totalManagers": 2,
    "assignedManagers": 1,
    "unassignedManagers": 1
  }
}
```

**Filter Examples:**

Get only unassigned managers:
```bash
GET /api/v1/managers?page=1&pageSize=20
# Then filter client-side where branchId === null
```

Get managers for specific branch:
```bash
GET /api/v1/managers?branchId=branch-uuid-123
```

Get only active managers:
```bash
GET /api/v1/managers?status=ACTIVE
```

---

### 2. Create Branch Manager

**Endpoint:** `POST /api/v1/managers`

**Authentication:** Required (Bearer Token)

**Roles:** SUPER_ADMIN, SYSTEM_ADMIN

**Request Body:**
```json
{
  "fullName": "Michael Manager",
  "email": "michael.manager@hospital.com",
  "password": "SecurePass123",
  "branchId": "branch-uuid-123"    // optional - can be assigned later
}
```

**Create Without Branch Assignment:**
```json
{
  "fullName": "Jane Pending",
  "email": "jane.pending@hospital.com",
  "password": "SecurePass123"
  // No branchId - will be assigned later
}
```

**Validation Rules:**
- `fullName`: Minimum 2 characters
- `email`: Valid email format, must be unique
- `password`: Minimum 8 characters
- `branchId`: Optional, must be valid UUID if provided

**Response (201 Created):**
```json
{
  "id": "manager-uuid-456",
  "hospitalId": "hospital-uuid",
  "branchId": "branch-uuid-123",
  "fullName": "Michael Manager",
  "email": "michael.manager@hospital.com",
  "status": "ACTIVE",
  "role": "BRANCH_MANAGER",
  "emailVerifiedAt": "2026-02-09T10:00:00.000Z",
  "createdAt": "2026-02-09T10:00:00.000Z",
  "updatedAt": "2026-02-09T10:00:00.000Z",
  "branch": {
    "id": "branch-uuid-123",
    "name": "Uptown Branch",
    "address": "456 North Avenue",
    "city": "Lagos",
    "state": "Lagos State",
    "phone": "+234-987-654-3210",
    "email": "uptown@hospital.com",
    "isHeadBranch": false
  }
}
```

**Response (201 Created - No Branch):**
```json
{
  "id": "manager-uuid-789",
  "hospitalId": "hospital-uuid",
  "branchId": null,
  "fullName": "Jane Pending",
  "email": "jane.pending@hospital.com",
  "status": "ACTIVE",
  "role": "BRANCH_MANAGER",
  "emailVerifiedAt": "2026-02-09T10:00:00.000Z",
  "createdAt": "2026-02-09T10:00:00.000Z",
  "updatedAt": "2026-02-09T10:00:00.000Z",
  "branch": null
}
```

**Error Response (409 Conflict - Branch Already Has Manager):**
```json
{
  "error": "Branch already has an assigned manager",
  "details": {
    "managerId": "existing-manager-uuid",
    "managerName": "John Manager",
    "managerEmail": "john.manager@hospital.com"
  }
}
```

**Error Response (409 Conflict - Email Exists):**
```json
{
  "error": "Email already registered"
}
```

**Error Response (404 Not Found - Invalid Branch):**
```json
{
  "error": "Branch not found"
}
```

---

### 3. Get Manager Details

**Endpoint:** `GET /api/v1/managers/{managerId}`

**Authentication:** Required (Bearer Token)

**Roles:** SUPER_ADMIN, SYSTEM_ADMIN

**Path Parameters:**
- `managerId` (string, uuid): Manager's user ID

**Response (200 OK):**
```json
{
  "id": "manager-uuid-456",
  "hospitalId": "hospital-uuid",
  "branchId": "branch-uuid-123",
  "fullName": "Michael Manager",
  "email": "michael.manager@hospital.com",
  "status": "ACTIVE",
  "emailVerifiedAt": "2026-02-09T10:00:00.000Z",
  "createdAt": "2026-02-09T10:00:00.000Z",
  "updatedAt": "2026-02-09T10:00:00.000Z",
  "branch": {
    "id": "branch-uuid-123",
    "name": "Uptown Branch",
    "address": "456 North Avenue",
    "city": "Lagos",
    "state": "Lagos State",
    "country": "Nigeria",
    "phone": "+234-987-654-3210",
    "email": "uptown@hospital.com",
    "isHeadBranch": false
  }
}
```

**Error Response (404 Not Found):**
```json
{
  "error": "Manager not found"
}
```

---

### 4. Update Manager Details

**Endpoint:** `PUT /api/v1/managers/{managerId}`

**Authentication:** Required (Bearer Token)

**Roles:** SUPER_ADMIN, SYSTEM_ADMIN

**Path Parameters:**
- `managerId` (string, uuid): Manager's user ID

**Note:** This endpoint updates manager details only. To change branch assignment, use `/assign-branch` endpoint.

**Request Body:**
```json
{
  "fullName": "Michael Updated",     // optional
  "status": "SUSPENDED"              // optional (ACTIVE, PENDING, SUSPENDED)
}
```

**Response (200 OK):**
```json
{
  "id": "manager-uuid-456",
  "hospitalId": "hospital-uuid",
  "branchId": "branch-uuid-123",
  "fullName": "Michael Updated",
  "email": "michael.manager@hospital.com",
  "status": "SUSPENDED",
  "role": "BRANCH_MANAGER",
  "emailVerifiedAt": "2026-02-09T10:00:00.000Z",
  "createdAt": "2026-02-09T10:00:00.000Z",
  "updatedAt": "2026-02-09T11:30:00.000Z",
  "branch": {
    "id": "branch-uuid-123",
    "name": "Uptown Branch",
    "address": "456 North Avenue",
    "city": "Lagos",
    "state": "Lagos State",
    "phone": "+234-987-654-3210",
    "email": "uptown@hospital.com",
    "isHeadBranch": false
  }
}
```

---

### 5. Delete Manager

**Endpoint:** `DELETE /api/v1/managers/{managerId}`

**Authentication:** Required (Bearer Token)

**Roles:** SUPER_ADMIN, SYSTEM_ADMIN

**Path Parameters:**
- `managerId` (string, uuid): Manager's user ID

**Description:**
Performs a soft delete by setting `deletedAt` timestamp and changing status to SUSPENDED.

**Response (200 OK):**
```json
{
  "message": "Manager deleted successfully"
}
```

**Error Response (404 Not Found):**
```json
{
  "error": "Manager not found"
}
```

---

## Branch Assignment

### 6. Assign/Reassign Manager to Branch

**Endpoint:** `PUT /api/v1/managers/{managerId}/assign-branch`

**Authentication:** Required (Bearer Token)

**Roles:** SUPER_ADMIN, SYSTEM_ADMIN

**Path Parameters:**
- `managerId` (string, uuid): Manager's user ID

**Request Body:**

**Assign to Branch:**
```json
{
  "branchId": "branch-uuid-123"
}
```

**Reassign to Different Branch:**
```json
{
  "branchId": "branch-uuid-456"
}
```

**Unassign from Branch:**
```json
{
  "branchId": null
}
```

**Response (200 OK - New Assignment):**
```json
{
  "message": "Manager assigned to branch \"Uptown Branch\"",
  "manager": {
    "id": "manager-uuid-789",
    "hospitalId": "hospital-uuid",
    "branchId": "branch-uuid-456",
    "fullName": "Jane Pending",
    "email": "jane.pending@hospital.com",
    "status": "ACTIVE",
    "emailVerifiedAt": "2026-02-09T10:00:00.000Z",
    "createdAt": "2026-02-08T10:00:00.000Z",
    "updatedAt": "2026-02-09T12:00:00.000Z",
    "branch": {
      "id": "branch-uuid-456",
      "name": "Uptown Branch",
      "address": "456 North Avenue",
      "city": "Lagos",
      "state": "Lagos State",
      "country": "Nigeria",
      "phone": "+234-987-654-3210",
      "email": "uptown@hospital.com",
      "isHeadBranch": false
    }
  },
  "previousBranch": null
}
```

**Response (200 OK - Reassignment):**
```json
{
  "message": "Manager reassigned from \"Downtown Branch\" to \"Uptown Branch\"",
  "manager": {
    "id": "manager-uuid-456",
    "branchId": "branch-uuid-456",
    "fullName": "Michael Manager",
    "branch": {
      "id": "branch-uuid-456",
      "name": "Uptown Branch"
    }
  },
  "previousBranch": {
    "id": "branch-uuid-123",
    "name": "Downtown Branch"
  }
}
```

**Response (200 OK - Unassignment):**
```json
{
  "message": "Manager unassigned from branch",
  "manager": {
    "id": "manager-uuid-456",
    "branchId": null,
    "fullName": "Michael Manager",
    "branch": null
  },
  "previousBranch": {
    "id": "branch-uuid-123",
    "name": "Downtown Branch"
  }
}
```

**Error Response (409 Conflict - Branch Already Has Manager):**
```json
{
  "error": "Branch already has an assigned manager",
  "details": {
    "managerId": "existing-manager-uuid",
    "managerName": "John Existing",
    "managerEmail": "john.existing@hospital.com"
  }
}
```

**Error Response (404 Not Found - Manager):**
```json
{
  "error": "Manager not found"
}
```

**Error Response (404 Not Found - Branch):**
```json
{
  "error": "Branch not found"
}
```

---

## Complete Workflows

### Workflow 1: Create Manager and Assign to Branch

**Step 1: Create manager without branch**
```bash
POST /api/v1/managers
Content-Type: application/json
Authorization: Bearer <super_admin_token>

{
  "fullName": "New Manager",
  "email": "new.manager@hospital.com",
  "password": "SecurePass123"
}
```

**Step 2: View available managers**
```bash
GET /api/v1/managers
Authorization: Bearer <super_admin_token>
```

**Step 3: Assign to branch**
```bash
PUT /api/v1/managers/<manager-id>/assign-branch
Content-Type: application/json
Authorization: Bearer <super_admin_token>

{
  "branchId": "branch-uuid-123"
}
```

---

### Workflow 2: Reassign Manager to Different Branch

**Step 1: View current assignments**
```bash
GET /api/v1/managers
Authorization: Bearer <super_admin_token>
```

**Step 2: Reassign manager**
```bash
PUT /api/v1/managers/<manager-id>/assign-branch
Content-Type: application/json
Authorization: Bearer <super_admin_token>

{
  "branchId": "new-branch-uuid"
}
```

---

### Workflow 3: Create Manager with Immediate Assignment

```bash
POST /api/v1/managers
Content-Type: application/json
Authorization: Bearer <super_admin_token>

{
  "fullName": "Direct Manager",
  "email": "direct.manager@hospital.com",
  "password": "SecurePass123",
  "branchId": "branch-uuid-123"
}
```

---

### Workflow 4: View Unassigned Managers

**Step 1: Get all managers**
```bash
GET /api/v1/managers
Authorization: Bearer <super_admin_token>
```

**Step 2: Filter client-side**
```javascript
const unassignedManagers = response.items.filter(m => m.branchId === null);
```

Or check the statistics:
```json
{
  "statistics": {
    "totalManagers": 5,
    "assignedManagers": 3,
    "unassignedManagers": 2
  }
}
```

---

### Workflow 5: Temporarily Unassign Manager

```bash
PUT /api/v1/managers/<manager-id>/assign-branch
Content-Type: application/json
Authorization: Bearer <super_admin_token>

{
  "branchId": null
}
```

This is useful when:
- Reorganizing branch structure
- Manager is on leave
- Branch is temporarily closed
- Manager is being transferred

---

## Best Practices

### 1. Manager Creation
✅ **Do:**
- Create managers without branch initially if branch selection comes later
- Verify email uniqueness before creation
- Use strong passwords (min 8 characters)
- Check statistics to see unassigned managers

❌ **Don't:**
- Assign multiple managers to same branch
- Skip password requirements
- Forget to check if branch already has a manager

### 2. Branch Assignment
✅ **Do:**
- Check if branch already has a manager before assignment
- Use reassignment flow when transferring managers
- Keep track of previous assignments (response includes previousBranch)
- Unassign manager before deleting a branch

❌ **Don't:**
- Assign inactive/suspended managers to critical branches
- Forget to notify manager of assignment changes
- Assign to non-existent branches

### 3. Manager Lifecycle
✅ **Do:**
- Use soft delete (DELETE endpoint) instead of hard delete
- Update status to SUSPENDED instead of deleting
- Check manager's branch before performing branch operations
- Keep audit trail of assignments

❌ **Don't:**
- Hard delete managers (use soft delete)
- Leave suspended managers assigned to branches
- Reassign without checking current workload

### 4. UI/UX Recommendations
✅ **Implement:**
- Dashboard showing unassigned managers count
- Drag-and-drop branch assignment interface
- Warning when reassigning from active branch
- Confirmation dialog before unassignment
- Manager assignment history log

---

## Security Considerations

### Access Control
- Only SUPER_ADMIN and SYSTEM_ADMIN can manage Branch Managers
- Branch Managers cannot manage other Branch Managers
- Cross-hospital access automatically prevented by hospitalId filtering

### Data Validation
- All UUIDs are validated
- Email uniqueness enforced at database level
- Branch existence verified before assignment
- Prevents duplicate managers per branch

### Audit Trail
- All operations logged with timestamps
- Previous branch information preserved in reassignment responses
- Soft delete preserves data for audit

---

## Common Error Scenarios

| Scenario | Error Code | Error Message | Solution |
|----------|------------|---------------|----------|
| Email exists | 409 | "Email already registered" | Use different email |
| Branch has manager | 409 | "Branch already has an assigned manager" | Unassign existing or use reassignment |
| Invalid branch | 404 | "Branch not found" | Verify branch ID and hospital |
| Manager not found | 404 | "Manager not found" | Verify manager ID |
| Insufficient permissions | 403 | "Forbidden: Insufficient permissions" | Login as Super Admin |
| Invalid branchId format | 400 | Validation error | Use valid UUID |

---

## API Summary

| Endpoint | Method | Purpose | Auth Required |
|----------|--------|---------|---------------|
| `/api/v1/managers` | GET | List all managers | ✅ Super Admin |
| `/api/v1/managers` | POST | Create new manager | ✅ Super Admin |
| `/api/v1/managers/:id` | GET | Get manager details | ✅ Super Admin |
| `/api/v1/managers/:id` | PUT | Update manager details | ✅ Super Admin |
| `/api/v1/managers/:id` | DELETE | Soft delete manager | ✅ Super Admin |
| `/api/v1/managers/:id/assign-branch` | PUT | Assign/reassign/unassign | ✅ Super Admin |

---

## Notes

- Managers are auto-activated upon creation (`status: "ACTIVE"`)
- Password hashing uses bcrypt with salt rounds of 10
- Email verification is automatically set to current timestamp
- Soft delete sets `deletedAt` timestamp and changes status to SUSPENDED
- Branch assignment is optional at creation time
- Only one active manager allowed per branch
- Reassignment preserves history in response
- All times use ISO 8601 format
- CORS headers included for mobile app compatibility
