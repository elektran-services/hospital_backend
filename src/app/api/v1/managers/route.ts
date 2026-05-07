import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { hash } from "bcryptjs";
import { db } from "@/lib/db";
import { getAuthContext, requireRole } from "@/lib/api-context";
import { getCorsHeaders, handleCorsOptions } from "@/lib/cors";
import { getErrorStatus } from "@/lib/http-error";

// Handle CORS preflight
export async function OPTIONS() {
  return handleCorsOptions();
}

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  branchId: z.string().uuid().optional(), // Filter by branch
  status: z.enum(["ACTIVE", "PENDING", "SUSPENDED"]).optional(),
});

const createManagerSchema = z.object({
  fullName: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  branchId: z.string().uuid().optional(), // Optional - can assign later
});

/**
 * GET /api/v1/managers
 * List all Branch Managers in the hospital
 * Super Admin can see all managers with their branch assignments
 */
export async function GET(req: NextRequest) {
  try {
    const ctx = getAuthContext(req);
    requireRole(ctx, ["SYSTEM_ADMIN", "SUPER_ADMIN"]);

    const params = Object.fromEntries(req.nextUrl.searchParams);
    const { page, pageSize, branchId, status } = paginationSchema.parse(params);

    // Build where clause
    const where: any = {
      hospitalId: ctx!.hospitalId,
      role: "BRANCH_MANAGER",
    };

    if (branchId) {
      where.branchId = branchId;
    }

    if (status) {
      where.status = status;
    }

    const [items, total] = await Promise.all([
      db.user.findMany({
        where,
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
              phone: true,
              email: true,
              isHeadBranch: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.user.count({ where }),
    ]);

    // Calculate statistics
    const [totalManagers, assignedManagers, unassignedManagers] = await Promise.all([
      db.user.count({
        where: {
          hospitalId: ctx!.hospitalId,
          role: "BRANCH_MANAGER",
        },
      }),
      db.user.count({
        where: {
          hospitalId: ctx!.hospitalId,
          role: "BRANCH_MANAGER",
          branchId: { not: null },
        },
      }),
      db.user.count({
        where: {
          hospitalId: ctx!.hospitalId,
          role: "BRANCH_MANAGER",
          branchId: null,
        },
      }),
    ]);

    return NextResponse.json(
      {
        items,
        total,
        page,
        pageSize,
        statistics: {
          totalManagers,
          assignedManagers,
          unassignedManagers,
        },
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

/**
 * POST /api/v1/managers
 * Create a new Branch Manager
 * Can be created with or without branch assignment
 */
export async function POST(req: NextRequest) {
  try {
    const ctx = getAuthContext(req);
    requireRole(ctx, ["SYSTEM_ADMIN", "SUPER_ADMIN"]);

    const body = await req.json().catch(() => null);
    const parsed = createManagerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400, headers: getCorsHeaders() }
      );
    }

    // Check if email already exists
    const existingUser = await db.user.findUnique({
      where: { email: parsed.data.email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 409, headers: getCorsHeaders() }
      );
    }

    // If branchId provided, verify it exists and belongs to hospital
    if (parsed.data.branchId) {
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

      // Check if branch already has a manager
      const existingManager = await db.user.findFirst({
        where: {
          branchId: parsed.data.branchId,
          role: "BRANCH_MANAGER",
          status: { not: "SUSPENDED" },
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

    const passwordHash = await hash(parsed.data.password, 10);

    const manager = await db.user.create({
      data: {
        hospitalId: ctx!.hospitalId,
        branchId: parsed.data.branchId ?? null,
        fullName: parsed.data.fullName,
        email: parsed.data.email,
        role: "BRANCH_MANAGER",
        status: "ACTIVE",
        passwordHash,
        emailVerifiedAt: new Date(),
      },
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

    return NextResponse.json(manager, {
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
