import { isSupabaseBackend } from "@/lib/backend";
import { findBy, genId, insert, remove, removeWhere, update } from "@/lib/mock/db";
import { deleteOne, deleteWhere, insertOne, selectMany, updateOne } from "@/lib/supabase/repository";
import type { Comment } from "@/types";

export const commentService = {
  async listForItem(contentItemId: string): Promise<Comment[]> {
    if (isSupabaseBackend) {
      return selectMany<Comment>("comments", (q) => q.eq("content_item_id", contentItemId).order("created_at"));
    }
    return (findBy("comments", (c) => c.content_item_id === contentItemId) as Comment[])
      .slice()
      .sort((a, b) => a.created_at.localeCompare(b.created_at));
  },

  async create(input: Omit<Comment, "id" | "created_at" | "updated_at">): Promise<Comment> {
    if (isSupabaseBackend) return insertOne<Comment>("comments", input);
    const now = new Date().toISOString();
    const row: Comment = { ...input, id: genId("cm"), created_at: now, updated_at: now };
    return insert("comments", row) as Comment;
  },

  async update(id: string, body: string): Promise<Comment | null> {
    if (isSupabaseBackend) return updateOne<Comment>("comments", id, { body });
    return (update("comments", id, { body }) as Comment | undefined) ?? null;
  },

  async removeForItem(contentItemId: string): Promise<number> {
    if (isSupabaseBackend) return deleteWhere("comments", "content_item_id", contentItemId);
    return removeWhere("comments", (comment) => comment.content_item_id === contentItemId);
  },

  async remove(id: string): Promise<boolean> {
    if (isSupabaseBackend) return deleteOne("comments", id);
    return remove("comments", id);
  },
};
