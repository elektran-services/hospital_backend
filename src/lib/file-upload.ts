import fs from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "hospitals");
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

export async function ensureUploadDir() {
  try {
    await fs.access(UPLOAD_DIR);
  } catch {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
  }
}

export async function saveUploadedFile(file: File): Promise<string> {
  await ensureUploadDir();

  console.log("[file-upload] Processing file:", { name: file.name, type: file.type, size: file.size });

  // Validate file type
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error(`Invalid file type. Allowed: ${ALLOWED_TYPES.join(", ")}. Got: ${file.type}`);
  }

  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File too large. Maximum size: ${MAX_FILE_SIZE / 1024 / 1024}MB. Got: ${file.size / 1024 / 1024}MB`);
  }

  // Generate unique filename
  const ext = path.extname(file.name) || ".png";
  const filename = `${randomUUID()}${ext}`;
  const filepath = path.join(UPLOAD_DIR, filename);

  console.log("[file-upload] Saving to:", filepath);

  // Save file
  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(filepath, buffer);

  console.log("[file-upload] File saved successfully:", filename);

  // Return relative path from public folder
  return `/uploads/hospitals/${filename}`;
}

export function getFullUrl(relativePath: string | null | undefined): string | null {
  if (!relativePath) return null;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://localhost:3000";
  return `${baseUrl}${relativePath}`;
}

export async function deleteFile(relativePath: string) {
  if (!relativePath) return;
  try {
    const fullPath = path.join(process.cwd(), "public", relativePath);
    await fs.unlink(fullPath);
  } catch (err) {
    console.error("Failed to delete file:", err);
  }
}
