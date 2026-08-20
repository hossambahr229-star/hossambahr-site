import { chromium } from 'playwright';
import { Script } from 'node:vm';
import { writeFile, mkdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';

const base='https://hossambahr.com';
const routes=['/','/services/','/services/issue-trade-license-dubai/','/command-center/','/dubai-business-activities.html'];
const out='production-js-diagnostic';
await mkdir(out,{recursive:true});
const report={generatedAt:new Date().toISOString(),routes:[],invalidScripts:[]};
function syntax(label,code){
  try{new Script(code,{filename:label});return null;}
  catch(error){const item={label,message:error.message,stack:error.stack,excerpt:code.slice(Math.max(0,(error.lineNumber||1)-3),600)};report.invalidScripts.push(item);return item;}
}
for(const route of routes){
  const url=base+route+'?js-diagnostic='+Date.now();
  const response=await fetch(url,{headers:{'Cache-Control':'no-cache'}});
  const html=await response.text();
  const item={route,status:response.status,inline:[],external:[]};
  let index=0;
  for(const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)){
    index++;
    const attrs=match[1]||'', body=match[2]||'';
    const src=(attrs.match(/\bsrc=["']([^"']+)["']/i)||[])[1];
    const type=((attrs.match(/\btype=["']([^"']+)["']/i)||[])[1]||'').toLowerCase();
    if(src){
      const absolute=new URL(src,url).href;
      const scriptResponse=await fetch(absolute,{headers:{'Cache-Control':'no-cache'}});
      const code=await scriptResponse.text();
      const failure=syntax(absolute,code);
      item.external.push({src:absolute,status:scriptResponse.status,bytes:code.length,syntax:failure?'FAIL':'PASS'});
    }else if(body.trim()){
      if(type.includes('ld+json')||type==='application/json'){
        try{JSON.parse(body);item.inline.push({index,bytes:body.length,type,syntax:'DATA_JSON_PASS'});}
        catch(error){report.invalidScripts.push({label:route+'#inline-'+index,message:'Invalid JSON-LD: '+error.message});item.inline.push({index,bytes:body.length,type,syntax:'DATA_JSON_FAIL'});}
      }else{
        const failure=syntax(route+'#inline-'+index,body);
        item.inline.push({index,bytes:body.length,type:type||'javascript',syntax:failure?'FAIL':'PASS'});
      }
    }
  }
  report.routes.push(item);
}
const executablePath=execFileSync('which',['chrome'],{encoding:'utf8'}).trim();
const browser=await chromium.launch({headless:true,executablePath,args:['--no-sandbox']});
for(const item of report.routes){
  const page=await browser.newPage();
  item.pageErrors=[]; item.console=[];
  page.on('pageerror',error=>item.pageErrors.push({message:error.message,stack:error.stack}));
  page.on('console',message=>{if(message.type()==='error')item.console.push({text:message.text(),location:message.location()});});
  await page.goto(base+item.route+'?chrome-diagnostic='+Date.now(),{waitUntil:'networkidle',timeout:60000});
  item.loadedScripts=await page.locator('script').evaluateAll(nodes=>nodes.map((node,index)=>({index,src:node.src||'',bytes:(node.textContent||'').length})));
  await page.close();
}
await browser.close();
report.summary={invalidScripts:report.invalidScripts.length,pageErrors:report.routes.reduce((n,x)=>n+x.pageErrors.length,0),consoleErrors:report.routes.reduce((n,x)=>n+x.console.length,0)};
await writeFile(out+'/result.json',JSON.stringify(report,null,2)+'\n','utf8');
console.log(JSON.stringify(report.summary));
if(report.invalidScripts.length)process.exitCode=1;

// Rerun after production runtime repair; JSON-LD is validated as data.
