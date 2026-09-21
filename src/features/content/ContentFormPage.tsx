import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, ArrowLeft, Briefcase, CalendarClock, CheckCircle2, ClipboardList, Copy, FileText, Flag, Save, Tag, UserRound } from "lucide-react";
import { type ChangeEvent, useEffect, useState } from "react";
import { type Path, useForm } from "react-hook-form";
import { useParams, useNavigate } from "react-router-dom";
import { z } from "zod";

import { Breadcrumbs } from "@/components/common/Breadcrumbs";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DateTimePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { usePermission, useRole } from "@/hooks/usePermission";
import { CONTENT_TYPES, MASTER_STATUSES, PLATFORMS, PRIORITIES, type Platform } from "@/lib/constants";
import { contentService, campaignService, profileService, activityService, platformService, getContentReadiness } from "@/services";
import { useAuthStore } from "@/stores/auth-store";
import { toast } from "@/stores/toast-store";
import type { Campaign, ContentItem, ContentPlatform, Profile } from "@/types";

const schema = z.object({
  title: z.string().min(1, "Title is required"),
  content_type: z.enum(CONTENT_TYPES),
  master_status: z.enum(MASTER_STATUSES),
  priority: z.enum(PRIORITIES),
  campaign_id: z.string(),
  assigned_to: z.string(),
  brief: z.string(),
  scheduled_at: z.string(),
  due_at: z.string(),
});

type FormValues = z.infer<typeof schema>;

export function ContentFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { role } = useRole();
  const canCreate = usePermission("createContent");
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const isEdit = Boolean(id);

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [existing, setExisting] = useState<ContentItem | null>(null);
  const [platforms, setPlatforms] = useState<ContentPlatform[]>([]);
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>([]);
  const [platformDrafts, setPlatformDrafts] = useState<Record<string, { caption: string; hashtags: string }>>({});

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "",
      content_type: "image",
      master_status: "draft",
      priority: "medium",
      campaign_id: "",
      assigned_to: "",
      brief: "",
      scheduled_at: "",
      due_at: "",
    },
  });

  useEffect(() => {
    (async () => {
      const [camps, profs] = await Promise.all([
        campaignService.list(),
        profileService.listForWorkspace(profile?.workspace_id ?? ""),
      ]);
      setCampaigns(camps);
      setProfiles(profs);

      if (id) {
        const item = await contentService.get(id);
        if (item) {
          setExisting(item);
          const itemPlatforms = await platformService.listForItem(item.id);
          setPlatforms(itemPlatforms);
          setSelectedPlatforms(itemPlatforms.map((p) => p.platform_name));
          setPlatformDrafts(Object.fromEntries(itemPlatforms.map((p) => [p.platform_name, { caption: p.caption, hashtags: p.hashtags }])));
          reset({
            title: item.title,
            content_type: item.content_type,
            master_status: item.master_status,
            priority: item.priority,
            campaign_id: item.campaign_id ?? "",
            assigned_to: item.assigned_to ?? "",
            brief: item.brief ?? "",
            scheduled_at: item.scheduled_at ? item.scheduled_at.slice(0, 16) : "",
            due_at: item.due_at ? item.due_at.slice(0, 16) : "",
          });
        }
      }
    })();
  }, [id, profile?.workspace_id, reset]);

  const readiness = getContentReadiness({
    title: watch("title"),
    brief: watch("brief"),
    campaign_id: watch("campaign_id"),
    assigned_to: watch("assigned_to"),
  }, platforms);

  const duplicate = async () => {
    if (!existing || !user || !canCreate) return;
    try {
      const copy = await contentService.duplicate(existing.id, { userId: user.id });
      toast("Draft copy created", { variant: "success" });
      navigate(`/app/content/${copy.id}/edit`);
    } catch (error) {
      toast(error instanceof Error ? error.message : "Unable to duplicate content.", { variant: "destructive" });
    }
  };

  const onSubmit = async (values: FormValues) => {
    const workspace_id = profile?.workspace_id ?? "";
    const payload = {
      title: values.title,
      content_type: values.content_type,
      master_status: values.master_status,
      priority: values.priority,
      campaign_id: values.campaign_id || null,
      assigned_to: values.assigned_to || null,
      brief: values.brief || null,
      scheduled_at: values.scheduled_at ? new Date(values.scheduled_at).toISOString() : null,
      due_at: values.due_at ? new Date(values.due_at).toISOString() : null,
    };

    try {
      let contentId: string;
      if (isEdit && existing) {
        await contentService.update(existing.id, payload, { role, userId: user!.id });
        contentId = existing.id;
        await activityService.log({
          workspace_id,
          content_item_id: existing.id,
          user_id: user!.id,
          action_type: "content.edited",
          old_value: { title: existing.title },
          new_value: { title: values.title },
        });
      } else {
        const created = await contentService.create({
          ...payload,
          master_status: "draft",
          workspace_id,
          created_by: user!.id,
          thumbnail_asset_id: null,
          approved_by: null,
          approved_at: null,
          posted_at: null,
          archived_at: null,
        });
        contentId = created.id;
        await activityService.log({
          workspace_id,
          content_item_id: created.id,
          user_id: user!.id,
          action_type: "content.created",
          new_value: { title: values.title },
        });
      }

      const existingByPlatform = Object.fromEntries(platforms.map((p) => [p.platform_name, p]));
      await Promise.all(selectedPlatforms.map(async (platform) => {
        const draft = platformDrafts[platform] ?? { caption: "", hashtags: "" };
        const current = existingByPlatform[platform];
        const nextPlatform = {
          workspace_id,
          content_item_id: contentId,
          platform_name: platform,
          platform_status: current?.platform_status ?? "draft",
          caption: draft.caption,
          hashtags: draft.hashtags,
          scheduled_at: current?.scheduled_at ?? null,
          posted_at: current?.posted_at ?? null,
          post_url: current?.post_url ?? null,
          posted_by: current?.posted_by ?? null,
          checklist_completed: current?.checklist_completed ?? false,
          notes: current?.notes ?? null,
        };
        if (current) await platformService.update(current.id, nextPlatform);
        else await platformService.create(nextPlatform);
      }));
      await Promise.all(platforms.filter((p) => !selectedPlatforms.includes(p.platform_name)).map((p) => platformService.remove(p.id)));

      toast(isEdit ? "Content updated" : "Content created", { variant: "success" });
      navigate(`/app/content/${contentId}`);
    } catch (error) {
      toast(error instanceof Error ? error.message : "Unable to save content.", { variant: "destructive" });
    }
  };

  const selectValue = (field: Path<FormValues>) => ({
    value: watch(field),
    onChange: (e: ChangeEvent<HTMLSelectElement>) =>
      setValue(field, e.target.value as unknown as FormValues[typeof field], {
        shouldDirty: true,
        shouldValidate: true,
      }),
  });

  const dateTimeValue = (field: "scheduled_at" | "due_at") => ({
    value: watch(field),
    onValueChange: (value: string) => setValue(field, value, { shouldDirty: true, shouldValidate: true }),
  });

  const statusOptions = isEdit && existing
    ? [existing.master_status, ...contentService.allowedTransitions(existing.master_status, role)]
    : ["draft"];

  return (
    <>
      <Breadcrumbs items={[
        { label: "Content", to: "/app/content" },
        ...(isEdit && existing ? [{ label: existing.title, to: `/app/content/${existing.id}` }] : []),
        { label: isEdit ? "Edit" : "New" },
      ]} />
      <PageHeader
        title={isEdit ? "Edit content" : "New content"}
        actions={
          <div className="flex gap-2">
            {isEdit && canCreate && <Button type="button" variant="outline" size="sm" onClick={duplicate}><Copy className="mr-1 h-4 w-4" /> Duplicate as draft</Button>}
            <Button variant="outline" size="sm" onClick={() => navigate(-1)}><ArrowLeft className="mr-1 h-4 w-4" /> Back</Button>
          </div>
        }
      />

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Basic info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <FileText className="h-4 w-4 text-muted-foreground" />
                Basic info
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="title">Title *</Label>
                <Input id="title" {...register("title")} />
                {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="content_type" className="flex items-center gap-1.5">
                    <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                    Content type
                  </Label>
                  <Select id="content_type" name="content_type" {...selectValue("content_type")}>
                    {CONTENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="priority" className="flex items-center gap-1.5">
                    <Flag className="h-3.5 w-3.5 text-muted-foreground" />
                    Priority
                  </Label>
                  <Select id="priority" name="priority" {...selectValue("priority")}>
                    {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
                  </Select>
                </div>
              </div>
              {isEdit ? (
                <div className="space-y-1.5">
                  <Label htmlFor="master_status">Status</Label>
                  <Select id="master_status" name="master_status" {...selectValue("master_status")}>
                    {statusOptions.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
                  </Select>
                </div>
              ) : (
                <div className="rounded-md border bg-muted/30 px-3 py-2.5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium">Starts as draft</p>
                      <p className="text-xs text-muted-foreground">You can send it for review after saving.</p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium capitalize text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      Draft
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Assignment + scheduling */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <CalendarClock className="h-4 w-4 text-muted-foreground" />
                Assignment &amp; scheduling
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="campaign_id" className="flex items-center gap-1.5">
                  <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
                  Campaign
                </Label>
                <Select id="campaign_id" name="campaign_id" {...selectValue("campaign_id")}>
                  <option value="">None</option>
                  {campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="assigned_to" className="flex items-center gap-1.5">
                  <UserRound className="h-3.5 w-3.5 text-muted-foreground" />
                  Assignee
                </Label>
                <Select id="assigned_to" name="assigned_to" {...selectValue("assigned_to")}>
                  <option value="">Unassigned</option>
                  {profiles.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="scheduled_at">Scheduled at</Label>
                  <DateTimePicker id="scheduled_at" {...dateTimeValue("scheduled_at")} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="due_at">Due date</Label>
                  <DateTimePicker id="due_at" {...dateTimeValue("due_at")} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Brief */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Tag className="h-4 w-4 text-muted-foreground" />
                Platforms & copy
              </CardTitle>
              <p className="text-xs text-muted-foreground">Choose where this content will be published. You can refine the copy for each platform.</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {PLATFORMS.map((platform) => {
                  const selected = selectedPlatforms.includes(platform);
                  return (
                    <Button
                      key={platform}
                      type="button"
                      variant={selected ? "default" : "outline"}
                      size="sm"
                      className="capitalize"
                      onClick={() => {
                        setSelectedPlatforms((current) => current.includes(platform) ? current.filter((item) => item !== platform) : [...current, platform]);
                        setPlatformDrafts((current) => current[platform] ? current : { ...current, [platform]: { caption: "", hashtags: "" } });
                      }}
                    >
                      {platform.replace(/_/g, " ")}
                    </Button>
                  );
                })}
              </div>
              {selectedPlatforms.length === 0 && (
                <div className="rounded-md border border-dashed bg-muted/20 px-3 py-3 text-xs text-muted-foreground">
                  No platforms selected yet. Add at least one platform before sending this content for review.
                </div>
              )}
              <div className="grid gap-4 md:grid-cols-2">
                {selectedPlatforms.map((platform) => {
                  const draft = platformDrafts[platform] ?? { caption: "", hashtags: "" };
                  return (
                    <div key={platform} className="rounded-lg border p-3">
                      <p className="mb-2 text-sm font-medium capitalize">{platform.replace(/_/g, " ")}</p>
                      <Textarea
                        rows={4}
                        value={draft.caption}
                        onChange={(e) => setPlatformDrafts((current) => ({ ...current, [platform]: { ...draft, caption: e.target.value } }))}
                        placeholder="Platform caption…"
                      />
                      <Input
                        className="mt-2"
                        value={draft.hashtags}
                        onChange={(e) => setPlatformDrafts((current) => ({ ...current, [platform]: { ...draft, hashtags: e.target.value } }))}
                        placeholder="#hashtags"
                      />
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <ClipboardList className="h-4 w-4 text-muted-foreground" />
                Brief / notes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea {...register("brief")} rows={4} placeholder="Content brief, notes, instructions…" />
            </CardContent>
          </Card>
          <Card className="lg:col-span-2">
            <CardHeader><CardTitle className="flex items-center gap-2 text-sm"><CheckCircle2 className="h-4 w-4 text-muted-foreground" />Readiness</CardTitle></CardHeader>
            <CardContent>
              <p className="mb-3 text-xs text-muted-foreground">Complete these checks before sending content for review or scheduling.</p>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {readiness.checks.map((check) => <div key={check.key} className="flex items-center gap-2 text-sm">{check.complete ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <AlertCircle className="h-4 w-4 text-amber-600" />}<span className={check.complete ? "text-foreground" : "text-muted-foreground"}>{check.label}</span></div>)}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>Cancel</Button>
          <Button type="submit" disabled={isSubmitting}>
            <Save className="mr-1 h-4 w-4" /> {isEdit ? "Save changes" : "Create content"}
          </Button>
        </div>
      </form>
    </>
  );
}
