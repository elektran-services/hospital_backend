import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { rateLimitAuth } from "@/lib/rate-limit";
import { createOTP, sendOTPEmail } from "@/lib/otp";

const schema = z.object({
  email: z.string().email(),
});

export async function POST(req: NextRequest) {
  const limit = rateLimitAuth(req, "patient-resend-otp", 3, 10 * 60 * 1000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many resend attempts. Please try again later." },
      { status: 429, headers: { "Retry-After": `${Math.ceil((limit.reset - Date.now()) / 1000)}` } },
    );
  }

  try {
    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { email } = parsed.data;

    // Find pending patient user
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

    // Extract first name from full name
    const firstName = user.fullName.split(" ")[0];

    // Generate and send new OTP
    const otp = await createOTP(email);
    await sendOTPEmail(email, otp, firstName);

    return NextResponse.json({
      message: "OTP has been resent to your email.",
      email: user.email,
      otpSent: true,
      expiresIn: 600, // 10 minutes in seconds
      // Include OTP in dev mode for testing
      otp: process.env.NODE_ENV !== "production" ? otp : undefined,
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
