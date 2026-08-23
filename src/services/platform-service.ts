import type { Platform, PlatformStatus } from "@/lib/constants";
import { findBy, findById, genId, insert, remove, removeWhere, update } from "@/lib/mock/db";
import type { ContentPlatform } from "@/types";

export const platformService = {
  async listForItem(contentItemId: string): Promise<ContentPlatform[]> {
    return (findBy("content_platforms", (p) => p.content_item_id === contentItemId) as ContentPlatform[])
      .slice()
      .sort((a, b) => a.platform_name.localeCompare(b.platform_name));
  },

  async listForItems(contentItemIds: string[]): Promise<Record<string, ContentPlatform[]>> {
    const ids = new Set(contentItemIds);
    const rows = findBy("content_platforms", (p) => ids.has(p.content_item_id)) as ContentPlatform[];

    return rows.reduce<Record<string, ContentPlatform[]>>((acc, row) => {
      (acc[row.content_item_id] ??= []).push(row);
      acc[row.content_item_id].sort((a, b) => a.platform_name.localeCompare(b.platform_name));
      return acc;
    }, {});
  },

  async get(id: string): Promise<ContentPlatform | null> {
    return (findById("content_platforms", id) as ContentPlatform | undefined) ?? null;
  },

  async create(input: Omit<ContentPlatform, "id" | "created_at" | "updated_at">): Promise<ContentPlatform> {
    const now = new Date().toISOString();
    const row: ContentPlatform = { ...input, id: genId("cp"), created_at: now, updated_at: now };
    return insert("content_platforms", row) as ContentPlatform;
  },

  async update(id: string, patch: Partial<ContentPlatform>): Promise<ContentPlatform | null> {
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
    return removeWhere("content_platforms", (platform) => platform.content_item_id === contentItemId);
  },

  async remove(id: string): Promise<boolean> {
    return remove("content_platforms", id);
  },

  // Calendar helper: return all scheduled platform records within a range
  async scheduledBetween(fromIso: string, toIso: string, platform?: Platform): Promise<ContentPlatform[]> {
    return findBy("content_platforms", (p) => {
      if (!p.scheduled_at) return false;
      if (p.scheduled_at < fromIso || p.scheduled_at > toIso) return false;
      if (platform && p.platform_name !== platform) return false;
      return true;
    }) as ContentPlatform[];
  },
};
