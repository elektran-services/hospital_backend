import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getAuthContext, requireRole } from "@/lib/api-context";
import { getCorsHeaders, handleCorsOptions } from "@/lib/cors";
import { getErrorStatus } from "@/lib/http-error";

// Handle CORS preflight
export async function OPTIONS() {
  return handleCorsOptions();
}

const querySchema = z.object({
  status: z.enum(["upcoming", "completed", "cancelled", "all"]).optional().default("all"),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

/**
 * GET /api/v1/appointments/history
 * 
 * Get appointment history with status filtering
 * 
 * **Authentication Required:** Yes
 * **Roles Allowed:** DOCTOR, PATIENT, BRANCH_MANAGER, SUPER_ADMIN
 * 
 * **Query Parameters:**
 * - status: "upcoming" | "completed" | "cancelled" | "all" (default: "all")
 * - page: number (default: 1)
 * - limit: number (default: 20, max: 100)
 * 
 * **Status Logic:**
 * - upcoming: scheduledAt >= now AND status != 'cancelled'
 * - completed: status = 'completed'
 * - cancelled: status = 'cancelled'
 * - all: all appointments
 * 
 * **Response:**
 * ```json
 * {
 *   "message": "Appointments retrieved successfully",
 *   "data": {
 *     "appointments": [...],
 *     "pagination": {
 *       "page": 1,
 *       "limit": 20,
 *       "total": 50,
 *       "totalPages": 3
 *     }
 *   }
 * }
 * ```
 */
export async function GET(req: NextRequest) {
  try {
    // 1. AUTHENTICATION
    const authContext = getAuthContext(req);
    requireRole(authContext, ["DOCTOR", "PATIENT", "BRANCH_MANAGER", "SUPER_ADMIN"]);

    if (!authContext) {
      return NextResponse.json(
        { error: "Unauthorized", message: "Authentication required" },
        { status: 401, headers: getCorsHeaders() }
      );
    }

    // 2. VALIDATION
    const { searchParams } = new URL(req.url);
    const validationResult = querySchema.safeParse({
      status: searchParams.get("status"),
      page: searchParams.get("page"),
      limit: searchParams.get("limit"),
    });

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation error", details: validationResult.error.flatten() },
        { status: 400, headers: getCorsHeaders() }
      );
    }

    const { status, page, limit } = validationResult.data;

    // 3. BUILD QUERY
    const where: any = {
      hospitalId: authContext.hospitalId,
    };

    // Role-based filtering
    if (authContext.role === "DOCTOR") {
      where.doctorId = authContext.userId;
    } else if (authContext.role === "PATIENT") {
      where.patientId = authContext.userId;
    } else if (authContext.role === "BRANCH_MANAGER" && authContext.branchId) {
      where.branchId = authContext.branchId;
    }

    // Status-based filtering
    const now = new Date();
    if (status === "upcoming") {
      where.scheduledAt = { gte: now };
      where.status = { not: "cancelled" };
    } else if (status === "completed") {
      where.status = "completed";
    } else if (status === "cancelled") {
      where.status = "cancelled";
    }

    // 4. FETCH DATA
    const [appointments, total] = await Promise.all([
      db.appointment.findMany({
        where,
        select: {
          id: true,
          status: true,
          appointmentType: true,
          scheduledAt: true,
          note: true,
          cancelReason: true,
          cancelledAt: true,
          createdAt: true,
          doctor: {
            select: {
              id: true,
              fullName: true,
              email: true,
              doctorProfile: {
                select: {
                  specialty: true,
                },
              },
            },
          },
          patient: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
          branch: {
            select: {
              id: true,
              name: true,
              address: true,
            },
          },
        },
        orderBy: { scheduledAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.appointment.count({ where }),
    ]);

    // 5. RESPONSE
    return NextResponse.json(
      {
        message: "Appointments retrieved successfully",
        data: {
          appointments,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
          },
        },
      },
      { status: 200, headers: getCorsHeaders() }
    );
  } catch (error) {
    console.error("Error fetching appointment history:", error);
    const status = getErrorStatus(error, 500);
    return NextResponse.json(
      {
        error: "Internal Server Error",
        message: "Failed to fetch appointment history",
      },
      { status, headers: getCorsHeaders() }
    );
  }
}
