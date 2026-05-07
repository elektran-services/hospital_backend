# Doctor Branch Assignment - Architecture Options

**Document Purpose:** Future reference for implementing doctor-to-branch assignment models  
**Date Created:** February 9, 2026  
**Status:** Planning / Not Implemented  
**Current System:** Single branch assignment (User.branchId)

---

## Table of Contents
1. [Current System](#current-system)
2. [Proposed Options](#proposed-options)
3. [Option Compatibility](#option-compatibility)
4. [Implementation Recommendations](#implementation-recommendations)
5. [Configurable System Considerations](#configurable-system-considerations)
6. [Decision Framework](#decision-framework)

---

## Current System

**Model:** Single Branch Assignment (SINGLE_BRANCH)

```prisma
model User {
  id         String   @id @default(uuid())
  hospitalId String
  branchId   String?  // Single branch assignment
  role       UserRole
  // ... other fields
}
```

**Characteristics:**
- ✅ Simple queries: `WHERE branchId = X`
- ✅ Clear ownership: one doctor belongs to one branch
- ✅ Easy to understand and maintain
- ✅ Works for 80%+ of hospital use cases
- ❌ No transfer history
- ❌ Cannot track doctor movements
- ❌ No support for doctors working at multiple branches

---

## Proposed Options

### Option 1: Simple Transfer (Single Branch with Transfer Capability)

**Description:** Keep single branch assignment, add transfer endpoint to move doctors between branches.

**Database Changes:**
```sql
-- No schema changes needed
-- Just new API endpoint: PUT /api/v1/doctors/{doctorId}/transfer-branch
```

**Implementation:**
```typescript
PUT /api/v1/doctors/{doctorId}/transfer-branch
{
  "newBranchId": "uuid",
  "effectiveDate": "2026-02-15",
  "handleExistingAppointments": "complete" | "cancel" | "transfer"
}
```

**Pros:**
- ✅ Minimal changes to existing system
- ✅ Simple implementation (just update `branchId`)
- ✅ No query complexity added
- ✅ Fast to implement

**Cons:**
- ❌ No audit trail of transfers
- ❌ Can't answer "where was doctor in March?"
- ❌ No compliance reporting on movements
- ❌ Lost historical data

**Existing Appointment Handling:**
- `complete` - Doctor remains responsible until appointments done
- `cancel` - Cancel all future appointments (notify patients)
- `transfer` - Move appointments to new branch

---

### Option 2: Transfer with History Tracking

**Description:** Single branch assignment + history table for audit trail.

**Database Changes:**
```prisma
model User {
  branchId      String?  // Current assignment
  branchHistory DoctorBranchHistory[]
}

model DoctorBranchHistory {
  id            String   @id @default(uuid())
  doctorId      String
  branchId      String
  startDate     DateTime
  endDate       DateTime?  // null = current assignment
  reason        String?
  transferredBy String     // Who initiated transfer
  createdAt     DateTime @default(now())
  
  doctor        User     @relation(fields: [doctorId], references: [id])
  branch        Branch   @relation(fields: [branchId], references: [id])
  
  @@index([doctorId, endDate])
}
```

**Implementation:**
```typescript
async function transferDoctor(
  doctorId: string,
  newBranchId: string,
  reason: string,
  transferredBy: string
) {
  await db.$transaction([
    // Close current history record
    db.doctorBranchHistory.updateMany({
      where: { doctorId, endDate: null },
      data: { endDate: new Date() }
    }),
    // Create new history record
    db.doctorBranchHistory.create({
      data: {
        doctorId,
        branchId: newBranchId,
        startDate: new Date(),
        reason,
        transferredBy
      }
    }),
    // Update current branch
    db.user.update({
      where: { id: doctorId },
      data: { branchId: newBranchId }
    })
  ]);
}
```

**Pros:**
- ✅ Complete audit trail
- ✅ Can answer historical queries
- ✅ Compliance-friendly (track all movements)
- ✅ Maintains simple current-state queries
- ✅ Easy to generate reports on transfers
- ✅ Supports reason tracking

**Cons:**
- ⚠️ Adds one table (minimal complexity)
- ⚠️ Extra writes on transfer (negligible performance impact)

**Query Examples:**
```typescript
// Current branch (fast, uses User.branchId)
WHERE branchId = X

// History: where was doctor on specific date?
SELECT * FROM DoctorBranchHistory
WHERE doctorId = Y AND startDate <= '2026-03-15' 
  AND (endDate IS NULL OR endDate > '2026-03-15')

// Transfer timeline
SELECT * FROM DoctorBranchHistory
WHERE doctorId = Y
ORDER BY startDate DESC
```

---

### Option 3: Multi-Branch Assignment

**Description:** Doctors can work at multiple branches simultaneously.

**Database Changes:**
```prisma
model User {
  // REMOVE branchId field completely
  branchAssignments DoctorBranchAssignment[]
}

model DoctorBranchAssignment {
  id            String   @id @default(uuid())
  doctorId      String
  branchId      String
  isPrimary     Boolean  @default(false)
  effectiveFrom DateTime
  effectiveTo   DateTime?  // null = current assignment
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  doctor        User     @relation(fields: [doctorId], references: [id])
  branch        Branch   @relation(fields: [branchId], references: [id])
  
  @@unique([doctorId, branchId, effectiveFrom])
  @@index([doctorId, effectiveTo])
}
```

**Implementation:**
```typescript
// Get doctor's current branches
const assignments = await db.doctorBranchAssignment.findMany({
  where: { 
    doctorId,
    effectiveTo: null  // Current assignments
  },
  include: { branch: true }
});

// Get doctor's primary branch
const primary = await db.doctorBranchAssignment.findFirst({
  where: { 
    doctorId,
    effectiveTo: null,
    isPrimary: true
  }
});
```

**Pros:**
- ✅ Supports complex scheduling (Mon-Wed at Branch A, Thu-Fri at Branch B)
- ✅ Ideal for specialists covering multiple locations
- ✅ History tracking built-in (effectiveTo dates)
- ✅ Flexible for large hospital chains

**Cons:**
- ❌ More complex queries everywhere
- ❌ Appointments need branch specification
- ❌ UI complexity (branch selector becomes multi-select)
- ❌ Every doctor query needs JOIN
- ❌ Performance impact on large datasets
- ❌ Harder to maintain and debug

**Query Examples:**
```typescript
// Doctors in Branch X (complex)
SELECT DISTINCT u.* FROM User u
JOIN DoctorBranchAssignment dba ON u.id = dba.doctorId
WHERE dba.branchId = X AND dba.effectiveTo IS NULL

// vs simple current system
SELECT * FROM User WHERE branchId = X
```

---

## Option Compatibility

### ✅ Compatible: Options 1 + 2
**Approach:** Simple Transfer + History Tracking

```prisma
model User {
  branchId      String?  // Current (Option 1)
  branchHistory DoctorBranchHistory[]  // History (Option 2)
}
```

**Benefits:**
- Best of both worlds: simple + auditable
- Easy queries for current branch
- Complete historical tracking
- No breaking changes

**Use Cases:**
- Hospitals where doctors belong to one branch
- Occasional transfers (quarterly/annually)
- Need audit compliance

---

### ❌ Incompatible: Options 1 + 3
**Conflict:** Single branch model vs multi-branch model

You must choose one:
- **Option 1/2:** `User.branchId` (one branch at a time)
- **Option 3:** `DoctorBranchAssignment` table (many branches simultaneously)

**Cannot have both** because they answer different questions:
- Option 1/2: "Which branch is this doctor at?"
- Option 3: "Which branches does this doctor work at?"

---

### ⚠️ Redundant: Options 2 + 3
**Issue:** Duplicate history tracking

```prisma
model DoctorBranchAssignment {
  effectiveFrom DateTime
  effectiveTo   DateTime?  // Already provides history
}

model DoctorBranchHistory {
  startDate DateTime
  endDate   DateTime?      // Redundant with above
}
```

**Recommendation:** If using Option 3, skip Option 2 (history built into assignments).

---

## Implementation Recommendations

### Recommended: Progressive Approach

#### Phase 1: Keep Current System ✅
**Status:** Already implemented  
**Model:** SINGLE_BRANCH (User.branchId)  
**Works for:** 80%+ of hospitals

**Action:** No changes needed

---

#### Phase 2: Add Transfer + History (Easy Upgrade)
**Model:** Options 1 + 2 combined  
**Effort:** Low (1-2 days)  
**Risk:** Low (additive, no breaking changes)

**Steps:**
1. Create `DoctorBranchHistory` table
2. Add migration to populate history for existing doctors
3. Implement transfer endpoint
4. Add history viewing endpoint
5. Update admin UI

**Migration Strategy:**
```sql
-- Populate history for existing doctors
INSERT INTO DoctorBranchHistory (doctorId, branchId, startDate, endDate)
SELECT id, branchId, createdAt, NULL
FROM User
WHERE role = 'DOCTOR' AND branchId IS NOT NULL;
```

---

#### Phase 3: Multi-Branch (If Needed)
**Trigger Conditions:** 
- 3+ hospitals request multi-branch doctors
- Specialists need to cover multiple locations
- Complex scheduling becomes critical

**Model:** Option 3 (major refactor)  
**Effort:** High (2-3 weeks)  
**Risk:** High (breaking changes)

**Steps:**
1. Analyze usage patterns from Phase 2 history
2. Design migration strategy
3. Create `DoctorBranchAssignment` table
4. Build abstraction layer for queries
5. Migrate all data with rollback plan
6. Update all endpoints
7. Comprehensive testing
8. Gradual rollout with feature flag

---

## Configurable System Considerations

### Hypothetical: Allow Super Admin to Choose Model

**Concept:** Hospital settings include a toggle for assignment mode:
```typescript
enum DoctorAssignmentMode {
  SINGLE_BRANCH   // Default
  MULTI_BRANCH    // Advanced
}
```

**Implementation:**
```prisma
model Hospital {
  doctorAssignmentMode DoctorAssignmentMode @default(SINGLE_BRANCH)
}
```

**Cache in JWT:**
```typescript
interface AuthTokenPayload {
  // ... existing fields
  doctorMode: "SINGLE_BRANCH" | "MULTI_BRANCH"
}
```

### Challenges with Configurable Approach

#### 1. Code Complexity
Every doctor query needs mode check:
```typescript
if (hospital.doctorAssignmentMode === 'SINGLE_BRANCH') {
  // Query User.branchId
} else {
  // Query DoctorBranchAssignment with JOIN
}
```

**Impact:**
- Doubles code paths for all features
- Higher bug risk (forgot to handle one mode)
- Testing multiplies (test both modes everywhere)

#### 2. Mode Switching Problems
```
Hospital switches: SINGLE_BRANCH → MULTI_BRANCH

Problems:
- What happens to existing User.branchId values?
- Need to migrate doctors to DoctorBranchAssignment
- What about appointments? Availability? History?
- Can it be reversed?
```

**Solution:** Lock mode after doctors exist, or require migration wizard

#### 3. UI Complexity
- Branch selector: single vs multiple
- Forms need conditional rendering
- Different validation rules per mode
- Admin confusion ("which mode should I use?")

#### 4. Maintenance Burden
- Two parallel implementations of same features
- Documentation splits (docs for mode A, docs for mode B)
- Support tickets: "it works in single-branch but not multi-branch"
- Future features require dual implementation

### When to Consider Configurable System

**Build it IF:**
- ✅ Customer demand is proven (5+ hospitals requesting)
- ✅ Willingness to 2x development time for all doctor features
- ✅ Resources for comprehensive testing
- ✅ Clear migration path between modes

**Don't build it IF:**
- ❌ Speculative need (no one asked for it)
- ❌ Small team (maintenance burden too high)
- ❌ Tight deadlines
- ❌ Can solve with Phase 2 instead

---

## Decision Framework

### Question 1: Do doctors transfer between branches?

**Yes → Implement Phase 2** (Options 1 + 2)  
**No → Keep current system** (Phase 1)

### Question 2: Do doctors work at multiple branches simultaneously?

**Yes, regularly (weekly) → Consider Phase 3** (Option 3)  
**No, or rarely → Phase 2 is sufficient**

### Question 3: Do you need audit compliance?

**Yes → Implement Phase 2 minimum**  
**No → Phase 1 is enough**

### Question 4: Hospital chain size?

**Small (1-3 branches) → Phase 1**  
**Medium (4-10 branches) → Phase 2**  
**Large (10+ branches) → Monitor usage, prepare for Phase 3 if needed**

---

## Migration Checklist (When Implementing)

### Phase 2 Implementation (Options 1 + 2)

**Schema Changes:**
- [ ] Create `DoctorBranchHistory` table
- [ ] Add indexes on (doctorId, endDate)
- [ ] Add foreign key constraints

**Data Migration:**
- [ ] Populate history for existing doctors
- [ ] Set startDate = createdAt, endDate = NULL
- [ ] Verify data integrity

**API Endpoints:**
- [ ] POST `/api/v1/doctors/{doctorId}/transfer-branch`
- [ ] GET `/api/v1/doctors/{doctorId}/transfer-history`
- [ ] Update OpenAPI spec

**Business Logic:**
- [ ] Handle existing appointments (complete/cancel/transfer)
- [ ] Clear doctor availability after transfer (requires reset)
- [ ] Notify affected patients
- [ ] Audit log transfer actions

**Testing:**
- [ ] Unit tests for transfer logic
- [ ] Integration tests for transaction rollback
- [ ] Test appointment handling scenarios
- [ ] Verify history queries

**Documentation:**
- [ ] Update API docs
- [ ] Create admin guide for transfers
- [ ] Document appointment handling policies

---

### Phase 3 Implementation (Option 3)

**Schema Changes:**
- [ ] Create `DoctorBranchAssignment` table
- [ ] Remove `User.branchId` field
- [ ] Add indexes on (doctorId, effectiveTo)
- [ ] Add unique constraint on (doctorId, branchId, effectiveFrom)

**Abstraction Layer:**
- [ ] Create `src/lib/doctor-branches.ts`
- [ ] Implement `getDoctorCurrentBranches()`
- [ ] Implement `getDoctorPrimaryBranch()`
- [ ] Implement `isDoctorAtBranch()`

**Data Migration:**
- [ ] Migrate existing branchId to assignments
- [ ] Migrate history to assignments (if exists)
- [ ] Mark first assignment as isPrimary
- [ ] Verify no data loss

**API Updates:**
- [ ] Refactor all doctor queries to use abstraction
- [ ] Update appointment creation (require branch)
- [ ] Update availability (link to specific branch)
- [ ] Update filtering/search

**UI Changes:**
- [ ] Multi-select branch selector
- [ ] Primary branch indicator
- [ ] Schedule view per branch
- [ ] Assignment management interface

**Testing:**
- [ ] Test single-branch assignments (backward compat)
- [ ] Test multi-branch assignments
- [ ] Test primary branch logic
- [ ] Performance testing with JOINs
- [ ] Load testing

---

## Appendix: Code Examples

### Phase 2: Transfer Implementation

```typescript
// src/app/api/v1/doctors/[doctorId]/transfer-branch/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getAuthContext, requireRole } from "@/lib/api-context";

const transferSchema = z.object({
  newBranchId: z.string().uuid(),
  reason: z.string().optional(),
  effectiveDate: z.string().date().optional(),
  handleAppointments: z.enum(["complete", "cancel", "transfer"]).default("complete"),
});

export async function PUT(
  req: NextRequest,
  { params }: { params: { doctorId: string } }
) {
  const ctx = getAuthContext(req);
  try {
    requireRole(ctx, ["SUPER_ADMIN", "SYSTEM_ADMIN"]);

    const body = await req.json();
    const parsed = transferSchema.parse(body);
    const { doctorId } = params;

    // Verify doctor exists
    const doctor = await db.user.findFirst({
      where: {
        id: doctorId,
        hospitalId: ctx!.hospitalId,
        role: "DOCTOR",
      },
    });

    if (!doctor) {
      return NextResponse.json(
        { error: "Doctor not found" },
        { status: 404 }
      );
    }

    // Verify new branch exists
    const newBranch = await db.branch.findFirst({
      where: {
        id: parsed.newBranchId,
        hospitalId: ctx!.hospitalId,
      },
    });

    if (!newBranch) {
      return NextResponse.json(
        { error: "Branch not found" },
        { status: 404 }
      );
    }

    // Cannot transfer to same branch
    if (doctor.branchId === parsed.newBranchId) {
      return NextResponse.json(
        { error: "Doctor already assigned to this branch" },
        { status: 400 }
      );
    }

    const result = await db.$transaction(async (tx) => {
      // Close current history record
      await tx.doctorBranchHistory.updateMany({
        where: {
          doctorId,
          endDate: null,
        },
        data: {
          endDate: new Date(),
        },
      });

      // Create new history record
      await tx.doctorBranchHistory.create({
        data: {
          doctorId,
          branchId: parsed.newBranchId,
          startDate: new Date(),
          reason: parsed.reason || "Transfer initiated by admin",
          transferredBy: ctx!.userId,
        },
      });

      // Update current branch
      const updatedDoctor = await tx.user.update({
        where: { id: doctorId },
        data: { branchId: parsed.newBranchId },
        include: {
          branch: true,
          doctorProfile: true,
        },
      });

      // Handle existing appointments
      if (parsed.handleAppointments === "cancel") {
        // Cancel future appointments
        await tx.appointment.updateMany({
          where: {
            doctorId,
            status: { in: ["requested", "confirmed"] },
            appointmentDate: { gte: new Date() },
          },
          data: {
            status: "cancelled",
            cancelReason: `Doctor transferred to ${newBranch.name}`,
          },
        });
      } else if (parsed.handleAppointments === "transfer") {
        // Move appointments to new branch
        await tx.appointment.updateMany({
          where: {
            doctorId,
            status: { in: ["requested", "confirmed"] },
            appointmentDate: { gte: new Date() },
          },
          data: {
            branchId: parsed.newBranchId,
          },
        });
      }
      // "complete" - do nothing, let appointments finish at old branch

      return updatedDoctor;
    });

    return NextResponse.json({
      message: `Doctor transferred to ${newBranch.name}`,
      doctor: result,
      previousBranch: doctor.branch,
    });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
```

---

## Conclusion

**Current Recommendation:** Implement **Phase 2** (Options 1 + 2)

**Rationale:**
- Solves immediate need (transfers with audit trail)
- Minimal complexity increase
- No breaking changes
- Compliance-friendly
- Can upgrade to Phase 3 later if multi-branch becomes critical

**Do NOT implement configurable system** unless:
- Proven customer demand exists
- Team has resources for dual maintenance
- Clear business value outweighs complexity cost

**Next Steps:**
1. Confirm Phase 2 meets requirements
2. Design transfer workflow with stakeholders
3. Implement schema changes
4. Add transfer endpoint
5. Build admin UI
6. Monitor usage patterns

**Future Consideration:**
- If 5+ hospitals request multi-branch doctors → revisit Phase 3
- If Phase 2 proves insufficient → begin Phase 3 planning
- If no transfers happen in 6 months → Phase 1 was enough

---

**Document Version:** 1.0  
**Last Updated:** February 9, 2026  
**Next Review:** After Phase 2 implementation
