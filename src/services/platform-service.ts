import { isSupabaseBackend } from "@/lib/backend";
import type { Platform, PlatformStatus } from "@/lib/constants";
import { findBy, findById, genId, insert, remove, removeWhere, update } from "@/lib/mock/db";
import { deleteOne, deleteWhere, insertOne, selectMany, selectOne, updateOne } from "@/lib/supabase/repository";
import type { ContentPlatform } from "@/types";

export const platformService = {
  async listForItem(contentItemId: string): Promise<ContentPlatform[]> {
    if (isSupabaseBackend) {
      return selectMany<ContentPlatform>("content_platforms", (q) =>
        q.eq("content_item_id", contentItemId).order("platform_name")
      );
    }
    return (findBy("content_platforms", (p) => p.content_item_id === contentItemId) as ContentPlatform[])
      .slice()
      .sort((a, b) => a.platform_name.localeCompare(b.platform_name));
  },

  async listForItems(contentItemIds: string[]): Promise<Record<string, ContentPlatform[]>> {
    if (contentItemIds.length === 0) return {};
    if (isSupabaseBackend) {
      const rows = await selectMany<ContentPlatform>("content_platforms", (q) =>
        q.in("content_item_id", contentItemIds).order("platform_name")
      );
      return rows.reduce<Record<string, ContentPlatform[]>>((acc, row) => {
        (acc[row.content_item_id] ??= []).push(row);
        return acc;
      }, {});
    }
    const ids = new Set(contentItemIds);
    const rows = findBy("content_platforms", (p) => ids.has(p.content_item_id)) as ContentPlatform[];

    return rows.reduce<Record<string, ContentPlatform[]>>((acc, row) => {
      (acc[row.content_item_id] ??= []).push(row);
      acc[row.content_item_id].sort((a, b) => a.platform_name.localeCompare(b.platform_name));
      return acc;
    }, {});
  },

  async get(id: string): Promise<ContentPlatform | null> {
    if (isSupabaseBackend) return selectOne<ContentPlatform>("content_platforms", id);
    return (findById("content_platforms", id) as ContentPlatform | undefined) ?? null;
  },

  async create(input: Omit<ContentPlatform, "id" | "created_at" | "updated_at">): Promise<ContentPlatform> {
    if (isSupabaseBackend) return insertOne<ContentPlatform>("content_platforms", input);
    const now = new Date().toISOString();
    const row: ContentPlatform = { ...input, id: genId("cp"), created_at: now, updated_at: now };
    return insert("content_platforms", row) as ContentPlatform;
  },

  async update(id: string, patch: Partial<ContentPlatform>): Promise<ContentPlatform | null> {
    if (isSupabaseBackend) return updateOne<ContentPlatform>("content_platforms", id, patch);
    return (update("content_platforms", id, patch) as ContentPlatform | undefined) ?? null;
  },

  async setStatus(id: string, status: PlatformStatus): Promise<ContentPlatform | null> {
    return this.update(id, { platform_status: status });
  },

  async markPosted(id: string, postUrl: string, postedBy: string): Promise<ContentPlatform | null> {
    return this.update(id, {
      platform_status: "posted",
      posted_at: new Date().toISOString(),
      post_url: postUrl,
      posted_by: postedBy,
    });
  },

  async removeForItem(contentItemId: string): Promise<number> {
    if (isSupabaseBackend) return deleteWhere("content_platforms", "content_item_id", contentItemId);
    return removeWhere("content_platforms", (platform) => platform.content_item_id === contentItemId);
  },

  async remove(id: string): Promise<boolean> {
    if (isSupabaseBackend) return deleteOne("content_platforms", id);
    return remove("content_platforms", id);
  },

  // Calendar helper: return all scheduled platform records within a range
  async scheduledBetween(fromIso: string, toIso: string, platform?: Platform): Promise<ContentPlatform[]> {
    if (isSupabaseBackend) {
      return selectMany<ContentPlatform>("content_platforms", (base) => {
        let query = base.gte("scheduled_at", fromIso).lte("scheduled_at", toIso).order("scheduled_at");
        if (platform) query = query.eq("platform_name", platform);
        return query;
      });
    }
    return findBy("content_platforms", (p) => {
      if (!p.scheduled_at) return false;
      if (p.scheduled_at < fromIso || p.scheduled_at > toIso) return false;
      if (platform && p.platform_name !== platform) return false;
      return true;
    }) as ContentPlatform[];
  },
};
