import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getAuthContext, requireRole } from "@/lib/api-context";
import { getCorsHeaders, handleCorsOptions } from "@/lib/cors";
import { getErrorStatus } from "@/lib/http-error";
import { getFullUrl } from "@/lib/file-upload";

// Handle CORS preflight
export async function OPTIONS() {
  return handleCorsOptions();
}

const updateBranchSchema = z.object({
  name: z.string().min(2).optional(),
  address: z.string().min(2).optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  phone: z.string().min(2).optional(),
  email: z.string().email().optional(),
});

/**
 * GET /api/v1/branches/my-branch
 * Get the branch details for the currently logged-in Branch Manager
 */
export async function GET(req: NextRequest) {
  try {
    const ctx = getAuthContext(req);
    requireRole(ctx, ["BRANCH_MANAGER"]);

    if (!ctx?.branchId) {
      return NextResponse.json(
        { error: "No branch assigned to this manager" },
        { status: 404, headers: getCorsHeaders() }
      );
    }

    const branch = await db.branch.findFirst({
      where: {
        id: ctx.branchId,
        hospitalId: ctx.hospitalId,
        deletedAt: null,
      },
      include: {
        hospital: {
          select: {
            id: true,
            name: true,
            logo: true,
          },
        },
        _count: {
          select: {
            users: true,
            appointments: true,
          },
        },
      },
    });

    if (!branch) {
      return NextResponse.json(
        { error: "Branch not found" },
        { status: 404, headers: getCorsHeaders() }
      );
    }

    // Get additional statistics
    const [doctorCount, patientCount, todayAppointments] = await Promise.all([
      db.user.count({
        where: {
          branchId: ctx.branchId,
          role: "DOCTOR",
          status: "ACTIVE",
        },
      }),
      db.user.count({
        where: {
          branchId: ctx.branchId,
          role: "PATIENT",
        },
      }),
      db.appointment.count({
        where: {
          branchId: ctx.branchId,
          scheduledAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
            lte: new Date(new Date().setHours(23, 59, 59, 999)),
          },
          status: {
            in: ["requested", "confirmed"],
          },
        },
      }),
    ]);

    const response = {
      ...branch,
      hospital: branch.hospital
        ? {
            ...branch.hospital,
            logoUrl: getFullUrl(branch.hospital.logo),
          }
        : null,
      statistics: {
        totalUsers: branch._count.users,
        totalAppointments: branch._count.appointments,
        activeDoctors: doctorCount,
        totalPatients: patientCount,
        todayAppointments: todayAppointments,
      },
    };

    // Remove the _count field as we've transformed it into statistics
    const { _count, ...branchData } = response;

    return NextResponse.json(branchData, { headers: getCorsHeaders() });
  } catch (error) {
    const status = getErrorStatus(error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status, headers: getCorsHeaders() }
    );
  }
}

/**
 * PUT /api/v1/branches/my-branch
 * Update the branch details for the currently logged-in Branch Manager
 */
export async function PUT(req: NextRequest) {
  try {
    const ctx = getAuthContext(req);
    requireRole(ctx, ["BRANCH_MANAGER"]);

    if (!ctx?.branchId) {
      return NextResponse.json(
        { error: "No branch assigned to this manager" },
        { status: 404, headers: getCorsHeaders() }
      );
    }

    const body = await req.json().catch(() => null);
    const parsed = updateBranchSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400, headers: getCorsHeaders() }
      );
    }

    // Check if branch exists and belongs to manager
    const existingBranch = await db.branch.findFirst({
      where: {
        id: ctx.branchId,
        hospitalId: ctx.hospitalId,
        deletedAt: null,
      },
    });

    if (!existingBranch) {
      return NextResponse.json(
        { error: "Branch not found" },
        { status: 404, headers: getCorsHeaders() }
      );
    }

    // Update only the provided fields
    const updateData: any = {};
    if (parsed.data.name !== undefined) updateData.name = parsed.data.name;
    if (parsed.data.address !== undefined) updateData.address = parsed.data.address;
    if (parsed.data.city !== undefined) updateData.city = parsed.data.city;
    if (parsed.data.state !== undefined) updateData.state = parsed.data.state;
    if (parsed.data.country !== undefined) updateData.country = parsed.data.country;
    if (parsed.data.phone !== undefined) updateData.phone = parsed.data.phone;
    if (parsed.data.email !== undefined) updateData.email = parsed.data.email;

    const updatedBranch = await db.branch.update({
      where: { id: ctx.branchId },
      data: updateData,
      include: {
        hospital: {
          select: {
            id: true,
            name: true,
            logo: true,
          },
        },
      },
    });

    const response = {
      ...updatedBranch,
      hospital: updatedBranch.hospital
        ? {
            ...updatedBranch.hospital,
            logoUrl: getFullUrl(updatedBranch.hospital.logo),
          }
        : null,
    };

    return NextResponse.json(response, { headers: getCorsHeaders() });
  } catch (error) {
    const status = getErrorStatus(error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status, headers: getCorsHeaders() }
    );
  }
}
