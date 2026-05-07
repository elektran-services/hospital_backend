import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { hash } from "bcryptjs";
import { db } from "@/lib/db";
import { getAuthContext, requireAuth, requireRole } from "@/lib/api-context";
import { getErrorStatus } from "@/lib/http-error";
import { getCorsHeaders } from "@/lib/cors";

const updateUserSchema = z.object({
  fullName: z.string().min(2).optional(),
  email: z.string().email().optional(),
  branchId: z.string().uuid().nullable().optional(),
  status: z.enum(["ACTIVE", "PENDING", "SUSPENDED"]).optional(),
  role: z.enum(["SYSTEM_ADMIN", "SUPER_ADMIN", "BRANCH_MANAGER", "DOCTOR", "PATIENT"]).optional(),
  password: z.string().min(8).optional(),
}).refine((data) => {
  // At least one field must be provided
  return Object.keys(data).length > 0;
}, {
  message: "At least one field must be provided for update",
});

const userSelect = {
  id: true,
  hospitalId: true,
  branchId: true,
  fullName: true,
  email: true,
  role: true,
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
      phone: true,
      email: true,
    },
  },
};

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: getCorsHeaders(),
  });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const ctx = getAuthContext(req);
  try {
    requireAuth(ctx);
    requireRole(ctx, ["SYSTEM_ADMIN", "SUPER_ADMIN", "BRANCH_MANAGER"]);

    const { userId } = await params;

    // Build where clause based on role
    const whereClause: any = {
      id: userId,
      hospitalId: ctx!.hospitalId,
      deletedAt: null,
    };

    // Branch managers can only view users in their branch
    if (ctx?.role === "BRANCH_MANAGER" && ctx.branchId) {
      whereClause.branchId = ctx.branchId;
    }

    const user = await db.user.findFirst({
      where: whereClause,
      select: userSelect,
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404, headers: getCorsHeaders() }
      );
    }

    return NextResponse.json(user, { headers: getCorsHeaders() });
  } catch (error) {
    const status = getErrorStatus(error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status, headers: getCorsHeaders() }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const ctx = getAuthContext(req);
  try {
    requireAuth(ctx);
    requireRole(ctx, ["SYSTEM_ADMIN", "SUPER_ADMIN"]);

    const { userId } = await params;
    const body = await req.json().catch(() => null);
    const parsed = updateUserSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400, headers: getCorsHeaders() }
      );
    }

    // Verify user exists and belongs to this hospital
    const existingUser = await db.user.findFirst({
      where: {
        id: userId,
        hospitalId: ctx!.hospitalId,
        deletedAt: null,
      },
    });

    if (!existingUser) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404, headers: getCorsHeaders() }
      );
    }

    // If updating email, check it's not already taken
    if (parsed.data.email && parsed.data.email !== existingUser.email) {
      const emailExists = await db.user.findFirst({
        where: {
          email: parsed.data.email,
          hospitalId: ctx!.hospitalId,
          id: { not: userId },
          deletedAt: null,
        },
      });

      if (emailExists) {
        return NextResponse.json(
          { error: "Email already in use" },
          { status: 400, headers: getCorsHeaders() }
        );
      }
    }

    // If updating branchId, verify branch exists and belongs to hospital
    if (parsed.data.branchId !== undefined && parsed.data.branchId !== null) {
      const branchExists = await db.branch.findFirst({
        where: {
          id: parsed.data.branchId,
          hospitalId: ctx!.hospitalId,
        },
      });

      if (!branchExists) {
        return NextResponse.json(
          { error: "Branch not found" },
          { status: 404, headers: getCorsHeaders() }
        );
      }
    }

    // Build update data
    const updateData: Record<string, any> = {};
    if (parsed.data.fullName) updateData.fullName = parsed.data.fullName;
    if (parsed.data.email) updateData.email = parsed.data.email;
    if (parsed.data.status) updateData.status = parsed.data.status;
    if (parsed.data.role) updateData.role = parsed.data.role;
    if (parsed.data.branchId !== undefined) {
      updateData.branchId = parsed.data.branchId;
    }
    if (parsed.data.password) {
      updateData.passwordHash = await hash(parsed.data.password, 10);
    }

    // Update user
    const updatedUser = await db.user.update({
      where: { id: userId },
      data: updateData,
      select: userSelect,
    });

    return NextResponse.json(updatedUser, { headers: getCorsHeaders() });
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
  { params }: { params: Promise<{ userId: string }> }
) {
  const ctx = getAuthContext(req);
  try {
    requireAuth(ctx);
    requireRole(ctx, ["SYSTEM_ADMIN", "SUPER_ADMIN"]);

    const { userId } = await params;

    // Verify user exists and belongs to this hospital
    const user = await db.user.findFirst({
      where: {
        id: userId,
        hospitalId: ctx!.hospitalId,
        deletedAt: null,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404, headers: getCorsHeaders() }
      );
    }

    // Prevent deleting yourself
    if (userId === ctx!.userId) {
      return NextResponse.json(
        { error: "Cannot delete your own account" },
        { status: 400, headers: getCorsHeaders() }
      );
    }

    // Soft delete user
    await db.user.update({
      where: { id: userId },
      data: { deletedAt: new Date() },
    });

    return NextResponse.json(
      { message: "User deleted successfully" },
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
