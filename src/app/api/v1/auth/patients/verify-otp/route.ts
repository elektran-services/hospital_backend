import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { rateLimitAuth } from "@/lib/rate-limit";
import { verifyOTP } from "@/lib/otp";

const schema = z.object({
  email: z.string().email(),
  otp: z.string().length(6),
});

export async function POST(req: NextRequest) {
  const limit = rateLimitAuth(req, "patient-verify-otp", 10, 10 * 60 * 1000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many verification attempts. Please try again later." },
      { status: 429, headers: { "Retry-After": `${Math.ceil((limit.reset - Date.now()) / 1000)}` } },
    );
  }

  try {
    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { email, otp } = parsed.data;

    // Verify OTP
    const isValid = await verifyOTP(email, otp);
    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid or expired OTP code" },
        { status: 400 }
      );
    }

    // Find and activate the user
    const user = await db.user.findFirst({
      where: {
        email,
        role: "PATIENT",
        status: "PENDING",
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found or already verified" },
        { status: 404 }
      );
    }

    // Activate user
    const updatedUser = await db.user.update({
      where: { id: user.id },
      data: {
        status: "ACTIVE",
        emailVerifiedAt: new Date(),
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        status: true,
        emailVerifiedAt: true,
      },
    });

    return NextResponse.json({
      message: "Email verified successfully. You can now login.",
      user: updatedUser,
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
