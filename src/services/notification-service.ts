import { findBy, genId, getAll, insert, update } from "@/lib/mock/db";
import type { Notification } from "@/types";

export const notificationService = {
  async listForUser(userId: string): Promise<Notification[]> {
    return (findBy("notifications", (n) => n.user_id === userId) as Notification[])
      .slice()
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  },

  async unreadCount(userId: string): Promise<number> {
    return (getAll("notifications") as Notification[]).filter((n) => n.user_id === userId && !n.is_read).length;
  },

  async markRead(id: string): Promise<Notification | null> {
    return (update("notifications", id, { is_read: true }) as Notification | undefined) ?? null;
  },

  async markAllRead(userId: string): Promise<void> {
    const rows = findBy("notifications", (n) => n.user_id === userId && !n.is_read) as Notification[];
    for (const r of rows) update("notifications", r.id, { is_read: true });
  },

  async create(input: Omit<Notification, "id" | "created_at" | "is_read"> & { is_read?: boolean }): Promise<Notification> {
    const row: Notification = {
      ...input,
      is_read: input.is_read ?? false,
      id: genId("n"),
      created_at: new Date().toISOString(),
    };
    return insert("notifications", row) as Notification;
  },
};
