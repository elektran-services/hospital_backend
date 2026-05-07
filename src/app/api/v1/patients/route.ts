import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getAuthContext, requireAuth, requireRole } from "@/lib/api-context";
import { getErrorStatus } from "@/lib/http-error";

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

const createSchema = z.object({
  fullName: z.string().min(2),
  email: z.string().email(),
  branchId: z.string().uuid().optional(),
  dateOfBirth: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const ctx = getAuthContext(req);
  try {
    requireAuth(ctx);
    const { page, pageSize } = paginationSchema.parse(Object.fromEntries(req.nextUrl.searchParams));

    const where =
      ctx?.role === "BRANCH_MANAGER" && ctx.branchId
        ? { hospitalId: ctx.hospitalId, branchId: ctx.branchId, role: { equals: "PATIENT" as const } }
        : { hospitalId: ctx!.hospitalId, role: { equals: "PATIENT" as const } };

    const [items, total] = await Promise.all([
      db.user.findMany({
        where,
        include: { patientProfile: true },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.user.count({ where }),
    ]);

    return NextResponse.json({ items, total, page, pageSize });
  } catch (error) {
    const status = getErrorStatus(error);
    return NextResponse.json({ error: (error as Error).message }, { status });
  }
}

export async function POST(req: NextRequest) {
  const ctx = getAuthContext(req);
  try {
    requireRole(ctx, ["SYSTEM_ADMIN", "SUPER_ADMIN", "BRANCH_MANAGER"]);
    const body = await req.json().catch(() => null);
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    if (ctx?.role === "BRANCH_MANAGER" && parsed.data.branchId && ctx.branchId !== parsed.data.branchId) {
      return NextResponse.json({ error: "Forbidden: branch scope" }, { status: 403 });
    }

    if (parsed.data.branchId) {
      const branch = await db.branch.findFirst({
        where: { id: parsed.data.branchId, hospitalId: ctx!.hospitalId },
      });
      if (!branch) {
        return NextResponse.json({ error: "Branch not found" }, { status: 404 });
      }
    }

    const user = await db.user.create({
      data: {
        hospitalId: ctx!.hospitalId,
        branchId: parsed.data.branchId ?? null,
        fullName: parsed.data.fullName,
        email: parsed.data.email,
        role: "PATIENT",
        status: "ACTIVE",
        passwordHash: "", // patients may authenticate via other channel; set later
        emailVerifiedAt: new Date(),
      },
    });

    const profile = await db.patientProfile.create({
      data: {
        userId: user.id,
        dateOfBirth: parsed.data.dateOfBirth ? new Date(parsed.data.dateOfBirth) : null,
      },
    });

    return NextResponse.json({ ...user, patientProfile: profile }, { status: 201 });
  } catch (error) {
    const status = getErrorStatus(error);
    return NextResponse.json({ error: (error as Error).message }, { status });
  }
}

