import { isSupabaseBackend } from "@/lib/backend";
import { findBy, genId, getAll, insert, removeWhere } from "@/lib/mock/db";
import { selectMany } from "@/lib/supabase/repository";
import type { ActivityLog, Json } from "@/types";

export const activityService = {
  async listForItem(contentItemId: string, limit = 50): Promise<ActivityLog[]> {
    if (isSupabaseBackend) {
      return selectMany<ActivityLog>("activity_logs", (q) =>
        q.eq("content_item_id", contentItemId).order("created_at", { ascending: false }).limit(limit)
      );
    }
    return (findBy("activity_logs", (a) => a.content_item_id === contentItemId) as ActivityLog[])
      .slice()
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, limit);
  },

  async recent(limit = 20): Promise<ActivityLog[]> {
    if (isSupabaseBackend) {
      return selectMany<ActivityLog>("activity_logs", (q) => q.order("created_at", { ascending: false }).limit(limit));
    }
    return (getAll("activity_logs") as ActivityLog[])
      .slice()
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, limit);
  },

  async removeForItem(contentItemId: string): Promise<number> {
    // Supabase audit events are immutable and cascade with their content item.
    if (isSupabaseBackend) return 0;
    return removeWhere("activity_logs", (activity) => activity.content_item_id === contentItemId);
  },

  async log(input: {
    workspace_id: string;
    content_item_id: string;
    user_id: string;
    action_type: string;
    old_value?: Json | null;
    new_value?: Json | null;
    metadata?: Json | null;
  }): Promise<ActivityLog | null> {
    if (isSupabaseBackend) {
      // The database audit trigger writes the authenticated actor and canonical
      // before/after values. Never accept an audit row from a browser client.
      return null;
    }
    const row: ActivityLog = {
      id: genId("al"),
      created_at: new Date().toISOString(),
      old_value: input.old_value ?? null,
      new_value: input.new_value ?? null,
      metadata: input.metadata ?? null,
      workspace_id: input.workspace_id,
      content_item_id: input.content_item_id,
      user_id: input.user_id,
      action_type: input.action_type,
    };
    return insert("activity_logs", row) as ActivityLog;
  },
};
