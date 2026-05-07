import { NextResponse } from "next/server";

// Simple health check endpoint for uptime probes and smoke tests.
export async function GET() {
  return NextResponse.json({
    status: "ok",
    version: "v1",
    message: "Hospital SaaS API healthcheck",
  });
}

