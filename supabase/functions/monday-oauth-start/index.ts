import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
const digest = async (value: string) => {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
};
const base64url = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

Deno.serve(async (request) => {
  if (request.method !== "POST") return Response.json({ error: "Method not allowed" }, { status: 405 });
  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!bearer) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { data, error } = await db.auth.getUser(bearer);
  if (error || !data.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { data: profile } = await db.from("profiles").select("workspace_id").eq("id", data.user.id).maybeSingle();
  if (!profile) return Response.json({ error: "Workspace not found" }, { status: 403 });
  const body = await request.json().catch(() => ({}));
  let returnUrl: URL;
  try { returnUrl = new URL(typeof body?.return_url === "string" ? body.return_url : ""); } catch { return Response.json({ error: "Invalid return_url" }, { status: 400 }); }
  if (returnUrl.protocol !== "https:" && !(returnUrl.protocol === "http:" && returnUrl.hostname === "localhost")) return Response.json({ error: "Invalid return_url" }, { status: 400 });
  const verifier = base64url(crypto.getRandomValues(new Uint8Array(32)));
  const challenge = await digest(verifier);
  const state = base64url(crypto.getRandomValues(new Uint8Array(32)));
  const { data: verifierRef, error: vaultError } = await db.rpc("store_social_secret", { p_name: `monday_pkce_${profile.workspace_id}_${Date.now()}`, p_value: verifier });
  if (vaultError || !verifierRef) return Response.json({ error: "Unable to start OAuth flow" }, { status: 500 });
  const { error: insertError } = await db.from("monday_oauth_states").insert({ workspace_id: profile.workspace_id, user_id: data.user.id, state_hash: await digest(state), code_challenge: challenge, verifier_ref: verifierRef, return_url: returnUrl.toString(), expires_at: new Date(Date.now() + 10 * 60_000).toISOString() });
  if (insertError) return Response.json({ error: "Unable to start OAuth flow" }, { status: 500 });
  const clientId = Deno.env.get("MONDAY_CLIENT_ID"); const redirect = Deno.env.get("MONDAY_REDIRECT_URI");
  if (!clientId || !redirect) return Response.json({ error: "monday OAuth is not configured" }, { status: 503 });
  const url = new URL("https://auth.monday.com/oauth2/authorize");
  url.searchParams.set("client_id", clientId); url.searchParams.set("redirect_uri", redirect); url.searchParams.set("response_type", "code"); url.searchParams.set("state", state); url.searchParams.set("code_challenge", challenge); url.searchParams.set("code_challenge_method", "S256");
  return Response.json({ authorization_url: url.toString() });
});
