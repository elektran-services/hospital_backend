import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getAuthContext, requireRole } from "@/lib/api-context";
import { getFullUrl } from "@/lib/file-upload";
import { getErrorStatus } from "@/lib/http-error";

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

const createSchema = z.object({
  name: z.string().min(2),
  // optional defaults for the head branch
  branch: z
    .object({
      name: z.string().min(2).default("Head Office"),
      address: z.string().min(2).default("Set address"),
      phone: z.string().min(2).default("Set phone"),
      email: z.string().email().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      country: z.string().optional(),
    })
    .optional(),
});

export async function GET(req: NextRequest) {
  const ctx = getAuthContext(req);
  try {
    requireRole(ctx, ["SYSTEM_ADMIN"]);
    const { page, pageSize } = paginationSchema.parse(Object.fromEntries(req.nextUrl.searchParams));

    const [items, total] = await Promise.all([
      db.hospital.findMany({
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.hospital.count(),
    ]);

    // Transform items to include full logo URL
    const itemsWithFullUrl = items.map((item) => ({
      ...item,
      logoUrl: getFullUrl(item.logo),
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
    requireRole(ctx, ["SYSTEM_ADMIN"]);
    const body = await req.json().catch(() => null);
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const branchInput = parsed.data.branch ?? { name: "Head Office", address: "Set address", phone: "Set phone" };

    const result = await db.$transaction(async (tx) => {
      const hospital = await tx.hospital.create({
        data: {
          name: parsed.data.name,
          createdBy: ctx!.userId,
        },
      });

      const defaultBranch = await tx.branch.create({
        data: {
          hospitalId: hospital.id,
          name: branchInput.name ?? "Head Office",
          address: branchInput.address ?? "Set address",
          city: branchInput.city,
          state: branchInput.state,
          country: branchInput.country,
          phone: branchInput.phone ?? "Set phone",
          email: branchInput.email ?? `${parsed.data.name.toLowerCase().replace(/\s+/g, "-")}@example.com`,
          isHeadBranch: true,
        },
      });

      return { hospital, defaultBranch };
    });

    return NextResponse.json(
      { hospital: result.hospital, defaultBranch: result.defaultBranch, adminUserId: null },
      { status: 201 },
    );
  } catch (error) {
    const status = getErrorStatus(error);
    return NextResponse.json({ error: (error as Error).message }, { status });
  }
}

