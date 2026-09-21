import { isSupabaseBackend } from "@/lib/backend";
import {
  PERMISSIONS,
  WORKFLOW_TRANSITIONS,
  canTransition,
  hasMinRole,
  type MasterStatus,
  type Platform,
  type Role,
} from "@/lib/constants";
import { findBy, findById, genId, getAll, insert, remove, update } from "@/lib/mock/db";
import { requireSupabase } from "@/lib/supabase/client";
import { deleteOne, insertOne, selectMany, selectOne, updateOne } from "@/lib/supabase/repository";
import { activityService } from "@/services/activity-service";
import { assetService } from "@/services/asset-service";
import { commentService } from "@/services/comment-service";
import { platformService } from "@/services/platform-service";
import type { ContentItem, ContentPlatform } from "@/types";

export interface ContentFilters {
  search?: string;
  status?: MasterStatus | "all";
  campaign_id?: string | "all";
  assigned_to?: string | "all";
  platform?: Platform | "all";
}

interface ContentActor {
  role: Role | null | undefined;
  userId: string;
}

export interface ContentReadiness {
  isReady: boolean;
  checks: Array<{ key: string; label: string; complete: boolean }>;
}

export function getContentReadiness(item: Pick<ContentItem, "title" | "brief" | "campaign_id" | "assigned_to">, platforms: Pick<ContentPlatform, "checklist_completed">[] = []): ContentReadiness {
  const checks = [
    { key: "title", label: "Title added", complete: Boolean(item.title.trim()) },
    { key: "brief", label: "Brief added", complete: Boolean(item.brief?.trim()) },
    { key: "campaign", label: "Campaign selected", complete: Boolean(item.campaign_id) },
    { key: "assignee", label: "Owner assigned", complete: Boolean(item.assigned_to) },
    { key: "platform", label: "At least one platform configured", complete: platforms.length > 0 },
    { key: "checklist", label: "Platform checklists complete", complete: platforms.length > 0 && platforms.every((platform) => platform.checklist_completed) },
  ];
  return { checks, isReady: checks.every((check) => check.complete) };
}

export const contentService = {
  async list(filters: ContentFilters = {}): Promise<ContentItem[]> {
    if (isSupabaseBackend) {
      return selectMany<ContentItem>("content_items", (base) => {
        let query = base.order("updated_at", { ascending: false });
        if (filters.status && filters.status !== "all") query = query.eq("master_status", filters.status);
        if (filters.campaign_id && filters.campaign_id !== "all") query = query.eq("campaign_id", filters.campaign_id);
        if (filters.assigned_to && filters.assigned_to !== "all") query = query.eq("assigned_to", filters.assigned_to);
        if (filters.search) {
          const safe = filters.search.replace(/[,%()]/g, " ").trim();
          if (safe) query = query.or(`title.ilike.%${safe}%,slug.ilike.%${safe}%`);
        }
        if (filters.platform && filters.platform !== "all") {
          query = query.eq("content_platforms.platform_name", filters.platform).select("*,content_platforms!inner(platform_name)");
        }
        return query;
      });
    }
    let rows = getAll("content_items") as ContentItem[];
    if (filters.status && filters.status !== "all") {
      rows = rows.filter((r) => r.master_status === filters.status);
    }
    if (filters.campaign_id && filters.campaign_id !== "all") {
      rows = rows.filter((r) => r.campaign_id === filters.campaign_id);
    }
    if (filters.assigned_to && filters.assigned_to !== "all") {
      rows = rows.filter((r) => r.assigned_to === filters.assigned_to);
    }
    if (filters.search) {
      const q = filters.search.toLowerCase();
      rows = rows.filter((r) => r.title.toLowerCase().includes(q) || r.slug.toLowerCase().includes(q));
    }
    if (filters.platform && filters.platform !== "all") {
      const platformItems = new Set(
        findBy("content_platforms", (p) => p.platform_name === filters.platform).map((p) => p.content_item_id)
      );
      rows = rows.filter((r) => platformItems.has(r.id));
    }
    return rows.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  },

  async get(id: string): Promise<ContentItem | null> {
    if (isSupabaseBackend) return selectOne<ContentItem>("content_items", id);
    return (findById("content_items", id) as ContentItem | undefined) ?? null;
  },

  allowedTransitions(status: MasterStatus, role: Role | null | undefined): MasterStatus[] {
    if (!role || !hasMinRole(role, PERMISSIONS.changeStatus)) {
      return [];
    }
    return WORKFLOW_TRANSITIONS[status].filter((nextStatus) => {
      if (nextStatus === "approved") {
        return hasMinRole(role, PERMISSIONS.approveContent);
      }
      return true;
    });
  },

  async create(
    input: Omit<ContentItem, "id" | "created_at" | "updated_at" | "slug"> & { slug?: string }
  ): Promise<ContentItem> {
    if (input.master_status !== "draft") {
      throw new Error("New content items must start in Draft.");
    }

    const slug = input.slug ?? input.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    if (isSupabaseBackend) return insertOne<ContentItem>("content_items", { ...input, slug });

    const now = new Date().toISOString();
    const row: ContentItem = {
      ...input,
      slug,
      id: genId("ci"),
      created_at: now,
      updated_at: now,
    };
    return insert("content_items", row) as ContentItem;
  },

  async duplicate(id: string, actor: { userId: string }): Promise<ContentItem> {
    const source = await this.get(id);
    if (!source) throw new Error("Content item not found.");
    const copy = await this.create({
      workspace_id: source.workspace_id,
      campaign_id: source.campaign_id,
      title: `${source.title} (Copy)`,
      content_type: source.content_type,
      master_status: "draft",
      priority: source.priority,
      brief: source.brief,
      thumbnail_asset_id: null,
      created_by: actor.userId,
      assigned_to: source.assigned_to,
      approved_by: null,
      approved_at: null,
      due_at: null,
      scheduled_at: null,
      posted_at: null,
      archived_at: null,
    });
    const sourcePlatforms = await platformService.listForItem(source.id);
    await Promise.all(sourcePlatforms.map((platform) => platformService.create({
      workspace_id: platform.workspace_id,
      content_item_id: copy.id,
      platform_name: platform.platform_name,
      platform_status: "draft",
      caption: platform.caption,
      hashtags: platform.hashtags,
      scheduled_at: null,
      posted_at: null,
      post_url: null,
      posted_by: null,
      checklist_completed: false,
      notes: platform.notes,
    })));
    return copy;
  },

  async update(id: string, patch: Partial<ContentItem>, actor?: ContentActor): Promise<ContentItem | null> {
    const existing = await this.get(id);
    if (!existing) return null;

    if (patch.master_status && patch.master_status !== existing.master_status) {
      if (!actor) {
        throw new Error("Status updates must include the acting user.");
      }
      return this.setStatus(id, patch.master_status, actor, patch);
    }

    if (isSupabaseBackend) return updateOne<ContentItem>("content_items", id, patch);
    return (update("content_items", id, patch) as ContentItem | undefined) ?? null;
  },

  async setStatus(
    id: string,
    status: MasterStatus,
    actor: ContentActor,
    extraPatch: Partial<ContentItem> = {}
  ): Promise<ContentItem | null> {
    const existing = await this.get(id);
    if (!existing) return null;

    if (!actor.role || !hasMinRole(actor.role, PERMISSIONS.changeStatus)) {
      throw new Error("You do not have permission to change content status.");
    }
    if (!canTransition(existing.master_status, status)) {
      throw new Error(`Cannot move content from ${existing.master_status} to ${status}.`);
    }
    if (status === "approved" && !hasMinRole(actor.role, PERMISSIONS.approveContent)) {
      throw new Error("Only managers and admins can approve content.");
    }

    if (status === "in_review") {
      if (isSupabaseBackend) {
        const { error } = await requireSupabase().rpc("request_content_approval", { target_content_id: id });
        if (error) throw new Error(error.message);
        return this.get(id);
      }
      const now = new Date().toISOString();
      insert("approval_requests", {
        id: genId("ar"), workspace_id: existing.workspace_id, content_item_id: id,
        requested_by: actor.userId, reviewed_by: null, decision: null, decision_note: null,
        created_at: now, decided_at: null,
      });
    }

    const now = new Date().toISOString();
    const patch: Partial<ContentItem> = { ...extraPatch, master_status: status };

    if (status === "approved") {
      patch.approved_at = now;
      patch.approved_by = actor.userId;
    }

    if (status === "posted") {
      patch.posted_at = now;
    }

    if (status === "archived") {
      patch.archived_at = now;
    } else if (existing.master_status === "archived") {
      patch.archived_at = null;
    }

    if (status === "draft" || status === "in_review" || status === "changes_requested") {
      patch.approved_at = null;
      patch.approved_by = null;
      patch.posted_at = null;
    }

    if (isSupabaseBackend) return updateOne<ContentItem>("content_items", id, patch);
    return (update("content_items", id, patch) as ContentItem | undefined) ?? null;
  },

  async archive(id: string, actor: ContentActor): Promise<ContentItem | null> {
    return this.setStatus(id, "archived", actor);
  },

  async remove(id: string): Promise<boolean> {
    if (isSupabaseBackend) {
      // Postgres cascades the metadata rows but cannot remove objects from
      // Storage. Remove physical assets first so deleting content never leaves
      // private bucket orphans behind.
      await assetService.removeForItem(id);
      return deleteOne("content_items", id);
    }
    await Promise.all([
      platformService.removeForItem(id),
      commentService.removeForItem(id),
      activityService.removeForItem(id),
      assetService.removeForItem(id),
    ]);
    return remove("content_items", id);
  },
};
