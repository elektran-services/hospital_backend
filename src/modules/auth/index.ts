import { randomUUID } from "crypto";
import { compare, hash } from "bcryptjs";
import { db } from "@/lib/db";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "@/lib/jwt";
import type { Prisma } from "@prisma/client";

export interface SuperAdminSignupInput {
  hospital_name: string;
  admin_name: string;
  admin_email: string;
  password: string;
  logo: string;
}

export type UserRole = "SYSTEM_ADMIN" | "SUPER_ADMIN" | "BRANCH_MANAGER" | "DOCTOR" | "PATIENT";
export type UserStatus = "PENDING" | "ACTIVE" | "SUSPENDED";

export interface AuthTokenPayload {
  sub: string;
  role: UserRole;
  hospital_id: string;
  branch_id?: string;
  exp?: number;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

const REFRESH_TOKEN_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days
const VERIFICATION_TOKEN_TTL_MS = 1000 * 60 * 60 * 24; // 24 hours

export class AuthService {
  async signupSuperAdmin(input: SuperAdminSignupInput) {
    const existingUser = await db.user.findUnique({ where: { email: input.admin_email } });
    if (existingUser) {
      throw new Error("Email already registered");
    }

    const verificationToken = randomUUID();
    const verificationExpires = new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS);
    const passwordHash = await hash(input.password, 10);

    const result = await db.$transaction(async (tx: Prisma.TransactionClient) => {
      const hospital = await tx.hospital.create({
        data: {
          name: input.hospital_name,
          logo: input.logo,
          createdBy: "SYSTEM",
        },
      });

      const branch = await tx.branch.create({
        data: {
          hospitalId: hospital.id,
          name: "Head Office",
          address: "Set address",
          phone: "Set phone",
          email: input.admin_email,
          isHeadBranch: true,
        },
      });

      const user = await tx.user.create({
        data: {
          hospitalId: hospital.id,
          branchId: null,
          role: "SUPER_ADMIN",
          status: "PENDING",
          fullName: input.admin_name,
          email: input.admin_email,
          passwordHash,
        },
      });

      await tx.hospital.update({
        where: { id: hospital.id },
        data: { createdBy: user.id },
      });

      await tx.verificationToken.create({
        data: {
          userId: user.id,
          token: verificationToken,
          expiresAt: verificationExpires,
        },
      });

      return { hospital, branch, user, verificationToken };
    });

    return {
      hospitalId: result.hospital.id,
      branchId: result.branch.id,
      userId: result.user.id,
      verificationToken,
      verificationExpires,
    };
  }

  async verifyEmail(token: string) {
    const record = await db.verificationToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!record) {
      throw new Error("Invalid token");
    }
    if (record.usedAt) {
      throw new Error("Token already used");
    }
    if (record.expiresAt < new Date()) {
      throw new Error("Token expired");
    }

    const updated = await db.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.verificationToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      });

      const user = await tx.user.update({
        where: { id: record.userId },
        data: { status: "ACTIVE", emailVerifiedAt: new Date() },
      });

      return user;
    });

    return updated;
  }

  async login(input: LoginInput) {
    const user = await db.user.findUnique({
      where: { email: input.email },
      include: {
        branch: true,
        hospital: true,
      },
    });

    if (!user || user.deletedAt) {
      throw new Error("Invalid credentials");
    }
    if (user.status !== "ACTIVE") {
      throw new Error("Account not active");
    }

    const passwordOk = await compare(input.password, user.passwordHash);
    if (!passwordOk) {
      throw new Error("Invalid credentials");
    }

    const payload: AuthTokenPayload = {
      sub: user.id,
      role: user.role as UserRole,
      hospital_id: user.hospitalId,
      branch_id: user.branchId ?? undefined,
    };

    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    await db.refreshToken.create({
      data: {
        userId: user.id,
        token: refreshToken,
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
      },
    });

    return {
      user,
      tokenPair: { accessToken, refreshToken },
    };
  }

  async refresh(refreshToken: string) {
    const payload = verifyRefreshToken(refreshToken);
    if (!payload) {
      throw new Error("Invalid refresh token");
    }

    const stored = await db.refreshToken.findUnique({ where: { token: refreshToken } });
    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new Error("Refresh token expired or revoked");
    }

    const user = await db.user.findUnique({ where: { id: payload.sub } });
    if (!user || user.status !== "ACTIVE" || user.deletedAt) {
      throw new Error("User not allowed");
    }

    const newPayload: AuthTokenPayload = {
      sub: user.id,
      role: user.role as UserRole,
      hospital_id: user.hospitalId,
      branch_id: user.branchId ?? undefined,
    };

    const accessToken = signAccessToken(newPayload);
    const newRefreshToken = signRefreshToken(newPayload);

    await db.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.refreshToken.update({
        where: { id: stored.id },
        data: { revokedAt: new Date() },
      });
      await tx.refreshToken.create({
        data: {
          userId: user.id,
          token: newRefreshToken,
          expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
        },
      });
    });

    return { accessToken, refreshToken: newRefreshToken };
  }
}

