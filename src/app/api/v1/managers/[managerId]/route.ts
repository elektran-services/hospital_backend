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

const updateManagerSchema = z.object({
  fullName: z.string().min(2).optional(),
  status: z.enum(["ACTIVE", "PENDING", "SUSPENDED"]).optional(),
});

/**
 * GET /api/v1/managers/:managerId
 * Get details of a specific Branch Manager
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ managerId: string }> }
) {
  try {
    const { managerId } = await params;
    const ctx = getAuthContext(req);
    requireRole(ctx, ["SYSTEM_ADMIN", "SUPER_ADMIN"]);

    const manager = await db.user.findFirst({
      where: {
        id: managerId,
        hospitalId: ctx!.hospitalId,
        role: "BRANCH_MANAGER",
      },
      select: {
        id: true,
        hospitalId: true,
        branchId: true,
        fullName: true,
        email: true,
        status: true,
        emailVerifiedAt: true,
        createdAt: true,
        updatedAt: true,
        branch: {
          select: {
            id: true,
            name: true,
            address: true,
            city: true,
            state: true,
            country: true,
            phone: true,
            email: true,
            isHeadBranch: true,
          },
        },
      },
    });

    if (!manager) {
      return NextResponse.json(
        { error: "Manager not found" },
        { status: 404, headers: getCorsHeaders() }
      );
    }

    return NextResponse.json(manager, { headers: getCorsHeaders() });
  } catch (error) {
    const status = getErrorStatus(error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status, headers: getCorsHeaders() }
    );
  }
}

/**
 * PUT /api/v1/managers/:managerId
 * Update Branch Manager details (not branch assignment - use /assign-branch for that)
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ managerId: string }> }
) {
  try {
    const { managerId } = await params;
    const ctx = getAuthContext(req);
    requireRole(ctx, ["SYSTEM_ADMIN", "SUPER_ADMIN"]);

    const body = await req.json().catch(() => null);
    const parsed = updateManagerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400, headers: getCorsHeaders() }
      );
    }

    // Check if manager exists
    const existingManager = await db.user.findFirst({
      where: {
        id: managerId,
        hospitalId: ctx!.hospitalId,
        role: "BRANCH_MANAGER",
      },
    });

    if (!existingManager) {
      return NextResponse.json(
        { error: "Manager not found" },
        { status: 404, headers: getCorsHeaders() }
      );
    }

    // Build update data
    const updateData: any = {};
    if (parsed.data.fullName !== undefined) updateData.fullName = parsed.data.fullName;
    if (parsed.data.status !== undefined) updateData.status = parsed.data.status;

    const updatedManager = await db.user.update({
      where: { id: managerId },
      data: updateData,
      include: {
        branch: {
          select: {
            id: true,
            name: true,
            address: true,
            city: true,
            state: true,
            phone: true,
            email: true,
            isHeadBranch: true,
          },
        },
      },
    });

    return NextResponse.json(updatedManager, { headers: getCorsHeaders() });
  } catch (error) {
    const status = getErrorStatus(error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status, headers: getCorsHeaders() }
    );
  }
}

/**
 * DELETE /api/v1/managers/:managerId
 * Delete (soft delete) a Branch Manager
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ managerId: string }> }
) {
  try {
    const { managerId } = await params;
    const ctx = getAuthContext(req);
    requireRole(ctx, ["SYSTEM_ADMIN", "SUPER_ADMIN"]);

    const manager = await db.user.findFirst({
      where: {
        id: managerId,
        hospitalId: ctx!.hospitalId,
        role: "BRANCH_MANAGER",
      },
    });

    if (!manager) {
      return NextResponse.json(
        { error: "Manager not found" },
        { status: 404, headers: getCorsHeaders() }
      );
    }

    // Soft delete by setting deletedAt timestamp
    await db.user.update({
      where: { id: managerId },
      data: {
        deletedAt: new Date(),
        status: "SUSPENDED",
      },
    });

    return NextResponse.json(
      { message: "Manager deleted successfully" },
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
