import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma, DayOfWeek } from "@prisma/client";
import { db } from "@/lib/db";
import { getAuthContext, requireAuth, requireRole } from "@/lib/api-context";
import { getCorsHeaders, handleCorsOptions } from "@/lib/cors";
import { getErrorStatus } from "@/lib/http-error";

// Handle CORS preflight
export async function OPTIONS() {
  return handleCorsOptions();
}

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

// Schema for admin creating appointments (requires doctorId)
const adminCreateSchema = z.object({
  doctorId: z.string().uuid(),
  patientId: z.string().uuid(),
  branchId: z.string().uuid(),
  appointmentType: z.enum(["virtual", "physical"]),
  appointmentDate: z.string().date("Appointment date must be in YYYY-MM-DD format"),
  appointmentTime: z.string().regex(/^\d{2}:\d{2}$/, "Appointment time must be in HH:mm format"),
  note: z.string().optional(),
});

// Schema for patients booking appointments (no doctorId required)
const patientCreateSchema = z.object({
  branchId: z.string().uuid(),
  doctorId: z.string().uuid().optional(),
  appointmentDate: z.string().date("Appointment date must be in YYYY-MM-DD format"),
  appointmentTime: z.string().regex(/^\d{2}:\d{2}$/, "Appointment time must be in HH:mm format"),
  appointmentType: z.enum(["virtual", "physical"]),
  note: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const ctx = getAuthContext(req);
  try {
    requireAuth(ctx);
    const { page, pageSize } = paginationSchema.parse(Object.fromEntries(req.nextUrl.searchParams));

    const baseWhere: Prisma.AppointmentWhereInput = { hospitalId: ctx!.hospitalId };

    if (ctx?.role === "BRANCH_MANAGER" && ctx.branchId) {
      baseWhere.branchId = ctx.branchId;
    }
    if (ctx?.role === "DOCTOR") {
      baseWhere.doctorId = ctx.userId;
    }
    if (ctx?.role === "PATIENT") {
      baseWhere.patientId = ctx.userId;
    }

    const [items, total] = await Promise.all([
      db.appointment.findMany({
        where: baseWhere,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          doctor: {
            select: {
              id: true,
              fullName: true,
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
        },
      }),
      db.appointment.count({ where: baseWhere }),
    ]);

    return NextResponse.json(
      { items, total, page, pageSize },
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

export async function POST(req: NextRequest) {
  const ctx = getAuthContext(req);
  try {
    const body = await req.json().catch(() => null);

    if (!body) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400, headers: getCorsHeaders() }
      );
    }

    // Determine if this is a patient booking or admin creation
    const isPatientFlow = ctx?.role === "PATIENT" && body.appointmentDate && body.appointmentTime;

    if (isPatientFlow) {
      // PATIENT FLOW: Patient books appointment without specifying doctor
      requireRole(ctx, ["PATIENT"]);

      const parsed = patientCreateSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: parsed.error.flatten() },
          { status: 400, headers: getCorsHeaders() }
        );
      }

      // Verify branch exists
      const branch = await db.branch.findFirst({
        where: {
          id: parsed.data.branchId,
          hospitalId: ctx!.hospitalId,
        },
      });

      if (!branch) {
        return NextResponse.json(
          { error: "Branch not found" },
          { status: 404, headers: getCorsHeaders() }
        );
      }

      // If doctorId is provided, verify doctor exists and is available
      let doctorId = parsed.data.doctorId;

      if (doctorId) {
        const doctor = await db.user.findFirst({
          where: {
            id: doctorId,
            hospitalId: ctx!.hospitalId,
            role: "DOCTOR",
            status: "ACTIVE",
          },
        });

        if (!doctor) {
          return NextResponse.json(
            { error: "Doctor not found or inactive" },
            { status: 404, headers: getCorsHeaders() }
          );
        }
      } else {
        // Auto-assign first available doctor
        const dayOfWeek = new Date(parsed.data.appointmentDate + "T00:00:00")
          .toLocaleDateString("en-US", { weekday: "long" })
          .toUpperCase() as DayOfWeek;

        const availableDoctors = await db.user.findMany({
          where: {
            branchId: parsed.data.branchId,
            role: "DOCTOR",
            status: "ACTIVE",
            doctorAvailability: {
              some: {
                dayOfWeek,
                isActive: true,
              },
            },
          },
          select: { id: true },
        });

        if (availableDoctors.length === 0) {
          return NextResponse.json(
            { error: "No available doctors for this date" },
            { status: 409, headers: getCorsHeaders() }
          );
        }

        doctorId = availableDoctors[0].id;
      }

      // Combine date and time to create scheduledAt
      const scheduledAt = new Date(`${parsed.data.appointmentDate}T${parsed.data.appointmentTime}:00Z`);

      // Check if slot is already booked
      const existingAppointment = await db.appointment.findFirst({
        where: {
          doctorId,
          branchId: parsed.data.branchId,
          scheduledAt,
          status: {
            in: ["requested", "confirmed"],
          },
        },
      });

      if (existingAppointment) {
        return NextResponse.json(
          { error: "This time slot is already booked" },
          { status: 409, headers: getCorsHeaders() }
        );
      }

      const doctor = await db.user.findUnique({
        where: { id: doctorId },
        select: {
          fullName: true,
          doctorProfile: { select: { specialty: true } },
        },
      });

      const appointment = await db.appointment.create({
        data: {
          hospitalId: ctx!.hospitalId,
          branchId: parsed.data.branchId,
          doctorId,
          patientId: ctx!.userId,
          appointmentType: parsed.data.appointmentType,
          scheduledAt,
          status: "requested",
          createdBy: ctx!.userId,
        },
      });

      return NextResponse.json(
        {
          message: "Connecting ...",
          data: {
            appointmentId: appointment.id,
            doctorId: appointment.doctorId,
            doctorName: doctor?.fullName,
            patientId: appointment.patientId,
            branchId: appointment.branchId,
            appointmentType: appointment.appointmentType,
            scheduledAt: appointment.scheduledAt,
            status: appointment.status,
          },
        },
        { status: 201, headers: getCorsHeaders() }
      );
    } else {
      // ADMIN FLOW: Admin creates appointment with explicit doctorId
      requireRole(ctx, ["SYSTEM_ADMIN", "SUPER_ADMIN", "BRANCH_MANAGER"]);

      const parsed = adminCreateSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: parsed.error.flatten() },
          { status: 400, headers: getCorsHeaders() }
        );
      }

      if (ctx?.role === "BRANCH_MANAGER" && ctx.branchId !== parsed.data.branchId) {
        return NextResponse.json(
          { error: "Forbidden: branch scope" },
          { status: 403, headers: getCorsHeaders() }
        );
      }

      // Validate doctor/patient belong to same hospital and branch
      const [doctor, patient, branch] = await Promise.all([
        db.user.findFirst({
          where: {
            id: parsed.data.doctorId,
            hospitalId: ctx!.hospitalId,
            role: "DOCTOR",
          },
        }),
        db.user.findFirst({
          where: {
            id: parsed.data.patientId,
            hospitalId: ctx!.hospitalId,
            role: "PATIENT",
          },
        }),
        db.branch.findFirst({
          where: {
            id: parsed.data.branchId,
            hospitalId: ctx!.hospitalId,
          },
        }),
      ]);

      if (!doctor)
        return NextResponse.json(
          { error: "Doctor not found" },
          { status: 404, headers: getCorsHeaders() }
        );
      if (!patient)
        return NextResponse.json(
          { error: "Patient not found" },
          { status: 404, headers: getCorsHeaders() }
        );
      if (!branch)
        return NextResponse.json(
          { error: "Branch not found" },
          { status: 404, headers: getCorsHeaders() }
        );

      // Combine date and time to create scheduledAt
      const scheduledAt = new Date(`${parsed.data.appointmentDate}T${parsed.data.appointmentTime}:00Z`);

      const appointment = await db.appointment.create({
        data: {
          hospitalId: ctx!.hospitalId,
          branchId: parsed.data.branchId,
          doctorId: parsed.data.doctorId,
          patientId: parsed.data.patientId,
          appointmentType: parsed.data.appointmentType,
          scheduledAt,
          status: "requested",
          createdBy: ctx!.userId,
          note: parsed.data.note,
        },
      });

      return NextResponse.json(appointment, {
        status: 201,
        headers: getCorsHeaders(),
      });
    }
  } catch (error) {
    const status = getErrorStatus(error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status, headers: getCorsHeaders() }
    );
  }
}

