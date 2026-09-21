import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
const db=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,{auth:{persistSession:false}});
const GRAPH="https://graph.facebook.com/v26.0";
async function sha(v:string){const b=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(v));return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,"0")).join("");}
async function graph(path:string,params:Record<string,string>){const u=new URL(GRAPH+path);for(const [k,v]of Object.entries(params))u.searchParams.set(k,v);const r=await fetch(u);const j=await r.json();if(!r.ok||j.error)throw new Error(j.error?.message||`Graph API ${r.status}`);return j;}
function redirectUrl(base:string|undefined,ok:boolean){if(!base)return null;const u=new URL(base);u.searchParams.set("facebook",ok?"connected":"error");return u.toString();}
Deno.serve(async req=>{
 const u=new URL(req.url);const code=u.searchParams.get("code"),state=u.searchParams.get("state"),error=u.searchParams.get("error");
 if(error||!code||!state)return Response.redirect(new URL("/",req.url).toString(),302);
 const hash=await sha(state);
 const {data:s,error:se}=await db.from("social_oauth_states").select("id,workspace_id,user_id,expires_at,consumed_at,return_url").eq("state_hash",hash).eq("provider","facebook").maybeSingle();
 if(se||!s||s.consumed_at||new Date(s.expires_at)<new Date())return new Response("Invalid or expired OAuth state",{status:400});
 const appId=Deno.env.get("META_APP_ID"),secret=Deno.env.get("META_APP_SECRET"),redirect=Deno.env.get("META_REDIRECT_URI");
 if(!appId||!secret||!redirect)return new Response("Meta OAuth is not configured",{status:503});
 try{
  const t=await graph("/oauth/access_token",{client_id:appId,client_secret:secret,redirect_uri:redirect,code});
  const long=await graph("/oauth/access_token",{grant_type:"fb_exchange_token",client_id:appId,client_secret:secret,fb_exchange_token:t.access_token});
  const pages=await graph("/me/accounts",{access_token:long.access_token,fields:"id,name,access_token"});
  for(const page of pages.data??[]){
   const stored=await db.rpc("store_social_secret",{p_name:`contentflow_fb_${s.workspace_id}_${page.id}_${Date.now()}`,p_value:page.access_token});
   if(stored.error)throw stored.error;
   const existing=await db.from("social_connections").select("id").eq("workspace_id",s.workspace_id).eq("provider","facebook").eq("external_account_id",String(page.id)).maybeSingle();
   const metadata={platform:"meta",graph_api_version:"v26.0",permissions:["pages_show_list","pages_read_engagement","pages_manage_metadata","pages_messaging","pages_manage_posts"]};
   if(existing.data){await db.from("social_connections").update({name:page.name,credentials_ref:stored.data,status:"active",metadata,updated_at:new Date().toISOString(),created_by:s.user_id}).eq("id",existing.data.id);}
   else{await db.from("social_connections").insert({workspace_id:s.workspace_id,provider:"facebook",account_type:"page",external_account_id:String(page.id),name:page.name,credentials_ref:stored.data,status:"active",metadata,created_by:s.user_id});}
   try{await graph(`/${page.id}/subscribed_apps`,{access_token:page.access_token,subscribed_fields:"feed,messages"});}catch(e){console.error("Page webhook subscription failed",e);}
  }
  await db.from("social_oauth_states").update({consumed_at:new Date().toISOString()}).eq("id",s.id);
  return Response.redirect(redirectUrl(s.return_url,true)??new URL("/",req.url).toString(),302);
 }catch(e){console.error(e);return Response.redirect(redirectUrl(false)??new URL("/",req.url).toString(),302);}
});