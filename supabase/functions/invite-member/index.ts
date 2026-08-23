import { createClient } from "npm:@supabase/supabase-js@2.112.3";

const jsonHeaders = { "Content-Type": "application/json" };

Deno.serve(async (request) => {
  const appUrl = Deno.env.get("APP_URL") ?? "http://localhost:5173";
  const origin = request.headers.get("origin");
  const corsHeaders = {
    "Access-Control-Allow-Origin": origin === appUrl ? origin : appUrl,
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  };
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authorization = request.headers.get("Authorization");
    if (!authorization) throw new Error("Authentication required.");
    const url = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !anonKey || !serviceKey) throw new Error("Function environment is incomplete.");

    const userClient = createClient(url, anonKey, { global: { headers: { Authorization: authorization } } });
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData.user) throw new Error("Authentication required.");

    const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: actor, error: actorError } = await admin
      .from("profiles").select("workspace_id,role").eq("id", userData.user.id).single();
    if (actorError || !actor || !["admin", "manager"].includes(actor.role)) throw new Error("Insufficient permission.");

    const body = await request.json() as { email?: string; role?: string; redirectTo?: string };
    const email = body.email?.trim().toLowerCase();
    const allowedRoles = actor.role === "admin" ? ["admin", "manager", "editor", "viewer"] : ["editor", "viewer"];
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) throw new Error("A valid email is required.");
    if (!body.role || !allowedRoles.includes(body.role)) throw new Error("That role cannot be assigned.");
    const redirectTo = body.redirectTo?.startsWith(appUrl) ? body.redirectTo : `${appUrl}/auth/sign-in`;

    const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
      redirectTo,
      data: { workspace_id: actor.workspace_id, role: body.role },
    });
    if (inviteError) throw inviteError;

    const tokenBytes = crypto.getRandomValues(new Uint8Array(32));
    const tokenHash = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", tokenBytes)))
      .map((byte) => byte.toString(16).padStart(2, "0")).join("");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const { error: profileError } = await admin.from("profiles").upsert({
      id: invited.user.id, workspace_id: actor.workspace_id, full_name: email.split("@")[0],
      email, role: body.role,
    });
    if (profileError) throw profileError;
    const { error: recordError } = await admin.from("workspace_invitations").upsert({
      workspace_id: actor.workspace_id, email, role: body.role, token_hash: tokenHash,
      invited_by: userData.user.id, expires_at: expiresAt, revoked_at: null,
    }, { onConflict: "workspace_id,email" });
    if (recordError) throw recordError;

    return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, ...jsonHeaders } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Invitation failed." }), {
      status: 400, headers: { ...corsHeaders, ...jsonHeaders },
    });
  }
});
