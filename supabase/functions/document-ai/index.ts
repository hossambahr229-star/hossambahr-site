import { completedProviderText, providerFailure } from "../public-ai-concierge/provider-status.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";
const ALLOWED=new Set(["https://hossambahr.com","https://www.hossambahr.com"]);
const MAX_BYTES=3*1024*1024;
function cors(req:Request){const o=req.headers.get("origin")||"";return {"Access-Control-Allow-Origin":ALLOWED.has(o)?o:"https://hossambahr.com","Access-Control-Allow-Headers":"authorization, content-type, apikey","Access-Control-Allow-Methods":"POST, OPTIONS","Vary":"Origin"}}
function reply(req:Request,body:any,status=200){return new Response(JSON.stringify(body),{status,headers:{...cors(req),"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"}})}
function outputText(j:any){return (j?.output||[]).flatMap((x:any)=>x.content||[]).filter((x:any)=>x.type==="output_text").map((x:any)=>x.text).join("").trim()}
const ACCEPTED=new Set(["application/pdf","image/png","image/jpeg","image/webp","image/gif"]);
function parseDataUrl(value:string){
 const m=/^data:([^;,]+);base64,([A-Za-z0-9+/]*={0,2})$/.exec(value);if(!m)return null;
 try{const bytes=Uint8Array.from(atob(m[2]),x=>x.charCodeAt(0));return {mime:m[1].toLowerCase(),bytes};}catch{return null}
}
function sniffMime(bytes:Uint8Array){
 const at=(...x:number[])=>x.every((v,i)=>bytes[i]===v);
 if(at(0x25,0x50,0x44,0x46,0x2d))return "application/pdf";
 if(at(0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a))return "image/png";
 if(at(0xff,0xd8,0xff))return "image/jpeg";
 if(bytes.length>=12&&String.fromCharCode(...bytes.slice(0,4))==="RIFF"&&String.fromCharCode(...bytes.slice(8,12))==="WEBP")return "image/webp";
 if(bytes.length>=6&&["GIF87a","GIF89a"].includes(String.fromCharCode(...bytes.slice(0,6))))return "image/gif";
 return null;
}
Deno.serve(async(req)=>{
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers:cors(req)});
 if(req.method!=="POST")return reply(req,{error:"method_not_allowed"},405);
 const bearer=(req.headers.get("authorization")||"").replace(/^Bearer\s+/i,"").trim();
 if(!bearer)return reply(req,{error:"authentication_required"},401);
 const supabaseUrl=Deno.env.get("SUPABASE_URL")||"";
 const serviceKey=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
 if(!supabaseUrl||!serviceKey)return reply(req,{error:"analysis_unavailable"},503);
 const admin=createClient(supabaseUrl,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:userData,error:userError}=await admin.auth.getUser(bearer);
 if(userError||!userData?.user?.id)return reply(req,{error:"authentication_required"},401);
 const origin=req.headers.get("origin")||""; if(origin&&!ALLOWED.has(origin))return reply(req,{error:"origin_not_allowed"},403);
 let body:any;try{body=await req.json()}catch{return reply(req,{error:"invalid_json"},400)}
 const filename=String(body?.filename||"document").slice(0,160), mime=String(body?.mime_type||"");
 const data=String(body?.data_url||""); const prompt=String(body?.question||"حلّل هذا المستند واشرح نوعه والبيانات الظاهرة وما الذي يحتاج انتباه المستخدم.").slice(0,600);
 const parsed=parseDataUrl(data);if(!parsed)return reply(req,{error:"invalid_file"},422);
 if(parsed.bytes.byteLength>MAX_BYTES)return reply(req,{error:"file_too_large",max_bytes:MAX_BYTES},413);
 const declared=mime.toLowerCase().replace("image/jpg","image/jpeg"),embedded=parsed.mime.replace("image/jpg","image/jpeg"),sniffed=sniffMime(parsed.bytes);
 if(!ACCEPTED.has(declared)||!ACCEPTED.has(embedded))return reply(req,{error:"unsupported_file_type"},415);
 if(!sniffed||declared!==embedded||declared!==sniffed)return reply(req,{error:"file_type_mismatch"},415);
 const isPdf=sniffed==="application/pdf"; const isImage=sniffed.startsWith("image/");
 const key=(Deno.env.get("OPENAI_API_KEY")||"").trim(); if(!key)return reply(req,{error:"analysis_unavailable"},503);
 const content:any[]=[{type:"input_text",text:"Analyze only what is actually visible/present in this user-provided document. Do not infer missing passport/ID/license fields. Distinguish extracted facts from uncertainty. Never expose hidden reasoning. User request: "+prompt}];
 if(isPdf)content.unshift({type:"input_file",filename,file_data:data}); else content.unshift({type:"input_image",image_url:data,detail:"high"});
 try{
  const res=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{"Authorization":"Bearer "+key,"Content-Type":"application/json"},body:JSON.stringify({model:Deno.env.get("OPENAI_MODEL")||"gpt-5.6-sol",store:false,reasoning:{effort:"low"},max_output_tokens:900,input:[{role:"user",content}]})});
  if(!res.ok){const detail=await res.json().catch(()=>({}));console.error("document-ai provider error",providerFailure(res.status,detail?.error?.code,detail?.error?.type));return reply(req,{error:"analysis_unavailable"},502)}
  const j=await res.json(),text=completedProviderText(j); if(!text)return reply(req,{error:"empty_analysis"},502);
  return reply(req,{ok:true,analysis:text,file:{filename,mime_type:mime,stored:false},privacy:{persisted:false,provider_store:false}});
 }catch{return reply(req,{error:"analysis_unavailable"},503)}
});