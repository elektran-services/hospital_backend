import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getFullUrl } from "@/lib/file-upload";
import { getCorsHeaders, handleCorsOptions } from "@/lib/cors";

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

// Handle CORS preflight
export async function OPTIONS() {
  return handleCorsOptions();
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const { page, pageSize} = paginationSchema.parse(Object.fromEntries(searchParams));

  const [items, total] = await Promise.all([
    db.hospital.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        name: true,
        logo: true,
        createdAt: true,
      },
    }),
    db.hospital.count({ where: { deletedAt: null } }),
  ]);

  // Transform items to include full logo URL
  const itemsWithFullUrl = items.map((item) => ({
    ...item,
    logoUrl: getFullUrl(item.logo),
  }));

  return NextResponse.json({ items: itemsWithFullUrl, total, page, pageSize }, { headers: getCorsHeaders() });
}
