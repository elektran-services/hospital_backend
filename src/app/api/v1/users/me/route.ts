import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { hash } from "bcryptjs";
import { db } from "@/lib/db";
import { getAuthContext, requireAuth } from "@/lib/api-context";
import { getErrorStatus } from "@/lib/http-error";

const updateSchema = z.object({
  fullName: z.string().min(2).optional(),
  email: z.string().email().optional(),
  currentPassword: z.string().min(8).optional(),
  newPassword: z.string().min(8).optional(),
}).refine((data) => {
  // If changing password, both currentPassword and newPassword are required
  if (data.newPassword || data.currentPassword) {
    return data.currentPassword && data.newPassword;
  }
  return true;
}, {
  message: "Both currentPassword and newPassword are required to change password",
});

const userSelect = {
  id: true,
  hospitalId: true,
  branchId: true,
  fullName: true,
  email: true,
  role: true,
  status: true,
  emailVerifiedAt: true,
  createdAt: true,
  updatedAt: true,
  hospital: {
    select: {
      id: true,
      name: true,
      logo: true,
    },
  },
  branch: {
    select: {
      id: true,
      name: true,
      address: true,
      city: true,
      state: true,
      country: true,
      phone: true,
    },
  },
};

export async function GET(req: NextRequest) {
  const ctx = getAuthContext(req);
  try {
    requireAuth(ctx);

    const user = await db.user.findUnique({
      where: { id: ctx!.userId },
      select: userSelect,
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (error) {
    const status = getErrorStatus(error);
    return NextResponse.json({ error: (error as Error).message }, { status });
  }
}

export async function PATCH(req: NextRequest) {
  const ctx = getAuthContext(req);
  try {
    requireAuth(ctx);

    const body = await req.json().catch(() => null);
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { fullName, email, currentPassword, newPassword } = parsed.data;

    // Check if there's anything to update
    if (!fullName && !email && !newPassword) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    // If changing password, verify current password
    if (newPassword && currentPassword) {
      const user = await db.user.findUnique({
        where: { id: ctx!.userId },
        select: { passwordHash: true },
      });

      if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      const { compare } = await import("bcryptjs");
      const passwordOk = await compare(currentPassword, user.passwordHash);
      if (!passwordOk) {
        return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
      }
    }

    // Check if email is already taken (by another user)
    if (email) {
      const existing = await db.user.findFirst({
        where: {
          email,
          id: { not: ctx!.userId },
        },
      });

      if (existing) {
        return NextResponse.json({ error: "Email already in use" }, { status: 400 });
      }
    }

    // Build update data
    const updateData: Record<string, unknown> = {};
    if (fullName) updateData.fullName = fullName;
    if (email) updateData.email = email;
    if (newPassword) {
      updateData.passwordHash = await hash(newPassword, 10);
    }

    // Update user
    const user = await db.user.update({
      where: { id: ctx!.userId },
      data: updateData,
      select: userSelect,
    });

    return NextResponse.json({ user });
  } catch (error) {
    const status = getErrorStatus(error);
    return NextResponse.json({ error: (error as Error).message }, { status });
  }
}
