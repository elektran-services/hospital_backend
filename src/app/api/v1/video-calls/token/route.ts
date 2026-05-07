import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { RtcRole } from "agora-token";
import { getAuthContext, requireRole } from "@/lib/api-context";
import { getCorsHeaders, handleCorsOptions } from "@/lib/cors";
import {
  generateAgoraToken,
  generateChannelName,
  uuidToAccount,
} from "@/lib/agora";
import { db } from "@/lib/db";
import { getErrorStatus } from "@/lib/http-error";

/**
 * Request validation schema for video call token generation
 * POST /api/v1/video-calls/token
 */
const generateTokenSchema = z.object({
  branchId: z
    .string()
    .min(1, "Branch ID is required")
    .uuid("Branch ID must be a valid UUID"),
  doctorId: z
    .string()
    .min(1, "Doctor ID is required")
    .uuid("Doctor ID must be a valid UUID"),
  patientId: z
    .string()
    .min(1, "Patient ID is required")
    .uuid("Patient ID must be a valid UUID"),
});

// Handle CORS preflight
export async function OPTIONS() {
  return handleCorsOptions();
}

/**
 * POST /api/v1/video-calls/token
 *
 * Generates an Agora RTC token for initiating a video call between a doctor and patient.
 * This endpoint must be called before attempting to establish a video call via Agora.
 *
 * **Authentication Required:** Yes (Bearer token or access_token cookie)
 * **Roles Allowed:** DOCTOR, PATIENT
 *
 * **Request Body:**
 * ```json
 * {
 *   "branchId": "uuid",
 *   "doctorId": "uuid",
 *   "patientId": "uuid"
 * }
 * ```
 *
 * **Response (200 OK):**
 * ```json
 * {
 *   "message": "Agora tokens generated successfully",
 *   "data": {
 *     "channelName": "branch_id_doctor_id_patient_id",
 *     "caller": {
 *       "role": "publisher",
 *       "account": "patient_id",
 *       "token": "string",
 *       "expiresIn": 86400,
 *       "expiresAt": 1706553290000,
 *       "fcmDeviceToken": "fcm-token-or-null"
 *     },
 *     "receiver": {
 *       "role": "subscriber",
 *       "account": "doctor_id",
 *       "token": "string",
 *       "expiresIn": 86400,
 *       "expiresAt": 1706553290000,
 *       "fcmDeviceToken": "fcm-token-or-null"
 *     },
 *     "requesterRole": "patient|doctor"
 *   }
 * }
 * ```
 *
 * **Error Responses:**
 * - 400: Invalid request body
 * - 401: Unauthorized (missing or invalid token)
 * - 403: Forbidden (user role not allowed)
 * - 404: Doctor, patient, or branch not found
 * - 409: Users not in the same hospital or branch conflicts
 * - 500: Server error
 */
export async function POST(req: NextRequest) {
  try {
    // 1. AUTHENTICATION: Verify user is authenticated
    const authContext = getAuthContext(req);
    requireRole(authContext, ["DOCTOR", "PATIENT"]);

    if (!authContext) {
      return NextResponse.json(
        {
          error: "Unauthorized",
          message: "Authentication token is missing or invalid",
        },
        { status: 401, headers: getCorsHeaders() }
      );
    }

    // 2. VALIDATION: Parse and validate request body
    const body = await req.json().catch(() => null);

    if (!body) {
      return NextResponse.json(
        { error: "Invalid request body", message: "Request body must be JSON" },
        { status: 400, headers: getCorsHeaders() }
      );
    }

    const validationResult = generateTokenSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Validation error",
          details: validationResult.error.flatten(),
        },
        { status: 400, headers: getCorsHeaders() }
      );
    }

    const { branchId, doctorId, patientId } = validationResult.data;

    // 3. AUTHORIZATION: Verify requester is the doctor or patient in this call
    const isDoctor = authContext.userId === doctorId;
    const isPatient = authContext.userId === patientId;

    if (!isDoctor && !isPatient) {
      return NextResponse.json(
        {
          error: "Forbidden",
          message: "You can only generate tokens for calls you are part of",
        },
        { status: 403, headers: getCorsHeaders() }
      );
    }

    // 4. DATABASE VALIDATION: Verify all users exist and have correct roles
    const [doctor, patient, branch] = await Promise.all([
      db.user.findUnique({
        where: { id: doctorId },
        select: {
          id: true,
          role: true,
          hospitalId: true,
          branchId: true,
          fullName: true,
        },
      }),
      db.user.findUnique({
        where: { id: patientId },
        select: {
          id: true,
          role: true,
          hospitalId: true,
          branchId: true,
          fullName: true,
        },
      }),
      db.branch.findUnique({
        where: { id: branchId },
        select: { id: true, hospitalId: true },
      }),
    ]);

    // Validate doctor exists and has DOCTOR role
    if (!doctor) {
      return NextResponse.json(
        { error: "Not found", message: "Doctor not found" },
        { status: 404, headers: getCorsHeaders() }
      );
    }

    if (doctor.role !== "DOCTOR") {
      return NextResponse.json(
        {
          error: "Invalid request",
          message: "The specified doctor ID does not belong to a doctor",
        },
        { status: 400, headers: getCorsHeaders() }
      );
    }

    // Validate patient exists and has PATIENT role
    if (!patient) {
      return NextResponse.json(
        { error: "Not found", message: "Patient not found" },
        { status: 404, headers: getCorsHeaders() }
      );
    }

    if (patient.role !== "PATIENT") {
      return NextResponse.json(
        {
          error: "Invalid request",
          message: "The specified patient ID does not belong to a patient",
        },
        { status: 400, headers: getCorsHeaders() }
      );
    }

    // Validate branch exists
    if (!branch) {
      return NextResponse.json(
        { error: "Not found", message: "Branch not found" },
        { status: 404, headers: getCorsHeaders() }
      );
    }

    // 5. BUSINESS LOGIC VALIDATION: Verify relationships
    // Doctor must be in the same hospital and branch
    if (
      doctor.hospitalId !== authContext.hospitalId ||
      doctor.branchId !== branchId
    ) {
      return NextResponse.json(
        {
          error: "Conflict",
          message:
            "Doctor must be in the same hospital and branch as the request",
        },
        { status: 409, headers: getCorsHeaders() }
      );
    }

    // Patient must be in the same hospital
    if (patient.hospitalId !== authContext.hospitalId) {
      return NextResponse.json(
        {
          error: "Conflict",
          message: "Patient must be in the same hospital as the request",
        },
        { status: 409, headers: getCorsHeaders() }
      );
    }

    // Branch must be in the same hospital
    if (branch.hospitalId !== authContext.hospitalId) {
      return NextResponse.json(
        {
          error: "Conflict",
          message: "Branch must be in the same hospital as the request",
        },
        { status: 409, headers: getCorsHeaders() }
      );
    }

    // 6. FETCH DEVICE TOKENS: Get active device tokens for both users
    const [doctorDeviceTokens, patientDeviceTokens] = await Promise.all([
      db.deviceToken.findMany({
        where: {
          userId: doctorId,
          isActive: true,
        },
        select: { fcmToken: true },
      }),
      db.deviceToken.findMany({
        where: {
          userId: patientId,
          isActive: true,
        },
        select: { fcmToken: true },
      }),
    ]);

    // Get primary device tokens (most recently updated)
    const doctorDeviceToken = doctorDeviceTokens[0]?.fcmToken || null;
    const patientDeviceToken = patientDeviceTokens[0]?.fcmToken || null;

    // 7. TOKEN GENERATION: Generate Agora tokens
    // First, fetch Agora config from database (seeded value)
    const agoraConfig = await db.agoraConfig.findFirst();
    const agoraAppId = agoraConfig?.appId || process.env.AGORA_APP_ID || "";
    const agoraAppCertificate = process.env.AGORA_APP_CERTIFICATE || "";

    console.log("🔐 Using Agora credentials:", {
      appIdSource: agoraConfig ? "database" : "environment",
      appId: agoraAppId,
      certificateSet: !!agoraAppCertificate,
    });

    // Both users need the same channel but different tokens based on their roles
    // Patient (caller) = Publisher (can send video/audio)
    // Doctor (receiver) = Subscriber (receive-only)
    const channelName = generateChannelName(branchId, doctorId, patientId);

    const patientToken = generateAgoraToken({
      channelName,
      userAccount: patientId,
      role: RtcRole.PUBLISHER, // Patient publishes video/audio (caller)
      expirationInSeconds: 86400, // 24 hours
      appId: agoraAppId,  // Pass seeded App ID
      appCertificate: agoraAppCertificate,  // Pass certificate
    });

    const doctorToken = generateAgoraToken({
      channelName,
      userAccount: doctorId,
      role: RtcRole.SUBSCRIBER, // Doctor receives only (receiver)
      expirationInSeconds: 86400, // 24 hours
      appId: agoraAppId,  // Pass seeded App ID
      appCertificate: agoraAppCertificate,  // Pass certificate
    });

    // 8. RESPONSE: Return both tokens and requester info
    const response = NextResponse.json(
      {
        message: "Agora tokens generated successfully",
        data: {
          agoraAppId: agoraAppId,
          channelName: channelName,
          caller: {
            role: "publisher",
            account: patientToken.account,
            token: patientToken.token,
            expiresIn: patientToken.expiresIn,
            expiresAt: patientToken.expiresAt,
            fcmDeviceToken: patientDeviceToken,
          },
          receiver: {
            role: "subscriber",
            account: doctorToken.account,
            token: doctorToken.token,
            expiresIn: doctorToken.expiresIn,
            expiresAt: doctorToken.expiresAt,
            fcmDeviceToken: doctorDeviceToken,
          },
          requesterRole: authContext.userId === patientId ? "patient" : "doctor",
        },
      },
      { status: 200, headers: getCorsHeaders() }
    );

    return response;
  } catch (error) {
    console.error("Error generating Agora token:", error);
    const status = getErrorStatus(error, 500);
    if (error instanceof Error && status !== 500) {
      const message = status === 401 ? "Unauthorized" : status === 403 ? "Forbidden" : "Error";
      return NextResponse.json(
        { error: message, message: error.message },
        { status, headers: getCorsHeaders() }
      );
    }

    return NextResponse.json(
      {
        error: "Internal Server Error",
        message: "Failed to generate token. Please try again later.",
      },
      { status: 500, headers: getCorsHeaders() }
    );
  }
}
