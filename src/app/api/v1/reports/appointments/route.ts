import { NextRequest, NextResponse } from "next/server";
import { getAuthContext, requireAuth, requireRole } from "@/lib/api-context";
import { getCorsHeaders, handleCorsOptions } from "@/lib/cors";
import { generateAppointmentReport } from "@/modules/reports";
import { z } from "zod";

const querySchema = z.object({
  timeframe: z.enum(["week", "month", "year"]).default("month"),
});

/**
 * GET /api/v1/reports/appointments
 * Generate appointment analytics report
 *
 * Query Parameters:
 * - timeframe: "week" | "month" | "year" (default: month)
 */
export async function GET(req: NextRequest) {
  const ctx = getAuthContext(req);

  try {
    requireAuth(ctx);
    requireRole(ctx, ["SUPER_ADMIN", "BRANCH_MANAGER"]);

    if (!ctx) {
      return NextResponse.json(
        { error: "Authentication context is missing" },
        { status: 401, headers: getCorsHeaders() }
      );
    }

    const { searchParams } = new URL(req.url);
    const validatedQuery = querySchema.safeParse({
      timeframe: searchParams.get("timeframe") || "month",
    });

    if (!validatedQuery.success) {
      return NextResponse.json(
        { error: validatedQuery.error.flatten() },
        { status: 400, headers: getCorsHeaders() }
      );
    }

    const report = await generateAppointmentReport(
      ctx!.hospitalId,
      validatedQuery.data.timeframe
    );

    return NextResponse.json(
      {
        message: "Appointment report generated successfully",
        data: report,
        timeframe: validatedQuery.data.timeframe,
        generatedAt: new Date(),
      },
      { headers: getCorsHeaders() }
    );
  } catch (error) {
    console.error("Appointment report error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate appointment report" },
      { status: 500, headers: getCorsHeaders() }
    );
  }
}

export async function OPTIONS() {
  return handleCorsOptions();
}
