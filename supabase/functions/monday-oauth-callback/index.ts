import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { MONDAY_API_VERSION } from "../_shared/monday.ts";

const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
const sha = async (value: string) => {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
};
const safeRedirect = (value: string | null, ok: boolean) => {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && !(url.protocol === "http:" && url.hostname === "localhost")) return null;
    url.searchParams.set("monday", ok ? "connected" : "error");
    return url.toString();
  } catch { return null; }
};

Deno.serve(async (request) => {
  const url = new URL(request.url); const state = url.searchParams.get("state");
  if (!state) return new Response("Invalid OAuth state", { status: 400 });
  const now = new Date().toISOString();
  const { data: oauthState, error } = await db.from("monday_oauth_states").update({ consumed_at: now }).eq("state_hash", await sha(state)).is("consumed_at", null).gt("expires_at", now).select("id,workspace_id,user_id,verifier_ref,return_url").maybeSingle();
  if (error || !oauthState) return new Response("Invalid or expired OAuth state", { status: 400 });
  const redirect = safeRedirect(oauthState.return_url, true) ?? new URL("/", request.url).toString();
  const code = url.searchParams.get("code");
  if (!code || url.searchParams.get("error")) return Response.redirect(safeRedirect(oauthState.return_url, false) ?? redirect, 302);
  const clientId = Deno.env.get("MONDAY_CLIENT_ID"); const clientSecret = Deno.env.get("MONDAY_CLIENT_SECRET"); const callback = Deno.env.get("MONDAY_REDIRECT_URI");
  if (!clientId || !clientSecret || !callback) return new Response("monday OAuth is not configured", { status: 503 });
  try {
    const verifier = await db.rpc("read_social_secret", { p_id: oauthState.verifier_ref });
    if (verifier.error || !verifier.data) throw new Error("PKCE verifier unavailable");
    const tokenResponse = await fetch("https://auth.monday.com/oauth_ms/oauth/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, redirect_uri: callback, code, grant_type: "authorization_code", code_verifier: verifier.data }) });
    const token = await tokenResponse.json();
    if (!tokenResponse.ok || !token.access_token) throw new Error("monday token exchange failed");
    const accountResponse = await fetch("https://api.monday.com/v2", { method: "POST", headers: { Authorization: token.access_token, "Content-Type": "application/json", "API-Version": MONDAY_API_VERSION }, body: JSON.stringify({ query: "{ me { id name account { id name } } }" }) });
    const account = await accountResponse.json(); const me = account?.data?.me;
    if (!accountResponse.ok || !me?.account?.id) throw new Error("Unable to read monday account");
    const secret = await db.rpc("store_social_secret", { p_name: `monday_token_${oauthState.workspace_id}_${me.account.id}`, p_value: token.access_token });
    if (secret.error || !secret.data) throw new Error("Unable to store monday token");
    const existing = await db.from("social_connections").select("id").eq("workspace_id", oauthState.workspace_id).eq("provider", "monday").eq("external_account_id", String(me.account.id)).maybeSingle();
    const row = { workspace_id: oauthState.workspace_id, provider: "monday", account_type: "board", external_account_id: String(me.account.id), name: String(me.account.name ?? "monday account"), credentials_ref: secret.data, status: "active", metadata: { api_version: MONDAY_API_VERSION, oauth_version: "2.1", monday_user_id: String(me.id) }, created_by: oauthState.user_id, last_synced_at: now };
    if (existing.data?.id) await db.from("social_connections").update(row).eq("id", existing.data.id);
    else await db.from("social_connections").insert(row);
    return Response.redirect(redirect, 302);
  } catch (caught) { console.error("monday OAuth callback failed", caught); return Response.redirect(safeRedirect(oauthState.return_url, false) ?? redirect, 302); }
});
