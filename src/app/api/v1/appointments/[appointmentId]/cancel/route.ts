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

const cancelSchema = z.object({
  reason: z.string().min(1, "Cancellation reason is required").max(500, "Reason must be 500 characters or less"),
});

/**
 * POST /api/v1/appointments/[appointmentId]/cancel
 * 
 * Cancel an appointment with a reason
 * 
 * **Authentication Required:** Yes
 * **Roles Allowed:** DOCTOR, PATIENT, BRANCH_MANAGER, SUPER_ADMIN
 * 
 * **Request Body:**
 * ```json
 * {
 *   "reason": "Unable to attend due to emergency"
 * }
 * ```
 * 
 * **Response:**
 * ```json
 * {
 *   "message": "Appointment cancelled successfully",
 *   "data": { ...appointment }
 * }
 * ```
 * 
 * **Error Responses:**
 * - 400: Invalid request or already completed/cancelled
 * - 401: Unauthorized
 * - 403: Forbidden (not your appointment)
 * - 404: Appointment not found
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ appointmentId: string }> }
) {
  try {
    const { appointmentId } = await params;

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
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400, headers: getCorsHeaders() }
      );
    }

    const validationResult = cancelSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation error", details: validationResult.error.flatten() },
        { status: 400, headers: getCorsHeaders() }
      );
    }

    const { reason } = validationResult.data;

    // 3. FETCH APPOINTMENT
    const appointment = await db.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        doctor: { select: { fullName: true } },
        patient: { select: { fullName: true } },
      },
    });

    if (!appointment) {
      return NextResponse.json(
        { error: "Not found", message: "Appointment not found" },
        { status: 404, headers: getCorsHeaders() }
      );
    }

    // 4. AUTHORIZATION
    if (appointment.hospitalId !== authContext.hospitalId) {
      return NextResponse.json(
        { error: "Forbidden", message: "Access denied" },
        { status: 403, headers: getCorsHeaders() }
      );
    }

    // Check if user has permission to cancel
    const canCancel =
      authContext.role === "SUPER_ADMIN" ||
      (authContext.role === "BRANCH_MANAGER" && appointment.branchId === authContext.branchId) ||
      appointment.doctorId === authContext.userId ||
      appointment.patientId === authContext.userId;

    if (!canCancel) {
      return NextResponse.json(
        { error: "Forbidden", message: "You cannot cancel this appointment" },
        { status: 403, headers: getCorsHeaders() }
      );
    }

    // 5. BUSINESS LOGIC VALIDATION
    if (appointment.status === "completed") {
      return NextResponse.json(
        { error: "Invalid operation", message: "Cannot cancel completed appointment" },
        { status: 400, headers: getCorsHeaders() }
      );
    }

    if (appointment.status === "cancelled") {
      return NextResponse.json(
        { error: "Invalid operation", message: "Appointment is already cancelled" },
        { status: 400, headers: getCorsHeaders() }
      );
    }

    // 6. UPDATE APPOINTMENT
    const cancelledAppointment = await db.appointment.update({
      where: { id: appointmentId },
      data: {
        status: "cancelled",
        cancelReason: reason,
        cancelledAt: new Date(),
        updatedAt: new Date(),
      },
      include: {
        doctor: {
          select: {
            id: true,
            fullName: true,
            email: true,
            doctorProfile: { select: { specialty: true } },
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
    });

    // 7. RESPONSE
    return NextResponse.json(
      {
        message: "Appointment cancelled successfully",
        data: cancelledAppointment,
      },
      { status: 200, headers: getCorsHeaders() }
    );
  } catch (error) {
    console.error("Error cancelling appointment:", error);
    const status = getErrorStatus(error, 500);
    return NextResponse.json(
      {
        error: "Internal Server Error",
        message: "Failed to cancel appointment",
      },
      { status, headers: getCorsHeaders() }
    );
  }
}
