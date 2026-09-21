import { ArrowLeft, Pencil, Trash2, Clock, User, Briefcase, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";

import { CampaignBadge } from "@/components/campaigns/CampaignBadge";
import { AppLoader } from "@/components/common/AppLoader";
import { Breadcrumbs } from "@/components/common/Breadcrumbs";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";
import { ContentStatusBadge } from "@/components/content/ContentStatusBadge";
import { PlatformStatusList } from "@/components/content/PlatformStatusList";
import { ActivityTimeline } from "@/components/tables/ActivityTimeline";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { CommentsSection } from "@/features/comments/CommentsSection";
import { useRole } from "@/hooks/usePermission";
import { useWorkspaceRealtime } from "@/hooks/useWorkspaceRealtime";
import type { MasterStatus } from "@/lib/constants";
import { formatDate, formatDateTime, fromNow } from "@/lib/dates";
import { contentService, platformService, campaignService, profileService, activityService, workflowService } from "@/services";
import { useAuthStore } from "@/stores/auth-store";
import { toast } from "@/stores/toast-store";
import type { Campaign, ContentItem, ContentPlatform, Profile, ActivityLog, ContentVersion } from "@/types";

const STATUS_LABELS: Record<MasterStatus, string> = {
  draft: "Draft", in_review: "In Review", changes_requested: "Changes Requested",
  approved: "Approved", scheduled: "Scheduled", posted: "Posted", archived: "Archived",
};

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

    if (content.campaign_id) setCampaign(await campaignService.get(content.campaign_id));
    if (content.assigned_to) setAssignee(await profileService.get(content.assigned_to));
    setCreator(await profileService.get(content.created_by));

    const userIds = [...new Set([...logList.map((l) => l.user_id), content.created_by, content.assigned_to].filter(Boolean) as string[])];
    const map = await profileService.byIds(userIds);
    setProfileMap(map);
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);
  useWorkspaceRealtime(workspaceId, load);

  const handleDelete = async () => {
    if (!id) return;
    await contentService.remove(id);
    toast("Content deleted", { variant: "destructive" });
    navigate("/app/content", { replace: true });
  };

  if (loading) return <AppLoader label="Loading content" />;
  if (!item) return <EmptyState title="Content not found" description="The item may have been deleted." />;

  const allowedTransitions = contentService.allowedTransitions(item.master_status, role);

  return (
    <>
      <Breadcrumbs items={[
        { label: "Content", to: "/app/content" },
        { label: item.title },
      ]} />
      <PageHeader
        title={item.title}
        description={`${item.content_type} · Created ${fromNow(item.created_at)}`}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate("/app/content")}>
              <ArrowLeft className="mr-1 h-4 w-4" /> Back
            </Button>
            {can("editContent") && (
              <Button variant="outline" size="sm" asChild>
                <Link to={`/app/content/${item.id}/edit`}>
                  <Pencil className="mr-1 h-4 w-4" /> Edit
                </Link>
              </Button>
            )}
            {can("deleteContent") && (
              <ConfirmDialog
                trigger={
                  <Button variant="destructive" size="sm">
                    <Trash2 className="mr-1 h-4 w-4" /> Delete
                  </Button>
                }
                title="Delete content"
                description="This will permanently remove this content item and all related records."
                confirmLabel="Delete"
                destructive
                onConfirm={handleDelete}
              />
            )}
          </div>
        }
      />

      {allowedTransitions.length > 0 && (
        <Card className="mb-6 border-primary/20 bg-primary/[0.03]">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <p className="text-sm font-semibold">Next step</p>
              <p className="text-sm text-muted-foreground">
                {item.master_status === "draft"
                  ? "Send this draft for review when the brief and platforms are ready."
                  : item.master_status === "in_review"
                    ? "Review the feedback and move the content to the next approval state."
                    : item.master_status === "changes_requested"
                      ? "Apply the requested changes, then resubmit for review."
                      : item.master_status === "approved"
                        ? "Choose a publish time and schedule the approved content."
                        : item.master_status === "scheduled"
                          ? "Confirm the publishing result when this content goes live."
                          : "Choose the next available workflow action."}
              </p>
            </div>
            <Button
              type="button"
              onClick={async () => {
                const nextStatus = allowedTransitions[0];
                try {
                  await contentService.setStatus(item.id, nextStatus, { role, userId });
                  toast(`Moved to ${STATUS_LABELS[nextStatus]}`, { variant: "success" });
                  await load();
                } catch (error) {
                  toast(error instanceof Error ? error.message : "Unable to update this content.", { variant: "destructive" });
                }
              }}
            >
              <ChevronRight className="mr-1 h-4 w-4" />
              {STATUS_LABELS[allowedTransitions[0]]}
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left column */}
        <div className="space-y-6 lg:col-span-2">
          {/* Basic info */}
          <Card>
            <CardHeader><CardTitle className="text-sm font-medium">Details</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Status</span>
                <div className="mt-1 flex items-center gap-2">
                  <ContentStatusBadge status={item.master_status} />
                  {can("changeStatus") && allowedTransitions.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {allowedTransitions.map((next) => (
                        <Button
                          type="button"
                          variant="outline"
                          key={next}
                          className="h-6 gap-0.5 rounded-full px-2 py-0.5 text-[10px]"
                          onClick={async () => {
                            try {
                              const old = item.master_status;
                              await contentService.setStatus(item.id, next, { role, userId });
                              await activityService.log({
                                workspace_id: workspaceId,
                                content_item_id: item.id,
                                user_id: userId,
                                action_type: "status.changed",
                                old_value: { status: old },
                                new_value: { status: next },
                              });
                              toast(`Status → ${STATUS_LABELS[next]}`, { variant: "success" });
                              load();
                            } catch (error) {
                              toast(error instanceof Error ? error.message : "Unable to change status.", { variant: "destructive" });
                            }
                          }}
                        >
                          <ChevronRight className="h-3 w-3" /> {STATUS_LABELS[next]}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">Priority</span>
                <div className="mt-1 capitalize font-medium">{item.priority}</div>
              </div>
              <div className="flex items-start gap-2">
                <Briefcase className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div>
                  <span className="text-muted-foreground">Campaign</span>
                  <div className="mt-0.5 font-medium">
                    {campaign ? (
                      <CampaignBadge name={campaign.name} color={campaign.color} />
                    ) : "—"}
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <User className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div>
                  <span className="text-muted-foreground">Assignee</span>
                  <div className="mt-0.5 font-medium">{assignee?.full_name ?? "Unassigned"}</div>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Clock className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div>
                  <span className="text-muted-foreground">Scheduled</span>
                  <div className="mt-0.5">{formatDateTime(item.scheduled_at)}</div>
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">Created by</span>
                <div className="mt-0.5 font-medium">{creator?.full_name ?? "Unknown"}</div>
              </div>
            </CardContent>
            {item.brief && (
              <>
                <Separator />
                <CardContent className="pt-4">
                  <span className="text-xs font-medium text-muted-foreground">Brief</span>
                  <p className="mt-1 text-sm whitespace-pre-wrap">{item.brief}</p>
                </CardContent>
              </>
            )}
          </Card>

          {/* Platforms */}
          <Card>
            <CardHeader><CardTitle className="text-sm font-medium">Platforms</CardTitle></CardHeader>
            <CardContent>
              <PlatformStatusList platforms={platforms} />
            </CardContent>
          </Card>

          {/* Comments */}
          <Card>
            <CardHeader><CardTitle className="text-sm font-medium">Comments</CardTitle></CardHeader>
            <CardContent>
              <CommentsSection contentItemId={item.id} workspaceId={item.workspace_id} />
            </CardContent>
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-sm font-medium">Timeline</CardTitle></CardHeader>
            <CardContent className="text-sm">
              <div className="space-y-1.5 text-xs text-muted-foreground">
                <div>Created {formatDate(item.created_at)}</div>
                {item.approved_at && <div>Approved {formatDate(item.approved_at)}</div>}
                {item.scheduled_at && <div>Scheduled {formatDateTime(item.scheduled_at)}</div>}
                {item.posted_at && <div>Posted {formatDateTime(item.posted_at)}</div>}
                {item.archived_at && <div>Archived {formatDate(item.archived_at)}</div>}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-sm font-medium">Activity log</CardTitle></CardHeader>
            <CardContent>
              <ActivityTimeline logs={logs} profileMap={profileMap} />
            </CardContent>
          </Card>
          {versions.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-sm font-medium">Version history</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {versions.slice(0, 10).map((version) => (
                  <div key={version.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-xs">
                    <span className="font-medium">Version {version.version_number}</span>
                    <span className="text-muted-foreground">{fromNow(version.created_at)}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
