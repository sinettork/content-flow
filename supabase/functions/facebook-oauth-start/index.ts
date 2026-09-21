import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
const db=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,{auth:{persistSession:false}});
async function sha(v:string){const b=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(v));return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,"0")).join("");}
function b64url(b:Uint8Array){let s="";for(const x of b)s+=String.fromCharCode(x);return btoa(s).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");}
Deno.serve(async req=>{
 if(req.method!=="POST")return Response.json({error:"Method not allowed"},{status:405});
 const token=(req.headers.get("authorization")??"").replace(/^Bearer\s+/,"");
 if(!token)return Response.json({error:"Unauthorized"},{status:401});
 const {data:u,error:ue}=await db.auth.getUser(token); if(ue||!u.user)return Response.json({error:"Unauthorized"},{status:401});
 const {data:p,error:pe}=await db.from("profiles").select("workspace_id").eq("id",u.user.id).maybeSingle(); if(pe||!p)return Response.json({error:"Workspace not found"},{status:403});
 const appId=Deno.env.get("META_APP_ID"); const redirect=Deno.env.get("META_REDIRECT_URI");
 if(!appId||!redirect)return Response.json({error:"META_APP_ID and META_REDIRECT_URI are not configured"},{status:503});
 const body=await req.json().catch(()=>({})); const returnUrl=String(body?.return_url??""); if(!/^https:\/\//.test(returnUrl)&&!/^http:\/\/localhost(:\d+)?\//.test(returnUrl))return Response.json({error:"Invalid return_url"},{status:400}); const state=b64url(crypto.getRandomValues(new Uint8Array(32))); const hash=await sha(state);
 await db.from("social_oauth_states").insert({workspace_id:p.workspace_id,user_id:u.user.id,provider:"facebook",state_hash:hash,expires_at:new Date(Date.now()+10*60*1000).toISOString(),return_url:returnUrl});
 const perms=["pages_show_list","pages_read_engagement","pages_manage_metadata","pages_messaging","pages_manage_posts","instagram_basic","instagram_content_publish","instagram_manage_comments","instagram_manage_messages"].join(",");
 const url=new URL("https://www.facebook.com/v26.0/dialog/oauth"); url.searchParams.set("client_id",appId);url.searchParams.set("redirect_uri",redirect);url.searchParams.set("state",state);url.searchParams.set("scope",perms);
 return Response.json({authorization_url:url.toString()});
});