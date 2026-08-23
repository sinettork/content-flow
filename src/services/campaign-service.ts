import { findById, genId, getAll, insert, remove, update } from "@/lib/mock/db";
import type { Campaign } from "@/types";

export const campaignService = {
  async list(): Promise<Campaign[]> {
    return (getAll("campaigns") as Campaign[])
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name));
  },

  async get(id: string): Promise<Campaign | null> {
    return (findById("campaigns", id) as Campaign | undefined) ?? null;
  },

  async create(input: Omit<Campaign, "id" | "created_at" | "updated_at">): Promise<Campaign> {
    const now = new Date().toISOString();
    const row: Campaign = { ...input, id: genId("c"), created_at: now, updated_at: now };
    return insert("campaigns", row) as Campaign;
  },

  async update(id: string, patch: Partial<Campaign>): Promise<Campaign | null> {
    return (update("campaigns", id, patch) as Campaign | undefined) ?? null;
  },

  async remove(id: string): Promise<boolean> {
    return remove("campaigns", id);
  },
};
