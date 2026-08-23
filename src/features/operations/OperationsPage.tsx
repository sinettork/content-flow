import { Check, Clock3, RotateCcw, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useWorkspaceRealtime } from "@/hooks/useWorkspaceRealtime";
import { fromNow } from "@/lib/dates";
import { contentService, workflowService } from "@/services";
import { useAuthStore } from "@/stores/auth-store";
import { toast } from "@/stores/toast-store";
import type { ApprovalRequest, PublishingJob } from "@/types";

export function OperationsPage() {
  const profile = useAuthStore((state) => state.profile);
  const userId = useAuthStore((state) => state.user?.id) ?? "";
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
  const [jobs, setJobs] = useState<PublishingJob[]>([]);
  const [titles, setTitles] = useState<Record<string, string>>({});
  const canReview = profile?.role === "admin" || profile?.role === "manager";
  const workspaceId = profile?.workspace_id ?? "";

  const load = useCallback(async () => {
    const [pending, publishing] = await Promise.all([workflowService.pendingApprovals(), workflowService.publishingJobs()]);
    setApprovals(pending);
    setJobs(publishing);
    const items = await Promise.all([...new Set(pending.map((item) => item.content_item_id))].map((id) => contentService.get(id)));
    setTitles(Object.fromEntries(items.filter(Boolean).map((item) => [item!.id, item!.title])));
  }, []);

  useEffect(() => { load().catch((error: Error) => toast("Could not load operations", { description: error.message, variant: "destructive" })); }, [load]);
  useWorkspaceRealtime(workspaceId, load);

  const decide = async (id: string, decision: "approved" | "changes_requested") => {
    try {
      await workflowService.decide(id, decision, userId);
      toast(decision === "approved" ? "Content approved" : "Changes requested", { variant: "success" });
      await load();
    } catch (error) {
      toast("Review failed", { description: error instanceof Error ? error.message : "Unknown error", variant: "destructive" });
    }
  };

  return (
    <>
      <PageHeader title="Operations" description="Approval queue and publishing job health." actions={<Button variant="outline" onClick={load}><RotateCcw className="mr-2 h-4 w-4" />Refresh</Button>} />
      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Pending approvals</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {approvals.length === 0 ? <EmptyState title="Approval queue is clear" description="Submitted content will appear here." /> : approvals.map((request) => (
              <div key={request.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
                <div><p className="font-medium">{titles[request.content_item_id] ?? "Content item"}</p><p className="text-xs text-muted-foreground">Requested {fromNow(request.created_at)}</p></div>
                {canReview && <div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => decide(request.id, "changes_requested")}><X className="mr-1 h-4 w-4" />Changes</Button><Button size="sm" onClick={() => decide(request.id, "approved")}><Check className="mr-1 h-4 w-4" />Approve</Button></div>}
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Publishing jobs</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {jobs.length === 0 ? <EmptyState title="No publishing jobs" description="Scheduled provider jobs will appear here when publishing integrations are configured." /> : jobs.map((job) => (
              <div key={job.id} className="flex items-center justify-between gap-3 rounded-lg border p-3"><div><p className="font-medium">Job {job.id.slice(0, 8)}</p><p className="flex items-center gap-1 text-xs text-muted-foreground"><Clock3 className="h-3 w-3" />{fromNow(job.run_at)} · {job.attempts} attempts</p></div><Badge variant={job.status === "failed" ? "destructive" : "secondary"}>{job.status}</Badge></div>
            ))}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
