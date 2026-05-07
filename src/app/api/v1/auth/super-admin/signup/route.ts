import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { AuthService } from "@/modules/auth";
import { rateLimitAuth } from "@/lib/rate-limit";
import { saveUploadedFile } from "@/lib/file-upload";
import { getCorsHeaders, handleCorsOptions } from "@/lib/cors";

const schema = z.object({
  hospital_name: z.string().min(2),
  admin_name: z.string().min(2),
  admin_email: z.string().email(),
  password: z.string().min(8),
});

// Handle CORS preflight
export async function OPTIONS() {
  return handleCorsOptions();
}

function corsHeaders() {
  return getCorsHeaders();
}

export async function POST(req: NextRequest) {
  const limit = rateLimitAuth(req, "super-admin-signup", 5, 10 * 60 * 1000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many signup attempts. Please try again later." },
      { status: 429, headers: { "Retry-After": `${Math.ceil((limit.reset - Date.now()) / 1000)}`, ...corsHeaders() } },
    );
  }

  try {
    const contentType = req.headers.get("content-type") || "";
    
    // Logo is required, so multipart/form-data is required
    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json(
        { error: "Hospital logo is required. Please use multipart/form-data and include a logo file." },
        { status: 400, headers: corsHeaders() }
      );
    }

    const formData = await req.formData();

    // Extract field values
    const data = {
      hospital_name: formData.get("hospital_name") as string,
      admin_name: formData.get("admin_name") as string,
      admin_email: formData.get("admin_email") as string,
      password: formData.get("password") as string,
    };

    // Validate data is present
    if (!data.hospital_name || !data.admin_name || !data.admin_email || !data.password) {
      return NextResponse.json(
        { error: "Missing required fields: hospital_name, admin_name, admin_email, password" },
        { status: 400, headers: corsHeaders() }
      );
    }

    // Process logo (required)
    const logoFile = formData.get("logo") as File | null;
    if (!logoFile || logoFile.size === 0) {
      return NextResponse.json(
        { error: "Hospital logo is required. Please upload a logo image (JPEG, PNG, or WebP)." },
        { status: 400, headers: corsHeaders() }
      );
    }

    const logoPath = await saveUploadedFile(logoFile);

    const parsed = schema.safeParse(data);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400, headers: corsHeaders() });
    }

    const service = new AuthService();
    const result = await service.signupSuperAdmin({
      ...parsed.data,
      logo: logoPath,
    });

    return NextResponse.json({
      message: "Signup created. Verify email to activate account.",
      verificationToken: result.verificationToken,
      verificationExpires: result.verificationExpires,
      hospitalId: result.hospitalId,
      userId: result.userId,
    }, { headers: corsHeaders() });
  } catch (error) {
    console.error("[signup] Error:", error);
    return NextResponse.json({ 
      error: (error as Error).message,
      detail: process.env.NODE_ENV !== "production" ? (error as Error).stack : undefined
    }, { status: 400, headers: corsHeaders() });
  }
}

