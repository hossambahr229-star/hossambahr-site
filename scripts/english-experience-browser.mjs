import assert from 'node:assert/strict';import {readFile,mkdir,writeFile} from 'node:fs/promises';import {chromium} from 'playwright';
import {englishServiceRoute,emirateEnglish,escapeHtml} from '../src/publication/english-catalog.mjs';
const base=process.env.HB_BASE_URL||'http://127.0.0.1:8787';const out='artifacts/english-experience';await mkdir(out,{recursive:true});
const {services}=JSON.parse(await readFile('src/registry/published-services.json','utf8'));
const routes=[];for(let offset=0;offset<services.length;offset+=8){await Promise.all(services.slice(offset,offset+8).map(async service=>{
 const route=englishServiceRoute(service);const response=await fetch(base+route+'?hb_qa=1');assert.equal(response.status,200,route);const html=await response.text();
 assert.ok(html.includes('<h1>'+escapeHtml(service.name.en)+'</h1>'),route+' title');assert.ok(html.includes('href="'+escapeHtml(service.officialInformationUrl)+'"'),route+' source');assert.ok(html.includes('href="'+escapeHtml(service.officialCtaUrl)+'"'),route+' official destination');
 const query=encodeURIComponent(service.name.en+' in '+emirateEnglish(service.emirate));assert.ok(html.includes('/en/ai/?q='+query),route+' contextual AI handoff');routes.push({route,identity:service.name.en,source:service.officialInformationUrl});
}));}
assert.equal(routes.length,200);
const browser=await chromium.launch({headless:true,executablePath:process.env.HB_BROWSER_PATH||undefined});const layouts=[];
for(const width of [1440,1366,430,390,360]){const page=await browser.newPage({viewport:{width,height:900}});const errors=[];page.on('pageerror',e=>errors.push(e.message));for(const route of ['/en/services/','/en/ai/','/en/auth/']){
 await page.goto(base+route+'?hb_qa=1',{waitUntil:'networkidle'});
 if(route==='/en/ai/')await page.getByRole('button',{name:'Send your question to HOSSAM BAHR AI',exact:true}).waitFor();
 const dimensions=await page.evaluate(()=>({width:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth,lang:document.documentElement.lang,dir:document.documentElement.dir,heading:document.querySelector('h1')?.textContent}));
 assert.equal(dimensions.width,width,route+' actual viewport');assert.ok(dimensions.scroll<=width+1,route+' horizontal overflow at '+width);assert.equal(dimensions.lang,'en');assert.equal(dimensions.dir,'ltr');assert.ok(!/[\u0600-\u06ff]/.test(dimensions.heading));
 layouts.push({route,width,...dimensions});await page.screenshot({path:out+'/'+route.replaceAll('/','_')+width+'.png',fullPage:true});
}assert.deepEqual(errors,[]);await page.close();}
for(const width of [1440,1366,430,390,360]){const p=await browser.newPage({viewport:{width,height:844}});await p.goto(base+'/en/os/?handoff=1#ai-intake');await p.waitForURL('**/en/auth/?return=*');assert.equal(new URL(p.url()).searchParams.get('return'),'/en/os/?handoff=1#ai-intake');await p.close();}
const page=await browser.newPage({viewport:{width:390,height:844}});await page.goto(base+'/en/ai/?hb_qa=1',{waitUntil:'networkidle'});
let documentUploads=0;page.on('request',request=>{if(request.url().includes('/functions/v1/document-ai'))documentUploads++;});
const picker=page.waitForEvent('filechooser');await page.getByRole('button',{name:'＋ Attach',exact:true}).click();await (await picker).setFiles({name:'synthetic.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-1.4\n%%EOF')});
await page.getByRole('button',{name:'Analyse document',exact:true}).click();await page.getByText(/requires sign-in/).waitFor();assert.equal(documentUploads,0,'Anonymous PDF must not be uploaded');await page.getByRole('button',{name:'Remove',exact:true}).click();assert.equal(await page.getByText('synthetic.pdf',{exact:true}).count(),0);
await browser.close();const report={status:'PASS',scope:'200 English route identities/source/CTA/context links, native layouts at five measured widths, anonymous attachment privacy',routes,layouts,anonymous_document_uploads:documentUploads};await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({...report,routes:routes.length},null,2));
