import { NextResponse } from "next/server";
import { getCorsHeaders, handleCorsOptions } from "@/lib/cors";
import { getErrorStatus } from "@/lib/http-error";

// Handle CORS preflight
export async function OPTIONS() {
  return handleCorsOptions();
}

const DAYS_OF_WEEK = [
  { id: "MONDAY", label: "Monday", value: "MONDAY" },
  { id: "TUESDAY", label: "Tuesday", value: "TUESDAY" },
  { id: "WEDNESDAY", label: "Wednesday", value: "WEDNESDAY" },
  { id: "THURSDAY", label: "Thursday", value: "THURSDAY" },
  { id: "FRIDAY", label: "Friday", value: "FRIDAY" },
  { id: "SATURDAY", label: "Saturday", value: "SATURDAY" },
  { id: "SUNDAY", label: "Sunday", value: "SUNDAY" },
];

/**
 * GET /api/v1/doctors/:doctorId/days-of-week
 * Get list of all days of the week for selection
 */
export async function GET() {
  try {
    return NextResponse.json(
      {
        days: DAYS_OF_WEEK,
        totalDays: DAYS_OF_WEEK.length,
      },
      { headers: getCorsHeaders() }
    );
  } catch (error) {
    const status = getErrorStatus(error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status, headers: getCorsHeaders() }
    );
  }
}
