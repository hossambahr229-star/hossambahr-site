import { createClient } from "npm:@supabase/supabase-js@2.57.4";

function secretKey() {
  const modern=Deno.env.get("SUPABASE_SECRET_KEYS");
  if(modern){
    try{
      const parsed=JSON.parse(modern);
      if(parsed?.default)return String(parsed.default);
      const first=Object.values(parsed||{})[0];
      if(first)return String(first);
    }catch{}
  }
  return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
}

function adminClient() {
  const url=Deno.env.get("SUPABASE_URL") || "";
  const key=secretKey();
  if(!url || !key)throw new Error("supabase_admin_configuration_missing");
  return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
}

function safeError(error: unknown) {
  const value=error instanceof Error ? error.message : String(error || "unknown_error");
  return value.replace(/(?:sb_secret_|eyJ)[A-Za-z0-9._-]+/g,"[redacted]").slice(0,500);
}

async function readLimited(response: Response,maxBytes=1_000_000) {
  if(!response.body)return "";
  const reader=response.body.getReader();
  const chunks:Uint8Array[]=[];
  let total=0;
  while(total<maxBytes){
    const {done,value}=await reader.read();
    if(done)break;
    if(!value)continue;
    const remaining=maxBytes-total;
    const part=value.byteLength>remaining ? value.slice(0,remaining) : value;
    chunks.push(part);
    total+=part.byteLength;
    if(part.byteLength<value.byteLength)break;
  }
  try{await reader.cancel();}catch{}
  const merged=new Uint8Array(total);
  let offset=0;
  for(const chunk of chunks){merged.set(chunk,offset);offset+=chunk.byteLength;}
  return new TextDecoder().decode(merged);
}

function normalizeOfficialPage(input:string) {
  return String(input||"")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi," ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi," ")
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi," ")
    .replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi," ")
    .replace(/<!--[\s\S]*?-->/g," ")
    .replace(/\bnonce=(["']).*?\1/gi,"")
    .replace(/<[^>]+>/g," ")
    .replace(/&nbsp;|&#160;/gi," ")
    .replace(/&amp;/gi,"&")
    .replace(/&quot;|&#34;/gi,'"')
    .replace(/\s+/g," ")
    .trim()
    .slice(0,600_000);
}

async function sha256(value:string) {
  const hash=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value));
  return [...new Uint8Array(hash)].map((b)=>b.toString(16).padStart(2,"0")).join("");
}

async function fetchWithTimeout(url:string,method:"GET"|"HEAD",timeoutMs:number) {
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),timeoutMs);
  try{
    return await fetch(url,{
      method,
      redirect:"follow",
      signal:controller.signal,
      headers:{
        "Accept":"text/html,application/xhtml+xml,application/json;q=0.9,text/plain;q=0.8,*/*;q=0.5",
        "Accept-Language":"ar,en;q=0.8",
        "User-Agent":"HOSSAM-BAHR-Policy-Monitor/1.0"
      }
    });
  }finally{
    clearTimeout(timeout);
  }
}

async function inspectSource(admin:any,source:any) {
  const started=Date.now();
  const url=String(source.source_url);
  let httpStatus:number|null=null;
  let etag:string|null=null;
  let lastModified:string|null=null;
  let contentHash:string|null=null;
  let errorText:string|null=null;
  let getFailure:string|null=null;
  let transientFailure=false;

  try{
    const response=await fetchWithTimeout(url,"GET",12000);
    httpStatus=response.status;
    etag=response.headers.get("etag");
    lastModified=response.headers.get("last-modified");

    if(response.ok){
      try{
        const body=await readLimited(response);
        const normalized=normalizeOfficialPage(body);
        if(normalized.length<20)throw new Error("source_content_too_small");
        contentHash=await sha256(normalized);
      }catch(error){
        getFailure=safeError(error);
      }
    }else if([404,410].includes(response.status)){
      errorText=`http_status_${response.status}`;
    }else{
      getFailure=`get_http_status_${response.status}`;
    }
  }catch(error){
    getFailure=safeError(error);
    transientFailure=/aborted|timeout|timed out|network|fetch failed/i.test(getFailure);
  }

  if(getFailure && !errorText){
    try{
      const head=await fetchWithTimeout(url,"HEAD",7000);
      httpStatus=head.status;
      etag=head.headers.get("etag") || etag;
      lastModified=head.headers.get("last-modified") || lastModified;
      if(head.ok){
        errorText=null;
      }else{
        errorText=`${getFailure}; head_http_status_${head.status}`;
      }
    }catch(error){
      const headFailure=safeError(error);
      transientFailure=transientFailure || /aborted|timeout|timed out|network|fetch failed/i.test(headFailure);
      errorText=`${getFailure}; head_${headFailure}`;
    }
  }

  const {data,error}=await admin.rpc("hb_finish_policy_source_check",{
    p_source_id:source.id,
    p_http_status:httpStatus,
    p_etag:etag,
    p_last_modified:lastModified,
    p_content_hash:contentHash,
    p_error:errorText,
    p_duration_ms:Date.now()-started
  });
  if(error)throw new Error("source_check_finish_failed");
  return {
    source_id:source.id,
    status:httpStatus,
    changed:Boolean(data?.changed),
    review_required:Boolean(data?.review_required),
    error:Boolean(errorText),
    content_checked:Boolean(contentHash),
    transient_failure:transientFailure
  };
}

Deno.serve(async(req)=>{
  if(req.method!=="POST"){
    return Response.json({error:"method_not_allowed"},{status:405,headers:{"Cache-Control":"no-store"}});
  }

  const admin=adminClient();
  const token=req.headers.get("x-hb-monitor-token") || "";
  const verified=await admin.rpc("hb_verify_internal_token",{
    p_name:"policy-source-monitor",
    p_token:token
  });
  if(verified.error || verified.data!==true){
    return Response.json({error:"unauthorized"},{status:401,headers:{"Cache-Control":"no-store"}});
  }

  let requestedLimit=5;
  try{
    const body=await req.json();
    requestedLimit=Math.min(10,Math.max(1,Number(body?.limit)||5));
  }catch{}

  const {data:sources,error:claimError}=await admin.rpc("hb_claim_policy_source_checks",{p_limit:requestedLimit});
  if(claimError){
    return Response.json({ok:false,error:"source_claim_failed"},{status:500,headers:{"Cache-Control":"no-store"}});
  }

  const rows=Array.isArray(sources)?sources:[];
  const settled=await Promise.allSettled(rows.map((source)=>inspectSource(admin,source)));
  const summary={checked:0,changed:0,review_required:0,errors:0};
  for(const result of settled){
    if(result.status==="rejected"){summary.errors+=1;continue;}
    summary.checked+=1;
    if(result.value.changed)summary.changed+=1;
    if(result.value.review_required)summary.review_required+=1;
    if(result.value.error)summary.errors+=1;
  }

  return Response.json({ok:true,...summary},{headers:{"Cache-Control":"no-store"}});
});
