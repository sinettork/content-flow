import { isSupabaseBackend } from "@/lib/backend";
import { requireSupabase } from "@/lib/supabase/client";

export type AutomationTrigger =
  | "incoming_comment"
  | "incoming_message"
  | "content_posted"
  | "schedule"
  | "manual";

export interface SocialConnection {
  id: string;
  workspace_id: string;
  provider: "facebook" | "instagram" | "telegram" | "tiktok" | "youtube";
  account_type: "page" | "profile" | "channel" | "group" | "bot";
  external_account_id: string;
  name: string;
  username: string | null;
  avatar_url: string | null;
  status: "active" | "paused" | "error" | "disconnected";
  credentials_ref: string | null;
  metadata: Record<string, unknown>;
  last_synced_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface AutomationRule {
  id: string;
  workspace_id: string;
  name: string;
  description: string;
  enabled: boolean;
  priority: number;
  trigger_type: AutomationTrigger;
  trigger_config: Record<string, unknown>;
  conditions: unknown[];
  actions: unknown[];
  cooldown_seconds: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface AutomationRun {
  id: string;
  workspace_id: string;
  rule_id: string;
  event_id: string | null;
  status: "queued" | "running" | "succeeded" | "failed" | "skipped" | "cancelled";
  attempt_count: number;
  idempotency_key: string;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  error: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface AutomationRuleInput {
  workspace_id: string;
  name: string;
  description?: string;
  enabled?: boolean;
  priority?: number;
  trigger_type: AutomationTrigger;
  trigger_config?: Record<string, unknown>;
  conditions?: unknown[];
  actions?: unknown[];
  cooldown_seconds?: number;
  created_by: string;
}

export interface AutomationDryRun {
  safe: boolean;
  checks: Array<{ label: string; passed: boolean; detail: string }>;
}

export function dryRunRule(rule: Pick<AutomationRule, "trigger_type" | "actions" | "conditions">): AutomationDryRun {
  const checks = [
    { label: "Trigger configured", passed: Boolean(rule.trigger_type), detail: rule.trigger_type ? `Runs on ${rule.trigger_type.replace(/_/g, " ")}.` : "Select a trigger." },
    { label: "Action configured", passed: rule.actions.length > 0, detail: rule.actions.length ? `${rule.actions.length} action(s) will run.` : "Add at least one action." },
    { label: "Conditions bounded", passed: rule.conditions.length <= 5, detail: rule.conditions.length <= 5 ? `${rule.conditions.length} condition(s) checked.` : "Limit rules to five conditions for predictable execution." },
  ];
  return { checks, safe: checks.every((check) => check.passed) };
}

export const automationService = {
  async listRules(): Promise<AutomationRule[]> {
    if (!isSupabaseBackend) return [];
    const { data, error } = await requireSupabase()
      .from("automation_rules")
      .select("*")
      .order("priority", { ascending: true })
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as AutomationRule[];
  },

  async createRule(input: AutomationRuleInput): Promise<AutomationRule> {
    if (!isSupabaseBackend) throw new Error("Automation requires the Supabase backend.");
    const { data, error } = await requireSupabase()
      .from("automation_rules")
      .insert({
        ...input,
        description: input.description ?? "",
        enabled: input.enabled ?? true,
        priority: input.priority ?? 100,
        trigger_config: input.trigger_config ?? {},
        conditions: input.conditions ?? [],
        actions: input.actions ?? [],
        cooldown_seconds: input.cooldown_seconds ?? 0,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return data as AutomationRule;
  },

  async updateRule(id: string, patch: Partial<AutomationRule>): Promise<AutomationRule> {
    if (!isSupabaseBackend) throw new Error("Automation requires the Supabase backend.");
    const { data, error } = await requireSupabase()
      .from("automation_rules")
      .update(patch)
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return data as AutomationRule;
  },

  async listConnections(): Promise<SocialConnection[]> {
    if (!isSupabaseBackend) return [];
    const { data, error } = await requireSupabase()
      .from("social_connections")
      .select("*")
      .order("provider")
      .order("name");
    if (error) throw new Error(error.message);
    return (data ?? []) as SocialConnection[];
  },

  async listRuns(limit = 20): Promise<AutomationRun[]> {
    if (!isSupabaseBackend) return [];
    const { data, error } = await requireSupabase()
      .from("automation_runs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw new Error(error.message);
    return (data ?? []) as AutomationRun[];
  },

  async connectFacebook(): Promise<void> {
    if (!isSupabaseBackend) throw new Error("Facebook integration requires the Supabase backend.");
    const { data, error } = await requireSupabase().functions.invoke("facebook-oauth-start", { body: { return_url: `${window.location.origin}/app/automation` } });
    if (error) throw new Error(error.message);
    const url = (data as { authorization_url?: string } | null)?.authorization_url;
    if (!url) throw new Error("Facebook authorization URL was not returned.");
    window.location.assign(url);
  },
};