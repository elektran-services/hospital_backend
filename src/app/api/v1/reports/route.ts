import { NextRequest, NextResponse } from "next/server";
import { getAuthContext, requireAuth, requireRole } from "@/lib/api-context";
import { getCorsHeaders, handleCorsOptions } from "@/lib/cors";
import { z } from "zod";

/**
 * GET /api/v1/reports
 * List all available reports for the hospital
 */
export async function GET(req: NextRequest) {
  const ctx = getAuthContext(req);

  try {
    requireAuth(ctx);
    requireRole(ctx, ["SUPER_ADMIN", "BRANCH_MANAGER"]);

    const availableReports = [
      {
        id: "appointments",
        name: "Appointment Analytics",
        description: "Detailed metrics on appointment trends, completion rates, and cancellations",
        endpoint: "/api/v1/reports/appointments",
        timeframes: ["week", "month", "year"],
      },
      {
        id: "doctors",
        name: "Doctor Performance",
        description: "Performance metrics for all doctors including completion rates and specialties",
        endpoint: "/api/v1/reports/doctors",
      },
      {
        id: "branches",
        name: "Branch Performance",
        description: "Key metrics for each branch including patient and appointment data",
        endpoint: "/api/v1/reports/branches",
      },
      {
        id: "patients",
        name: "Patient Analytics",
        description: "Patient registration trends, retention, and booking patterns",
        endpoint: "/api/v1/reports/patients",
      },
      {
        id: "system-health",
        name: "System Health",
        description: "Video call success rates, API performance, and database metrics",
        endpoint: "/api/v1/reports/system-health",
      },
    ];

    return NextResponse.json(
      {
        message: "Available reports retrieved successfully",
        data: availableReports,
      },
      { headers: getCorsHeaders() }
    );
  } catch (error) {
    console.error("Reports list error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to retrieve reports" },
      { status: 500, headers: getCorsHeaders() }
    );
  }
}

export async function OPTIONS() {
  return handleCorsOptions();
}
