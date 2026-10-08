import {chromium} from 'playwright';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {canonicalDetails} from '../src/registry/canonical-details.mjs';
const {services}=JSON.parse(await readFile('src/registry/registry.json','utf8'));
const output='artifacts/live-canonical-facts';await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.HB_BROWSER_PATH});
const checks=[];
try {
 for(const locale of ['ar','en'])for(const source of services)for(const width of [1440,390]){
  const page=await browser.newPage({viewport:{width,height:960},deviceScaleFactor:1});
  const route=(locale==='en'?'/en':'')+'/services/'+source.slug+'/';
  const response=await page.goto('https://hossambahr.com'+route,{waitUntil:'networkidle'});
  await page.evaluate(()=>document.fonts.ready);
  const body=await page.locator('body').innerText();
  const details=canonicalDetails(source,locale), failures=[];
  const expected=[source.duration[locale],...source.conditions.map(item=>item[locale]),source.governmentFees.notes[locale],...source.governmentFees.items.flatMap(item=>[String(item.amount),item.label[locale],item.notes[locale]])].filter(Boolean);
  for(const text of expected)if(!body.includes(text))failures.push('Missing recorded fragment: '+text);
  if(locale==='en' && await page.locator('[data-recorded-english-detail]').count()!==4)failures.push('English canonical sections not published');
  const paths=page.locator('[data-hb-pathways="'+source.slug+'"]').first();
  const official=await paths.locator('.hb-path-official').getAttribute('href');
  const whatsapp=await paths.locator('[data-hb-direct-whatsapp]').getAttribute('href');
  const whatsappUrl=new URL(whatsapp);
  if(official!==source.officialGovernmentLink.url)failures.push('Official service identity changed');
  if(whatsappUrl.hostname!=='wa.me'||whatsappUrl.pathname!=='/971503780460'||!whatsappUrl.searchParams.get('text')?.includes(source.id))failures.push('WhatsApp context invalid');
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
  if(overflow)failures.push('Horizontal overflow');
  if(response.status()!==200)failures.push('HTTP '+response.status());
  await page.screenshot({path:output+'/'+locale+'-'+source.slug+'-'+width+'.png',fullPage:true});
  checks.push({locale,slug:source.slug,width,url:page.url(),status:response.status(),recordedFragments:expected.length,official,whatsappContextValid:!failures.includes('WhatsApp context invalid'),overflow,failures});
  await page.close();
 }
}finally{await browser.close();}
const report={capturedAt:new Date().toISOString(),source:'LIVE_PRODUCTION',checks,passed:checks.length===16&&checks.every(row=>!row.failures.length),scope:'New canonical-detail publication and preserved adjacent public pathways. No WhatsApp message, government application, login or private document is submitted.'};
await writeFile(output+'/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));if(!report.passed)process.exitCode=1;
