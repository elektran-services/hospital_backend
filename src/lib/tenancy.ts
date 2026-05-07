import type { AuthTokenPayload } from "@/modules/auth";

export function assertHospitalScope(token: AuthTokenPayload | null, hospitalId?: string) {
  if (!token) {
    throw new Error("Unauthorized: missing token");
  }
  if (hospitalId && token.hospital_id !== hospitalId) {
    throw new Error("Forbidden: cross-tenant access blocked");
  }
}

