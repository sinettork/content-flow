import { Check, Clock3, RotateCcw, Search, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useWorkspaceRealtime } from "@/hooks/useWorkspaceRealtime";
import { fromNow } from "@/lib/dates";
import { contentService, workflowService } from "@/services";
import { useAuthStore } from "@/stores/auth-store";
import { toast } from "@/stores/toast-store";
import type { ApprovalRequest, ContentItem, PublishingJob } from "@/types";

export function OperationsPage() {
  const profile = useAuthStore((state) => state.profile);
  const userId = useAuthStore((state) => state.user?.id) ?? "";
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
  const [jobs, setJobs] = useState<PublishingJob[]>([]);
  const [titles, setTitles] = useState<Record<string, string>>({});
  const [contentItems, setContentItems] = useState<Record<string, ContentItem>>({});
  const [approvalSearch, setApprovalSearch] = useState("");
  const [jobStatus, setJobStatus] = useState<"all" | PublishingJob["status"]>("all");
  const [jobSearch, setJobSearch] = useState("");
  const [retrying, setRetrying] = useState<string | null>(null);
  const [reviewRequest, setReviewRequest] = useState<{ id: string; decision: "approved" | "changes_requested" } | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const canReview = profile?.role === "admin" || profile?.role === "manager";
  const workspaceId = profile?.workspace_id ?? "";

  const load = useCallback(async () => {
    const [pending, publishing] = await Promise.all([
      workflowService.pendingApprovals(),
      workflowService.publishingJobs({ status: jobStatus, search: jobSearch }),
    ]);
    setApprovals(pending);
    setJobs(publishing);
    const items = await Promise.all([...new Set(pending.map((item) => item.content_item_id))].map((id) => contentService.get(id)));
    const validItems = items.filter(Boolean) as ContentItem[];
    setTitles(Object.fromEntries(validItems.map((item) => [item.id, item.title])));
    setContentItems(Object.fromEntries(validItems.map((item) => [item.id, item])));
  }, [jobSearch, jobStatus]);

  useEffect(() => { load().catch((error: Error) => toast("Could not load operations", { description: error.message, variant: "destructive" })); }, [load]);
  useWorkspaceRealtime(workspaceId, load);

  const decide = async (id: string, decision: "approved" | "changes_requested", note?: string) => {
    try {
      await workflowService.decide(id, decision, userId, note?.trim() || undefined);
      toast(decision === "approved" ? "Content approved" : "Changes requested", { variant: "success" });
      setReviewRequest(null);
      setReviewNote("");
      await load();
    } catch (error) {
      toast("Review failed", { description: error instanceof Error ? error.message : "Unknown error", variant: "destructive" });
    }
  };

  const openDecision = (id: string, decision: "approved" | "changes_requested") => {
    setReviewRequest({ id, decision });
    setReviewNote("");
  };

  const retry = async (id: string) => {
    setRetrying(id);
    try {
      await workflowService.retryPublishingJob(id);
      toast("Publishing job queued for retry", { variant: "success" });
      await load();
    } catch (error) {
      toast("Retry failed", { description: error instanceof Error ? error.message : "Unknown error", variant: "destructive" });
    } finally {
      setRetrying(null);
    }
  };

  const visibleApprovals = approvals.filter((request) =>
    (titles[request.content_item_id] ?? "").toLowerCase().includes(approvalSearch.toLowerCase().trim())
  );

  return (
    <>
      <PageHeader title="Approvals & Publishing" description="Review content and recover publishing jobs that need attention." actions={<Button variant="outline" onClick={load}><RotateCcw className="mr-2 h-4 w-4" />Refresh</Button>} />
      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader className="space-y-3">
            <CardTitle>Pending approvals</CardTitle>
            <div className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input className="pl-9" value={approvalSearch} onChange={(event) => setApprovalSearch(event.target.value)} placeholder="Filter by content title" /></div>
          </CardHeader>
          <CardContent className="space-y-3">
            {visibleApprovals.length === 0 ? <EmptyState title="Approval queue is clear" description="Submitted content will appear here." /> : visibleApprovals.map((request) => (
              <div key={request.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
                <div className="min-w-0"><p className="font-medium">{titles[request.content_item_id] ?? "Content item"}</p><p className="text-xs text-muted-foreground">Requested {fromNow(request.created_at)} · {contentItems[request.content_item_id]?.priority ?? "medium"} priority · {contentItems[request.content_item_id]?.content_type ?? "content"}</p>{contentItems[request.content_item_id]?.brief && <p className="mt-1 text-sm text-muted-foreground">{contentItems[request.content_item_id].brief}</p>}</div>
                {canReview && <div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => openDecision(request.id, "changes_requested")}><X className="mr-1 h-4 w-4" />Changes</Button><Button size="sm" onClick={() => openDecision(request.id, "approved")}><Check className="mr-1 h-4 w-4" />Approve</Button></div>}
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="space-y-3">
            <CardTitle>Publishing jobs</CardTitle>
            <div className="flex flex-wrap gap-2">
              <Input className="min-w-[12rem] flex-1" value={jobSearch} onChange={(event) => setJobSearch(event.target.value)} placeholder="Search failure details" />
              <Select className="w-36" value={jobStatus} onChange={(event) => setJobStatus(event.target.value as typeof jobStatus)} aria-label="Filter publishing jobs">
                <option value="all">All statuses</option><option value="queued">Queued</option><option value="processing">Processing</option><option value="succeeded">Succeeded</option><option value="failed">Failed</option><option value="cancelled">Cancelled</option>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {jobs.length === 0 ? <EmptyState title="No publishing jobs" description="Scheduled provider jobs will appear here when publishing integrations are configured." /> : jobs.map((job) => (
              <div key={job.id} className="flex flex-wrap items-start justify-between gap-3 rounded-lg border p-3">
                <div className="min-w-0"><p className="font-medium">Job {job.id.slice(0, 8)}</p><p className="flex items-center gap-1 text-xs text-muted-foreground"><Clock3 className="h-3 w-3" />{fromNow(job.run_at)} · {job.attempts} attempts</p>{job.last_error && <p className="mt-1 text-sm text-destructive">{job.last_error}</p>}</div>
                <div className="flex items-center gap-2"><Badge variant={job.status === "failed" ? "destructive" : "secondary"}>{job.status}</Badge>{job.status === "failed" && <Button size="sm" variant="outline" disabled={retrying === job.id} onClick={() => retry(job.id)}><RotateCcw className="mr-1 h-4 w-4" />Retry</Button>}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Dialog open={Boolean(reviewRequest)} onOpenChange={(open) => { if (!open) { setReviewRequest(null); setReviewNote(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{reviewRequest?.decision === "approved" ? "Approve content" : "Request changes"}</DialogTitle>
            <DialogDescription>
              {reviewRequest?.decision === "approved"
                ? "Confirm that this content is ready for the next workflow step."
                : "Add a clear note so the owner knows what to change before resubmitting."}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={reviewNote}
            onChange={(event) => setReviewNote(event.target.value)}
            placeholder={reviewRequest?.decision === "approved" ? "Optional approval note…" : "What should be changed?"}
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setReviewRequest(null); setReviewNote(""); }}>Cancel</Button>
            <Button
              variant={reviewRequest?.decision === "approved" ? "default" : "destructive"}
              onClick={() => reviewRequest && void decide(reviewRequest.id, reviewRequest.decision, reviewNote)}
            >
              {reviewRequest?.decision === "approved" ? "Approve content" : "Request changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
