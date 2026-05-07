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

const availabilityItemSchema = z.object({
  dayOfWeek: z.enum([
    "MONDAY",
    "TUESDAY",
    "WEDNESDAY",
    "THURSDAY",
    "FRIDAY",
    "SATURDAY",
    "SUNDAY",
  ]),
  startTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "Start time must be in HH:mm format"),
  endTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "End time must be in HH:mm format"),
});

const createAvailabilitySchema = z.object({
  availabilities: z.array(availabilityItemSchema).min(1, "At least one day must be selected"),
});

/**
 * GET /api/v1/doctors/:doctorId/availability
 * Get all availability schedules for a doctor
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ doctorId: string }> }
) {
  try {
    const { doctorId } = await params;
    const authContext = getAuthContext(req);
    requireRole(authContext, ["SUPER_ADMIN", "SYSTEM_ADMIN", "BRANCH_MANAGER"]);

    const doctor = await db.user.findFirst({
      where: {
        id: doctorId,
        hospitalId: authContext!.hospitalId,
        role: "DOCTOR",
      },
    });

    if (!doctor) {
      return NextResponse.json(
        { error: "Doctor not found" },
        { status: 404, headers: getCorsHeaders() }
      );
    }

    const availabilities = await db.doctorAvailability.findMany({
      where: { doctorId },
      orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
    });

    return NextResponse.json(
      { doctorId, availabilities },
      { headers: getCorsHeaders() }
    );
  } catch (error) {
    const status = getErrorStatus(error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status, headers: getCorsHeaders() }
    );
  }
}

/**
 * POST /api/v1/doctors/:doctorId/availability
 * Add availability schedule for a doctor
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ doctorId: string }> }
) {
  try {
    const { doctorId } = await params;
    const authContext = getAuthContext(req);
    requireRole(authContext, ["SUPER_ADMIN", "SYSTEM_ADMIN", "BRANCH_MANAGER"]);

    const doctor = await db.user.findFirst({
      where: {
        id: doctorId,
        hospitalId: authContext!.hospitalId,
        role: "DOCTOR",
      },
    });

    if (!doctor) {
      return NextResponse.json(
        { error: "Doctor not found" },
        { status: 404, headers: getCorsHeaders() }
      );
    }

    const body = await req.json().catch(() => null);
    const parsed = createAvailabilitySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400, headers: getCorsHeaders() }
      );
    }

    // Validate each availability entry
    const validationErrors: Array<{ dayOfWeek: string; error: string }> = [];
    const daysToProcess: typeof parsed.data.availabilities = [];

    for (const availability of parsed.data.availabilities) {
      const [startHour, startMin] = availability.startTime.split(":").map(Number);
      const [endHour, endMin] = availability.endTime.split(":").map(Number);

      // Validate time range
      if (
        startHour < 0 ||
        startHour > 23 ||
        startMin < 0 ||
        startMin > 59 ||
        endHour < 0 ||
        endHour > 23 ||
        endMin < 0 ||
        endMin > 59
      ) {
        validationErrors.push({
          dayOfWeek: availability.dayOfWeek,
          error: "Invalid time format",
        });
        continue;
      }

      const startTotalMins = startHour * 60 + startMin;
      const endTotalMins = endHour * 60 + endMin;

      if (startTotalMins >= endTotalMins) {
        validationErrors.push({
          dayOfWeek: availability.dayOfWeek,
          error: "Start time must be before end time",
        });
        continue;
      }

      daysToProcess.push(availability);
    }

    if (validationErrors.length > 0) {
      return NextResponse.json(
        { error: "Validation failed for some days", details: validationErrors },
        { status: 400, headers: getCorsHeaders() }
      );
    }

    // Check if availability already exists for any of the selected days
    const daysToCheck = daysToProcess.map((a) => a.dayOfWeek);
    const existingDays = await db.doctorAvailability.findMany({
      where: {
        doctorId,
        dayOfWeek: {
          in: daysToCheck,
        },
      },
    });

    if (existingDays.length > 0) {
      const conflictingDays = existingDays.map((a) => a.dayOfWeek);
      return NextResponse.json(
        {
          error: "Availability already exists for some of the selected days",
          details: { conflictingDays },
        },
        { status: 409, headers: getCorsHeaders() }
      );
    }

    // Create availability for all selected days with their respective times
    const availabilities = await Promise.all(
      daysToProcess.map((day) =>
        db.doctorAvailability.create({
          data: {
            doctorId,
            dayOfWeek: day.dayOfWeek,
            startTime: day.startTime,
            endTime: day.endTime,
            isActive: true,
          },
        })
      )
    );

    return NextResponse.json(availabilities, {
      status: 201,
      headers: getCorsHeaders(),
    });
  } catch (error) {
    const status = getErrorStatus(error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status, headers: getCorsHeaders() }
    );
  }
}
