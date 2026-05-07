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
  appointmentDate: z.string().date("Appointment date must be in YYYY-MM-DD format"),
  slotDuration: z.coerce.number().int().min(15).max(480).default(30),
});

/**
 * Generates time slots between start and end time
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
 * GET /api/v1/doctors/:doctorId/availability-slots
 * Get available time slots for a doctor on a specific date
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ doctorId: string }> }
) {
  try {
    const { doctorId } = await params;

    // Parse and validate query parameters
    const searchParams = Object.fromEntries(req.nextUrl.searchParams);
    const { appointmentDate, slotDuration } = querySchema.parse(searchParams);

    // Get auth context
    const authContext = await getAuthContext(req);
    await requireRole(authContext, ["SYSTEM_ADMIN", "BRANCH_MANAGER", "DOCTOR"]);

    // Get doctor with availability
    const doctor = await db.user.findFirst({
      where: {
        id: doctorId,
        hospitalId: authContext!.hospitalId,
        role: "DOCTOR",
        status: "ACTIVE",
      },
      select: {
        id: true,
        fullName: true,
        branchId: true,
        doctorProfile: {
          select: {
            specialty: true,
          },
        },
        doctorAvailability: true,
      },
    });

    if (!doctor) {
      return NextResponse.json(
        { error: "Doctor not found or inactive" },
        { status: 404, headers: getCorsHeaders() }
      );
    }

    const dayOfWeek = getDayOfWeek(appointmentDate);

    // Get availability for this day
    const availability = doctor.doctorAvailability?.find(
      (avail) => avail.dayOfWeek === dayOfWeek && avail.isActive
    );

    if (!availability) {
      return NextResponse.json(
        {
          doctorId: doctorId,
          doctorName: doctor.fullName,
          date: appointmentDate,
          dayOfWeek,
          availableSlots: [],
          message: "Doctor not available on this day",
        },
        { headers: getCorsHeaders() }
      );
    }

    // Generate all possible slots
    const allSlots = generateTimeSlots(availability.startTime, availability.endTime, slotDuration);

    // Get booked appointments for this doctor on this date
    const bookedAppointments = await db.appointment.findMany({
      where: {
        doctorId: doctorId,
        scheduledAt: {
          gte: new Date(appointmentDate + "T00:00:00"),
          lte: new Date(appointmentDate + "T23:59:59"),
        },
        status: {
          in: ["requested", "confirmed"],
        },
      },
      select: {
        scheduledAt: true,
      },
    });

    // Get booked slot times
    const bookedSlots = bookedAppointments.map((apt) => {
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

    return NextResponse.json(
      {
        doctorId: doctorId,
        doctorName: doctor.fullName,
        specialty: doctor.doctorProfile?.specialty || "General",
        date: appointmentDate,
        dayOfWeek,
        slotDuration,
        workingHours: {
          startTime: availability.startTime,
          endTime: availability.endTime,
        },
        availableSlots,
        totalAvailableSlots: availableSlots.length,
        bookedSlots: bookedSlots.length,
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
