import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
const supabase=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,{auth:{autoRefreshToken:false,persistSession:false}});
const json=(b:unknown,s=200)=>new Response(JSON.stringify(b),{status:s,headers:{"content-type":"application/json"}});
async function sha256(v:string){const d=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(v));return [...new Uint8Array(d)].map(b=>b.toString(16).padStart(2,"0")).join("")}
function textAt(p:Record<string,unknown>,f:string){return typeof p[f]==="string"?p[f] as string:""}
function matches(cs:unknown[],p:Record<string,unknown>){return cs.every(c=>{if(!c||typeof c!=="object")return true;const x=c as Record<string,unknown>;if(x.type==="contains"){const f=typeof x.field==="string"?x.field:"text";const v=typeof x.value==="string"?x.value.toLowerCase():"";return textAt(p,f).toLowerCase().includes(v)}return true})}
Deno.serve(async req=>{
 if(req.method!=="POST")return json({error:"POST required"},405);
 const token=req.headers.get("x-contentflow-webhook-token")??new URL(req.url).searchParams.get("token");
 if(!token)return json({error:"Missing webhook token"},401);
 let e:{provider:string;external_account_id:string;event_type:string;external_event_id?:string;payload?:Record<string,unknown>};
 try{e=await req.json()}catch{return json({error:"Invalid JSON"},400)}
 if(!e.provider||!e.external_account_id||!e.event_type)return json({error:"provider, external_account_id and event_type are required"},400);
 const {data:endpoint,error:ee}=await supabase.from("automation_webhook_endpoints").select("id,workspace_id,connection_id").eq("provider",e.provider).eq("external_account_id",e.external_account_id).eq("token_hash",await sha256(token)).eq("active",true).maybeSingle();
 if(ee)return json({error:ee.message},500); if(!endpoint)return json({error:"Invalid webhook credentials"},401);
 const {data:event,error:ev}=await supabase.from("automation_events").insert({workspace_id:endpoint.workspace_id,connection_id:endpoint.connection_id,event_type:e.event_type,external_event_id:e.external_event_id??null,payload:e.payload??{},status:"pending"}).select("id").single();
 if(ev){if(ev.code==="23505")return json({ok:true,duplicate:true});return json({error:ev.message},500)}
 const {data:rules,error:re}=await supabase.from("automation_rules").select("id,conditions").eq("workspace_id",endpoint.workspace_id).eq("enabled",true).eq("trigger_type",e.event_type).order("priority",{ascending:true});
 if(re)return json({error:re.message},500);
 const runs:string[]=[];
 for(const rule of rules??[]){const conditions=Array.isArray(rule.conditions)?rule.conditions:[];if(!matches(conditions,e.payload??{}))continue;const key=endpoint.workspace_id+":"+event.id+":"+rule.id;const {data:run,error:r}=await supabase.from("automation_runs").insert({workspace_id:endpoint.workspace_id,rule_id:rule.id,event_id:event.id,status:"queued",idempotency_key:key,input:e.payload??{}}).select("id").single();if(!r&&run)runs.push(run.id)}
 await supabase.from("automation_events").update({status:"processed",processed_at:new Date().toISOString()}).eq("id",event.id);
 return json({ok:true,event_id:event.id,queued_runs:runs},202);
});