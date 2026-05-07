import { hash } from "bcryptjs";
import { db } from "@/lib/db";

export type UserRole = "SYSTEM_ADMIN" | "SUPER_ADMIN" | "BRANCH_MANAGER" | "DOCTOR" | "PATIENT";

export interface UserCreateInput {
  full_name: string;
  email: string;
  role: UserRole;
  hospital_id: string;
  branch_id?: string;
  password_hash?: string;
  password_plain?: string;
}

export class UserService {
  async createUser(input: UserCreateInput) {
    const passwordHash =
      input.password_hash ?? (input.password_plain ? await hash(input.password_plain, 10) : undefined);

    if (!passwordHash) {
      throw new Error("password_hash or password_plain is required");
    }

    return db.user.create({
      data: {
        hospitalId: input.hospital_id,
        branchId: input.branch_id ?? null,
        fullName: input.full_name,
        email: input.email,
        role: input.role,
        status: "ACTIVE",
        passwordHash,
        emailVerifiedAt: new Date(),
      },
      select: {
        id: true,
        hospitalId: true,
        branchId: true,
        fullName: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });
  }

  async listUsers(hospitalId: string, branchId?: string) {
    const where =
      branchId != null
        ? { hospitalId, branchId }
        : { hospitalId };

    return db.user.findMany({
      where,
      select: {
        id: true,
        hospitalId: true,
        branchId: true,
        fullName: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }
}

