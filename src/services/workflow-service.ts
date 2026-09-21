import { isSupabaseBackend } from "@/lib/backend";
import type { ApprovalDecision } from "@/lib/constants";
import { findBy, genId, insert, update } from "@/lib/mock/db";
import { requireSupabase } from "@/lib/supabase/client";
import { selectMany } from "@/lib/supabase/repository";
import type { ApprovalRequest, ContentVersion, PublishingJob } from "@/types";

export interface PublishingJobFilters {
  status?: PublishingJob["status"] | "all";
  search?: string;
}

export const workflowService = {
  async pendingApprovals(): Promise<ApprovalRequest[]> {
    if (isSupabaseBackend) {
      return selectMany<ApprovalRequest>("approval_requests", (q) =>
        q.is("decision", null).order("created_at", { ascending: false })
      );
    }
    return (findBy("approval_requests", (request) => request.decision === null) as ApprovalRequest[])
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  },

  async request(contentItemId: string, workspaceId: string, userId: string): Promise<ApprovalRequest> {
    if (isSupabaseBackend) {
      const { data, error } = await requireSupabase().rpc("request_content_approval", { target_content_id: contentItemId });
      if (error) throw new Error(error.message);
      return data as ApprovalRequest;
    }
    const row: ApprovalRequest = {
      id: genId("ar"), workspace_id: workspaceId, content_item_id: contentItemId, requested_by: userId,
      reviewed_by: null, decision: null, decision_note: null, created_at: new Date().toISOString(), decided_at: null,
    };
    update("content_items", contentItemId, { master_status: "in_review" });
    return insert("approval_requests", row) as ApprovalRequest;
  },

  async decide(id: string, decision: ApprovalDecision, reviewerId: string, note?: string): Promise<ApprovalRequest> {
    if (isSupabaseBackend) {
      const { data, error } = await requireSupabase().rpc("decide_content_approval", {
        target_request_id: id, target_decision: decision, note: note ?? null,
      });
      if (error) throw new Error(error.message);
      return data as ApprovalRequest;
    }
    const request = findBy("approval_requests", (row) => row.id === id)[0] as ApprovalRequest | undefined;
    if (!request) throw new Error("Approval request not found.");
    const now = new Date().toISOString();
    update("content_items", request.content_item_id, {
      master_status: decision === "approved" ? "approved" : "changes_requested",
      approved_by: decision === "approved" ? reviewerId : null,
      approved_at: decision === "approved" ? now : null,
    });
    return update("approval_requests", id, {
      decision, decision_note: note ?? null, reviewed_by: reviewerId, decided_at: now,
    }) as ApprovalRequest;
  },

  async versions(contentItemId: string): Promise<ContentVersion[]> {
    if (!isSupabaseBackend) return [];
    return selectMany<ContentVersion>("content_versions", (q) =>
      q.eq("content_item_id", contentItemId).order("version_number", { ascending: false })
    );
  },

  async publishingJobs(filters: PublishingJobFilters = {}): Promise<PublishingJob[]> {
    if (!isSupabaseBackend) return [];
    return selectMany<PublishingJob>("publishing_jobs", (q) => {
      let query = q.order("run_at", { ascending: false }).limit(100);
      if (filters.status && filters.status !== "all") query = query.eq("status", filters.status);
      if (filters.search?.trim()) query = query.ilike("last_error", `%${filters.search.trim()}%`);
      return query;
    });
  },

  async retryPublishingJob(id: string): Promise<PublishingJob> {
    if (!isSupabaseBackend) throw new Error("Retry is only available when publishing integrations are configured.");
    const { data, error } = await requireSupabase()
      .from("publishing_jobs")
      .update({
        status: "queued",
        run_at: new Date().toISOString(),
        locked_at: null,
        completed_at: null,
        last_error: null,
      })
      .eq("id", id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data as PublishingJob;
  },
};
