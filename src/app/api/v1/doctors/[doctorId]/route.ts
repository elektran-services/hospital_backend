import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { UserRole } from "@prisma/client";
import { db } from "@/lib/db";
import { getAuthContext, requireAuth, requireRole } from "@/lib/api-context";
import { getErrorStatus } from "@/lib/http-error";

const updateSchema = z.object({
  fullName: z.string().min(2).optional(),
  status: z.enum(["ACTIVE", "PENDING", "SUSPENDED"]).optional(),
  specialty: z.string().optional(),
  license: z.string().optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ doctorId: string }> }
) {
  const ctx = getAuthContext(req);
  try {
    requireAuth(ctx);

    const { doctorId } = await params;

    const baseWhere: { id: string; hospitalId: string; role: UserRole; branchId?: string } = {
      id: doctorId,
      hospitalId: ctx!.hospitalId,
      role: "DOCTOR" as UserRole,
    };

    // Branch managers can only view doctors in their branch
    if (ctx?.role === "BRANCH_MANAGER" && ctx.branchId) {
      baseWhere.branchId = ctx.branchId;
    }

    const doctor = await db.user.findFirst({
      where: baseWhere,
      include: {
        doctorProfile: true,
        branch: {
          select: {
            id: true,
            name: true,
            address: true,
            city: true,
            state: true,
            phone: true,
            email: true,
          },
        },
      },
    });

    if (!doctor) {
      return NextResponse.json({ error: "Doctor not found" }, { status: 404 });
    }

    return NextResponse.json(doctor);
  } catch (error) {
    const status = getErrorStatus(error);
    return NextResponse.json({ error: (error as Error).message }, { status });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ doctorId: string }> }
) {
  const ctx = getAuthContext(req);
  try {
    requireRole(ctx, ["SYSTEM_ADMIN", "SUPER_ADMIN", "BRANCH_MANAGER"]);

    const { doctorId } = await params;
    const body = await req.json().catch(() => null);
    const parsed = updateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    // Check if doctor exists and belongs to the hospital
    const baseWhere: { id: string; hospitalId: string; role: UserRole; branchId?: string } = {
      id: doctorId,
      hospitalId: ctx!.hospitalId,
      role: "DOCTOR" as UserRole,
    };

    // Branch managers can only update doctors in their branch
    if (ctx?.role === "BRANCH_MANAGER" && ctx.branchId) {
      baseWhere.branchId = ctx.branchId;
    }

    const existingDoctor = await db.user.findFirst({
      where: baseWhere,
      include: { doctorProfile: true },
    });

    if (!existingDoctor) {
      return NextResponse.json({ error: "Doctor not found" }, { status: 404 });
    }

    // Separate user fields from profile fields
    const { specialty, license, ...userFields } = parsed.data;

    const result = await db.$transaction(async (tx) => {
      // Update user fields if provided
      const updatedUser = await tx.user.update({
        where: { id: doctorId },
        data: userFields,
        include: { doctorProfile: true },
      });

      // Update doctor profile if specialty or license is provided
      if (specialty !== undefined || license !== undefined) {
        const profileData: { specialty?: string; license?: string } = {};
        if (specialty !== undefined) profileData.specialty = specialty;
        if (license !== undefined) profileData.license = license;

        await tx.doctorProfile.update({
          where: { userId: doctorId },
          data: profileData,
        });

        // Fetch updated user with profile
        return await tx.user.findUnique({
          where: { id: doctorId },
          include: { doctorProfile: true },
        });
      }

      return updatedUser;
    });

    return NextResponse.json(result);
  } catch (error) {
    const status = getErrorStatus(error);
    return NextResponse.json({ error: (error as Error).message }, { status });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ doctorId: string }> }
) {
  const ctx = getAuthContext(req);
  try {
    requireRole(ctx, ["SYSTEM_ADMIN", "SUPER_ADMIN", "BRANCH_MANAGER"]);

    const { doctorId } = await params;

    // Check if doctor exists and belongs to the hospital
    const baseWhere: { id: string; hospitalId: string; role: UserRole; branchId?: string } = {
      id: doctorId,
      hospitalId: ctx!.hospitalId,
      role: "DOCTOR" as UserRole,
    };

    // Branch managers can only delete doctors in their branch
    if (ctx?.role === "BRANCH_MANAGER" && ctx.branchId) {
      baseWhere.branchId = ctx.branchId;
    }

    const doctor = await db.user.findFirst({
      where: baseWhere,
    });

    if (!doctor) {
      return NextResponse.json({ error: "Doctor not found" }, { status: 404 });
    }

    // Soft delete by setting deletedAt
    await db.user.update({
      where: { id: doctorId },
      data: { deletedAt: new Date() },
    });

    return NextResponse.json({ message: "Doctor deleted successfully" });
  } catch (error) {
    const status = getErrorStatus(error);
    return NextResponse.json({ error: (error as Error).message }, { status });
  }
}
