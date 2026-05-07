import { NextRequest, NextResponse } from "next/server";
import { getAuthContext, requireAuth, requireRole } from "@/lib/api-context";
import { getCorsHeaders, handleCorsOptions } from "@/lib/cors";
import { generatePatientAnalyticsReport } from "@/modules/reports";

/**
 * GET /api/v1/reports/patients
 * Generate patient analytics report with registration and retention trends
 */
export async function GET(req: NextRequest) {
  const ctx = getAuthContext(req);

  try {
    requireAuth(ctx);
    requireRole(ctx, ["SUPER_ADMIN", "BRANCH_MANAGER"]);

    const report = await generatePatientAnalyticsReport(ctx!.hospitalId);

    return NextResponse.json(
      {
        message: "Patient analytics report generated successfully",
        data: report,
        generatedAt: new Date(),
      },
      { headers: getCorsHeaders() }
    );
  } catch (error) {
    console.error("Patient analytics report error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate patient analytics report" },
      { status: 500, headers: getCorsHeaders() }
    );
  }
}

export async function OPTIONS() {
  return handleCorsOptions();
}
