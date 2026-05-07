import { NextResponse } from "next/server";
import { z } from "zod";
import { AuthService } from "@/modules/auth";
import { rateLimitAuth } from "@/lib/rate-limit";
import { getCorsHeaders, handleCorsOptions } from "@/lib/cors";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
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

  const limit = rateLimitAuth(req, "login", 10, 60 * 1000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many login attempts. Please wait and try again." },
      { status: 429, headers: { "Retry-After": `${Math.ceil((limit.reset - Date.now()) / 1000)}`, ...getCorsHeaders() } },
    );
  }

  try {
    const service = new AuthService();
    const { user, tokenPair } = await service.login(parsed.data);

    const response = NextResponse.json({
      message: "Authenticated",
      user: {
        id: user.id,
        role: user.role,
        status: user.status,
        fullName: user.fullName,
        email: user.email,
        hospitalId: user.hospitalId,
        branchId: user.branchId,
        hospital: user.hospital
          ? {
              id: user.hospital.id,
              name: user.hospital.name,
              logo: user.hospital.logo,
            }
          : null,
        branch: user.branch
          ? {
              id: user.branch.id,
              name: user.branch.name,
              address: user.branch.address,
              city: user.branch.city,
              state: user.branch.state,
              country: user.branch.country,
              phone: user.branch.phone,
            }
          : null,
      },
      tokens: {
        ...tokenPair,
        accessTokenExpiresIn: 60 * 15,
        refreshTokenExpiresIn: 60 * 60 * 24 * 30,
      },
    });

    response.cookies.set("access_token", tokenPair.accessToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 15,
    });

    response.cookies.set("refresh_token", tokenPair.refreshToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });

    // Add CORS headers
    Object.entries(getCorsHeaders()).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return response;
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 401, headers: getCorsHeaders() });
  }
}

