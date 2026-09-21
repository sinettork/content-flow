import {
  Bot,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Facebook,
  Instagram,
  MessageCircle,
  MoreHorizontal,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Send,
  Settings2,
  Workflow,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";

import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { automationService, type AutomationRule, type AutomationRun, type SocialConnection, type AutomationTrigger } from "@/services/automation-service";
import { useAuthStore } from "@/stores/auth-store";
import { toast } from "@/stores/toast-store";

const TRIGGERS: Array<{ value: AutomationTrigger; label: string }> = [
  { value: "incoming_comment", label: "New comment" },
  { value: "incoming_message", label: "New message" },
  { value: "content_posted", label: "Content published" },
  { value: "schedule", label: "Schedule" },
  { value: "manual", label: "Manual test" },
];

const ACTIONS = [
  { value: "reply_comment", label: "Reply to comment" },
  { value: "send_message", label: "Send private message" },
  { value: "notify_team", label: "Notify team" },
  { value: "share_content", label: "Share content" },
];

const providerIcons = {
  facebook: Facebook,
  instagram: Instagram,
  telegram: Send,
  tiktok: MessageCircle,
  youtube: Play,
};

interface FormState {
  name: string;
  trigger: AutomationTrigger;
  keyword: string;
  action: string;
  message: string;
}

const emptyForm: FormState = {
  name: "",
  trigger: "incoming_comment",
  keyword: "",
  action: "reply_comment",
  message: "",
};

export function AutomationPage() {
  const workspaceId = useAuthStore((s) => s.profile?.workspace_id) ?? "";
  const userId = useAuthStore((s) => s.user?.id) ?? "";
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [connections, setConnections] = useState<SocialConnection[]>([]);
  const [runs, setRuns] = useState<AutomationRun[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [loading, setLoading] = useState(true);\n  const [connectingFacebook, setConnectingFacebook] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [nextRules, nextConnections, nextRuns] = await Promise.all([
        automationService.listRules(),
        automationService.listConnections(),
        automationService.listRuns(),
      ]);
      setRules(nextRules);
      setConnections(nextConnections);
      setRuns(nextRuns);
    } catch (error) {
      toast("Could not load automation", {
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const createRule = async () => {
    if (!form.name.trim() || !workspaceId || !userId) return;
    try {
      await automationService.createRule({
        workspace_id: workspaceId,
        created_by: userId,
        name: form.name.trim(),
        trigger_type: form.trigger,
        trigger_config: form.keyword.trim() ? { keyword: form.keyword.trim() } : {},
        conditions: form.keyword.trim()
          ? [{ type: "contains", field: "text", value: form.keyword.trim() }]
          : [],
        actions: [{ type: form.action, message: form.message.trim() }],
      });
      setOpen(false);
      setForm(emptyForm);
      toast("Automation created", { variant: "success" });
      await load();
    } catch (error) {
      toast("Could not create automation", {
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const toggleRule = async (rule: AutomationRule) => {
    try {
      await automationService.updateRule(rule.id, { enabled: !rule.enabled });
      await load();
    } catch (error) {
      toast("Could not update automation", {
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const enabledCount = rules.filter((rule) => rule.enabled).length;
  const successfulRuns = runs.filter((run) => run.status === "succeeded").length;
  const failedRuns = runs.filter((run) => run.status === "failed").length;

  return (
    <>
      <PageHeader
        title="Automation"
        description="Build rules that react to social events and run actions automatically."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => void load()} disabled={loading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button onClick={() => setOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> New automation
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card><CardContent className="flex items-center gap-3 p-4"><Workflow className="h-5 w-5 text-primary" /><div><p className="text-2xl font-semibold">{rules.length}</p><p className="text-xs text-muted-foreground">Rules</p></div></CardContent></Card>
        <Card><CardContent className="flex items-center gap-3 p-4"><Zap className="h-5 w-5 text-emerald-600" /><div><p className="text-2xl font-semibold">{enabledCount}</p><p className="text-xs text-muted-foreground">Active</p></div></CardContent></Card>
        <Card><CardContent className="flex items-center gap-3 p-4"><CheckCircle2 className="h-5 w-5 text-emerald-600" /><div><p className="text-2xl font-semibold">{successfulRuns}</p><p className="text-xs text-muted-foreground">Successful runs</p></div></CardContent></Card>
        <Card><CardContent className="flex items-center gap-3 p-4"><Clock3 className="h-5 w-5 text-amber-600" /><div><p className="text-2xl font-semibold">{failedRuns}</p><p className="text-xs text-muted-foreground">Failed runs</p></div></CardContent></Card>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Rules</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">Trigger → conditions → actions</p>
            </div>
            <Badge variant="secondary">{rules.length}</Badge>
          </CardHeader>
          <CardContent className="space-y-2">
            {rules.length === 0 ? (
              <EmptyState
                title="No automations yet"
                description="Create your first rule for comments, messages, publishing events, or scheduled workflows."
                action={<Button onClick={() => setOpen(true)}><Plus className="mr-2 h-4 w-4" />Create rule</Button>}
              />
            ) : (
              rules.map((rule) => {
                const trigger = TRIGGERS.find((item) => item.value === rule.trigger_type)?.label ?? rule.trigger_type;
                const firstAction = rule.actions[0] as { type?: string } | undefined;
                const action = ACTIONS.find((item) => item.value === firstAction?.type)?.label ?? "Action";
                return (
                  <div key={rule.id} className="flex items-center gap-3 rounded-md border p-3">
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${rule.enabled ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                      <Bot className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-medium">{rule.name}</p>
                        <Badge variant={rule.enabled ? "default" : "secondary"}>{rule.enabled ? "Active" : "Paused"}</Badge>
                      </div>
                      <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                        {trigger}<ChevronRight className="h-3 w-3" />{action}
                      </p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => void toggleRule(rule)} title={rule.enabled ? "Pause" : "Enable"}>
                      {rule.enabled ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </Button>
                    <Button variant="ghost" size="icon" disabled title="More actions"><MoreHorizontal className="h-4 w-4" /></Button>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Connected channels</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">Provider credentials stay server-side.</p>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button className="mb-2 w-full justify-start" variant="outline" onClick={() => void connectFacebook()} disabled={connectingFacebook}>
              <Facebook className="mr-2 h-4 w-4" />
              {connectingFacebook ? "Connecting…" : "Connect Facebook Page"}
            </Button>
            {connections.length === 0 ? (
              <div className="rounded-md border border-dashed p-5 text-center">
                <Settings2 className="mx-auto mb-2 h-5 w-5 text-muted-foreground" />
                <p className="text-sm font-medium">No channels connected</p>
                <p className="mt-1 text-xs text-muted-foreground">OAuth connections will be added in the next integration phase.</p>
              </div>
            ) : connections.map((connection) => {
              const Icon = providerIcons[connection.provider];
              return (
                <div key={connection.id} className="flex items-center gap-3 rounded-md border p-3">
                  <Icon className="h-4 w-4" />
                  <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{connection.name}</p><p className="text-xs text-muted-foreground capitalize">{connection.provider} · {connection.status}</p></div>
                  <Badge variant={connection.status === "active" ? "default" : "secondary"}>{connection.status}</Badge>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Recent runs</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">Execution history will populate when webhook workers are connected.</p>
        </CardHeader>
        <CardContent className="space-y-2">
          {runs.length === 0 ? (
            <div className="rounded-md border border-dashed p-5 text-sm text-muted-foreground">No automation runs yet.</div>
          ) : runs.map((run) => (
            <div key={run.id} className="flex items-center justify-between rounded-md border p-3">
              <div><p className="text-sm font-medium">Run {run.id.slice(0, 8)}</p><p className="text-xs text-muted-foreground">{new Date(run.created_at).toLocaleString()}</p></div>
              <Badge variant={run.status === "failed" ? "destructive" : run.status === "succeeded" ? "default" : "secondary"}>{run.status}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>Create automation</DialogTitle>
            <DialogDescription>Define a simple trigger → condition → action rule. More advanced conditions can be added later without changing the data model.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5"><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Price inquiry reply" /></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5"><Label>Trigger</Label><Select value={form.trigger} onChange={(e) => setForm({ ...form, trigger: e.target.value as AutomationTrigger })}>{TRIGGERS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</Select></div>
              <div className="space-y-1.5"><Label>Action</Label><Select value={form.action} onChange={(e) => setForm({ ...form, action: e.target.value })}>{ACTIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</Select></div>
            </div>
            {(form.trigger === "incoming_comment" || form.trigger === "incoming_message") && (
              <div className="space-y-1.5"><Label>Keyword <span className="font-normal text-muted-foreground">(optional)</span></Label><Input value={form.keyword} onChange={(e) => setForm({ ...form, keyword: e.target.value })} placeholder="price" /></div>
            )}
            <div className="space-y-1.5"><Label>Action message <span className="font-normal text-muted-foreground">(optional)</span></Label><Input value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="Thanks! We will send you the price shortly." /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button disabled={!form.name.trim()} onClick={() => void createRule()}>Create automation</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
