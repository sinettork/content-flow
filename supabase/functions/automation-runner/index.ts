import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const url = Deno.env.get("SUPABASE_URL")!;
const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

const authorized = (req: Request) =>
  (req.headers.get("authorization") ?? "") === `Bearer ${key}`;

type Run = {
  id: string;
  workspace_id: string;
  rule_id: string;
  event_id: string;
  attempt_count: number;
  idempotency_key: string;
  input: Record<string, unknown> | null;
};

async function log(run: Run, level: string, message: string, metadata = {}) {
  await db.from("automation_logs").insert({
    workspace_id: run.workspace_id,
    run_id: run.id,
    level,
    message,
    metadata,
  });
}

async function finish(
  run: Run,
  status: "succeeded" | "failed" | "skipped",
  output: Record<string, unknown>,
  error?: string,
) {
  const { error: updateError } = await db.from("automation_runs").update({
    status,
    output,
    error: error ?? null,
    finished_at: new Date().toISOString(),
  }).eq("id", run.id).eq("status", "running");

  if (updateError) throw updateError;

  await log(run, status === "failed" ? "error" : "info",
    status === "succeeded" ? "Automation completed" :
    status === "skipped" ? "Automation skipped" : "Automation failed",
    { output, error: error ?? null });
}

async function processRun(run: Run) {
  const { data: rule, error: ruleError } = await db.from("automation_rules")
    .select("id,name,enabled,trigger_type,trigger_config,conditions,actions")
    .eq("id", run.rule_id).maybeSingle();
  if (ruleError) throw ruleError;
  if (!rule) return finish(run, "skipped", { reason: "rule_not_found" });
  if (!rule.enabled) return finish(run, "skipped", { reason: "rule_disabled" });

  const { data: event, error: eventError } = await db.from("automation_events")
    .select("id,event_type,payload,connection_id,external_event_id")
    .eq("id", run.event_id).maybeSingle();
  if (eventError) throw eventError;
  if (!event) return finish(run, "skipped", { reason: "event_not_found" });

  const actions = Array.isArray(rule.actions) ? rule.actions : [];
  if (!actions.length) throw new Error("Automation rule has no actions");

  const results: Record<string, unknown>[] = [];
  for (const raw of actions as Record<string, unknown>[]) {
    const type = String(raw?.type ?? raw?.action ?? "").trim();

    if (type === "notify_team") {
      results.push({ type, status: "accepted" });
      continue;
    }

    if (["reply_comment", "send_message", "share_content"].includes(type)) {
      throw new Error(`Action "${type}" requires a connected provider adapter; none is configured yet.`);
    }

    throw new Error(`Unsupported automation action: ${type || "unknown"}`);
  }

  await log(run, "info", "Executing automation actions", {
    rule_id: rule.id,
    event_type: event.event_type,
  });

  await finish(run, "succeeded", {
    run_id: run.id,
    event_id: event.id,
    actions: results,
  });
}

async function worker(limit: number) {
  const { data: runs, error } = await db.rpc("claim_automation_runs", {
    p_limit: Math.max(1, Math.min(limit, 50)),
  });
  if (error) throw error;

  let succeeded = 0;
  let failed = 0;

  for (const run of (runs ?? []) as Run[]) {
    try {
      await processRun(run);
      succeeded++;
    } catch (error) {
      failed++;
      const message = error instanceof Error ? error.message : String(error);
      await finish(run, "failed", {}, message).catch(() => undefined);
    }
  }

  return { claimed: runs?.length ?? 0, succeeded, failed };
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }
  if (!authorized(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const limit = Number(body?.limit ?? 10);
    return Response.json({
      ok: true,
      ...(await worker(Number.isFinite(limit) ? limit : 10)),
    });
  } catch (error) {
    console.error("automation-runner error", error);
    return Response.json({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
});
