import {
  Bell,
  CalendarClock,
  CheckCircle2,
  Database,
  Eye,
  FileCheck2,
  Flag,
  Globe2,
  Megaphone,
  Palette,
  RotateCcw,
  Save,
  Settings,
  Share2,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
  Workflow,
} from "lucide-react";
import { useEffect, useState } from "react";

import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { PageHeader } from "@/components/common/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { isSupabaseBackend } from "@/lib/backend";
import { CONTENT_TYPES, MASTER_STATUSES, PLATFORMS, PRIORITIES } from "@/lib/constants";
import { CAMBODIA_WORKING_DAY_OPTIONS } from "@/lib/cambodia-locale";
import { resetDatabase } from "@/lib/mock/db";
import { cn } from "@/lib/utils";
import { settingsService } from "@/services";
import { useAuthStore } from "@/stores/auth-store";
import { toast } from "@/stores/toast-store";

const CHECKLIST_ITEMS = [
  "Creative matches campaign objective",
  "Caption and hashtags are ready",
  "Platform size is checked",
  "Brand/logo placement is approved",
  "Schedule date and owner are assigned",
];

const NOTIFICATION_SETTINGS = [
  { key: "approval", label: "Approval requests", description: "When content is submitted or reviewed." },
  { key: "schedule", label: "Schedule reminders", description: "Before approved content is due to publish." },
  { key: "comments", label: "Comments and mentions", description: "When teammates leave feedback." },
  { key: "overdue", label: "Overdue content", description: "When tasks pass due date without progress." },
];

const AUTOMATION_RULES = [
  { label: "Move approved content to Scheduled when a publish date is added", active: true },
  { label: "Mark platform checklist as required before Posted", active: true },
  { label: "Auto-archive posted content after 30 days", active: false },
];

export function SettingsPage() {
  const profile = useAuthStore((s) => s.profile);
  const workspaceId = profile?.workspace_id ?? "";
  const [workspaceName, setWorkspaceName] = useState("ContentFlow Demo");
  const [timezone, setTimezone] = useState("Asia/Phnom_Penh");
  const [defaultContentType, setDefaultContentType] = useState<(typeof CONTENT_TYPES)[number]>("image");
  const [defaultPriority, setDefaultPriority] = useState<(typeof PRIORITIES)[number]>("medium");
  const [approvalRequired, setApprovalRequired] = useState(true);
  const [autoChecklist, setAutoChecklist] = useState(true);
  const [brandNotes, setBrandNotes] = useState("Use approved logo lockup, avoid low-contrast text, and keep CTA visible.");
  const [workingDays, setWorkingDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [khmerLunarEnabled, setKhmerLunarEnabled] = useState(true);
  const [notifications, setNotifications] = useState<Record<string, boolean>>({
    approval: true,
    schedule: true,
    comments: true,
    overdue: true,
  });
  const [rules, setRules] = useState(AUTOMATION_RULES);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!workspaceId) return;
    settingsService.get(workspaceId).then((settings) => {
      setWorkspaceName(settings.workspace_name);
      setTimezone(settings.timezone);
      setDefaultContentType(settings.default_content_type);
      setDefaultPriority(settings.default_priority);
      setApprovalRequired(settings.approval_required);
      setAutoChecklist(settings.checklist_required);
      setBrandNotes(settings.brand_notes);
      setWorkingDays(settings.working_days);
      setKhmerLunarEnabled(settings.khmer_lunar_enabled);
      setNotifications(settings.notification_preferences);
      if (settings.automation_rules.length) setRules(settings.automation_rules);
    }).catch((error: Error) => toast("Could not load settings", { description: error.message, variant: "destructive" }));
  }, [workspaceId]);

  const handleSave = async () => {
    if (!workspaceId) return;
    setSaving(true);
    try {
      await settingsService.save({
        workspace_id: workspaceId,
        workspace_name: workspaceName,
        timezone,
        default_content_type: defaultContentType,
        default_priority: defaultPriority,
        approval_required: approvalRequired,
        checklist_required: autoChecklist,
        brand_notes: brandNotes,
        notification_preferences: notifications,
        automation_rules: rules,
        working_days: workingDays,
        khmer_lunar_enabled: khmerLunarEnabled,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      toast("Workspace settings saved", { variant: "success" });
    } catch (error) {
      toast("Could not save settings", { description: error instanceof Error ? error.message : "Unknown error", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    resetDatabase();
    window.location.reload();
  };

  return (
    <>
      <PageHeader
        title="Settings"
        description="Set up workspace behavior, publishing rules, notifications, and defaults for your content team."
        actions={
          <Button onClick={handleSave} disabled={saving || profile?.role !== "admin"}>
            <Save className="mr-1 h-4 w-4" /> {saving ? "Saving…" : saved ? "Saved!" : "Save setup"}
          </Button>
        }
      />

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <Card className="overflow-hidden">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Current role</p>
              <p className="font-semibold capitalize">{profile?.role ?? "Member"}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="overflow-hidden">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
              <Globe2 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Timezone</p>
              <p className="font-semibold">{timezone}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="overflow-hidden">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Publishing guardrails</p>
              <p className="font-semibold">{approvalRequired ? "Approval required" : "Flexible workflow"}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-muted-foreground" />
                Workspace setup
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-5 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Workspace name</Label>
                <Input value={workspaceName} onChange={(e) => setWorkspaceName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Timezone</Label>
                <Select value={timezone} onChange={(e) => setTimezone(e.target.value)}>
                  <option value="Asia/Phnom_Penh">Asia/Phnom Penh</option>
                  <option value="Asia/Bangkok">Asia/Bangkok</option>
                  <option value="Asia/Singapore">Asia/Singapore</option>
                  <option value="UTC">UTC</option>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Default content type</Label>
                <Select
                  value={defaultContentType}
                  onChange={(e) => setDefaultContentType(e.target.value as (typeof CONTENT_TYPES)[number])}
                >
                  {CONTENT_TYPES.map((type) => (
                    <option key={type} value={type}>{type.replace(/_/g, " ")}</option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Default priority</Label>
                <Select
                  value={defaultPriority}
                  onChange={(e) => setDefaultPriority(e.target.value as (typeof PRIORITIES)[number])}
                >
                  {PRIORITIES.map((priority) => (
                    <option key={priority} value={priority}>{priority}</option>
                  ))}
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarClock className="h-5 w-5 text-muted-foreground" />
                Cambodia calendar
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div>
                <p className="mb-2 text-sm font-medium">Working days</p>
                <p className="mb-3 text-xs text-muted-foreground">
                  Used for scheduling guidance. Public holidays remain separate national dates.
                </p>
                <div className="flex flex-wrap gap-2">
                  {CAMBODIA_WORKING_DAY_OPTIONS.map((day) => {
                    const active = workingDays.includes(day.value);
                    return (
                      <Button
                        key={day.value}
                        type="button"
                        variant={active ? "default" : "outline"}
                        size="sm"
                        onClick={() =>
                          setWorkingDays((current) =>
                            active
                              ? current.filter((value) => value !== day.value)
                              : [...current, day.value].sort((a, b) => a - b)
                          )
                        }
                      >
                        {day.label}
                      </Button>
                    );
                  })}
                </div>
              </div>
              <div className="flex items-center justify-between gap-4 rounded-xl border bg-muted/20 p-4">
                <div>
                  <p className="font-medium">Show Khmer lunar date</p>
                  <p className="text-sm text-muted-foreground">
                    Display Chhankitek lunar dates as a secondary calendar layer.
                  </p>
                </div>
                <Switch checked={khmerLunarEnabled} onCheckedChange={setKhmerLunarEnabled} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileCheck2 className="h-5 w-5 text-muted-foreground" />
                Publishing checklist
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex items-center justify-between gap-4 rounded-xl border bg-muted/20 p-4">
                <div>
                  <p className="font-medium">Require checklist before marking as Posted</p>
                  <p className="text-sm text-muted-foreground">Helps prevent posting the wrong poster, video, or caption.</p>
                </div>
                <Switch checked={autoChecklist} onCheckedChange={setAutoChecklist} />
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {CHECKLIST_ITEMS.map((item) => (
                  <div key={item} className="flex items-start gap-3 rounded-xl border bg-card p-4">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-500" />
                    <span className="text-sm font-medium">{item}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5 text-muted-foreground" />
                Brand and approval rules
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex items-center justify-between gap-4 rounded-xl border bg-muted/20 p-4">
                <div>
                  <p className="font-medium">Manager approval required</p>
                  <p className="text-sm text-muted-foreground">Content must pass review before scheduling or posting.</p>
                </div>
                <Switch checked={approvalRequired} onCheckedChange={setApprovalRequired} />
              </div>
              <div className="space-y-1.5">
                <Label>Brand notes</Label>
                <Textarea value={brandNotes} onChange={(e) => setBrandNotes(e.target.value)} />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Share2 className="h-5 w-5 text-muted-foreground" />
                Platforms
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-sm text-muted-foreground">Supported channels available when planning content.</p>
              <div className="flex flex-wrap gap-2">
                {PLATFORMS.map((platform) => (
                  <Badge key={platform} variant="secondary" className="capitalize">
                    {platform.replace(/_/g, " ")}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Workflow className="h-5 w-5 text-muted-foreground" />
                Workflow statuses
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-sm text-muted-foreground">Core pipeline stages used by board, calendar, and reports.</p>
              <div className="flex flex-wrap gap-2">
                {MASTER_STATUSES.map((status) => (
                  <Badge key={status} variant="outline" className="capitalize">
                    {status.replace(/_/g, " ")}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-muted-foreground" />
                Notifications
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {NOTIFICATION_SETTINGS.map((item) => (
                <div key={item.key} className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.description}</p>
                  </div>
                  <Switch
                    checked={notifications[item.key]}
                    onCheckedChange={(checked) => setNotifications((current) => ({ ...current, [item.key]: checked }))}
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Megaphone className="h-5 w-5 text-muted-foreground" />
                Automation rules
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {rules.map((rule, index) => (
                <div key={rule.label} className="rounded-xl border p-3">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-medium">{rule.label}</p>
                    <Switch
                      checked={rule.active}
                      onCheckedChange={(checked) =>
                        setRules((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, active: checked } : item))
                      }
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {!isSupabaseBackend && <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5 text-muted-foreground" />
                Data controls
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3">
                <Button variant="outline" className="justify-start">
                  <Eye className="mr-2 h-4 w-4" /> Preview workspace data
                </Button>
                <Button variant="outline" className="justify-start">
                  <CalendarClock className="mr-2 h-4 w-4" /> Review schedule health
                </Button>
                <Button variant="outline" className="justify-start">
                  <Flag className="mr-2 h-4 w-4" /> Check missing post status
                </Button>
              </div>
              <Separator />
              <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
                <div className="mb-3 flex items-center gap-2 font-semibold text-destructive">
                  <TriangleAlert className="h-5 w-5" />
                  Danger zone
                </div>
                <p className="mb-4 text-sm text-muted-foreground">
                  Reset all mock data to the initial seed. This clears localStorage and reloads the app.
                </p>
                <ConfirmDialog
                  trigger={
                    <Button variant="destructive" size="sm">
                      <RotateCcw className="mr-1 h-4 w-4" /> Reset database
                    </Button>
                  }
                  title="Reset database?"
                  description="All mock data will be reset to the initial seed. This cannot be undone."
                  confirmLabel="Reset"
                  destructive
                  onConfirm={handleReset}
                />
              </div>
            </CardContent>
          </Card>}
        </div>
      </div>

      <div className={cn("mt-4 text-sm text-muted-foreground", saved && "text-emerald-600")}>
        {saved ? "Settings saved." : profile?.role === "admin" ? "Settings persist for this workspace." : "Only workspace admins can change these settings."}
      </div>
    </>
  );
}
