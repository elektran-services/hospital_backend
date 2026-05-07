import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { compare, hash } from "bcryptjs";
import { db } from "@/lib/db";
import { getAuthContext, requireRole } from "@/lib/api-context";
import { rateLimitAuth } from "@/lib/rate-limit";
import { getErrorStatus } from "@/lib/http-error";

const schema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "New password must be at least 8 characters"),
});

/**
 * POST /api/v1/auth/doctors/change-password
 * Change password for logged-in doctor
 */
export async function POST(req: NextRequest) {
  const limit = rateLimitAuth(req, "doctor-change-password", 5, 15 * 60 * 1000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many password change attempts. Please try again later." },
      { status: 429, headers: { "Retry-After": `${Math.ceil((limit.reset - Date.now()) / 1000)}` } },
    );
  }

  try {
    const ctx = getAuthContext(req);
    requireRole(ctx, ["DOCTOR"]);

    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { currentPassword, newPassword } = parsed.data;

    // Prevent using the same password
    if (currentPassword === newPassword) {
      return NextResponse.json(
        { error: "New password must be different from current password" },
        { status: 400 }
      );
    }

    // Get user
    const user = await db.user.findUnique({
      where: { id: ctx!.userId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Verify current password
    const passwordValid = await compare(currentPassword, user.passwordHash);
    if (!passwordValid) {
      return NextResponse.json({ error: "Current password is incorrect" }, { status: 401 });
    }

    // Hash new password
    const newPasswordHash = await hash(newPassword, 10);

    // Update password
    await db.user.update({
      where: { id: ctx!.userId },
      data: { passwordHash: newPasswordHash },
    });

    return NextResponse.json({
      message: "Password changed successfully",
    });
  } catch (error: unknown) {
    const status = getErrorStatus(error, 500);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status }
    );
  }
}
