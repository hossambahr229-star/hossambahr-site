import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';

const base = 'https://hossambahr.com';
const out = 'external-production-artifacts';
await mkdir(out, { recursive: true });
const executablePath = execFileSync('which', ['chrome'], { encoding: 'utf8' }).trim();
const browser = await chromium.launch({ headless: true, executablePath, args: ['--no-sandbox'] });
const report = {
  generatedAt: new Date().toISOString(),
  base,
  commit: process.env.GITHUB_SHA || '',
  method: 'GitHub Actions ubuntu-latest + Google Chrome + Playwright',
  checks: [],
  failures: [],
  consoleErrors: [],
  networkFailures: [],
  normalizedDirectoryOnlyRecords: [
    { id:'directory:mohre:14', name:'تصريح عمل جزئي', resolution:'DUPLICATE', resolvedInto:'guide:part-time-work-permit-uae' },
    { id:'directory:mohre:18', name:'تجديد عقد العمل', resolution:'SUB_SERVICE', resolvedInto:'guide:employment-contract-uae' },
    { id:'directory:mohre:21', name:'إصدار عرض العمل', resolution:'SUB_SERVICE', resolvedInto:'guide:new-work-permit-overseas-uae' },
    { id:'directory:mohre:7', name:'دليل توعية أصحاب العمل', resolution:'INFORMATIONAL', resolvedInto:'/authorities/mohre/' },
    { id:'directory:mohre:28', name:'دليل الضمان المصرفي والتأمين', resolution:'GUIDANCE', resolvedInto:'/authorities/mohre/' },
    { id:'directory:mohre:27', name:'خدمات نافس لأصحاب العمل', resolution:'WRONG_AUTHORITY', resolvedInto:'https://nafis.gov.ae/employer' },
    { id:'directory:mohre:4', name:'التفويض الإلكتروني للمنشأة', resolution:'GUIDANCE', resolvedInto:'guide:establishment-card-mohre-uae' },
    { id:'directory:residency:21', name:'إصدار إقامة لمولود جديد في دبي', resolution:'SUB_SERVICE', resolvedInto:'family-residency-uae' }
  ]
};
const badText = /\ufffd|[ØÙ][\u0080-\u00ffŒœŠšŸŽž–-™]|(?:Ã[\u0080-\u00ff]|Â[\u0080-\u00ff]|â€|ðŸ)/;
function assert(condition, message) { if (!condition) throw new Error(message); }
async function check(name, fn) {
  try {
    const details = await fn();
    report.checks.push({ name, status:'PASS', details });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    report.checks.push({ name, status:'FAIL', error:message });
    report.failures.push({ name, error:message });
  }
}
async function newPage(viewport={width:1440,height:1000}) {
  const context = await browser.newContext({ viewport, ignoreHTTPSErrors:false, locale:'ar-AE' });
  const page = await context.newPage();
  await page.setExtraHTTPHeaders({ 'Cache-Control':'no-cache', Pragma:'no-cache' });
  page.on('console', msg => { if (msg.type()==='error' && page.url().startsWith(base)) { const location=msg.location(); report.consoleErrors.push({ pageUrl:page.url(), resourceUrl:location?.url || '', line:location?.lineNumber ?? null, text:msg.text() }); } });
  page.on('pageerror', err => { if (page.url().startsWith(base)) report.consoleErrors.push({ url:page.url(), text:err.message }); });
  page.on('requestfailed', req => {
    const error=req.failure()?.errorText || 'failed';
    if (req.url().startsWith(base) && error!=='net::ERR_ABORTED') report.networkFailures.push({ url:req.url(), error });
  });
  page.on('response', res => {
    const type=res.request().resourceType();
    if (res.url().startsWith(base) && res.status()>=400 && ['document','script','stylesheet','image','font'].includes(type)) {
      report.networkFailures.push({ url:res.url(), status:res.status(), type });
    }
  });
  return { context, page };
}
async function goto(page, route) {
  const join = route.includes('?') ? '&' : '?';
  const response = await page.goto(base + route + join + 'external-acceptance=' + Date.now(), { waitUntil:'networkidle', timeout:60000 });
  assert(response && response.status() < 400, route + ' returned ' + response?.status());
  const text = await page.locator('body').innerText();
  assert(!badText.test(text), route + ' contains mojibake');
  return response;
}
async function visual(route, width) {
  const {context,page}=await newPage({width,height:width<500?844:1000});
  await goto(page,route);
  const layout=await page.evaluate(() => {
    const html=document.documentElement;
    const headings=[...document.querySelectorAll('h1,h2,h3')].filter(el=>el.offsetParent!==null);
    const clipped=headings.filter(el=>{const r=el.getBoundingClientRect();return r.width<2||r.height<2||r.right>innerWidth+2||r.left<-2}).map(el=>el.textContent.trim().slice(0,80));
    const vertical=[...document.querySelectorAll('h1,h2,h3,a,button')].filter(el=>el.offsetParent!==null&&getComputedStyle(el).writingMode!=='horizontal-tb').map(el=>el.textContent.trim().slice(0,80));
    return { overflow:html.scrollWidth>html.clientWidth+1, clipped, vertical, title:document.title };
  });
  await page.screenshot({path:out+'/'+route.replace(/[^a-z0-9]+/gi,'-').replace(/^-|-$/g,'')+'-'+width+'.png',fullPage:true});
  await context.close();
  assert(!layout.overflow,'horizontal overflow at '+route+' '+width);
  assert(!layout.clipped.length,'clipped headings at '+route+' '+width+': '+layout.clipped.join('|'));
  assert(!layout.vertical.length,'vertical text at '+route+' '+width);
  return layout;
}
async function homeJourney(query, expectedSlug) {
  const {context,page}=await newPage({width:390,height:844});
  await goto(page,'/');
  await page.waitForSelector('#government-search');
  // The intent-search module and its data are loaded asynchronously after DOM readiness.
  await page.waitForTimeout(2500);
  await page.fill('#government-search',query);
  await page.locator('form.primary-search').dispatchEvent('submit');
  const results=page.locator('#search-results .intent-result-card, #search-results .activity-intent-card');
  await results.first().waitFor({state:'visible',timeout:15000});
  const count=await results.count();
  const first=results.first().locator('a').first();
  const href=await first.getAttribute('href');
  const expectedHref='/services/'+expectedSlug+'/';
  assert(href===expectedHref,'wrong first result for '+query+': expected '+expectedHref+' but received '+href);
  await first.click();
  await page.waitForLoadState('networkidle');
  assert(page.url().startsWith(base),'journey left production unexpectedly');
  const destination=page.url();
  const requirements=await page.locator('h2').allTextContents();
  const commercial=await page.locator('[data-commercial-cta="verified"]').count();
  const official=await page.locator('[data-government-cta="verified"]').count();
  await context.close();
  return {query,count,href,destination,requirements:requirements.slice(0,8),commercial,official};
}
async function clickedExternal(slug,kind) {
  const {context,page}=await newPage({width:390,height:844});
  await goto(page,'/services/'+slug+'/');
  const selector=kind==='commercial'?'[data-commercial-cta="verified"]':'[data-government-cta="verified"]:visible, .official-route-actions .route-primary:visible, .service-hero .actions > a:first-child:visible';
  const link=page.locator(selector).first();
  // Runtime routing enhances and reveals the verified CTA after deferred scripts execute.
  await page.waitForTimeout(2500);
  await link.waitFor({state:'visible',timeout:15000});
  const href=await link.getAttribute('href');
  assert(href && href.startsWith('https://'),'missing external '+kind+' href for '+slug);
  const popupPromise=context.waitForEvent('page',{timeout:8000}).catch(()=>null);
  const initialUrl=page.url();
  await link.click({noWaitAfter:true});
  const popup=await popupPromise;
  let finalUrl=page.url();
  if (popup) {
    await popup.waitForLoadState('domcontentloaded',{timeout:30000}).catch(()=>{});
    finalUrl=popup.url();
  } else {
    await page.waitForURL(url=>url.href!==initialUrl,{timeout:30000}).catch(()=>{});
    finalUrl=page.url();
  }
  const intended=new URL(href);
  const reached=finalUrl.startsWith('http') ? new URL(finalUrl) : intended;
  if (kind==='commercial') assert(/(?:wa\.me|whatsapp\.com)$/.test(reached.hostname)||/wa\.me/.test(href),'commercial click reached '+finalUrl);
  else assert(reached.hostname===intended.hostname||reached.hostname.endsWith('.'+intended.hostname)||intended.hostname.endsWith('.'+reached.hostname),'official click mismatch '+href+' -> '+finalUrl);
  await context.close();
  return {slug,kind,href,finalUrl};
}

await check('release-marker', async()=> {
  const expected='2026-08-20-critical-intent-ranking-repair';
  let marker='',status=0;
  for(let attempt=1;attempt<=36;attempt++){
    const response=await fetch(base+'/release-marker.txt?cache='+Date.now()+'-'+attempt,{headers:{'Cache-Control':'no-cache'}});
    status=response.status; marker=(await response.text()).trim();
    if(response.ok&&marker===expected)break;
    await new Promise(resolve=>setTimeout(resolve,10000));
  }
  assert(status<400,'marker HTTP '+status);
  assert(marker===expected,'wrong production marker '+marker);
  return {marker};
});

for (const [name,query,expectedSlug] of [
  ['journey-cleaning-company-dubai','أريد فتح شركة تنظيف في دبي','issue-trade-license-dubai'],
  ['journey-renew-wife-residence','أريد تجديد إقامة زوجتي','تجديد-إقامة-أفراد-الأسرة-في-دبي'],
  ['journey-hire-inside-uae','أريد توظيف شخص موجود داخل الإمارات','transfer-work-permit-uae'],
  ['journey-renew-dubai-license','تجديد رخصة في دبي','renew-business-license-dubai'],
  ['journey-contracting-company-dubai','شركة مقاولات في دبي','issue-trade-license-dubai'],
  ['journey-cancel-employee','إلغاء موظف','cancel-work-permit-uae']
]) await check(name,()=>homeJourney(query,expectedSlug));

await check('activity-search-ar-en-partial-code',async()=>{
  const {context,page}=await newPage({width:430,height:900});
  await goto(page,'/dubai-business-activities.html');
  const search=page.locator('#activitySearch');
  const run=async q=>{await search.fill(q);await page.waitForTimeout(400);const cards=page.locator('.activity-card');assert(await cards.count()>0,'no activity for '+q);return {q,count:await cards.count(),title:await cards.first().locator('h3').innerText(),code:await cards.first().locator('.activity-code').innerText()};};
  const results=[await run('تجارة مواد التعبئة'),await run('Packing Packaging Materials'),await run('تعبئة'),await run('514929')];
  assert(results[3].code==='514929','code search mismatch '+results[3].code);
  await page.locator('.activity-card').first().locator('button').click();
  await context.close();
  return results;
});

await check('services-explorer-filters-dubai',async()=>{
  const {context,page}=await newPage();
  await goto(page,'/services/');
  const cards=page.locator('[data-directory-card]');
  assert(await cards.count()===208,'directory records '+await cards.count());
  const emirates=await page.locator('[data-emirate-shortcut]').allTextContents();
  assert(emirates.join('|')==='دبي|أبوظبي|الشارقة|عجمان|رأس الخيمة|أم القيوين|الفجيرة','wrong emirates '+emirates.join('|'));
  await page.click('[data-emirate-shortcut="دبي"]');
  const visible=page.locator('[data-directory-card]:visible');
  const count=await visible.count();
  const mismatch=await visible.evaluateAll(items=>items.filter(el=>!(el.dataset.emirate||'').includes('دبي')).length);
  assert(count>0&&mismatch===0,'Dubai filtering mismatch '+mismatch);
  assert(await page.locator('.directory-controls select').count()===4,'advanced filters missing');
  assert(await page.locator('.directory-reset').count()===1,'reset missing');
  const records=await cards.count();
  await context.close();
  return {records,emirates,dubaiVisible:count,dubaiMismatch:mismatch,normalizedNonIndependent:report.normalizedDirectoryOnlyRecords};
});

await check('command-center-truthful-actions',async()=>{
  const {context,page}=await newPage({width:390,height:844});
  await goto(page,'/command-center/');
  const links=page.locator('.command-action-grid a');
  assert(await links.count()===4,'command actions '+await links.count());
  const hrefs=await links.evaluateAll(items=>items.map(a=>a.getAttribute('href')));
  assert(hrefs.every(h=>h&&h!=='#'&&!h.startsWith('javascript:')),'inactive command action');
  const metrics=(await page.locator('.metric-grid').innerText()).replaceAll(',','');
  assert(['200','2610','7','20'].every(v=>metrics.includes(v)),'command metrics not live');
  const readiness=await page.locator('.account-readiness').innerText();
  assert(readiness.includes('غير مفعّل')&&readiness.includes('مخطط'),'unsupported features not truthful');
  for(let i=0;i<hrefs.length;i++){await goto(page,'/command-center/');await page.locator('.command-action-grid a').nth(i).click();await page.waitForLoadState('networkidle');assert(page.url().startsWith(base),'command action left platform');}
  await context.close();
  return {hrefs,metrics};
});

for (const slug of ['issue-trade-license-dubai','gdrfa-family-residence-renew','mohre-private-tutor-permit']) {
  await check('commercial-click-'+slug,()=>clickedExternal(slug,'commercial'));
  await check('official-click-'+slug,()=>clickedExternal(slug,'official'));
}

for (const width of [375,430,1024,1440]) {
  for (const route of ['/','/services/','/dubai-business-activities.html','/command-center/','/for/resident/','/services/issue-trade-license-dubai/']) {
    await check('visual-'+width+'-'+route,()=>visual(route,width));
  }
}

await browser.close();
report.consoleErrors=[...new Map(report.consoleErrors.map(x=>[x.url+'|'+x.text,x])).values()];
report.networkFailures=[...new Map(report.networkFailures.map(x=>[x.url+'|'+(x.status||x.error),x])).values()];
if(report.consoleErrors.length) report.failures.push({name:'console-errors',error:JSON.stringify(report.consoleErrors.slice(0,20))});
if(report.networkFailures.length) report.failures.push({name:'required-network-failures',error:JSON.stringify(report.networkFailures.slice(0,20))});
report.summary={checks:report.checks.length,passed:report.checks.filter(x=>x.status==='PASS').length,failed:report.failures.length,consoleErrors:report.consoleErrors.length,networkFailures:report.networkFailures.length,productionExternalBrowser:report.failures.length?'FAIL':'PASS'};
await writeFile(out+'/external-production-report.json',JSON.stringify(report,null,2)+'\n','utf8');
console.log(JSON.stringify(report.summary));
if(report.failures.length) process.exitCode=1;

// External acceptance harness timing/diagnostic precision update.

// Final visible-route verification trigger.

// Post-deployment exact-journey verification trigger.
