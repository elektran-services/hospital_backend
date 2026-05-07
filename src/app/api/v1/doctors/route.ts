import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { hash } from "bcryptjs";
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
  password: z.string().min(8),
  branchId: z.string().uuid(),
  specialty: z.string().optional(),
  license: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const ctx = getAuthContext(req);
  try {
    requireAuth(ctx);
    const { page, pageSize } = paginationSchema.parse(Object.fromEntries(req.nextUrl.searchParams));

    const where =
      ctx?.role === "BRANCH_MANAGER" && ctx.branchId
        ? { hospitalId: ctx.hospitalId, branchId: ctx.branchId, role: { equals: "DOCTOR" as const } }
        : { hospitalId: ctx!.hospitalId, role: { equals: "DOCTOR" as const } };

    const [items, total] = await Promise.all([
      db.user.findMany({
        where,
        include: { doctorProfile: true },
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

    if (ctx?.role === "BRANCH_MANAGER" && ctx.branchId !== parsed.data.branchId) {
      return NextResponse.json({ error: "Forbidden: branch scope" }, { status: 403 });
    }

    const branch = await db.branch.findFirst({
      where: { id: parsed.data.branchId, hospitalId: ctx!.hospitalId },
    });
    if (!branch) {
      return NextResponse.json({ error: "Branch not found" }, { status: 404 });
    }

    const passwordHash = await hash(parsed.data.password, 10);

    const result = await db.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          hospitalId: ctx!.hospitalId,
          branchId: parsed.data.branchId,
          fullName: parsed.data.fullName,
          email: parsed.data.email,
          role: "DOCTOR",
          status: "ACTIVE",
          passwordHash,
          emailVerifiedAt: new Date(),
        },
      });

      const profile = await tx.doctorProfile.create({
        data: {
          userId: user.id,
          specialty: parsed.data.specialty,
          license: parsed.data.license,
        },
      });

      return { user, profile };
    });

    return NextResponse.json({ ...result.user, doctorProfile: result.profile }, { status: 201 });
  } catch (error) {
    const status = getErrorStatus(error);
    return NextResponse.json({ error: (error as Error).message }, { status });
  }
}

