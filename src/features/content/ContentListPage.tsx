import { CalendarClock, CheckSquare, Filter, Layers, Megaphone, Plus, Search, SlidersHorizontal, UserRound, X } from "lucide-react";
import { ChangeEvent, useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { CampaignBadge } from "@/components/campaigns/CampaignBadge";
import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";
import { ContentStatusBadge } from "@/components/content/ContentStatusBadge";
import { PlatformBadge } from "@/components/content/PlatformBadge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useDebounce } from "@/hooks/useDebounce";
import { usePermission, useRole } from "@/hooks/usePermission";
import { useWorkspaceRealtime } from "@/hooks/useWorkspaceRealtime";
import { MASTER_STATUSES, PLATFORMS , STATUS_ACCENTS } from "@/lib/constants";
import { formatDate } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { contentService, campaignService, platformService, profileService } from "@/services";
import { useAuthStore } from "@/stores/auth-store";
import { useUiStore } from "@/stores/ui-store";
import type { Campaign, ContentItem, ContentPlatform, Profile } from "@/types";

export function ContentListPage() {
  const navigate = useNavigate();
  const workspaceId = useAuthStore((s) => s.profile?.workspace_id);
  const canCreate = usePermission("createContent");
  const { contentFilters, setContentFilters, resetContentFilters, savedContentViews, saveContentView, deleteContentView } = useUiStore();

  const [items, setItems] = useState<ContentItem[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [platformMap, setPlatformMap] = useState<Record<string, ContentPlatform[]>>({});
  const [selected, setSelected] = useState<string[]>([]);
  const { role } = useRole();
  const canBulkEdit = usePermission("editContent");

  const debouncedSearch = useDebounce(contentFilters.search, 250);

  const load = useCallback(async () => {
    const [list, camps, profs] = await Promise.all([
      contentService.list({ ...contentFilters, search: debouncedSearch }),
      campaignService.list(),
      profileService.listForWorkspace(workspaceId ?? ""),
    ]);
    setItems(list);
    setCampaigns(camps);
    setProfiles(profs);
    setPlatformMap(await platformService.listForItems(list.map((item) => item.id)));
  }, [contentFilters, debouncedSearch, workspaceId]);

  useEffect(() => {
    load();
  }, [load]);
  useWorkspaceRealtime(workspaceId ?? "", load);

  const campMap = Object.fromEntries(campaigns.map((c) => [c.id, c]));
  const profMap = Object.fromEntries(profiles.map((p) => [p.id, p]));

  const hasFilters =
    contentFilters.status !== "all" ||
    contentFilters.campaign_id !== "all" ||
    contentFilters.assigned_to !== "all" ||
    contentFilters.platform !== "all" ||
    contentFilters.search !== "";

  const initials = (name: string) =>
    name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

  const applyBulk = async (patch: { master_status?: ContentItem["master_status"]; assigned_to?: string | null }) => {
    if (!canBulkEdit || !selected.length || !role) return;
    try {
      await contentService.bulkUpdate(selected, patch, { role, userId: useAuthStore.getState().user?.id ?? "" });
      setSelected([]);
      await load();
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <>
      <PageHeader
        title="Content"
        description={`${items.length} item${items.length !== 1 ? "s" : ""}`}
        actions={
          canCreate ? (
            <Button asChild>
              <Link to="/app/content/new">
                <Plus className="mr-1 h-4 w-4" /> New content
              </Link>
            </Button>
          ) : undefined
        }
      />

      {/* Filters */}
      <Card className="mb-6 overflow-hidden">
        <CardContent className="space-y-3 p-3.5 md:p-4">
          <div className="flex flex-col gap-2.5 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
                <SlidersHorizontal className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold">Find content fast</p>
                <p className="text-xs text-muted-foreground">Search by title, then narrow by status, campaign, owner, or platform.</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Filter className="h-3.5 w-3.5" />
              <span>{hasFilters ? "Filters active" : "No filters active"}</span>
            </div>
          </div>

          <div className="grid gap-2.5 lg:grid-cols-[minmax(240px,1.35fr)_repeat(4,minmax(140px,1fr))_auto]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search title or slug..."
                className="pl-8 pr-9"
                value={contentFilters.search}
                onChange={(e) => setContentFilters({ search: e.target.value })}
              />
              {contentFilters.search && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setContentFilters({ search: "" })}
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            <Select
              value={contentFilters.status}
              onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                setContentFilters({ status: e.target.value as typeof contentFilters.status })
              }
            >
              <option value="all">All statuses</option>
              {MASTER_STATUSES.map((s) => (
                <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
              ))}
            </Select>
            <Select value={contentFilters.campaign_id} onChange={(e) => setContentFilters({ campaign_id: e.target.value })}>
              <option value="all">All campaigns</option>
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
            <Select value={contentFilters.assigned_to} onChange={(e) => setContentFilters({ assigned_to: e.target.value })}>
              <option value="all">All members</option>
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>{p.full_name}</option>
              ))}
            </Select>
            <Select
              value={contentFilters.platform}
              onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                setContentFilters({ platform: e.target.value as typeof contentFilters.platform })
              }
            >
              <option value="all">All platforms</option>
              {PLATFORMS.map((p) => (
                <option key={p} value={p}>{p.replace(/_/g, " ")}</option>
              ))}
            </Select>
            {hasFilters && (
              <Button variant="outline" className="whitespace-nowrap" onClick={resetContentFilters}>
                <X className="h-3.5 w-3.5" /> Clear
              </Button>
            )}
          </div>

          {hasFilters && (
            <div className="flex flex-wrap gap-2 border-t border-border/70 pt-2.5">
              {contentFilters.search && (
                <span className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                  Search: <span className="font-medium text-foreground">{contentFilters.search}</span>
                </span>
              )}
              {contentFilters.status !== "all" && (
                <span className="rounded-md bg-muted px-2 py-0.5 text-xs capitalize text-muted-foreground">
                  Status: <span className="font-medium text-foreground">{contentFilters.status.replace(/_/g, " ")}</span>
                </span>
              )}
              {contentFilters.platform !== "all" && (
                <span className="rounded-md bg-muted px-2 py-0.5 text-xs capitalize text-muted-foreground">
                  Platform: <span className="font-medium text-foreground">{contentFilters.platform.replace(/_/g, " ")}</span>
                </span>
              )}
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2 border-t border-border/70 pt-2.5">
            <Select value="" onChange={(e) => { const view = savedContentViews.find((item) => item.id === e.target.value); if (view) setContentFilters(view.filters); }}>
              <option value="">Saved views</option>{savedContentViews.map((view) => <option key={view.id} value={view.id}>{view.name}</option>)}
            </Select>
            <Button variant="outline" size="sm" onClick={() => { const name = window.prompt("Name this view"); if (name?.trim()) saveContentView(name); }}>Save current view</Button>
            {savedContentViews.length > 0 && <Button variant="ghost" size="sm" onClick={() => { const view = savedContentViews.find((item) => item.filters.search === contentFilters.search && item.filters.status === contentFilters.status); if (view) deleteContentView(view.id); }}>Remove matching view</Button>}
          </div>
        </CardContent>
      </Card>

      {canBulkEdit && selected.length > 0 && <Card className="mb-4 border-primary/30"><CardContent className="flex flex-wrap items-center gap-2 p-3"><CheckSquare className="h-4 w-4 text-primary" /><span className="mr-2 text-sm font-medium">{selected.length} selected</span><Select value="" onChange={(e) => { if (e.target.value) void applyBulk({ master_status: e.target.value as ContentItem["master_status"] }); }}><option value="">Set status…</option>{MASTER_STATUSES.map((status) => <option key={status} value={status}>{status.replace(/_/g, " ")}</option>)}</Select><Select value="" onChange={(e) => { if (e.target.value) void applyBulk({ assigned_to: e.target.value === "__none" ? null : e.target.value }); }}><option value="">Assign to…</option><option value="__none">Unassigned</option>{profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.full_name}</option>)}</Select><Button variant="ghost" size="sm" onClick={() => setSelected([])}>Clear</Button></CardContent></Card>}

      {/* Table */}
      {items.length === 0 ? (
        <EmptyState
          title="No content found"
          description={hasFilters ? "Try adjusting your filters." : "Create your first content item to get started."}
          action={
            !hasFilters && canCreate && (
              <Button asChild>
                <Link to="/app/content/new">
                  <Plus className="mr-1 h-4 w-4" /> New content
                </Link>
              </Button>
            )
          }
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto"><Table>
            <TableHeader>
              <TableRow className="bg-muted/30 uppercase tracking-wider hover:bg-muted/30">
                <TableHead className="w-10"><input type="checkbox" aria-label="Select all visible content" checked={items.length > 0 && items.every((item) => selected.includes(item.id))} onChange={(event) => setSelected(event.target.checked ? items.map((item) => item.id) : [])} /></TableHead>
                <TableHead>Title</TableHead>
                <TableHead>
                  <span className="flex items-center gap-1.5">
                    <Megaphone className="h-3.5 w-3.5" />
                    Campaign
                  </span>
                </TableHead>
                <TableHead>Type</TableHead>
                <TableHead>
                  <span className="flex items-center gap-1.5">
                    <UserRound className="h-3.5 w-3.5" />
                    Assignee
                  </span>
                </TableHead>
                <TableHead>Status</TableHead>
                <TableHead>
                  <span className="flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5" />
                    Platforms
                  </span>
                </TableHead>
                <TableHead>
                  <span className="flex items-center gap-1.5">
                    <CalendarClock className="h-3.5 w-3.5" />
                    Scheduled
                  </span>
                </TableHead>
                <TableHead>Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
                {items.map((item) => {
                  const camp = item.campaign_id ? campMap[item.campaign_id] : null;
                  const assignee = item.assigned_to ? profMap[item.assigned_to] : null;
                  const plats = platformMap[item.id] ?? [];
                  return (
                    <TableRow
                      key={item.id}
                      className="group cursor-pointer hover:bg-muted/40"
                      onClick={() => navigate(`/app/content/${item.id}`)}
                    >
                      <TableCell onClick={(event) => event.stopPropagation()} className="w-10">
                        <input type="checkbox" aria-label={`Select ${item.title}`} checked={selected.includes(item.id)} onChange={(event) => setSelected((current) => event.target.checked ? [...current, item.id] : current.filter((id) => id !== item.id))} />
                      </TableCell>
                      <TableCell className="font-medium transition-colors duration-100 group-hover:text-primary">
                        <span className="flex items-center gap-2">
                          <span className={cn("h-7 w-1 rounded-full", STATUS_ACCENTS[item.master_status])} />
                          {item.title}
                        </span>
                      </TableCell>
                      <TableCell>
                        {camp ? (
                          <CampaignBadge name={camp.name} color={camp.color} className="text-[11px]" />
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="capitalize text-muted-foreground">{item.content_type}</TableCell>
                      <TableCell>
                        {assignee ? (
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarFallback className="bg-primary/10 text-primary text-[9px] font-semibold">{initials(assignee.full_name)}</AvatarFallback>
                            </Avatar>
                            <span className="text-xs font-medium">{assignee.full_name}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <ContentStatusBadge status={item.master_status} />
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {plats.map((p) => (
                            <PlatformBadge key={p.id} platform={p.platform_name} />
                          ))}
                          {plats.length === 0 && <span className="text-muted-foreground">—</span>}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground tabular-nums">
                        {formatDate(item.scheduled_at)}
                      </TableCell>
                      <TableCell className="text-muted-foreground tabular-nums">
                        {formatDate(item.updated_at)}
                      </TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table></div>
        </Card>
      )}
    </>
  );
}
