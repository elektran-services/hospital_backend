import { db } from "@/lib/db";

export interface HospitalCreateInput {
  hospital_name: string;
  created_by: string;
  branch_name?: string;
  branch_address?: string;
  branch_phone?: string;
  branch_email?: string;
}

export class HospitalService {
  async createHospitalWithDefaultBranch(input: HospitalCreateInput) {
    const result = await db.$transaction(async (tx) => {
      const hospital = await tx.hospital.create({
        data: {
          name: input.hospital_name,
          createdBy: input.created_by,
        },
      });

      const branch = await tx.branch.create({
        data: {
          hospitalId: hospital.id,
          name: input.branch_name ?? "Head Office",
          address: input.branch_address ?? "Set address",
          phone: input.branch_phone ?? "Set phone",
          email: input.branch_email ?? `${input.hospital_name.toLowerCase().replace(/\s+/g, "-")}@example.com`,
          isHeadBranch: true,
        },
      });

      return { hospital, branch };
    });

    return result;
  }

  async listHospitals(opts: { limit?: number; cursor?: string } = {}) {
    const take = Math.min(Math.max(opts.limit ?? 20, 1), 100);

    if (opts.cursor) {
      const items = await db.hospital.findMany({
        take,
        skip: 1,
        cursor: { id: opts.cursor },
        orderBy: { createdAt: "desc" },
      });
      return items;
    }

    return db.hospital.findMany({
      take,
      orderBy: { createdAt: "desc" },
    });
  }
}

