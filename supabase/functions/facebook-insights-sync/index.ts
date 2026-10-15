import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import {
  FACEBOOK_INSIGHT_METRICS,
  getFacebookInsightsWindow,
  mapMetaInsights,
  mergeMetaInsightsWithExisting,
  type FacebookDailyInsight,
  type MetaInsightMetric,
} from "../../../src/lib/facebook-insights.ts";

const db = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } },
);

const GRAPH = "https://graph.facebook.com/v26.0";
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: Record<string, unknown>, status = 200) {
  return Response.json(body, { status, headers: CORS_HEADERS });
}

function apiErrorMessage(code: number | undefined, status: number) {
  if (code === 190) return "The Meta Page token expired. Reconnect Meta from Automation and sync again.";
  if (code === 10 || code === 200) {
    return "Meta denied Insights access. Reconnect Meta with read_insights and pages_read_engagement, and confirm the Page account has the ANALYZE task.";
  }
  if (code === 100) return "Meta rejected an Insights metric. Check that the Page and Graph API v26.0 still support these metrics.";
  return `Meta Insights could not be loaded (HTTP ${status}). Try again later or reconnect the Page.`;
}

function toDateString(date: Date) {
  return date.toISOString().slice(0, 10);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);

  const bearer = req.headers.get("authorization") ?? "";
  const accessToken = bearer.replace(/^Bearer\s+/i, "").trim();
  if (!accessToken) return json({ error: "Sign in before syncing Facebook Insights." }, 401);

  const { data: authData, error: authError } = await db.auth.getUser(accessToken);
  if (authError || !authData.user) return json({ error: "Your session is not valid. Sign in again." }, 401);

  const body = await req.json().catch(() => null) as { connection_id?: unknown; days?: unknown } | null;
  const connectionId = typeof body?.connection_id === "string" ? body.connection_id : "";
  const days = body?.days === 90 ? 90 : body?.days === 30 ? 30 : null;
  if (!connectionId || !days) return json({ error: "Choose a Facebook Page and a 30- or 90-day range." }, 400);

  const { data: profile, error: profileError } = await db
    .from("profiles")
    .select("workspace_id,role")
    .eq("id", authData.user.id)
    .maybeSingle();
  if (profileError || !profile?.workspace_id) return json({ error: "Your account is not linked to a workspace." }, 403);
  if (profile.role !== "admin" && profile.role !== "manager") {
    return json({ error: "Only workspace admins and managers can sync Facebook Insights." }, 403);
  }

  const { data: connection, error: connectionError } = await db
    .from("social_connections")
    .select("id,workspace_id,provider,account_type,external_account_id,status,credentials_ref,last_insights_synced_at")
    .eq("id", connectionId)
    .eq("workspace_id", profile.workspace_id)
    .eq("provider", "facebook")
    .eq("account_type", "page")
    .eq("status", "active")
    .maybeSingle();
  if (connectionError || !connection) return json({ error: "That active Facebook Page is not available in your workspace. Reconnect it if needed." }, 404);
  if (!connection.credentials_ref) return json({ error: "The Page token is missing. Reconnect Meta from Automation." }, 409);

  const cooldownMs = 5 * 60 * 1000;
  const lastInsightsSync = connection.last_insights_synced_at ? Date.parse(connection.last_insights_synced_at) : Number.NaN;
  if (Number.isFinite(lastInsightsSync) && Date.now() - lastInsightsSync < cooldownMs) {
    const secondsLeft = Math.ceil((cooldownMs - (Date.now() - lastInsightsSync)) / 1000);
    return json({ error: `This Page was synced recently. Try again in about ${Math.max(1, Math.ceil(secondsLeft / 60))} minute(s).` }, 429);
  }

  const { data: pageToken, error: tokenError } = await db.rpc("read_social_secret", { p_id: connection.credentials_ref });
  if (tokenError || typeof pageToken !== "string" || !pageToken) {
    return json({ error: "The saved Page token is unavailable. Reconnect Meta from Automation." }, 409);
  }

  const { since: sinceDate, until: untilDate } = getFacebookInsightsWindow(days);
  const throughDate = new Date(`${untilDate}T00:00:00Z`);
  throughDate.setUTCDate(throughDate.getUTCDate() - 1);
  const through = toDateString(throughDate);

  const url = new URL(`${GRAPH}/${encodeURIComponent(connection.external_account_id)}/insights`);
  url.searchParams.set("metric", FACEBOOK_INSIGHT_METRICS.join(","));
  url.searchParams.set("period", "day");
  url.searchParams.set("since", sinceDate);
  url.searchParams.set("until", untilDate);

  let metrics: MetaInsightMetric[];
  try {
    const response = await fetch(url, { headers: { Authorization: `Bearer ${pageToken}` } });
    const payload = await response.json().catch(() => ({})) as {
      data?: MetaInsightMetric[];
      error?: { code?: number; message?: string };
    };
    if (!response.ok || payload.error) {
      return json({ error: apiErrorMessage(payload.error?.code, response.status) }, 502);
    }
    metrics = Array.isArray(payload.data) ? payload.data : [];
  } catch {
    return json({ error: "Could not reach Meta Insights. Check the network and try again." }, 502);
  }

  const syncedAt = new Date().toISOString();
  const incomingRows = mapMetaInsights(metrics);
  const { data: existingRows, error: existingError } = await db
    .from("facebook_page_insights_daily")
    .select("metric_date,unique_viewers,daily_follows,daily_unfollows,total_followers,updated_at")
    .eq("workspace_id", profile.workspace_id)
    .eq("connection_id", connection.id)
    .gte("metric_date", sinceDate)
    .lt("metric_date", untilDate);
  if (existingError) return json({ error: "Could not read saved Insights before updating them." }, 500);

  const mergedRows = mergeMetaInsightsWithExisting(incomingRows, (existingRows ?? []) as FacebookDailyInsight[]);
  const rows = mergedRows.map((row) => ({
    workspace_id: profile.workspace_id,
    connection_id: connection.id,
    metric_date: row.metric_date,
    unique_viewers: row.unique_viewers,
    daily_follows: row.daily_follows,
    daily_unfollows: row.daily_unfollows,
    total_followers: row.total_followers,
    updated_at: syncedAt,
  }));

  if (rows.length) {
    const { error: upsertError } = await db
      .from("facebook_page_insights_daily")
      .upsert(rows, { onConflict: "workspace_id,connection_id,metric_date" });
    if (upsertError) return json({ error: "Meta data was received but could not be saved. Check the database migration and try again." }, 500);
  }

  const { error: connectionUpdateError } = await db
    .from("social_connections")
    .update({ last_synced_at: syncedAt, last_insights_synced_at: syncedAt })
    .eq("id", connection.id)
    .eq("workspace_id", profile.workspace_id);
  if (connectionUpdateError) return json({ error: "Insights were saved, but the sync cooldown could not be recorded." }, 500);

  return json({
    connection_id: connection.id,
    days,
    since: sinceDate,
    through,
    synced_days: rows.length,
    synced_at: syncedAt,
  });
});
