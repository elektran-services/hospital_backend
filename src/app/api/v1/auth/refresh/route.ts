import { NextResponse } from "next/server";
import { z } from "zod";
import { AuthService } from "@/modules/auth";
import { rateLimitAuth } from "@/lib/rate-limit";

const schema = z.object({
  refreshToken: z.string().min(10),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const limit = rateLimitAuth(req, "refresh", 20, 5 * 60 * 1000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many refresh attempts. Please try again later." },
      { status: 429, headers: { "Retry-After": `${Math.ceil((limit.reset - Date.now()) / 1000)}` } },
    );
  }

  try {
    const service = new AuthService();
    const tokens = await service.refresh(parsed.data.refreshToken);

    const response = NextResponse.json({
      message: "Token refreshed",
      tokens,
    });

    response.cookies.set("access_token", tokens.accessToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 15,
    });

    response.cookies.set("refresh_token", tokens.refreshToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });

    return response;
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 401 });
  }
}

