import { NextRequest, NextResponse } from "next/server";
import { getAuthContext, requireAuth } from "@/lib/api-context";
import { db } from "@/lib/db";
import { getCorsHeaders } from "@/lib/cors";

/**
 * GET /api/v1/video-calls/session/[sessionId]
 * Retrieves call session details
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const ctx = getAuthContext(req);
    requireAuth(ctx);

    const { sessionId } = await params;

    // Fetch call session
    const callSession = await db.callSession.findUnique({
      where: { id: sessionId },
      include: {
        appointment: {
          include: {
            doctor: true,
            patient: true,
            branch: true,
            hospital: true,
          },
        },
      },
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
          error: "Unauthorized to access this call session",
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

    // Determine which token to send based on user role
    const isReceiver = ctx!.userId === callSession.receiverId;
    const token = isReceiver ? callSession.agoraReceiverToken : callSession.agoraCallerToken;

    return NextResponse.json(
      {
        success: true,
        data: {
          sessionId: callSession.id,
          channelId: callSession.channelId,
          token: token,
          uid: isReceiver ? callSession.receiverId : callSession.callerId,
          userRole: isReceiver ? "receiver" : "caller",
          sessionStatus: callSession.sessionStatus,
          callStatus: callSession.appointment.status,
          appointmentId: callSession.appointmentId,
          callStartedAt: callSession.callStartedAt,
          callEndedAt: callSession.callEndedAt,
          callDuration: callSession.callDuration,
          doctor: {
            id: callSession.appointment.doctor.id,
            name: callSession.appointment.doctor.fullName,
            email: callSession.appointment.doctor.email,
          },
          patient: {
            id: callSession.appointment.patient.id,
            name: callSession.appointment.patient.fullName,
            email: callSession.appointment.patient.email,
          },
          hospital: {
            id: callSession.appointment.hospital.id,
            name: callSession.appointment.hospital.name,
            logo: callSession.appointment.hospital.logo,
          },
          branch: {
            id: callSession.appointment.branch.id,
            name: callSession.appointment.branch.name,
          },
        },
      },
      { status: 200, headers: getCorsHeaders() }
    );
  } catch (error) {
    console.error("Error retrieving call session:", error);
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
