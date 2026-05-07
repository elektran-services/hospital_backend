import jwt from "jsonwebtoken";
import type { AuthTokenPayload } from "@/modules/auth";
import type { SignOptions } from "jsonwebtoken";

const ACCESS_TTL = process.env.ACCESS_TOKEN_TTL ?? "15m";
const REFRESH_TTL = process.env.REFRESH_TOKEN_TTL ?? "30d";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var ${name}`);
  }
  return value;
}

export function signAccessToken(payload: AuthTokenPayload): string {
  const secret = requireEnv("JWT_SECRET") as string;
  return jwt.sign(payload, secret, { expiresIn: ACCESS_TTL } as SignOptions);
}

export function signRefreshToken(payload: AuthTokenPayload): string {
  const secret = requireEnv("JWT_REFRESH_SECRET") as string;
  return jwt.sign(payload, secret, { expiresIn: REFRESH_TTL } as SignOptions);
}

export function verifyAccessToken(token: string): AuthTokenPayload | null {
  const secret = requireEnv("JWT_SECRET");
  try {
    return jwt.verify(token, secret) as AuthTokenPayload;
  } catch {
    return null;
  }
}

export function verifyRefreshToken(token: string): AuthTokenPayload | null {
  const secret = requireEnv("JWT_REFRESH_SECRET");
  try {
    return jwt.verify(token, secret) as AuthTokenPayload;
  } catch {
    return null;
  }
}

