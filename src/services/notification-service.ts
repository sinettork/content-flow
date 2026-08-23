import { isSupabaseBackend } from "@/lib/backend";
import { findBy, genId, getAll, insert, update } from "@/lib/mock/db";
import { requireSupabase } from "@/lib/supabase/client";
import { insertOne, selectMany, updateOne } from "@/lib/supabase/repository";
import type { Notification } from "@/types";

export const notificationService = {
  async listForUser(userId: string): Promise<Notification[]> {
    if (isSupabaseBackend) {
      return selectMany<Notification>("notifications", (q) =>
        q.eq("user_id", userId).order("created_at", { ascending: false })
      );
    }
    return (findBy("notifications", (n) => n.user_id === userId) as Notification[])
      .slice()
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  },

  async unreadCount(userId: string): Promise<number> {
    if (isSupabaseBackend) {
      const { count, error } = await requireSupabase()
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("is_read", false);
      if (error) throw new Error(error.message);
      return count ?? 0;
    }
    return (getAll("notifications") as Notification[]).filter((n) => n.user_id === userId && !n.is_read).length;
  },

  async markRead(id: string): Promise<Notification | null> {
    if (isSupabaseBackend) return updateOne<Notification>("notifications", id, { is_read: true });
    return (update("notifications", id, { is_read: true }) as Notification | undefined) ?? null;
  },

  async markAllRead(userId: string): Promise<void> {
    if (isSupabaseBackend) {
      const { error } = await requireSupabase()
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", userId)
        .eq("is_read", false);
      if (error) throw new Error(error.message);
      return;
    }
    const rows = findBy("notifications", (n) => n.user_id === userId && !n.is_read) as Notification[];
    for (const r of rows) update("notifications", r.id, { is_read: true });
  },

  async create(input: Omit<Notification, "id" | "created_at" | "is_read"> & { is_read?: boolean }): Promise<Notification> {
    if (isSupabaseBackend) return insertOne<Notification>("notifications", { ...input, is_read: input.is_read ?? false });
    const row: Notification = {
      ...input,
      is_read: input.is_read ?? false,
      id: genId("n"),
      created_at: new Date().toISOString(),
    };
    return insert("notifications", row) as Notification;
  },
};
