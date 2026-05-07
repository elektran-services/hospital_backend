import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      message: "Auth endpoint stub. Implement signup/login with JWT + refresh.",
      requirements: [
        "Email verification for Super Admin",
        "Short-lived access tokens",
        "Refresh tokens in secure storage",
        "Rate limiting on auth endpoints",
      ],
    },
    { status: 501 },
  );
}

