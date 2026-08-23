import { isSupabaseBackend } from "@/lib/backend";
import { findById, genId, getAll, insert, remove, update } from "@/lib/mock/db";
import { deleteOne, insertOne, selectMany, selectOne, updateOne } from "@/lib/supabase/repository";
import type { Campaign } from "@/types";

export const campaignService = {
  async list(): Promise<Campaign[]> {
    if (isSupabaseBackend) return selectMany<Campaign>("campaigns", (q) => q.order("name"));
    return (getAll("campaigns") as Campaign[])
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name));
  },

  async get(id: string): Promise<Campaign | null> {
    if (isSupabaseBackend) return selectOne<Campaign>("campaigns", id);
    return (findById("campaigns", id) as Campaign | undefined) ?? null;
  },

  async create(input: Omit<Campaign, "id" | "created_at" | "updated_at">): Promise<Campaign> {
    if (isSupabaseBackend) return insertOne<Campaign>("campaigns", input);
    const now = new Date().toISOString();
    const row: Campaign = { ...input, id: genId("c"), created_at: now, updated_at: now };
    return insert("campaigns", row) as Campaign;
  },

  async update(id: string, patch: Partial<Campaign>): Promise<Campaign | null> {
    if (isSupabaseBackend) return updateOne<Campaign>("campaigns", id, patch);
    return (update("campaigns", id, patch) as Campaign | undefined) ?? null;
  },

  async remove(id: string): Promise<boolean> {
    if (isSupabaseBackend) return deleteOne("campaigns", id);
    return remove("campaigns", id);
  },
};
