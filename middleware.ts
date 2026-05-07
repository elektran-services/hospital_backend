import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { jwtVerify } from "jose";
import type { AuthTokenPayload } from "@/modules/auth";

const PUBLIC_PATHS = new Set([
  "/api/v1",
  "/api/v1/",
  "/api/v1/health",
  "/api/v1/openapi",
  "/api/v1/hospitals/public",
  "/api/v1/auth/super-admin/signup",
  "/api/v1/auth/verify-email",
  "/api/v1/auth/login",
  "/api/v1/auth/refresh",
  "/api/v1/auth/patients/register",
  "/api/v1/auth/patients/verify-otp",
  "/api/v1/auth/patients/resend-otp",
  "/api/v1/auth/patients/login",
  "/api/v1/auth/patients/forgot-password",
  "/api/v1/auth/doctors/forgot-password",
]);

function isPublic(pathname: string) {
  if (PUBLIC_PATHS.has(pathname)) return true;
  // Allow trailing slashes on the known public endpoints only.
  if (pathname.endsWith("/") && PUBLIC_PATHS.has(pathname.slice(0, -1))) return true;
  return false;
}

type EdgeVerifyResult =
  | { payload: AuthTokenPayload }
  | { error: string };

async function verifyAccessTokenEdge(token: string): Promise<EdgeVerifyResult> {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.error("[middleware] JWT_SECRET missing");
    return { error: "missing_secret" } as const;
  }
  try {
    const { payload } = await jwtVerify<AuthTokenPayload>(token, new TextEncoder().encode(secret));
    console.log("[middleware] Token verified successfully for user:", payload.sub);
    return { payload };
  } catch (err) {
    const message = (err as Error).message ?? "verify_failed";
    console.error("[middleware] Token verification failed:", message, "| token preview:", token.substring(0, 20));
    return { error: message } as const;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (isPublic(pathname)) {
    return NextResponse.next();
  }

  const authHeader = req.headers.get("authorization");
  const cookieToken = req.cookies.get("access_token")?.value;
  const hasSecret = !!process.env.JWT_SECRET;

  let result: Awaited<ReturnType<typeof verifyAccessTokenEdge>> | null = null;

  // Try Authorization header first (if present and non-empty)
  if (authHeader) {
    const cleaned = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (cleaned) {
      result = await verifyAccessTokenEdge(cleaned);
    }
  }

  // If header failed or wasn't present, try cookie
  if (!result || "error" in result) {
    if (cookieToken) {
      const cookieResult = await verifyAccessTokenEdge(cookieToken);
      if (!("error" in cookieResult)) {
        result = cookieResult;
      }
    }
  }

  // If still no valid result, return 401
  if (!result || "error" in result) {
    const errorDetail = result && "error" in result ? result.error : "no_token";
    if (errorDetail === "missing_secret") {
      return NextResponse.json({ error: "Server misconfig: JWT_SECRET missing" }, { status: 500 });
    }
    return NextResponse.json(
      {
        error: "Unauthorized",
        detail: process.env.NODE_ENV !== "production" ? {
          errorDetail,
          hasSecret,
          hasAuthHeader: !!authHeader,
          hasCookie: !!cookieToken,
        } : undefined,
      },
      { status: 401 },
    );
  }

  const payload = result.payload;
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-hospital-id", payload.hospital_id);
  if (payload.branch_id) {
    requestHeaders.set("x-branch-id", payload.branch_id);
  }
  requestHeaders.set("x-user-role", payload.role);
  requestHeaders.set("x-user-id", payload.sub);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: [],  // Temporarily disabled - using per-route auth instead
};

