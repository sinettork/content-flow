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
import { activityService } from "@/services/activity-service";
import { assetService } from "@/services/asset-service";
import { commentService } from "@/services/comment-service";
import { platformService } from "@/services/platform-service";
import type { ContentItem } from "@/types";

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

export const contentService = {
  async list(filters: ContentFilters = {}): Promise<ContentItem[]> {
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

    const now = new Date().toISOString();
    const slug = input.slug ?? input.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const row: ContentItem = {
      ...input,
      slug,
      id: genId("ci"),
      created_at: now,
      updated_at: now,
    };
    return insert("content_items", row) as ContentItem;
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

    return (update("content_items", id, patch) as ContentItem | undefined) ?? null;
  },

  async archive(id: string, actor: ContentActor): Promise<ContentItem | null> {
    return this.setStatus(id, "archived", actor);
  },

  async remove(id: string): Promise<boolean> {
    await Promise.all([
      platformService.removeForItem(id),
      commentService.removeForItem(id),
      activityService.removeForItem(id),
      assetService.removeForItem(id),
    ]);
    return remove("content_items", id);
  },
};
