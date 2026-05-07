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

const videoCallStatusSchema = z.object({
  event: z.enum(["started", "ended"]),
  timestamp: z.string().datetime("Timestamp must be in ISO 8601 format"),
  doctorId: z.string().uuid("Doctor ID must be a valid UUID"),
  patientId: z.string().uuid("Patient ID must be a valid UUID"),
  branchId: z.string().uuid("Branch ID must be a valid UUID"),
});

/**
 * PATCH /api/v1/appointments/[appointmentId]/video-call-status
 * 
 * Update video call status (started/ended) for virtual appointments
 * 
 * **Authentication Required:** Yes
 * **Roles Allowed:** DOCTOR, PATIENT, BRANCH_MANAGER, SUPER_ADMIN
 * 
 * **Request Body:**
 * ```json
 * {
 *   "event": "started" | "ended",
 *   "timestamp": "2026-02-11T10:00:00Z",
 *   "doctorId": "uuid",
 *   "patientId": "uuid",
 *   "branchId": "uuid"
 * }
 * ```
 * 
 * **Logic:**
 * - When event = "started":
 *   - Sets videoCallStartedAt
 *   - Sets videoCallIsActive = true
 *   - Changes appointment status to "in_progress"
 * - When event = "ended":
 *   - Sets videoCallEndedAt
 *   - Sets videoCallIsActive = false
 *   - Calculates videoCallDuration in minutes
 *   - Keeps appointment status as "in_progress" (manual completion by doctor)
 * 
 * **Response:**
 * ```json
 * {
 *   "message": "Video call status updated successfully",
 *   "data": { ...appointment with video call fields }
 * }
 * ```
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ appointmentId: string }> }
) {
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

    const { appointmentId } = await params;

    // 2. VALIDATION
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400, headers: getCorsHeaders() }
      );
    }

    const validationResult = videoCallStatusSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation error", details: validationResult.error.flatten() },
        { status: 400, headers: getCorsHeaders() }
      );
    }

    const { event, timestamp, doctorId, patientId, branchId } = validationResult.data;
    const eventTimestamp = new Date(timestamp);

    // 3. FETCH APPOINTMENT
    const appointment = await db.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        doctor: { select: { id: true, fullName: true } },
        patient: { select: { id: true, fullName: true } },
        branch: { select: { id: true, name: true } },
      },
    });

    if (!appointment) {
      return NextResponse.json(
        { error: "Not found", message: "Appointment not found" },
        { status: 404, headers: getCorsHeaders() }
      );
    }

    // 4. AUTHORIZATION & VALIDATION
    // Verify hospital scope
    if (appointment.hospitalId !== authContext.hospitalId) {
      return NextResponse.json(
        { error: "Forbidden", message: "Access denied" },
        { status: 403, headers: getCorsHeaders() }
      );
    }

    // Verify user is either the doctor or patient
    const isDoctor = authContext.userId === appointment.doctorId;
    const isPatient = authContext.userId === appointment.patientId;

    if (!isDoctor && !isPatient) {
      return NextResponse.json(
        { error: "Forbidden", message: "You are not authorized to update this appointment's video call status" },
        { status: 403, headers: getCorsHeaders() }
      );
    }

    // Verify provided IDs match appointment
    if (appointment.doctorId !== doctorId) {
      return NextResponse.json(
        { error: "Invalid request", message: "Doctor ID does not match appointment" },
        { status: 400, headers: getCorsHeaders() }
      );
    }

    if (appointment.patientId !== patientId) {
      return NextResponse.json(
        { error: "Invalid request", message: "Patient ID does not match appointment" },
        { status: 400, headers: getCorsHeaders() }
      );
    }

    if (appointment.branchId !== branchId) {
      return NextResponse.json(
        { error: "Invalid request", message: "Branch ID does not match appointment" },
        { status: 400, headers: getCorsHeaders() }
      );
    }

    // 5. BUSINESS LOGIC VALIDATION
    if (appointment.appointmentType !== "virtual") {
      return NextResponse.json(
        { error: "Invalid operation", message: "Video call status can only be updated for virtual appointments" },
        { status: 400, headers: getCorsHeaders() }
      );
    }

    if (appointment.status === "cancelled") {
      return NextResponse.json(
        { error: "Invalid operation", message: "Cannot update video call status for cancelled appointment" },
        { status: 400, headers: getCorsHeaders() }
      );
    }

    if (appointment.status === "completed") {
      return NextResponse.json(
        { error: "Invalid operation", message: "Cannot update video call status for completed appointment" },
        { status: 400, headers: getCorsHeaders() }
      );
    }

    // 6. UPDATE APPOINTMENT BASED ON EVENT
    let updateData: any = {
      updatedAt: new Date(),
    };

    if (event === "started") {
      // Validate call hasn't already started
      if (appointment.videoCallIsActive) {
        return NextResponse.json(
          { error: "Invalid operation", message: "Video call is already active" },
          { status: 400, headers: getCorsHeaders() }
        );
      }

      updateData = {
        ...updateData,
        videoCallStartedAt: eventTimestamp,
        videoCallIsActive: true,
        status: "in_progress", // Change status to in-progress
      };
    } else if (event === "ended") {
      // Validate call has started
      if (!appointment.videoCallStartedAt) {
        return NextResponse.json(
          { error: "Invalid operation", message: "Video call has not been started yet" },
          { status: 400, headers: getCorsHeaders() }
        );
      }

      // Validate call is currently active
      if (!appointment.videoCallIsActive) {
        return NextResponse.json(
          { error: "Invalid operation", message: "Video call is not currently active" },
          { status: 400, headers: getCorsHeaders() }
        );
      }

      // Calculate duration in minutes
      const durationMs = eventTimestamp.getTime() - appointment.videoCallStartedAt.getTime();
      const durationMinutes = Math.round(durationMs / (1000 * 60));

      updateData = {
        ...updateData,
        videoCallEndedAt: eventTimestamp,
        videoCallIsActive: false,
        videoCallDuration: durationMinutes,
        // Status remains "in_progress" - doctor manually completes later
      };
    }

    // 7. UPDATE APPOINTMENT
    const updatedAppointment = await db.appointment.update({
      where: { id: appointmentId },
      data: updateData,
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

    // 8. RESPONSE
    return NextResponse.json(
      {
        message: `Video call ${event === "started" ? "started" : "ended"} successfully`,
        data: {
          id: updatedAppointment.id,
          status: updatedAppointment.status,
          appointmentType: updatedAppointment.appointmentType,
          scheduledAt: updatedAppointment.scheduledAt,
          videoCallStartedAt: updatedAppointment.videoCallStartedAt,
          videoCallEndedAt: updatedAppointment.videoCallEndedAt,
          videoCallIsActive: updatedAppointment.videoCallIsActive,
          videoCallDuration: updatedAppointment.videoCallDuration,
          doctor: updatedAppointment.doctor,
          patient: updatedAppointment.patient,
          branch: updatedAppointment.branch,
        },
      },
      { status: 200, headers: getCorsHeaders() }
    );
  } catch (error) {
    console.error("Error updating video call status:", error);
    const status = getErrorStatus(error, 500);
    return NextResponse.json(
      {
        error: "Internal Server Error",
        message: "Failed to update video call status",
      },
      { status, headers: getCorsHeaders() }
    );
  }
}
