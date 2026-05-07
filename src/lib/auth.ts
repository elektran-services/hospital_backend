import type { NextRequest } from "next/server";

export function getAccessTokenFromRequest(req: NextRequest): string | undefined {
  const headerToken = req.headers.get("authorization") ?? undefined;
  const cookieToken = req.cookies.get("access_token")?.value;
  return headerToken ?? cookieToken;
}

