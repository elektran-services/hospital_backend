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

const assignBranchSchema = z.object({
  branchId: z.string().uuid().nullable(),
});

/**
 * PUT /api/v1/managers/:managerId/assign-branch
 * Assign or reassign a Branch Manager to a branch
 * Can set branchId to null to unassign a manager
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
    const parsed = assignBranchSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400, headers: getCorsHeaders() }
      );
    }

    // Check if manager exists
    const manager = await db.user.findFirst({
      where: {
        id: managerId,
        hospitalId: ctx!.hospitalId,
        role: "BRANCH_MANAGER",
      },
      include: {
        branch: {
          select: {
            id: true,
            name: true,
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

    // If assigning to a branch (not null)
    if (parsed.data.branchId) {
      // Verify branch exists and belongs to hospital
      const branch = await db.branch.findFirst({
        where: {
          id: parsed.data.branchId,
          hospitalId: ctx!.hospitalId,
          deletedAt: null,
        },
      });

      if (!branch) {
        return NextResponse.json(
          { error: "Branch not found" },
          { status: 404, headers: getCorsHeaders() }
        );
      }

      // Check if branch already has another active manager
      const existingManager = await db.user.findFirst({
        where: {
          branchId: parsed.data.branchId,
          role: "BRANCH_MANAGER",
          status: { not: "SUSPENDED" },
          id: { not: managerId }, // Exclude current manager
        },
      });

      if (existingManager) {
        return NextResponse.json(
          {
            error: "Branch already has an assigned manager",
            details: {
              managerId: existingManager.id,
              managerName: existingManager.fullName,
              managerEmail: existingManager.email,
            },
          },
          { status: 409, headers: getCorsHeaders() }
        );
      }
    }

    // Update manager's branch assignment
    const updatedManager = await db.user.update({
      where: { id: managerId },
      data: {
        branchId: parsed.data.branchId,
      },
      include: {
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

    const message = parsed.data.branchId
      ? manager.branchId
        ? `Manager reassigned from "${manager.branch?.name}" to "${updatedManager.branch?.name}"`
        : `Manager assigned to branch "${updatedManager.branch?.name}"`
      : "Manager unassigned from branch";

    return NextResponse.json(
      {
        message,
        manager: updatedManager,
        previousBranch: manager.branch,
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
