import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthContext, requireAuth } from "@/lib/api-context";
import { db } from "@/lib/db";
import { getCorsHeaders } from "@/lib/cors";

const endCallSchema = z.object({
  sessionId: z.string().uuid("Invalid session ID"),
  callStatus: z.enum(["COMPLETED", "FAILED", "CANCELLED"]).optional(),
});

/**
 * POST /api/v1/video-calls/end
 * Ends an active video call session
 *
 * Request body:
 * {
 *   "sessionId": "uuid",
 *   "callStatus": "COMPLETED" | "FAILED" | "CANCELLED"
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const ctx = getAuthContext(req);
    requireAuth(ctx);

    const body = await req.json();
    const parsed = endCallSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request body",
          details: parsed.error.flatten(),
        },
        { status: 400, headers: getCorsHeaders() }
      );
    }

    const { sessionId, callStatus = "COMPLETED" } = parsed.data;

    // Fetch call session
    const callSession = await db.callSession.findUnique({
      where: { id: sessionId },
      include: { appointment: true },
    });

    if (!callSession) {
      return NextResponse.json(
        {
          success: false,
          error: "Call session not found",
        },
        { status: 404, headers: getCorsHeaders() }
      );
    }

    // Verify user is part of the call
    if (
      ctx!.userId !== callSession.callerId &&
      ctx!.userId !== callSession.receiverId
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized to end this call",
        },
        { status: 403, headers: getCorsHeaders() }
      );
    }

    // Verify tenancy
    if (callSession.hospitalId !== ctx!.hospitalId) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized access to call session",
        },
        { status: 403, headers: getCorsHeaders() }
      );
    }

    // Calculate call duration
    const callStartedAt = callSession.callStartedAt || callSession.createdAt;
    const callEndedAt = new Date();
    const callDurationSeconds = Math.floor(
      (callEndedAt.getTime() - callStartedAt.getTime()) / 1000
    );

    // Update call session
    const updatedSession = await db.callSession.update({
      where: { id: sessionId },
      data: {
        sessionStatus: callStatus as any,
        callStartedAt: callSession.callStartedAt || new Date(),
        callEndedAt: callEndedAt,
        callDuration: Math.max(0, callDurationSeconds),
      },
    });

    // Update appointment
    await db.appointment.update({
      where: { id: callSession.appointmentId },
      data: {
        videoCallIsActive: false,
        videoCallEndedAt: callEndedAt,
        status: callStatus === "COMPLETED" ? "completed" : "confirmed",
        videoCallDuration: Math.max(0, callDurationSeconds),
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Call ended successfully",
        data: {
          sessionId: updatedSession.id,
          duration: updatedSession.callDuration,
          status: updatedSession.sessionStatus,
        },
      },
      { status: 200, headers: getCorsHeaders() }
    );
  } catch (error) {
    console.error("Error ending call:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500, headers: getCorsHeaders() }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: getCorsHeaders(),
  });
}
