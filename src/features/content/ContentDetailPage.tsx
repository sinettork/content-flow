import { ArrowLeft, CalendarDays, ChevronRight, Clock, Pencil, Trash2, User } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { CampaignBadge } from "@/components/campaigns/CampaignBadge";
import { AppLoader } from "@/components/common/AppLoader";
import { Breadcrumbs } from "@/components/common/Breadcrumbs";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";
import { ContentAssetsSection } from "@/components/content/ContentAssetsSection";
import { ContentStatusBadge } from "@/components/content/ContentStatusBadge";
import { PlatformStatusList } from "@/components/content/PlatformStatusList";
import { ActivityTimeline } from "@/components/tables/ActivityTimeline";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { CommentsSection } from "@/features/comments/CommentsSection";
import { useRole } from "@/hooks/usePermission";
import { useWorkspaceRealtime } from "@/hooks/useWorkspaceRealtime";
import type { MasterStatus } from "@/lib/constants";
import { formatDate, formatDateTime, fromNow } from "@/lib/dates";
import { activityService, campaignService, contentService, platformService, profileService, workflowService } from "@/services";
import { toast } from "@/stores/toast-store";
import { useAuthStore } from "@/stores/auth-store";
import type { ActivityLog, Campaign, ContentItem, ContentPlatform, ContentVersion, Profile } from "@/types";

const STATUS_LABELS: Record<MasterStatus, string> = {
  draft: "Draft",
  in_review: "In Review",
  changes_requested: "Changes requested",
  approved: "Approved",
  scheduled: "Scheduled",
  posted: "Published",
  archived: "Archived",
};

const PRIMARY_ACTION_LABELS: Partial<Record<MasterStatus, string>> = {
  in_review: "Send for review",
  changes_requested: "Request changes",
  approved: "Approve",
  scheduled: "Schedule",
  posted: "Mark as published",
};

const DISPLAY_STATUSES: MasterStatus[] = ["draft", "in_review", "changes_requested", "approved", "scheduled", "posted"];

export function ContentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { can, role } = useRole();
  const userId = useAuthStore((s) => s.user?.id) ?? "";
  const workspaceId = useAuthStore((s) => s.profile?.workspace_id) ?? "";

  const [item, setItem] = useState<ContentItem | null>(null);
  const [platforms, setPlatforms] = useState<ContentPlatform[]>([]);
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [assignee, setAssignee] = useState<Profile | null>(null);
  const [creator, setCreator] = useState<Profile | null>(null);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [versions, setVersions] = useState<ContentVersion[]>([]);
  const [profileMap, setProfileMap] = useState<Record<string, Profile>>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!id) return;
    const content = await contentService.get(id);
    if (!content) {
      setItem(null);
      setLoading(false);
      return;
    }
    setItem(content);

    const [plats, logList, versionList] = await Promise.all([
      platformService.listForItem(id),
      activityService.listForItem(id),
      workflowService.versions(id),
    ]);
    setPlatforms(plats);
    setLogs(logList);
    setVersions(versionList);

    const [campaignValue, assigneeValue, creatorValue] = await Promise.all([
      content.campaign_id ? campaignService.get(content.campaign_id) : Promise.resolve(null),
      content.assigned_to ? profileService.get(content.assigned_to) : Promise.resolve(null),
      profileService.get(content.created_by),
    ]);
    setCampaign(campaignValue);
    setAssignee(assigneeValue);
    setCreator(creatorValue);

    const userIds = [...new Set([...logList.map((log) => log.user_id), content.created_by, content.assigned_to].filter(Boolean) as string[])];
    setProfileMap(await profileService.byIds(userIds));
    setLoading(false);
  }, [id]);

  useEffect(() => { void load(); }, [load]);
  useWorkspaceRealtime(workspaceId, load);

  const handleDelete = async () => {
    if (!id) return;
    await contentService.remove(id);
    toast("Content deleted", { variant: "destructive" });
    navigate("/app/content", { replace: true });
  };

  const moveTo = async (nextStatus: MasterStatus) => {
    if (!item) return;
    try {
      const oldStatus = item.master_status;
      await contentService.setStatus(item.id, nextStatus, { role, userId });
      if (oldStatus !== nextStatus) {
        await activityService.log({
          workspace_id: workspaceId,
          content_item_id: item.id,
          user_id: userId,
          action_type: "status.changed",
          old_value: { status: oldStatus },
          new_value: { status: nextStatus },
        });
      }
      toast("Moved to " + STATUS_LABELS[nextStatus], { variant: "success" });
      await load();
    } catch (error) {
      toast(error instanceof Error ? error.message : "Unable to update this content.", { variant: "destructive" });
    }
  };

  if (loading) return <AppLoader label="Loading content" />;
  if (!item) return <EmptyState title="Content not found" description="The item may have been deleted." />;

  const allowedTransitions = contentService.allowedTransitions(item.master_status, role);
  const recommendedTransition = item.master_status === "in_review" && allowedTransitions.includes("approved")
    ? "approved"
    : allowedTransitions[0];
  const primaryActionLabel = recommendedTransition
    ? PRIMARY_ACTION_LABELS[recommendedTransition] ?? STATUS_LABELS[recommendedTransition]
    : null;

  return (
    <>
      <Breadcrumbs items={[{ label: "Content", to: "/app/content" }, { label: item.title }]} />

      <PageHeader
        title={item.title}
        description={item.content_type + " · Updated " + fromNow(item.updated_at)}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate("/app/content")}>
              <ArrowLeft className="mr-1 h-4 w-4" /> Back
            </Button>
            {can("editContent") && (
              <Button variant="outline" size="sm" asChild>
                <Link to={"/app/content/" + item.id + "/edit"}>
                  <Pencil className="mr-1 h-4 w-4" /> Edit
                </Link>
              </Button>
            )}
            {can("deleteContent") && (
              <ConfirmDialog
                trigger={
                  <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                    <Trash2 className="mr-1 h-4 w-4" /> Delete
                  </Button>
                }
                title="Delete content"
                description="This will permanently remove this content item and its related records."
                confirmLabel="Delete"
                destructive
                onConfirm={handleDelete}
              />
            )}
          </div>
        }
      />

      <div className="mb-5 rounded-lg border bg-card">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3 border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <ContentStatusBadge status={item.master_status} />
            <span className="text-sm font-medium">{STATUS_LABELS[item.master_status]}</span>
          </div>
          <div className="hidden h-4 w-px bg-border sm:block" />
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <User className="h-3.5 w-3.5" /> {assignee?.full_name ?? "Unassigned"}
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <CalendarDays className="h-3.5 w-3.5" /> {item.due_at ? formatDate(item.due_at, "MMM d") : "No due date"}
          </div>
          {campaign && <CampaignBadge name={campaign.name} color={campaign.color} className="text-[11px]" />}
        </div>

        <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold">
              {recommendedTransition ? PRIMARY_ACTION_LABELS[recommendedTransition] ?? "Continue workflow" : "This content is complete"}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {recommendedTransition === "in_review" && "Submit the current version to the reviewer."}
              {recommendedTransition === "changes_requested" && "Send feedback back to the content owner."}
              {recommendedTransition === "approved" && "This content is approved and can move to scheduling."}
              {recommendedTransition === "scheduled" && "Set a publish time, then schedule the content."}
              {recommendedTransition === "posted" && "Confirm the content is live."}
              {!recommendedTransition && "No further action is available for your role."}
            </p>
          </div>
          {recommendedTransition && primaryActionLabel && can("changeStatus") && (
            <Button size="sm" onClick={() => void moveTo(recommendedTransition)}>
              {primaryActionLabel}
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          )}
        </div>

        <div className="grid grid-cols-3 gap-px border-t bg-border sm:grid-cols-6">
          {DISPLAY_STATUSES.map((status) => {
            const active = item.master_status === status;
            const completed = DISPLAY_STATUSES.indexOf(status) < DISPLAY_STATUSES.indexOf(item.master_status);
            return (
              <div key={status} className={"bg-card px-2.5 py-2 text-center text-[11px] " + (active ? "text-primary" : completed ? "text-foreground" : "text-muted-foreground")}>
                <span className={active ? "font-semibold" : "font-medium"}>{STATUS_LABELS[status]}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.65fr)_minmax(320px,0.85fr)]">
        <div className="space-y-5">
          {item.brief && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Brief</CardTitle></CardHeader>
              <CardContent><p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{item.brief}</p></CardContent>
            </Card>
          )}

          <ContentAssetsSection contentItemId={item.id} workspaceId={item.workspace_id} userId={userId} canEdit={can("editContent")} />

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Publishing</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {platforms.length > 0 ? <PlatformStatusList platforms={platforms} /> : <p className="text-sm text-muted-foreground">No platforms configured yet.</p>}
              {item.scheduled_at && <div className="flex items-center gap-2 border-t pt-3 text-xs text-muted-foreground"><Clock className="h-3.5 w-3.5" /> Scheduled for {formatDateTime(item.scheduled_at)}</div>}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-5">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Updates</CardTitle></CardHeader>
            <CardContent><CommentsSection contentItemId={item.id} workspaceId={item.workspace_id} /></CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Details</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between gap-3"><span className="text-muted-foreground">Owner</span><span className="font-medium">{assignee?.full_name ?? "Unassigned"}</span></div>
              <div className="flex items-center justify-between gap-3"><span className="text-muted-foreground">Created by</span><span className="font-medium">{creator?.full_name ?? "Unknown"}</span></div>
              <div className="flex items-center justify-between gap-3"><span className="text-muted-foreground">Priority</span><Badge variant="secondary" className="capitalize">{item.priority}</Badge></div>
              {item.scheduled_at && <div className="flex items-center justify-between gap-3"><span className="text-muted-foreground">Publish date</span><span className="font-medium">{formatDateTime(item.scheduled_at)}</span></div>}
            </CardContent>
          </Card>

          <details className="rounded-lg border bg-card">
            <summary className="cursor-pointer px-4 py-3 text-sm font-medium">History</summary>
            <div className="space-y-4 border-t p-4">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Activity</p>
                <ActivityTimeline logs={logs} profileMap={profileMap} />
              </div>
              {versions.length > 0 && <>
                <Separator />
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Versions</p>
                  <div className="space-y-2">
                    {versions.slice(0, 10).map((version) => (
                      <div key={version.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-xs">
                        <span className="font-medium">Version {version.version_number}</span>
                        <span className="text-muted-foreground">{fromNow(version.created_at)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>}
            </div>
          </details>
        </div>
      </div>
    </>
  );
}