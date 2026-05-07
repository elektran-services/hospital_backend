import { db } from "@/lib/db";

export interface BranchCreateInput {
  branch_name: string;
  hospital_id: string;
  address: string;
  phone: string;
  email: string;
  is_head_branch: boolean;
  city?: string;
  state?: string;
  country?: string;
}

export class BranchService {
  async createBranch(input: BranchCreateInput) {
    return db.branch.create({
      data: {
        hospitalId: input.hospital_id,
        name: input.branch_name,
        address: input.address,
        city: input.city,
        state: input.state,
        country: input.country,
        phone: input.phone,
        email: input.email,
        isHeadBranch: input.is_head_branch,
      },
    });
  }

  async listBranches(hospitalId: string) {
    return db.branch.findMany({
      where: { hospitalId },
      orderBy: { createdAt: "desc" },
    });
  }
}

