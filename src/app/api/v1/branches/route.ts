import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getAuthContext, requireAuth, requireRole } from "@/lib/api-context";
import { getFullUrl } from "@/lib/file-upload";
import { getErrorStatus } from "@/lib/http-error";

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

const createSchema = z.object({
  name: z.string().min(2),
  address: z.string().min(2),
  phone: z.string().min(2),
  email: z.string().email(),
  isHeadBranch: z.boolean().default(false),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const ctx = getAuthContext(req);
  try {
    requireAuth(ctx);
    const { page, pageSize } = paginationSchema.parse(Object.fromEntries(req.nextUrl.searchParams));

    const where =
      ctx?.role === "BRANCH_MANAGER" && ctx.branchId
        ? { hospitalId: ctx.hospitalId, id: ctx.branchId }
        : { hospitalId: ctx?.hospitalId };

    const [items, total] = await Promise.all([
      db.branch.findMany({
        where,
        include: {
          hospital: {
            select: {
              id: true,
              name: true,
              logo: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.branch.count({ where }),
    ]);

    // Transform items to include full logo URL
    const itemsWithFullUrl = items.map((item) => ({
      ...item,
      hospital: item.hospital
        ? {
            ...item.hospital,
            logoUrl: getFullUrl(item.hospital.logo),
          }
        : null,
    }));

    return NextResponse.json({ items: itemsWithFullUrl, total, page, pageSize });
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

    const branch = await db.branch.create({
      data: {
        hospitalId: ctx!.hospitalId,
        name: parsed.data.name,
        address: parsed.data.address,
        city: parsed.data.city,
        state: parsed.data.state,
        country: parsed.data.country,
        phone: parsed.data.phone,
        email: parsed.data.email,
        isHeadBranch: parsed.data.isHeadBranch,
      },
    });

    return NextResponse.json(branch, { status: 201 });
  } catch (error) {
    const status = getErrorStatus(error);
    return NextResponse.json({ error: (error as Error).message }, { status });
  }
}

