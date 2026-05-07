import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { hash } from "bcryptjs";
import { db } from "@/lib/db";
import { rateLimitAuth } from "@/lib/rate-limit";
import { createOTP, sendOTPEmail } from "@/lib/otp";

const schema = z.object({
  hospital_id: z.string().uuid(),
  first_name: z.string().min(2),
  last_name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
});

export async function POST(req: NextRequest) {
  const limit = rateLimitAuth(req, "patient-register", 5, 10 * 60 * 1000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many registration attempts. Please try again later." },
      { status: 429, headers: { "Retry-After": `${Math.ceil((limit.reset - Date.now()) / 1000)}` } },
    );
  }

  try {
    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { hospital_id, first_name, last_name, email, password } = parsed.data;

    // Verify hospital exists
    const hospital = await db.hospital.findUnique({
      where: { id: hospital_id },
    });

    if (!hospital) {
      return NextResponse.json({ error: "Hospital not found" }, { status: 404 });
    }

    // Check if email already exists in this hospital
    const existingUser = await db.user.findFirst({
      where: {
        email,
        hospitalId: hospital_id,
      },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Email already registered in this hospital" },
        { status: 400 }
      );
    }

    // Hash password
    const passwordHash = await hash(password, 10);

    // Create patient user (status PENDING until OTP verification)
    const user = await db.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          hospitalId: hospital_id,
          branchId: null, // Patients are not assigned to specific branches initially
          role: "PATIENT",
          status: "PENDING",
          fullName: `${first_name} ${last_name}`,
          email,
          passwordHash,
        },
      });

      // Create patient profile
      await tx.patientProfile.create({
        data: {
          userId: newUser.id,
        },
      });

      return newUser;
    });

    // Generate and send OTP
    const otp = await createOTP(email);
    await sendOTPEmail(email, otp, first_name);

    return NextResponse.json({
      message: "Registration successful. Please verify your email with the OTP sent to you.",
      userId: user.id,
      email: user.email,
      otpSent: true,
      // Include OTP in dev mode for testing
      otp: process.env.NODE_ENV !== "production" ? otp : undefined,
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
