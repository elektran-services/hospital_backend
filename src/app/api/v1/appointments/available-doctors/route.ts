import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma, DayOfWeek } from "@prisma/client";
import { db } from "@/lib/db";
import { getAuthContext, requireRole } from "@/lib/api-context";
import { getCorsHeaders, handleCorsOptions } from "@/lib/cors";
import { getErrorStatus } from "@/lib/http-error";

// Handle CORS preflight
export async function OPTIONS() {
  return handleCorsOptions();
}

const querySchema = z.object({
  branchId: z.string().uuid("Branch ID must be a valid UUID"),
  appointmentDate: z.string().date("Appointment date must be in YYYY-MM-DD format"),
  slotDuration: z.coerce.number().int().min(15).max(480).default(30), // 15 min to 8 hours
});

/**
 * Generates 30-min slots between start and end time
 */
function generateTimeSlots(startTime: string, endTime: string, slotDuration: number = 30): string[] {
  const slots: string[] = [];
  const [startHour, startMin] = startTime.split(":").map(Number);
  const [endHour, endMin] = endTime.split(":").map(Number);

  let currentMins = startHour * 60 + startMin;
  const endMins = endHour * 60 + endMin;

  while (currentMins + slotDuration <= endMins) {
    const hour = Math.floor(currentMins / 60);
    const min = currentMins % 60;
    const nextHour = Math.floor((currentMins + slotDuration) / 60);
    const nextMin = (currentMins + slotDuration) % 60;

    slots.push(
      `${String(hour).padStart(2, "0")}:${String(min).padStart(2, "0")}-${String(nextHour).padStart(2, "0")}:${String(nextMin).padStart(2, "0")}`
    );

    currentMins += slotDuration;
  }

  return slots;
}

/**
 * Get day of week name from date in West Central African Time (UTC+1)
 */
function getDayOfWeek(dateStr: string): DayOfWeek {
  const date = new Date(dateStr + "T00:00:00Z");
  // West Central African Time is UTC+1
  const wactTime = new Date(date.getTime() + (1 * 60 * 60 * 1000));
  const days: DayOfWeek[] = [DayOfWeek.SUNDAY, DayOfWeek.MONDAY, DayOfWeek.TUESDAY, DayOfWeek.WEDNESDAY, DayOfWeek.THURSDAY, DayOfWeek.FRIDAY, DayOfWeek.SATURDAY];
  return days[wactTime.getUTCDay()];
}

/**
 * GET /api/v1/appointments/available-doctors
 * Get available doctors for a specific date in a branch
 */
export async function GET(req: NextRequest) {
  try {
    const authContext = getAuthContext(req);
    requireRole(authContext, ["PATIENT"]);

    const parsed = querySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400, headers: getCorsHeaders() }
      );
    }

    const { branchId, appointmentDate, slotDuration } = parsed.data;

    // Verify branch exists and belongs to patient's hospital
    const branch = await db.branch.findFirst({
      where: {
        id: branchId,
        hospitalId: authContext!.hospitalId,
      },
    });

    if (!branch) {
      return NextResponse.json(
        { error: "Branch not found" },
        { status: 404, headers: getCorsHeaders() }
      );
    }

    const dayOfWeek = getDayOfWeek(appointmentDate);

    // Get all active doctors in the branch with their availability for this day
    const doctors = await db.user.findMany({
      where: {
        branchId,
        role: "DOCTOR",
        status: "ACTIVE",
      },
      select: {
        id: true,
        fullName: true,
        doctorProfile: {
          select: {
            specialty: true,
          },
        },
        doctorAvailability: {
          where: {
            dayOfWeek,
            isActive: true,
          },
          select: {
            startTime: true,
            endTime: true,
          },
        },
      },
    });

    // Get all appointments for this date to exclude booked slots
    const appointmentsOnDate = await db.appointment.findMany({
      where: {
        branchId,
        scheduledAt: {
          gte: new Date(appointmentDate + "T00:00:00"),
          lte: new Date(appointmentDate + "T23:59:59"),
        },
        status: {
          in: ["requested", "confirmed"],
        },
      },
      select: {
        doctorId: true,
        scheduledAt: true,
      },
    });

    // Build available doctors with slots
    const availableDoctors = doctors
      .filter((doctor) => doctor.doctorAvailability.length > 0)
      .map((doctor) => {
        const availability = doctor.doctorAvailability[0];
        const allSlots = generateTimeSlots(availability.startTime, availability.endTime, slotDuration);

        // Get doctor's booked slots for this date
        const bookedSlots = appointmentsOnDate
          .filter((apt) => apt.doctorId === doctor.id)
          .map((apt) => {
            const time = apt.scheduledAt;
            const hour = time.getUTCHours();
            const min = time.getUTCMinutes();
            return `${String(hour).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
          });

        // Filter out booked slots
        const availableSlots = allSlots.filter((slot) => {
          const startTime = slot.split("-")[0];
          return !bookedSlots.includes(startTime);
        });

        return {
          doctorId: doctor.id,
          doctorName: doctor.fullName,
          specialty: doctor.doctorProfile?.specialty || "General",
          availableSlots: availableSlots.length > 0 ? availableSlots : [],
          totalAvailableSlots: availableSlots.length,
        };
      });

    return NextResponse.json(
      {
        date: appointmentDate,
        dayOfWeek,
        branchId,
        slotDuration,
        availableDoctors: availableDoctors.filter((d) => d.availableSlots.length > 0),
        totalAvailableDoctors: availableDoctors.filter((d) => d.availableSlots.length > 0).length,
      },
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
