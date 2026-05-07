import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getAuthContext, requireRole } from "@/lib/api-context";
import { getFullUrl } from "@/lib/file-upload";
import { getErrorStatus } from "@/lib/http-error";

// Schema for patient profile updates
const updateProfileSchema = z.object({
  // Personal & Demographic
  dateOfBirth: z.string().datetime().optional(),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
  maritalStatus: z.enum(["SINGLE", "MARRIED", "DIVORCED", "WIDOWED", "OTHER"]).optional(),
  nationality: z.string().min(2).max(100).optional(),
  stateOfResidence: z.string().min(2).max(100).optional(),
  city: z.string().min(2).max(100).optional(),
  address: z.string().min(5).max(500).optional(),

  // Medical Baseline
  bloodGroup: z
    .enum(["A_POSITIVE", "A_NEGATIVE", "B_POSITIVE", "B_NEGATIVE", "AB_POSITIVE", "AB_NEGATIVE", "O_POSITIVE", "O_NEGATIVE"])
    .optional(),
  genotype: z.enum(["AA", "AS", "AC", "SS", "SC", "CC"]).optional(),
  knownAllergies: z.string().max(1000).optional(),
  existingConditions: z.string().max(1000).optional(),
  disabilities: z.string().max(500).optional(),

  // Emergency Contact
  emergencyContactName: z.string().min(2).max(200).optional(),
  emergencyContactPhone: z.string().min(7).max(20).optional(),
  emergencyContactRelationship: z.string().min(2).max(100).optional(),
});

/**
 * GET /api/v1/patients/me
 * Get current patient's profile information
 */
export async function GET(req: NextRequest) {
  try {
    const ctx = getAuthContext(req);
    requireRole(ctx, ["PATIENT"]);

    const user = await db.user.findUnique({
      where: { id: ctx!.userId },
      include: {
        patientProfile: true,
        hospital: {
          select: {
            id: true,
            name: true,
            logo: true,
          },
        },
      },
    });

    if (!user || !user.patientProfile) {
      return NextResponse.json({ error: "Patient profile not found" }, { status: 404 });
    }

    return NextResponse.json({
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        emailVerifiedAt: user.emailVerifiedAt,
        status: user.status,
      },
      hospital: {
        ...user.hospital,
        logoUrl: getFullUrl(user.hospital.logo),
      },
      profile: {
        ...user.patientProfile,
        dateOfBirth: user.patientProfile.dateOfBirth?.toISOString(),
      },
    });
  } catch (error: unknown) {
    const status = getErrorStatus(error, 500);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status }
    );
  }
}

/**
 * PATCH /api/v1/patients/me
 * Update current patient's profile information
 */
export async function PATCH(req: NextRequest) {
  try {
    const ctx = getAuthContext(req);
    requireRole(ctx, ["PATIENT"]);

    const body = await req.json().catch(() => null);
    const parsed = updateProfileSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    // Check if patient profile exists
    const existingProfile = await db.patientProfile.findUnique({
      where: { userId: ctx!.userId },
    });

    if (!existingProfile) {
      return NextResponse.json({ error: "Patient profile not found" }, { status: 404 });
    }

    // Convert dateOfBirth string to Date if provided
    const updateData: Record<string, unknown> = { ...parsed.data };
    if (typeof parsed.data.dateOfBirth === "string") {
      updateData.dateOfBirth = new Date(parsed.data.dateOfBirth);
    }

    // Update patient profile
    const updatedProfile = await db.patientProfile.update({
      where: { userId: ctx!.userId },
      data: updateData,
    });

    return NextResponse.json({
      message: "Profile updated successfully",
      profile: {
        ...updatedProfile,
        dateOfBirth: updatedProfile.dateOfBirth?.toISOString(),
      },
    });
  } catch (error: unknown) {
    const status = getErrorStatus(error, 500);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status }
    );
  }
}
