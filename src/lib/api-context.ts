import type { NextRequest } from "next/server";
import { verifyAccessToken } from "./jwt";
import { createHttpError } from "./http-error";

export type UserRole = "SYSTEM_ADMIN" | "SUPER_ADMIN" | "BRANCH_MANAGER" | "DOCTOR" | "PATIENT";

export interface AuthContext {
  userId: string;
  role: UserRole;
  hospitalId: string;
  branchId?: string;
}

export function getAuthContext(req: NextRequest): AuthContext | null {
  // Try to get token from Authorization header or cookie
  const authHeader = req.headers.get("authorization");
  const cookieToken = req.cookies.get("access_token")?.value;

  let token: string | null = null;

  if (authHeader) {
    const cleaned = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (cleaned) token = cleaned;
  }

  if (!token && cookieToken) {
    token = cookieToken;
  }

  if (!token) return null;

  const payload = verifyAccessToken(token);
  if (!payload) return null;

  return {
    userId: payload.sub,
    role: payload.role as UserRole,
    hospitalId: payload.hospital_id,
    branchId: payload.branch_id,
  };
}

export function requireRole(ctx: AuthContext | null, roles: UserRole[]) {
  if (!ctx) {
    throw createHttpError("Unauthorized", 401);
  }
  if (!roles.includes(ctx.role)) {
    throw createHttpError("Forbidden", 403);
  }
}

export function requireAuth(ctx: AuthContext | null) {
  if (!ctx) {
    throw createHttpError("Unauthorized", 401);
  }
}

