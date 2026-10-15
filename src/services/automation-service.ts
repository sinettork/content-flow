import { isSupabaseBackend } from "@/lib/backend";
import type { Platform } from "@/lib/constants";
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

export type ConnectionHealth = "healthy" | "stale" | "action_required";

export interface PublishingReadiness {
  platform: Platform;
  connection: "connected" | "missing" | "unhealthy";
  canPublish: false;
  reason: string;
  nextStep: string;
}

export function connectionHealth(connection: SocialConnection, now = Date.now()): ConnectionHealth {
  if (connection.status === "error" || connection.status === "disconnected") return "action_required";
  if (!connection.last_synced_at || now - Date.parse(connection.last_synced_at) > 24 * 60 * 60 * 1000) return "stale";
  return "healthy";
}

/** Publishing adapters are intentionally explicit: OAuth alone must not imply publishing support. */
export function publishingReadiness(platform: Platform, connections: SocialConnection[]): PublishingReadiness {
  const provider = platform === "instagram" ? "instagram" : platform;
  const connection = connections.find((item) => item.provider === provider);
  if (!connection) {
    return { platform, connection: "missing", canPublish: false, reason: `No ${platform} account is connected.`, nextStep: "Connect an account before publishing." };
  }
  if (connectionHealth(connection) === "action_required") {
    return { platform, connection: "unhealthy", canPublish: false, reason: `${connection.name} needs attention.`, nextStep: "Reconnect the account and confirm its permissions." };
  }
  return {
    platform,
    connection: "connected",
    canPublish: false,
    reason: `${connection.name} is connected, but the ${platform} publishing worker is not configured.`,
    nextStep: "Keep content scheduled and complete the provider publishing adapter before sending live posts.",
  };
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

const EXECUTABLE_AUTOMATION_ACTIONS = new Set(["reply_comment", "send_message", "notify_team"]);
const SUPPORTED_CONDITION_TYPES = new Set(["contains"]);

function actionType(action: unknown): string {
  if (!action || typeof action !== "object" || Array.isArray(action)) return "";
  const record = action as Record<string, unknown>;
  return typeof record.type === "string" ? record.type : typeof record.action === "string" ? record.action : "";
}

function validCondition(condition: unknown): boolean {
  if (!condition || typeof condition !== "object" || Array.isArray(condition)) return false;
  const record = condition as Record<string, unknown>;
  return SUPPORTED_CONDITION_TYPES.has(String(record.type ?? ""))
    && typeof record.value === "string"
    && record.value.trim().length > 0;
}

export function dryRunRule(rule: Pick<AutomationRule, "trigger_type" | "actions" | "conditions">): AutomationDryRun {
  const actions = rule.actions.map((action) => ({
    type: actionType(action),
    message: action && typeof action === "object" && !Array.isArray(action)
      ? (action as Record<string, unknown>).message
      : undefined,
  }));
  const unsupported = actions.filter((action) => !EXECUTABLE_AUTOMATION_ACTIONS.has(action.type));
  const missingMessage = actions.filter(
    (action) => ["reply_comment", "send_message"].includes(action.type)
      && (typeof action.message !== "string" || !action.message.trim()),
  );
  const incompatibleActions = actions.filter(
    (action) => (action.type === "reply_comment" && rule.trigger_type !== "incoming_comment")
      || (action.type === "send_message" && rule.trigger_type !== "incoming_message"),
  );
  const conditionsBounded = rule.conditions.length <= 5;
  const invalidConditions = rule.conditions.filter((condition) => !validCondition(condition));
  const checks = [
    {
      label: "Trigger configured",
      passed: Boolean(rule.trigger_type),
      detail: rule.trigger_type ? `Runs on ${rule.trigger_type.replace(/_/g, " ")}.` : "Select a trigger.",
    },
    {
      label: "Action configured",
      passed: actions.length > 0,
      detail: actions.length ? `${actions.length} action(s) configured.` : "Add at least one action.",
    },
    {
      label: "Actions supported",
      passed: unsupported.length === 0,
      detail: unsupported.length === 0
        ? "Every action has an execution handler."
        : `No execution handler is configured for: ${[...new Set(unsupported.map((action) => action.type || "unknown action"))].join(", ")}.`,
    },
    {
      label: "Required action fields",
      passed: missingMessage.length === 0,
      detail: missingMessage.length === 0
        ? "Required action messages are present."
        : "Reply and private-message actions need a non-empty message.",
    },
    {
      label: "Trigger matches action",
      passed: incompatibleActions.length === 0,
      detail: incompatibleActions.length === 0
        ? "Each action matches the incoming event type."
        : "Reply to comment requires a New comment trigger; Send private message requires a New message trigger.",
    },
    {
      label: "Conditions supported",
      passed: invalidConditions.length === 0 && conditionsBounded,
      detail: !conditionsBounded
        ? "Limit rules to five conditions."
        : invalidConditions.length === 0
          ? "All conditions use the supported contains operator and a non-empty value."
          : "Only contains conditions with a non-empty value are supported.",
    },
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