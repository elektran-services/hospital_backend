import { NextRequest, NextResponse } from "next/server";
import { getAuthContext, requireAuth, requireRole } from "@/lib/api-context";
import { getCorsHeaders, handleCorsOptions } from "@/lib/cors";
import { generateBranchPerformanceReport } from "@/modules/reports";

/**
 * GET /api/v1/reports/branches
 * Generate branch performance report with appointment and patient data
 */
export async function GET(req: NextRequest) {
  const ctx = getAuthContext(req);

  try {
    requireAuth(ctx);
    requireRole(ctx, ["SUPER_ADMIN", "BRANCH_MANAGER"]);

    const report = await generateBranchPerformanceReport(ctx!.hospitalId);

    return NextResponse.json(
      {
        message: "Branch performance report generated successfully",
        data: report,
        generatedAt: new Date(),
      },
      { headers: getCorsHeaders() }
    );
  } catch (error) {
    console.error("Branch performance report error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate branch performance report" },
      { status: 500, headers: getCorsHeaders() }
    );
  }
}

export async function OPTIONS() {
  return handleCorsOptions();
}
