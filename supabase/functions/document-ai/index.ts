const ALLOWED=new Set(["https://hossambahr.com","https://www.hossambahr.com"]);
const MAX_BYTES=3*1024*1024;
function cors(req:Request){const o=req.headers.get("origin")||"";return {"Access-Control-Allow-Origin":ALLOWED.has(o)?o:"https://hossambahr.com","Access-Control-Allow-Headers":"authorization, content-type, apikey","Access-Control-Allow-Methods":"POST, OPTIONS","Vary":"Origin"}}
function reply(req:Request,body:any,status=200){return new Response(JSON.stringify(body),{status,headers:{...cors(req),"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"}})}
function outputText(j:any){return (j?.output||[]).flatMap((x:any)=>x.content||[]).filter((x:any)=>x.type==="output_text").map((x:any)=>x.text).join("").trim()}
Deno.serve(async(req)=>{
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers:cors(req)});
 if(req.method!=="POST")return reply(req,{error:"method_not_allowed"},405);
 const origin=req.headers.get("origin")||""; if(origin&&!ALLOWED.has(origin))return reply(req,{error:"origin_not_allowed"},403);
 let body:any;try{body=await req.json()}catch{return reply(req,{error:"invalid_json"},400)}
 const filename=String(body?.filename||"document").slice(0,160), mime=String(body?.mime_type||"");
 const data=String(body?.data_url||""); const prompt=String(body?.question||"حلّل هذا المستند واشرح نوعه والبيانات الظاهرة وما الذي يحتاج انتباه المستخدم.").slice(0,600);
 if(!data.startsWith("data:")||!data.includes(";base64,"))return reply(req,{error:"invalid_file"},422);
 const approx=Math.floor((data.length-data.indexOf(",")-1)*0.75); if(approx>MAX_BYTES)return reply(req,{error:"file_too_large",max_bytes:MAX_BYTES},413);
 const isPdf=mime==="application/pdf"||/\.pdf$/i.test(filename); const isImage=/^image\/(png|jpeg|jpg|webp|gif)$/i.test(mime);
 if(!isPdf&&!isImage)return reply(req,{error:"unsupported_file_type"},415);
 const key=(Deno.env.get("OPENAI_API_KEY")||"").trim(); if(!key)return reply(req,{error:"analysis_unavailable"},503);
 const content:any[]=[{type:"input_text",text:"Analyze only what is actually visible/present in this user-provided document. Do not infer missing passport/ID/license fields. Distinguish extracted facts from uncertainty. Never expose hidden reasoning. User request: "+prompt}];
 if(isPdf)content.unshift({type:"input_file",filename,file_data:data,detail:"high"}); else content.unshift({type:"input_image",image_url:data,detail:"high"});
 try{
  const res=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{"Authorization":"Bearer "+key,"Content-Type":"application/json"},body:JSON.stringify({model:Deno.env.get("OPENAI_MODEL")||"gpt-5.6-sol",store:false,reasoning:{effort:"low"},max_output_tokens:900,input:[{role:"user",content}]})});
  if(!res.ok){console.error("document-ai provider error",{status:res.status});return reply(req,{error:"analysis_unavailable"},502)}
  const j=await res.json(),text=outputText(j); if(!text)return reply(req,{error:"empty_analysis"},502);
  return reply(req,{ok:true,analysis:text,file:{filename,mime_type:mime,stored:false},privacy:{persisted:false,provider_store:false}});
 }catch{return reply(req,{error:"analysis_unavailable"},503)}
});