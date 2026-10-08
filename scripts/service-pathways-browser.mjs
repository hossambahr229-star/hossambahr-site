import {createRequire} from 'node:module';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
const require=createRequire(resolve(process.env.HB_NODE_MODULES,'runtime.cjs'));
const {chromium}=require('playwright');
const base=process.env.HB_BASE_URL||'http://127.0.0.1:61751';
const output=process.env.HB_OUTPUT_DIR||'artifacts/service-pathways';await mkdir(output,{recursive:true});
const {services}=JSON.parse(await readFile('src/registry/published-services.json','utf8'));
const browser=await chromium.launch({headless:true,executablePath:process.env.HB_BROWSER_PATH});const checks=[];
try{for(const locale of ['ar','en'])for(const width of [1440,1366,430,390,360]){
 const page=await browser.newPage({viewport:{width,height:width>500?960:844}}),p=locale==='en'?'/en':'';
 await page.goto(base+p+'/discover/',{waitUntil:'networkidle'});
 assert.equal(await page.locator('[data-canonical-service] [data-hb-direct-whatsapp]').count(),200);
 const service=services.find(s=>s.slug==='family-residency-uae');
 await page.goto(base+p+service.internalRoute,{waitUntil:'networkidle'});
 const paths=page.locator('[data-hb-pathways]').first();await paths.waitFor();
 assert.equal(await paths.locator('.hb-path-official').getAttribute('href'),service.officialCtaUrl);
 const wa=new URL(await paths.locator('[data-hb-direct-whatsapp]').getAttribute('href'));
 assert.equal(wa.pathname,'/971503780460');assert.ok(wa.searchParams.get('text').includes(service.name[locale]));
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await page.screenshot({path:output+'/'+locale+'-'+width+'-service.png'});
 await page.goto(base+p+'/ai/',{waitUntil:'networkidle'});
 assert.equal(await page.locator('.hb-ai-welcome-examples button').count(),6);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await page.screenshot({path:output+'/'+locale+'-'+width+'-ai.png'});
 checks.push({locale,width,dualPaths:'PASS',canonicalWhatsApp:'PASS',aiWelcome:'PASS',overflow:false});await page.close();
}await writeFile(output+'/report.json',JSON.stringify({base,captureSource:base.includes('hossambahr.com')?'LIVE_PRODUCTION':'LOCAL_BUILD',checks},null,2));console.log(JSON.stringify({status:'PASS',checks:checks.length,base}));
}finally{await browser.close();}

