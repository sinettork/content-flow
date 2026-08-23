import { findBy, genId, insert, remove, removeWhere, update } from "@/lib/mock/db";
import type { Comment } from "@/types";

export const commentService = {
  async listForItem(contentItemId: string): Promise<Comment[]> {
    return (findBy("comments", (c) => c.content_item_id === contentItemId) as Comment[])
      .slice()
      .sort((a, b) => a.created_at.localeCompare(b.created_at));
  },

  async create(input: Omit<Comment, "id" | "created_at" | "updated_at">): Promise<Comment> {
    const now = new Date().toISOString();
    const row: Comment = { ...input, id: genId("cm"), created_at: now, updated_at: now };
    return insert("comments", row) as Comment;
  },

  async update(id: string, body: string): Promise<Comment | null> {
    return (update("comments", id, { body }) as Comment | undefined) ?? null;
  },

  async removeForItem(contentItemId: string): Promise<number> {
    return removeWhere("comments", (comment) => comment.content_item_id === contentItemId);
  },

  async remove(id: string): Promise<boolean> {
    return remove("comments", id);
  },
};
