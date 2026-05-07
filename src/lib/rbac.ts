export const Roles = {
  SYSTEM_ADMIN: "SYSTEM_ADMIN",
  SUPER_ADMIN: "SUPER_ADMIN",
  BRANCH_MANAGER: "BRANCH_MANAGER",
  DOCTOR: "DOCTOR",
  PATIENT: "PATIENT",
} as const;

export type Role = (typeof Roles)[keyof typeof Roles];

export function canAccess(role: Role, allowed: Role[]): boolean {
  return allowed.includes(role);
}

