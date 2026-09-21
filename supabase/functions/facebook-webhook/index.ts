import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
const db=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,{auth:{persistSession:false}});
const enc=new TextEncoder();
async function hmacHex(secret:string,body:string){const k=await crypto.subtle.importKey("raw",enc.encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign"]);const b=await crypto.subtle.sign("HMAC",k,enc.encode(body));return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,"0")).join("");}
async function verify(body:string,header:string|null,secret:string){if(!header?.startsWith("sha256="))return false;const a=header.slice(7),b=await hmacHex(secret,body);if(a.length!==b.length)return false;let diff=0;for(let i=0;i<a.length;i++)diff|=a.charCodeAt(i)^b.charCodeAt(i);return diff===0;}
async function ingest(workspaceId:string,connectionId:string,pageId:string,eventType:string,externalId:string,payload:unknown){
 const ins=await db.from("automation_events").insert({workspace_id:workspaceId,connection_id:connectionId,event_type:eventType,external_event_id:externalId,payload,status:"pending"});
 if(ins.error&&ins.error.code!=="23505")throw ins.error;if(ins.error?.code==="23505")return;
 const {data:rules,error}=await db.from("automation_rules").select("id,conditions").eq("workspace_id",workspaceId).eq("enabled",true).eq("trigger_type",eventType).order("priority",{ascending:false});if(error)throw error;
 const {data:event}=await db.from("automation_events").select("id").eq("workspace_id",workspaceId).eq("connection_id",connectionId).eq("external_event_id",externalId).maybeSingle();
 for(const rule of rules??[]){let ok=true;const conditions=Array.isArray(rule.conditions)?rule.conditions:[];for(const c of conditions as Record<string,unknown>[]){if(c.type==="contains"){const needle=String(c.value??"").toLowerCase();if(needle&&!JSON.stringify(payload).toLowerCase().includes(needle))ok=false;}}if(ok&&event)await db.from("automation_runs").insert({workspace_id:workspaceId,rule_id:rule.id,event_id:event.id,status:"queued",idempotency_key:`${event.id}:${rule.id}`,input:{provider:"facebook",page_id:pageId}});}
 await db.from("automation_events").update({status:"processed",processed_at:new Date().toISOString()}).eq("workspace_id",workspaceId).eq("connection_id",connectionId).eq("external_event_id",externalId);
}
Deno.serve(async req=>{
 const u=new URL(req.url);
 if(req.method==="GET"){const mode=u.searchParams.get("hub.mode"),token=u.searchParams.get("hub.verify_token"),challenge=u.searchParams.get("hub.challenge");if(mode==="subscribe"&&challenge&&token===Deno.env.get("META_VERIFY_TOKEN"))return new Response(challenge);return new Response("Forbidden",{status:403});}
 if(req.method!=="POST")return new Response("Method not allowed",{status:405});
 const body=await req.text(),secret=Deno.env.get("META_APP_SECRET");if(!secret||!(await verify(body,req.headers.get("x-hub-signature-256"),secret)))return new Response("Invalid signature",{status:403});
 try{const json=JSON.parse(body);for(const entry of json.entry??[]){const pageId=String(entry.id);const {data:c}=await db.from("social_connections").select("id,workspace_id").eq("provider","facebook").eq("external_account_id",pageId).eq("status","active").maybeSingle();if(!c)continue;
   for(const change of entry.changes??[]){if(change.field!=="feed")continue;const v=change.value??{};const item=String(v.item??"");if(item==="comment"||v.comment_id){const id=String(v.comment_id??v.id??crypto.randomUUID());await ingest(c.workspace_id,c.id,pageId,"incoming_comment",`comment:${id}`,v);}}
   for(const m of entry.messaging??[]){if(m.message?.is_echo)continue;const mid=String(m.message?.mid??m.timestamp??crypto.randomUUID());await ingest(c.workspace_id,c.id,pageId,"incoming_message",`message:${mid}`,m);}
  }return Response.json({ok:true});}catch(e){console.error(e);return Response.json({ok:false,error:e instanceof Error?e.message:String(e)},{status:500});}
});