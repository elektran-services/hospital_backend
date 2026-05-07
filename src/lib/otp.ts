import { randomInt } from "crypto";
import { db } from "./db";

const OTP_LENGTH = 6;
const OTP_TTL_MS = 1000 * 60 * 10; // 10 minutes

export function generateOTP(): string {
  const otp = randomInt(0, 10 ** OTP_LENGTH).toString().padStart(OTP_LENGTH, "0");
  return otp;
}

export async function createOTP(email: string): Promise<string> {
  const otp = generateOTP();
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);

  await db.otpToken.create({
    data: {
      email,
      otp,
      expiresAt,
    },
  });

  return otp;
}

export async function verifyOTP(email: string, otp: string): Promise<boolean> {
  const record = await db.otpToken.findFirst({
    where: {
      email,
      otp,
      usedAt: null,
      expiresAt: { gte: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!record) {
    return false;
  }

  // Mark OTP as used
  await db.otpToken.update({
    where: { id: record.id },
    data: { usedAt: new Date() },
  });

  return true;
}

export async function sendOTPEmail(email: string, otp: string, firstName: string): Promise<void> {
  // TODO: Integrate with email service (SendGrid, AWS SES, etc.)
  // For now, just log to console in development
  if (process.env.NODE_ENV !== "production") {
    console.log(`
======================================
OTP EMAIL
To: ${email}
Name: ${firstName}
OTP Code: ${otp}
Expires: 10 minutes
======================================
    `);
  }

  // In production, send actual email:
  // await emailService.send({
  //   to: email,
  //   subject: "Your OTP Code",
  //   template: "otp",
  //   data: { firstName, otp }
  // });
}
