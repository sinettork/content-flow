import { findBy, genId, getAll, insert, removeWhere } from "@/lib/mock/db";
import type { ActivityLog, Json } from "@/types";

export const activityService = {
  async listForItem(contentItemId: string, limit = 50): Promise<ActivityLog[]> {
    return (findBy("activity_logs", (a) => a.content_item_id === contentItemId) as ActivityLog[])
      .slice()
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, limit);
  },

  async recent(limit = 20): Promise<ActivityLog[]> {
    return (getAll("activity_logs") as ActivityLog[])
      .slice()
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, limit);
  },

  async removeForItem(contentItemId: string): Promise<number> {
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
  }): Promise<ActivityLog> {
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
