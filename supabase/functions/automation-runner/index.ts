import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
const url=Deno.env.get("SUPABASE_URL")!, key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
type Run={id:string;workspace_id:string;rule_id:string;event_id:string;attempt_count:number;idempotency_key:string;input:Record<string,unknown>|null};
async function secret(){const r=await db.rpc("get_automation_worker_secret");if(r.error||!r.data)throw new Error("Worker secret unavailable");return r.data;}
async function log(run:Run,level:string,message:string,metadata={}){await db.from("automation_logs").insert({workspace_id:run.workspace_id,run_id:run.id,level,message,metadata});}
async function finish(run:Run,status:"succeeded"|"failed"|"skipped",output:Record<string,unknown>,error?:string){
 const {data:updated,error:e}=await db.from("automation_runs").update({status,output,error:error??null,completed_at:new Date().toISOString()}).eq("id",run.id).eq("status","running").select("id");
 if(e)throw e;
 if(!updated?.length)throw new Error(`Unable to complete automation run ${run.id}: run was not running or no longer exists`);
 await log(run,status==="failed"?"error":"info",status==="succeeded"?"Automation completed":status==="skipped"?"Automation skipped":"Automation failed",{output,error:error??null});
}
async function graph(path:string,token:string,params:Record<string,string>={},method="POST"){const u=new URL(`https://graph.facebook.com/v26.0${path}`);const body=new URLSearchParams({access_token:token,...params});const r=await fetch(u,{method,headers:{"Content-Type":"application/x-www-form-urlencoded"},body:method==="GET"?undefined:body});const j=await r.json();if(!r.ok||j.error)throw new Error(j.error?.message||`Meta API ${r.status}`);return j;}
async function facebookAction(connectionId:string,event:any,action:Record<string,unknown>){
 const {data:c,error:ce}=await db.from("social_connections").select("external_account_id,credentials_ref").eq("id",connectionId).maybeSingle();if(ce)throw ce;if(!c?.credentials_ref)throw new Error("Facebook credentials are missing");
 const sr=await db.rpc("read_social_secret",{p_id:c.credentials_ref});if(sr.error||!sr.data)throw new Error("Facebook access token unavailable");const token=sr.data;
 const type=String(action.type??action.action??"");const p=event.payload??{};
 if(type==="reply_comment"){const commentId=String(action.comment_id??p.comment_id??"");const message=String(action.message??"");if(!commentId||!message)throw new Error("reply_comment requires comment_id and message");const privateReply=Boolean(action.private_reply);return privateReply?await graph(`/${commentId}/private_replies`,token,{message}):await graph(`/${commentId}/comments`,token,{message});}
 if(type==="send_message"){const recipient=String(action.recipient_id??p.sender?.id??p.sender_id??"");const message=String(action.message??"");if(!recipient||!message)throw new Error("send_message requires recipient_id and message");return await graph(`/${c.external_account_id}/messages`,token,{recipient:JSON.stringify({id:recipient}),message:JSON.stringify({text:message})});}
 if(type==="share_content")throw new Error("Facebook share_content is not enabled until the content publishing/group-sharing adapter is configured.");
 throw new Error(`Unsupported Facebook action: ${type}`);
}
async function processRun(run:Run){
 const {data:rule,error:re}=await db.from("automation_rules").select("id,name,enabled,trigger_type,trigger_config,conditions,actions").eq("id",run.rule_id).maybeSingle();if(re)throw re;if(!rule)return finish(run,"skipped",{reason:"rule_not_found"});if(!rule.enabled)return finish(run,"skipped",{reason:"rule_disabled"});
 const {data:event,error:ee}=await db.from("automation_events").select("id,event_type,payload,connection_id,external_event_id").eq("id",run.event_id).maybeSingle();if(ee)throw ee;if(!event)return finish(run,"skipped",{reason:"event_not_found"});
 const actions=Array.isArray(rule.actions)?rule.actions:[];if(!actions.length)throw new Error("Automation rule has no actions");
 const results=[];for(const raw of actions as Record<string,unknown>[]){const type=String(raw?.type??raw?.action??"");if(type==="notify_team"){results.push({type,status:"accepted"});continue;}if(["reply_comment","send_message","share_content"].includes(type)){if(!event.connection_id)throw new Error("Automation event has no social connection");results.push({type,status:"sent",response:await facebookAction(event.connection_id,event,raw)});continue;}throw new Error(`Unsupported automation action: ${type}`);}
 await log(run,"info","Executing automation actions",{rule_id:rule.id,event_type:event.event_type});await finish(run,"succeeded",{run_id:run.id,event_id:event.id,actions:results});
}
async function worker(limit:number){
 const {data:runs,error}=await db.rpc("claim_automation_runs",{p_limit:Math.max(1,Math.min(limit,50))});if(error)throw error;
 let succeeded=0,failed=0;const completionErrors:string[]=[];
 for(const run of (runs??[]) as Run[]){try{await processRun(run);succeeded++;}catch(e){
   failed++;const message=e instanceof Error?e.message:String(e);
   try{await finish(run,"failed",{},message);}catch(completionError){
     const detail=completionError instanceof Error?completionError.message:String(completionError);
     completionErrors.push(`${run.id}: ${detail}`);console.error("Automation run completion failed",{runId:run.id,error:detail,originalError:message});
   }
 }}
 return {claimed:runs?.length??0,succeeded,failed,completion_errors:completionErrors};
}
Deno.serve(async req=>{if(req.method!=="POST")return Response.json({error:"Method not allowed"},{status:405});const supplied=req.headers.get("x-contentflow-worker-secret");const s=await secret().catch(()=>null);if(!s||supplied!==s)return Response.json({error:"Unauthorized"},{status:401});try{const b=await req.json().catch(()=>({}));const n=Number(b?.limit??10);const result=await worker(Number.isFinite(n)?n:10);return Response.json({ok:result.failed===0&&result.completion_errors.length===0,...result},{status:result.failed===0&&result.completion_errors.length===0?200:500});}catch(e){console.error(e);return Response.json({ok:false,error:e instanceof Error?e.message:String(e)},{status:500});}});