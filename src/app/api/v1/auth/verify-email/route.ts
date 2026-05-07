import { NextResponse } from "next/server";
import { z } from "zod";
import { AuthService } from "@/modules/auth";
import { rateLimitAuth } from "@/lib/rate-limit";
import { getCorsHeaders, handleCorsOptions } from "@/lib/cors";

const schema = z.object({
  token: z.string().min(10),
});

// Handle CORS preflight
export async function OPTIONS() {
  return handleCorsOptions();
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400, headers: getCorsHeaders() });
  }

  const limit = rateLimitAuth(req, "verify-email", 10, 10 * 60 * 1000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many verification attempts. Please try again later." },
      { status: 429, headers: { "Retry-After": `${Math.ceil((limit.reset - Date.now()) / 1000)}`, ...getCorsHeaders() } },
    );
  }

  try {
    const service = new AuthService();
    const user = await service.verifyEmail(parsed.data.token);
    return NextResponse.json({ message: "Email verified", userId: (user as any).id }, { headers: getCorsHeaders() });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400, headers: getCorsHeaders() });
  }
}

