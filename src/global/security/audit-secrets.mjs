import { readdir, readFile, stat } from "node:fs/promises";
import { join, relative } from "node:path";

const root=process.cwd();
const ignored=new Set([".git","node_modules","vendor","artifacts","zero-defect-smoke","coverage-smoke","visual-layout-audit"]);
const patterns=[
  {name:"OpenAI secret key",regex:/\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}\b/g},
  {name:"Supabase secret key",regex:/\bsb_secret_[A-Za-z0-9_-]{20,}\b/g},
  {name:"Stripe live secret",regex:/\bsk_live_[A-Za-z0-9]{16,}\b/g},
  {name:"AWS access key",regex:/\bAKIA[0-9A-Z]{16}\b/g},
  {name:"Private key PEM",regex:/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g},
  {name:"Assigned sensitive environment value",regex:/(?:OPENAI_API_KEY|SUPABASE_SERVICE_ROLE_KEY|STRIPE_SECRET_KEY|AWS_SECRET_ACCESS_KEY)\s*[:=]\s*["']?[A-Za-z0-9_./+=-]{16,}/g}
];

const findings=[];
async function walk(dir){
  for(const entry of await readdir(dir,{withFileTypes:true})){
    if(ignored.has(entry.name))continue;
    const path=join(dir,entry.name);
    if(entry.isDirectory()){await walk(path);continue;}
    const info=await stat(path);
    if(info.size>2_000_000)continue;
    let text;
    try{text=await readFile(path,"utf8");}catch{continue;}
    for(const pattern of patterns){
      pattern.regex.lastIndex=0;
      if(pattern.regex.test(text))findings.push({file:relative(root,path),type:pattern.name});
    }
  }
}
await walk(root);
if(findings.length){
  console.error(JSON.stringify({ok:false,findings},null,2));
  process.exit(1);
}
console.log(JSON.stringify({ok:true,checked:"repository text files; public publishable keys intentionally allowed"},null,2));
