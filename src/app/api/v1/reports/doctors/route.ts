import { NextRequest, NextResponse } from "next/server";
import { getAuthContext, requireAuth, requireRole } from "@/lib/api-context";
import { getCorsHeaders, handleCorsOptions } from "@/lib/cors";
import { generateDoctorPerformanceReport } from "@/modules/reports";

/**
 * GET /api/v1/reports/doctors
 * Generate doctor performance report with completion rates and specialties
 */
export async function GET(req: NextRequest) {
  const ctx = getAuthContext(req);

  try {
    requireAuth(ctx);
    requireRole(ctx, ["SUPER_ADMIN", "BRANCH_MANAGER"]);

    const report = await generateDoctorPerformanceReport(ctx!.hospitalId);

    return NextResponse.json(
      {
        message: "Doctor performance report generated successfully",
        data: report,
        generatedAt: new Date(),
      },
      { headers: getCorsHeaders() }
    );
  } catch (error) {
    console.error("Doctor performance report error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate doctor performance report" },
      { status: 500, headers: getCorsHeaders() }
    );
  }
}

export async function OPTIONS() {
  return handleCorsOptions();
}
