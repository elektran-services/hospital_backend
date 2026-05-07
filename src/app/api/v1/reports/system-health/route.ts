import { NextRequest, NextResponse } from "next/server";
import { getAuthContext, requireAuth, requireRole } from "@/lib/api-context";
import { getCorsHeaders, handleCorsOptions } from "@/lib/cors";
import { generateSystemHealthReport } from "@/modules/reports";

/**
 * GET /api/v1/reports/system-health
 * Generate system health report with video call metrics and database stats
 */
export async function GET(req: NextRequest) {
  const ctx = getAuthContext(req);

  try {
    requireAuth(ctx);
    requireRole(ctx, ["SUPER_ADMIN", "BRANCH_MANAGER"]);

    const report = await generateSystemHealthReport(ctx!.hospitalId);

    return NextResponse.json(
      {
        message: "System health report generated successfully",
        data: report,
        generatedAt: new Date(),
      },
      { headers: getCorsHeaders() }
    );
  } catch (error) {
    console.error("System health report error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate system health report" },
      { status: 500, headers: getCorsHeaders() }
    );
  }
}

export async function OPTIONS() {
  return handleCorsOptions();
}
