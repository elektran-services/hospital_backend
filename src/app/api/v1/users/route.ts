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
  role: z.enum(["SYSTEM_ADMIN", "SUPER_ADMIN", "BRANCH_MANAGER", "DOCTOR", "PATIENT"]),
  password: z.string().min(8),
  branchId: z.string().uuid().optional(),
});

export async function GET(req: NextRequest) {
  const ctx = getAuthContext(req);
  try {
    requireAuth(ctx);
    const { page, pageSize } = paginationSchema.parse(Object.fromEntries(req.nextUrl.searchParams));

    const where =
      ctx?.role === "BRANCH_MANAGER" && ctx.branchId
        ? { hospitalId: ctx.hospitalId, branchId: ctx.branchId }
        : { hospitalId: ctx!.hospitalId };

    const [items, total] = await Promise.all([
      db.user.findMany({
        where,
        select: {
          id: true,
          hospitalId: true,
          branchId: true,
          fullName: true,
          email: true,
          role: true,
          status: true,
          createdAt: true,
        },
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
    requireRole(ctx, ["SYSTEM_ADMIN", "SUPER_ADMIN"]);
    const body = await req.json().catch(() => null);
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const passwordHash = await hash(parsed.data.password, 10);

    const user = await db.user.create({
      data: {
        hospitalId: ctx!.hospitalId,
        branchId: parsed.data.branchId ?? null,
        fullName: parsed.data.fullName,
        email: parsed.data.email,
        role: parsed.data.role,
        status: "ACTIVE",
        passwordHash,
        emailVerifiedAt: new Date(),
      },
      select: {
        id: true,
        hospitalId: true,
        branchId: true,
        fullName: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    const status = getErrorStatus(error);
    return NextResponse.json({ error: (error as Error).message }, { status });
  }
}

