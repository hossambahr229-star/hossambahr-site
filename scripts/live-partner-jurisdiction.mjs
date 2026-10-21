import{chromium}from'playwright';import{mkdir,writeFile}from'node:fs/promises';import assert from'node:assert/strict';
const out='diagnostics/partner-jurisdiction-production-2026-10-21';await mkdir(out,{recursive:true});const browser=await chromium.launch({executablePath:process.env.HB_BROWSER_PATH,args:['--no-sandbox']}),report={source:'LIVE_PRODUCTION_BROWSER',humanAcceptance:'NOT_VERIFIED',checks:[]};
const cases=[
{q:'عايز أدخل شريك في الرخصة',city:'دبي',id:'add-remove-partner-dubai'},
{q:'اضافة شريك بالرخصة',city:'رأس الخيمة',id:'ras-al-khaimah-add-remove-partner'},
{q:'محتاج أضيف شريك',city:'دبي',id:'add-remove-partner-dubai'},
{q:'عايز ألغي شركة وعندي عمال',city:'الشارقة',id:'sharjah-economic-license-cancellation'},
{q:'I need to add a partner to my licence in Ras Al Khaimah',id:'ras-al-khaimah-add-remove-partner',en:true}];
const state=p=>p.evaluate(()=>JSON.parse(sessionStorage.getItem('hb-public-ai-conversation-v2')||'{}'));
try{for(const [i,c] of cases.entries()){const p=await browser.newPage({viewport:{width:c.en?1440:390,height:900}});let row={...c};try{
await p.goto('https://hossambahr.com'+(c.en?'/en':'')+'/ai/?q='+encodeURIComponent(c.q),{waitUntil:'networkidle'});
await p.waitForFunction(()=>!document.querySelector('[data-pending="true"]')&&JSON.parse(sessionStorage.getItem('hb-public-ai-conversation-v2')||'{}').history?.some(x=>x.role==='assistant'),{},{timeout:60000});
row.initial=await state(p);if(c.city){assert.ok(!row.initial.active_service_id);row.question=await p.locator('[data-chat-role="assistant"] .hb-chat-bubble').last().innerText();assert.match(row.question,/إمارة/);
const count=await p.locator('[data-chat-role="assistant"]').count();await p.locator('textarea[name="goal"]').fill(c.city);await p.locator('textarea[name="goal"]').press('Enter');
await p.waitForFunction(n=>!document.querySelector('[data-pending="true"]')&&document.querySelectorAll('[data-chat-role="assistant"]').length>n,count,{timeout:60000});}
row.final=await state(p);assert.equal(row.final.active_service_id,c.id);row.reply=await p.locator('[data-chat-role="assistant"] .hb-chat-bubble').last().innerText();assert.ok(!await p.locator('[data-pending="true"]').count());
const reply=p.locator('[data-chat-role="assistant"]').last();assert.ok(await reply.locator('a[href^="https://"]').count());await reply.locator('a[href*="/contact/"]').first().click();const d=p.locator('dialog.hb-whatsapp-consent');await d.waitFor({state:'visible'});const wa=new URL(await d.locator('a.hb-consent-continue').getAttribute('href'));assert.equal(wa.pathname,'/971503780460');assert.ok(!wa.searchParams.get('text').includes(c.q));const handoff=await p.evaluate(()=>JSON.parse(sessionStorage.getItem('hb-public-ai-handoff-v1')));assert.equal(handoff.service_slug,c.id);assert.ok(handoff.goal.includes(c.q));await d.getByRole('button',{name:c.en?'Cancel':'إلغاء',exact:true}).click();row.privateContextPreserved=true;row.noMessageSent=true;row.status='PASS';await p.screenshot({path:out+'/'+i+'.png',fullPage:true});
}catch(e){row.status='FAIL';row.error=String(e.stack);row.failureState=await state(p);await p.screenshot({path:out+'/'+i+'-failure.png',fullPage:true});}report.checks.push(row);await p.close();}report.status=report.checks.every(x=>x.status==='PASS')?'PASS':'FAIL';if(report.status==='FAIL')process.exitCode=1;
}finally{await writeFile(out+'/report.json',JSON.stringify(report,null,2));await browser.close();}