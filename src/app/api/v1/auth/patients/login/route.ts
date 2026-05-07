import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { compare } from "bcryptjs";
import { db } from "@/lib/db";
import { rateLimitAuth } from "@/lib/rate-limit";
import { signAccessToken, signRefreshToken } from "@/lib/jwt";
import type { AuthTokenPayload } from "@/modules/auth";
import jwt from "jsonwebtoken";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  hospital_id: z.string().uuid(),
});

const ACCESS_TOKEN_TTL_MS = 1000 * 60 * 60; // 1 hour for patients
const REFRESH_TOKEN_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days

export async function POST(req: NextRequest) {
  const limit = rateLimitAuth(req, "patient-login", 10, 10 * 60 * 1000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many login attempts. Please try again later." },
      { status: 429, headers: { "Retry-After": `${Math.ceil((limit.reset - Date.now()) / 1000)}` } },
    );
  }

  try {
    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { email, password, hospital_id } = parsed.data;

    // Find patient user
    const user = await db.user.findFirst({
      where: {
        email,
        hospitalId: hospital_id,
        role: "PATIENT",
      },
      include: {
        patientProfile: true,
      },
    });

    if (!user || user.deletedAt) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    if (user.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "Account not active. Please verify your email first." },
        { status: 401 }
      );
    }

    // Verify password
    const passwordOk = await compare(password, user.passwordHash);
    if (!passwordOk) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    // Generate tokens with custom TTL for patients
    const payload: AuthTokenPayload = {
      sub: user.id,
      role: user.role as AuthTokenPayload["role"],
      hospital_id: user.hospitalId,
      branch_id: user.branchId ?? undefined,
    };

    // Sign custom access token with 1 hour expiration for patients
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error("Missing JWT_SECRET");
    }
    const accessToken = jwt.sign(payload, secret, { expiresIn: "1h" });
    const refreshToken = signRefreshToken(payload);

    // Store refresh token
    await db.refreshToken.create({
      data: {
        userId: user.id,
        token: refreshToken,
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
      },
    });

    return NextResponse.json({
      message: "Login successful",
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        hospitalId: user.hospitalId,
        status: user.status,
        emailVerifiedAt: user.emailVerifiedAt,
      },
      tokens: {
        accessToken,
        refreshToken,
        accessTokenExpiresIn: Math.floor(ACCESS_TOKEN_TTL_MS / 1000),
        refreshTokenExpiresIn: Math.floor(REFRESH_TOKEN_TTL_MS / 1000),
      },
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
