import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getAuthContext, requireRole } from "@/lib/api-context";
import { getFullUrl, saveUploadedFile, deleteFile } from "@/lib/file-upload";
import { getErrorStatus } from "@/lib/http-error";

type HospitalUpdateFields = {
  name?: string;
  logo?: string;
};

const updateSchema = z.object({
  name: z.string().min(2).optional(),
});

export async function GET(req: NextRequest) {
  const ctx = getAuthContext(req);
  try {
    requireRole(ctx, ["SUPER_ADMIN"]);

    const hospital = await db.hospital.findUnique({
      where: { id: ctx!.hospitalId },
      select: {
        id: true,
        name: true,
        logo: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            branches: true,
            users: true,
          },
        },
      },
    });

    if (!hospital) {
      return NextResponse.json({ error: "Hospital not found" }, { status: 404 });
    }

    return NextResponse.json({
      ...hospital,
      logoUrl: getFullUrl(hospital.logo),
    });
  } catch (error) {
    const status = getErrorStatus(error);
    return NextResponse.json({ error: (error as Error).message }, { status });
  }
}

export async function PATCH(req: NextRequest) {
  const ctx = getAuthContext(req);
  try {
    requireRole(ctx, ["SUPER_ADMIN"]);

    const contentType = req.headers.get("content-type") || "";
    let data: HospitalUpdateFields = {};
    let logoPath: string | undefined;
    let shouldDeleteOldLogo = false;

    // Handle multipart/form-data (with logo)
    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();

      // Extract field values
      const name = formData.get("name") as string | null;
      if (name) data.name = name;

      // Process logo if present
      const logoFile = formData.get("logo") as File | null;
      if (logoFile && logoFile.size > 0) {
        logoPath = await saveUploadedFile(logoFile);
        shouldDeleteOldLogo = true;
      }
    }
    // Handle JSON
    else {
      const body = await req.json().catch(() => null);
      const parsed = updateSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
      }
      data = parsed.data;
    }

    // Check if there's anything to update
    if (Object.keys(data).length === 0 && !logoPath) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    // Get current hospital to delete old logo if needed
    let oldLogo: string | null = null;
    if (shouldDeleteOldLogo) {
      const current = await db.hospital.findUnique({
        where: { id: ctx!.hospitalId },
        select: { logo: true },
      });
      oldLogo = current?.logo || null;
    }

    // Update hospital
    const updateData: HospitalUpdateFields = { ...data };
    if (logoPath !== undefined) {
      updateData.logo = logoPath;
    }

    const hospital = await db.hospital.update({
      where: { id: ctx!.hospitalId },
      data: updateData,
      select: {
        id: true,
        name: true,
        logo: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Delete old logo file if a new one was uploaded
    if (shouldDeleteOldLogo && oldLogo) {
      await deleteFile(oldLogo).catch(() => {
        // Ignore errors on cleanup
      });
    }

    return NextResponse.json({
      ...hospital,
      logoUrl: getFullUrl(hospital.logo),
    });
  } catch (error) {
    const status = getErrorStatus(error);
    return NextResponse.json({ error: (error as Error).message }, { status });
  }
}
