# Hospital SaaS Codebase - AI Agent Instructions

## Project Overview

**Hospital Multi-Tenant SaaS Platform** — A full-stack healthcare application serving super administrators managing hospital chains with video call capabilities.

- **Stack:** Next.js 16 (App Router) + Node.js + TypeScript + PostgreSQL (Prisma)
- **Structure:** Single-codebase monolith with backend APIs and super-admin frontend coexisting
- **Key Feature:** Agora.io video calling for doctor-patient consultations
- **Architecture Pattern:** Multi-tenant with hospital-level isolation

---

## Critical Architecture Principles

### 1. Backend ≠ Frontend Separation in Same Codebase

- Backend APIs (`src/app/api/v1/*`) must be **framework-agnostic** and consumable by web, doctor mobile app, and patient mobile app
- Frontend (`src/app/(super-admin)/*`) consumes APIs via HTTP, never accesses database directly
- **Never** import UI components into API route handlers
- Business logic lives in `src/modules/*` (server-only), not routes

### 2. Multi-Tenant Isolation via Hospital ID

All data access is **hospital-scoped**:

```typescript
// Example: Always include hospitalId in WHERE clause
const appointments = await db.appointment.findMany({
  where: {
    hospitalId: ctx.hospitalId,  // REQUIRED
    // ... other filters
  },
});
```

- Extract `hospital_id` from JWT token in `getAuthContext(req)`
- Block cross-tenant access in [src/lib/tenancy.ts](src/lib/tenancy.ts) via `assertHospitalScope()`
- Implement role-based filtering in addition to hospital scope (BRANCH_MANAGER sees only their branch, etc.)

### 3. Authentication & Authorization Flow

**Token Structure** ([src/modules/auth/index.ts](src/modules/auth/index.ts)):

```typescript
interface AuthTokenPayload {
  userId: string;
  hospitalId: string;
  role: UserRole;           // SUPER_ADMIN, BRANCH_MANAGER, DOCTOR, PATIENT, SYSTEM_ADMIN
  branchId?: string;        // For managers
}
```

**API Pattern** (all routes):

```typescript
import { getAuthContext, requireAuth, requireRole } from "@/lib/api-context";

export async function POST(req: NextRequest) {
  const ctx = getAuthContext(req);
  try {
    requireAuth(ctx);  // Validate token exists
    requireRole(ctx, ["DOCTOR", "PATIENT"]);  // Check roles
    
    // ctx.hospitalId, ctx.userId, ctx.role guaranteed here
  }
}
```

---

## Developer Workflows

### Running the Project

```bash
npm run dev              # Start Next.js dev server (localhost:3000)
npm run build            # Build for production
npm run lint             # Run ESLint
npm run prisma:format    # Format schema.prisma
npm run prisma:generate  # Regenerate Prisma client
```

### Database Changes

1. Modify [prisma/schema.prisma](prisma/schema.prisma)
2. Run: `npx prisma migrate dev --name <migration_name>`
3. Prisma auto-generates types in `node_modules/.prisma/client`
4. Redeploy with `npm run prisma:generate` before build

### Debugging APIs

- Test endpoints via curl or Postman with `Authorization: Bearer <token>` header
- Enable verbose logging: set `NODE_ENV=development` to log Prisma queries
- Check token validity at `/api/v1/debug-token` (dev endpoint)

---

## Project-Specific Patterns

### 1. API Route Structure

All routes live in `/api/v1/*` and follow a common pattern:

**Standard HTTP Methods:**

```typescript
// GET - List or fetch resources
export async function GET(req: NextRequest)

// POST - Create or bulk operation
export async function POST(req: NextRequest)

// PUT/PATCH - Update (rarely used, prefer POST)
// DELETE - Remove

// OPTIONS - Always include for CORS
export async function OPTIONS() {
  return handleCorsOptions();
}
```

**Validation & Error Handling:**

- Use **Zod** (`z.object()`) for schema validation
- Return errors with proper HTTP codes: 400 (bad input), 401 (auth), 403 (forbidden), 404 (not found), 409 (conflict)
- Include `getCorsHeaders()` in all responses for mobile app compatibility
- Never expose sensitive info in error messages

**Example** ([src/app/api/v1/appointments/route.ts](src/app/api/v1/appointments/route.ts)):

```typescript
const schema = z.object({
  appointmentDate: z.string().date(),
  appointmentTime: z.string().regex(/^\d{2}:\d{2}$/),
});

const parsed = schema.safeParse(body);
if (!parsed.success) {
  return NextResponse.json(
    { error: parsed.error.flatten() },
    { status: 400, headers: getCorsHeaders() }
  );
}
```

### 2. User Roles & Access Control

**Role Hierarchy** (from [src/lib/rbac.ts](src/lib/rbac.ts)):

- `SYSTEM_ADMIN` — Reserved, system-wide access (rarely used)
- `SUPER_ADMIN` — Hospital chain owner, full access
- `BRANCH_MANAGER` — Manages single branch, branch-scoped access
- `DOCTOR` — Can view own appointments, request video tokens
- `PATIENT` — Can book appointments, receive treatment

**Access Pattern:**

```typescript
// In API handlers
if (ctx?.role === "BRANCH_MANAGER" && ctx.branchId) {
  baseWhere.branchId = ctx.branchId;  // Enforce branch scope
}
if (ctx?.role === "DOCTOR") {
  baseWhere.doctorId = ctx.userId;    // Doctors see only their appointments
}
```

### 3. Video Calling Integration (Agora.io)

**Architecture:** Server-side token generation to prevent certificate exposure.

**Key Files:**
- **[src/lib/agora.ts](src/lib/agora.ts)** — Token generation, UID conversion, channel naming
- **[src/app/api/v1/video-calls/route.ts](src/app/api/v1/video-calls/route.ts)** — Token endpoint
- **Environment:** `AGORA_APP_ID` and `AGORA_APP_CERTIFICATE` (required in `.env.local`)

**Endpoint Pattern:**

```
POST /api/v1/video-calls/token
Authorization: Bearer <access_token>

Request:
{
  "branchId": "uuid",
  "doctorId": "uuid",
  "patientId": "uuid"
}

Response:
{
  "message": "Agora token generated successfully",
  "data": {
    "token": "006...",
    "channelName": "branch_{id}_doctor_{id}_patient_{id}",
    "doctorUid": 1234567890,
    "patientUid": 1234567891,
    "expiresIn": 86400,
    "expiresAt": 1706553290000
  }
}
```

**Security:**
- Doctor role = PUBLISHER (send/receive video)
- Patient role = SUBSCRIBER (receive-only)
- Tokens auto-expire after 24 hours
- Validates all three users in same hospital

### 4. Database Schema Essentials

Key models (see [prisma/schema.prisma](prisma/schema.prisma)):

- **User** → All users (doctors, patients, managers)
- **Hospital** → Super admin's hospital chain
- **Branch** → Hospital locations, managed by BRANCH_MANAGER
- **DoctorProfile** → Extended doctor info (specialty, availability)
- **Appointment** → Doctor-patient bookings
- **DoctorAvailability** → Doctor working hours per branch
- **PatientProfile** → Medical history (blood group, genotype, etc.)

**Key Enums:**
- `UserRole` — SYSTEM_ADMIN, SUPER_ADMIN, BRANCH_MANAGER, DOCTOR, PATIENT
- `AppointmentStatus` — requested, confirmed, completed, cancelled
- `AppointmentType` — virtual, physical

---

## Integration Points & Data Flow

### Authentication Flow

1. User submits login → `/api/v1/auth/login`
2. Backend verifies credentials, returns `{ accessToken, refreshToken }`
3. Client stores tokens (header or cookie)
4. Middleware validates token on each request
5. `getAuthContext()` extracts user info from JWT

### Appointment Booking Flow (Patient → Doctor)

1. Patient views available doctors via `/api/v1/doctors` (filtered by branch)
2. Patient checks doctor availability via `/api/v1/doctors/[doctorId]/availability-slots`
3. Patient posts appointment request via `/api/v1/appointments`
4. Doctor confirms appointment (status = `confirmed`)
5. Before call: Request video token from `/api/v1/video-calls/token`

### Branch Manager Scope

- Managers see only their branch's data
- Cannot access other branches
- No direct hospital-level operations (handled by super admin)

---

## Common Tasks & Code Locations

| Task | Primary File | Secondary Files |
|------|---|---|
| Add API endpoint | `src/app/api/v1/{resource}/route.ts` | Validate with Zod, use auth context |
| Add role permission | `src/lib/rbac.ts`, then endpoint auth | Update `requireRole()` calls |
| Modify user model | `prisma/schema.prisma` | Run `prisma migrate dev` |
| Implement doctor availability | `src/modules/appointments/` | Schema: `DoctorAvailability` model |
| Video call feature | `src/lib/agora.ts` + `/video-calls/route.ts` | Test with mobile SDK |
| Multi-tenant filtering | `src/lib/tenancy.ts` | Always include `hospitalId` in WHERE |

---

## Critical Don'ts

❌ **Don't** import UI components in `/api/*` routes  
❌ **Don't** access database directly from super-admin pages (use `/api/v1/*` instead)  
❌ **Don't** forget `hospital_id` in WHERE clauses — enables data leaks  
❌ **Don't** skip CORS headers in API responses — breaks mobile apps  
❌ **Don't** hardcode credentials (use env vars)  
❌ **Don't** return sensitive data in error responses  

---

## Environment Variables

```bash
# Database
DATABASE_URL=postgresql://...

# Authentication (JWT signing)
# Generated during project setup, keep secure

# Agora Video Calls
AGORA_APP_ID=<from agora.io dashboard>
AGORA_APP_CERTIFICATE=<from agora.io dashboard>
```

---

## Key References

- **Existing Rules:** [.cursorrules](.cursorrules) — Extended architecture details
- **Video Calling Docs:** [AGORA_INTEGRATION.md](AGORA_INTEGRATION.md), [AGORA_QUICK_REFERENCE.md](AGORA_QUICK_REFERENCE.md)
- **Typescript Config:** [tsconfig.json](tsconfig.json) — Path aliases (`@/` → `src/`)
- **Next.js Config:** [next.config.ts](next.config.ts)
