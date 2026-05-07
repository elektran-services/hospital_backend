import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { hash } from "bcryptjs";
import { db } from "@/lib/db";
import { rateLimitAuth } from "@/lib/rate-limit";
import { createOTP, sendOTPEmail, verifyOTP } from "@/lib/otp";
import { getErrorStatus } from "@/lib/http-error";

const requestOtpSchema = z.object({
  email: z.string().email(),
});

const resetPasswordSchema = z.object({
  email: z.string().email(),
  otp: z.string().length(6),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
});

/**
 * POST /api/v1/auth/patients/forgot-password
 * Step 1: Request OTP (provide only email)
 * Step 2: Reset password (provide email, otp, and newPassword)
 */
export async function POST(req: NextRequest) {
  const limit = rateLimitAuth(req, "patient-forgot-password", 5, 15 * 60 * 1000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many password reset attempts. Please try again later." },
      { status: 429, headers: { "Retry-After": `${Math.ceil((limit.reset - Date.now()) / 1000)}` } },
    );
  }

  try {
    const body = await req.json().catch(() => null);
    
    // Check if this is a password reset request (has OTP and new password)
    const resetParsed = resetPasswordSchema.safeParse(body);
    if (resetParsed.success) {
      // Step 2: Reset password with OTP
      const { email, otp, newPassword } = resetParsed.data;

      // Verify OTP
      const isValid = await verifyOTP(email, otp);
      if (!isValid) {
        return NextResponse.json(
          { error: "Invalid or expired OTP code" },
          { status: 400 }
        );
      }

      // Find active patient user
      const user = await db.user.findFirst({
        where: {
          email,
          role: "PATIENT",
          status: "ACTIVE",
          deletedAt: null,
        },
      });

      if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      // Hash new password
      const newPasswordHash = await hash(newPassword, 10);

      // Update password
      await db.user.update({
        where: { id: user.id },
        data: { passwordHash: newPasswordHash },
      });

      return NextResponse.json({
        message: "Password reset successful. You can now login with your new password.",
      });
    }

    // Step 1: Request OTP
    const otpParsed = requestOtpSchema.safeParse(body);
    if (!otpParsed.success) {
      return NextResponse.json({ error: otpParsed.error.flatten() }, { status: 400 });
    }

    const { email } = otpParsed.data;

    // Find active patient user
    const user = await db.user.findFirst({
      where: {
        email,
        role: "PATIENT",
        status: "ACTIVE",
        deletedAt: null,
      },
    });

    // For security, always return success even if user not found
    // This prevents email enumeration attacks
    if (!user) {
      return NextResponse.json({
        message: "If an account exists with this email, a password reset OTP has been sent.",
        email,
      });
    }

    // Extract first name
    const firstName = user.fullName.split(" ")[0];

    // Generate and send OTP
    const otp = await createOTP(email);
    await sendOTPEmail(email, otp, firstName);

    return NextResponse.json({
      message: "Password reset OTP has been sent to your email.",
      email,
      expiresIn: 600, // 10 minutes
      // Include OTP in dev mode for testing
      otp: process.env.NODE_ENV !== "production" ? otp : undefined,
    });
  } catch (error: unknown) {
    const status = getErrorStatus(error, 500);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status }
    );
  }
}
