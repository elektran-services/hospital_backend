import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getFullUrl } from "@/lib/file-upload";
import { getCorsHeaders, handleCorsOptions } from "@/lib/cors";

const querySchema = z.object({
  hospitalId: z.string().uuid(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

// Handle CORS preflight
export async function OPTIONS() {
  return handleCorsOptions();
}

/**
 * GET /api/v1/branches/public
 * Public endpoint to list branches for a specific hospital
 * Used by mobile apps to show available branches after hospital selection
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  
  const parsed = querySchema.safeParse(Object.fromEntries(searchParams));
  
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400, headers: getCorsHeaders() });
  }

  const { hospitalId, page, pageSize } = parsed.data;

  // Verify hospital exists
  const hospital = await db.hospital.findUnique({
    where: { id: hospitalId, deletedAt: null },
    select: {
      id: true,
      name: true,
      logo: true,
    },
  });

  if (!hospital) {
    return NextResponse.json({ error: "Hospital not found" }, { status: 404, headers: getCorsHeaders() });
  }

  // Get branches for this hospital
  const [items, total] = await Promise.all([
    db.branch.findMany({
      where: {
        hospitalId,
        deletedAt: null,
      },
      orderBy: [
        { isHeadBranch: "desc" }, // Head branch first
        { createdAt: "desc" },
      ],
      skip: (page - 1) * pageSize,
      take: pageSize,
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
        createdAt: true,
      },
    }),
    db.branch.count({
      where: {
        hospitalId,
        deletedAt: null,
      },
    }),
  ]);

  return NextResponse.json({
    hospital: {
      ...hospital,
      logoUrl: getFullUrl(hospital.logo),
    },
    branches: items,
    total,
    page,
    pageSize,
  }, { headers: getCorsHeaders() });
}
