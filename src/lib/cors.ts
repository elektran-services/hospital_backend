import { NextResponse } from "next/server";

/**
 * CORS headers for API endpoints
 * Allows Swagger UI and other cross-origin requests
 */
export function getCorsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
  };
}

/**
 * Handle CORS preflight OPTIONS request
 */
export async function handleCorsOptions() {
  return new NextResponse(null, {
    status: 200,
    headers: getCorsHeaders(),
  });
}

/**
 * Wrap a response with CORS headers
 */
export function withCors(response: NextResponse) {
  Object.entries(getCorsHeaders()).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}
