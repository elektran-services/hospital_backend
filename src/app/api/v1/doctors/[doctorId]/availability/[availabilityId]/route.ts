import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getAuthContext, requireRole } from "@/lib/api-context";
import { getCorsHeaders, handleCorsOptions } from "@/lib/cors";
import { getErrorStatus } from "@/lib/http-error";

export async function OPTIONS() {
  return handleCorsOptions();
}

const updateAvailabilitySchema = z.object({
  startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  endTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  isActive: z.boolean().optional(),
});

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ doctorId: string; availabilityId: string }> }
) {
  try {
    const { doctorId, availabilityId } = await params;
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

    const availability = await db.doctorAvailability.findUnique({
      where: { id: availabilityId },
    });

    if (!availability || availability.doctorId !== doctorId) {
      return NextResponse.json(
        { error: "Availability not found" },
        { status: 404, headers: getCorsHeaders() }
      );
    }

    const body = await req.json().catch(() => null);
    const parsed = updateAvailabilitySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400, headers: getCorsHeaders() }
      );
    }

    const startTime = parsed.data.startTime || availability.startTime;
    const endTime = parsed.data.endTime || availability.endTime;

    const [startHour, startMin] = startTime.split(":").map(Number);
    const [endHour, endMin] = endTime.split(":").map(Number);

    if (startHour < 0 || startHour > 23 || startMin < 0 || startMin > 59 || endHour < 0 || endHour > 23 || endMin < 0 || endMin > 59) {
      return NextResponse.json(
        { error: "Invalid time format" },
        { status: 400, headers: getCorsHeaders() }
      );
    }

    const startTotalMins = startHour * 60 + startMin;
    const endTotalMins = endHour * 60 + endMin;

    if (startTotalMins >= endTotalMins) {
      return NextResponse.json(
        { error: "Start time must be before end time" },
        { status: 400, headers: getCorsHeaders() }
      );
    }

    const updated = await db.doctorAvailability.update({
      where: { id: availabilityId },
      data: {
        startTime,
        endTime,
        isActive: parsed.data.isActive !== undefined ? parsed.data.isActive : availability.isActive,
      },
    });

    return NextResponse.json(updated, { headers: getCorsHeaders() });
  } catch (error) {
    const status = getErrorStatus(error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status, headers: getCorsHeaders() }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ doctorId: string; availabilityId: string }> }
) {
  try {
    const { doctorId, availabilityId } = await params;
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

    const availability = await db.doctorAvailability.findUnique({
      where: { id: availabilityId },
    });

    if (!availability || availability.doctorId !== doctorId) {
      return NextResponse.json(
        { error: "Availability not found" },
        { status: 404, headers: getCorsHeaders() }
      );
    }

    await db.doctorAvailability.delete({
      where: { id: availabilityId },
    });

    return NextResponse.json(
      { message: "Availability deleted successfully" },
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
