import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const db = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } },
);

const GRAPH = "https://graph.facebook.com/v26.0";
const META_PERMISSIONS = [
  "pages_show_list",
  "pages_read_engagement",
  "pages_manage_metadata",
  "pages_messaging",
  "pages_manage_posts",
  "instagram_basic",
  "instagram_content_publish",
  "instagram_manage_comments",
  "instagram_manage_messages",
];

async function sha(value: string) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(bytes)].map((x) => x.toString(16).padStart(2, "0")).join("");
}

async function graph(path: string, params: Record<string, string>) {
  const url = new URL(GRAPH + path);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  const response = await fetch(url);
  const json = await response.json();
  if (!response.ok || json.error) {
    throw new Error(json.error?.message || `Graph API ${response.status}`);
  }
  return json;
}

function redirectUrl(base: string | undefined, ok: boolean) {
  if (!base) return null;
  let url: URL;
  try { url = new URL(base); } catch { return null; }
  if (url.protocol !== "https:" && !(url.protocol === "http:" && url.hostname === "localhost")) return null;
  url.searchParams.set("facebook", ok ? "connected" : "error");
  return url.toString();
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");

  if (!state) {
    return Response.redirect(new URL("/", req.url).toString(), 302);
  }

  const stateHash = await sha(state);
  const now = new Date().toISOString();
  const { data: oauthState, error: stateError } = await db
    .from("social_oauth_states")
    .update({ consumed_at: now })
    .eq("state_hash", stateHash)
    .eq("provider", "facebook")
    .is("consumed_at", null)
    .gt("expires_at", now)
    .select("id,workspace_id,user_id,expires_at,consumed_at,return_url")
    .maybeSingle();

  if (
    stateError ||
    !oauthState ||
    !redirectUrl(oauthState.return_url, true)
  ) {
    return new Response("Invalid or expired OAuth state", { status: 400 });
  }

  if (oauthError || !code) {
    return Response.redirect(
      redirectUrl(oauthState.return_url, false) ?? new URL("/", req.url).toString(),
      302,
    );
  }

  const appId = Deno.env.get("META_APP_ID");
  const secret = Deno.env.get("META_APP_SECRET");
  const redirect = Deno.env.get("META_REDIRECT_URI");

  if (!appId || !secret || !redirect) {
    return new Response("Meta OAuth is not configured", { status: 503 });
  }

  try {
    const shortToken = await graph("/oauth/access_token", {
      client_id: appId,
      client_secret: secret,
      redirect_uri: redirect,
      code,
    });

    const longToken = await graph("/oauth/access_token", {
      grant_type: "fb_exchange_token",
      client_id: appId,
      client_secret: secret,
      fb_exchange_token: shortToken.access_token,
    });

    const pages = await graph("/me/accounts", {
      access_token: longToken.access_token,
      fields: "id,name,access_token,instagram_business_account",
    });

    for (const page of pages.data ?? []) {
      const pageId = String(page.id);
      const pageName = String(page.name ?? "Facebook Page");

      const stored = await db.rpc("store_social_secret", {
        p_name: `contentflow_meta_${oauthState.workspace_id}_${pageId}_${Date.now()}`,
        p_value: page.access_token,
      });
      if (stored.error) throw stored.error;

      const existingFacebook = await db
        .from("social_connections")
        .select("id")
        .eq("workspace_id", oauthState.workspace_id)
        .eq("provider", "facebook")
        .eq("external_account_id", pageId)
        .maybeSingle();

      const facebookMetadata = {
        platform: "meta",
        graph_api_version: "v26.0",
        permissions: META_PERMISSIONS,
      };

      if (existingFacebook.data) {
        await db
          .from("social_connections")
          .update({
            name: pageName,
            credentials_ref: stored.data,
            status: "active",
            metadata: facebookMetadata,
            updated_at: new Date().toISOString(),
            created_by: oauthState.user_id,
          })
          .eq("id", existingFacebook.data.id);
      } else {
        await db.from("social_connections").insert({
          workspace_id: oauthState.workspace_id,
          provider: "facebook",
          account_type: "page",
          external_account_id: pageId,
          name: pageName,
          credentials_ref: stored.data,
          status: "active",
          metadata: facebookMetadata,
          created_by: oauthState.user_id,
        });
      }

      try {
        await graph(`/${pageId}/subscribed_apps`, {
          access_token: page.access_token,
          subscribed_fields: "feed,messages",
        });
      } catch (error) {
        console.error("Facebook Page webhook subscription failed", error);
      }

      const instagramId = page.instagram_business_account?.id;
      if (!instagramId) continue;

      try {
        const instagram = await graph(`/${instagramId}`, {
          access_token: page.access_token,
          fields: "id,username,name,profile_picture_url",
        });

        const instagramMetadata = {
          platform: "meta",
          graph_api_version: "v26.0",
          parent_page_id: pageId,
          permissions: META_PERMISSIONS,
        };

        const existingInstagram = await db
          .from("social_connections")
          .select("id")
          .eq("workspace_id", oauthState.workspace_id)
          .eq("provider", "instagram")
          .eq("external_account_id", String(instagram.id))
          .maybeSingle();

        const instagramRow = {
          workspace_id: oauthState.workspace_id,
          provider: "instagram",
          account_type: "profile",
          external_account_id: String(instagram.id),
          name: String(instagram.name ?? instagram.username ?? "Instagram"),
          username: instagram.username ? String(instagram.username) : null,
          avatar_url: instagram.profile_picture_url ? String(instagram.profile_picture_url) : null,
          status: "active",
          credentials_ref: stored.data,
          metadata: instagramMetadata,
          last_synced_at: new Date().toISOString(),
          created_by: oauthState.user_id,
        };

        if (existingInstagram.data) {
          await db
            .from("social_connections")
            .update(instagramRow)
            .eq("id", existingInstagram.data.id);
        } else {
          await db.from("social_connections").insert(instagramRow);
        }
      } catch (error) {
        console.error("Instagram account sync failed", error);
      }
    }

    return Response.redirect(
      redirectUrl(oauthState.return_url, true) ?? new URL("/", req.url).toString(),
      302,
    );
  } catch (error) {
    console.error(error);
    return Response.redirect(
      redirectUrl(oauthState.return_url, false) ?? new URL("/", req.url).toString(),
      302,
    );
  }
});