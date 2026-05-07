import { NextRequest, NextResponse } from "next/server";
import { getAuthContext, requireAuth, requireRole } from "@/lib/api-context";
import { getCorsHeaders, handleCorsOptions } from "@/lib/cors";
import {
  generateAppointmentReport,
  generateDoctorPerformanceReport,
  generateBranchPerformanceReport,
  generatePatientAnalyticsReport,
  generateSystemHealthReport,
} from "@/modules/reports";
import { z } from "zod";

const querySchema = z.object({
  reportType: z.enum([
    "appointments",
    "doctors",
    "branches",
    "patients",
    "system-health",
  ]),
  format: z.enum(["csv", "json"]).default("json"),
  timeframe: z.enum(["week", "month", "year"]).optional().default("month"),
});

/**
 * GET /api/v1/reports/export
 * Export report data as CSV or JSON
 *
 * Query Parameters:
 * - reportType: The type of report to export
 * - format: "csv" | "json" (default: json)
 * - timeframe: For appointment reports (week | month | year)
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
      reportType: searchParams.get("reportType"),
      format: searchParams.get("format") || "json",
      timeframe: searchParams.get("timeframe") || "month",
    });

    if (!validatedQuery.success) {
      return NextResponse.json(
        { error: validatedQuery.error.flatten() },
        { status: 400, headers: getCorsHeaders() }
      );
    }

    const { reportType, format, timeframe } = validatedQuery.data;

    let reportData: any;

    // Generate appropriate report
    switch (reportType) {
      case "appointments":
        reportData = await generateAppointmentReport(
          ctx!.hospitalId,
          timeframe as "week" | "month" | "year"
        );
        break;
      case "doctors":
        reportData = await generateDoctorPerformanceReport(ctx!.hospitalId);
        break;
      case "branches":
        reportData = await generateBranchPerformanceReport(ctx!.hospitalId);
        break;
      case "patients":
        reportData = await generatePatientAnalyticsReport(ctx!.hospitalId);
        break;
      case "system-health":
        reportData = await generateSystemHealthReport(ctx!.hospitalId);
        break;
    }

    if (format === "csv") {
      return exportAsCSV(reportData, reportType);
    }

    // Default to JSON
    return NextResponse.json(
      {
        message: `${reportType} report exported successfully`,
        data: reportData,
        exportedAt: new Date(),
      },
      { headers: getCorsHeaders() }
    );
  } catch (error) {
    console.error("Report export error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to export report" },
      { status: 500, headers: getCorsHeaders() }
    );
  }
}

function exportAsCSV(data: any, reportType: string): NextResponse {
  let csv = "";

  switch (reportType) {
    case "appointments":
      csv = convertAppointmentToCSV(data);
      break;
    case "doctors":
      csv = convertDoctorToCSV(data);
      break;
    case "branches":
      csv = convertBranchToCSV(data);
      break;
    case "patients":
      csv = convertPatientToCSV(data);
      break;
    case "system-health":
      csv = convertSystemHealthToCSV(data);
      break;
  }

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${reportType}-report-${new Date().toISOString().split("T")[0]}.csv"`,
      ...getCorsHeaders(),
    },
  });
}

function convertAppointmentToCSV(data: any): string {
  const headers = [
    "Metric",
    "Value",
  ];
  const rows = [
    headers,
    ["Total Appointments", data.totalAppointments],
    ["Completed Appointments", data.completedAppointments],
    ["Cancelled Appointments", data.cancelledAppointments],
    ["Virtual Appointments", data.virtualAppointments],
    ["Physical Appointments", data.physicalAppointments],
    ["Average Completion Rate (%)", data.averageCompletionRate.toFixed(2)],
    [],
    ["Doctor Performance"],
    ["Doctor Name", "Specialty", "Completed", "Total", "Completion Rate (%)"],
  ];

  if (data.completionRateByDoctor && data.completionRateByDoctor.length > 0) {
    data.completionRateByDoctor.forEach((doc: any) => {
      rows.push([
        doc.doctorName,
        "",
        doc.completedCount,
        doc.totalCount,
        doc.completionRate.toFixed(2),
      ]);
    });
  }

  return rows.map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n");
}

function convertDoctorToCSV(data: any): string {
  const headers = [
    "Doctor Name",
    "Specialty",
    "Status",
    "Total Appointments",
    "Completed",
    "Cancelled",
    "Completion Rate (%)",
    "Branch Count",
  ];
  const rows = [headers];

  if (data.doctorStats && data.doctorStats.length > 0) {
    data.doctorStats.forEach((doc: any) => {
      rows.push([
        doc.doctorName,
        doc.specialty,
        doc.status,
        doc.totalAppointments,
        doc.completedAppointments,
        doc.cancelledAppointments,
        doc.appointmentCompletionRate.toFixed(2),
        doc.branchCount,
      ]);
    });
  }

  return rows.map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n");
}

function convertBranchToCSV(data: any): string {
  const headers = [
    "Branch Name",
    "Address",
    "Doctors",
    "Patients",
    "Total Appointments",
    "Completed",
    "Virtual",
    "Physical",
    "Completion Rate (%)",
  ];
  const rows = [headers];

  if (data.branches && data.branches.length > 0) {
    data.branches.forEach((branch: any) => {
      rows.push([
        branch.branchName,
        branch.address,
        branch.doctorCount,
        branch.patientCount,
        branch.totalAppointments,
        branch.completedAppointments,
        branch.virtualAppointmentsCount,
        branch.physicalAppointmentsCount,
        branch.completionRate.toFixed(2),
      ]);
    });
  }

  return rows.map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n");
}

function convertPatientToCSV(data: any): string {
  const headers = [
    "Branch Name",
    "Total Patients",
    "New This Month",
  ];
  const rows = [headers];

  if (data.patientsByBranch && data.patientsByBranch.length > 0) {
    data.patientsByBranch.forEach((branch: any) => {
      rows.push([
        branch.branchName,
        branch.patientCount,
        branch.newThisMonth,
      ]);
    });
  }

  return rows.map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n");
}

function convertSystemHealthToCSV(data: any): string {
  const rows = [
    ["System Health Report"],
    [],
    ["Video Call Metrics"],
    ["Total Video Sessions", data.videoCallMetrics.totalVideoSessions],
    ["Successful Sessions", data.videoCallMetrics.successfulSessions],
    ["Failed Sessions", data.videoCallMetrics.failedSessions],
    ["Success Rate (%)", data.videoCallMetrics.successRate.toFixed(2)],
    ["Average Session Duration (minutes)", data.videoCallMetrics.averageSessionDuration.toFixed(2)],
    [],
    ["Database Metrics"],
    ["Total Records", data.databaseMetrics.totalRecords],
  ];

  if (data.databaseMetrics.recordsByModel) {
    rows.push([]);
    Object.entries(data.databaseMetrics.recordsByModel).forEach(
      ([model, count]) => {
        rows.push([model, count]);
      }
    );
  }

  return rows.map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n");
}

export async function OPTIONS() {
  return handleCorsOptions();
}
