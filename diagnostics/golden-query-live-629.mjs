import{mkdir,writeFile}from'node:fs/promises';
import{resolve,join}from'node:path';
import{chromium,firefox}from'playwright';
const base=process.env.HB_BASE_URL, out=resolve(process.env.HB_OUTPUT_DIR), cases=[];
const scenarios=[{"id":"formation-dubai","query":"عاوز أفتح شركة خدمات فنية في دبي","expected":["issue-trade-license-dubai"],"mode":"only_expected"},{"id":"quota-colloquial","query":"محتاج كوته عمال","expected":["حصة-تصاريح-العمل-للمنشأة"],"mode":"only_expected"},{"id":"cancel-sole-dubai","query":"إلغاء مؤسسة فردية في دبي","expected":["cancel-business-license-dubai"],"mode":"only_expected"},{"id":"certificate-attestation-ar","query":"تصديق الشهادات","expected":["تصديق-مستند-شخصي-داخل-الإمارات"],"mode":"only_expected"},{"id":"degree-attestation-en","query":"degree attestation","expected":["تصديق-مستند-شخصي-داخل-الإمارات"],"mode":"only_expected"},{"id":"sharjah-renewal","query":"تجديد رخصة في الشارقة","expected":["sharjah-economic-license-renewal","renew-business-license-sharjah"],"mode":"only_expected"},{"id":"sharjah-partner-withdrawal","query":"خروج شريك من شركة بالشارقة","expected":["sharjah-economic-license-amendment"],"mode":"only_expected"},{"id":"dubai-food-product","query":"تسجيل منتج غذائي في بلدية دبي","expected":["register-assess-food-item-dubai"],"mode":"only_expected"},{"id":"dubai-spouse-children","query":"إقامة زوجتي وأولادي في دبي","expected":["family-residency-uae"],"mode":"only_expected"},{"id":"parent-residence","query":"إقامة والدتي في الإمارات","expected":["إصدار-إقامة-للوالدين-عبر-icp-خارج-دبي","إصدار-إقامة-للوالدين-ضمن-الحالات-الإنسانية-في-دبي"],"mode":"only_expected"},{"id":"establishment-card-cancel","query":"إلغاء بطاقة منشأة","expected":["إلغاء-ملف-أو-بطاقة-المنشأة","إلغاء-بطاقة-المنشأة-عبر-icp-خارج-دبي","إلغاء-بطاقة-المنشأة-في-دبي-لجميع-الفئات"],"mode":"only_expected"},{"id":"legal-consultancy-uncovered","query":"تأسيس شركة استشارات قانونية","expected":[],"mode":"no_match"},{"id":"dubai-ports-uncovered","query":"موافقة موانئ دبي","expected":[],"mode":"no_match"},{"id":"ejari-renewal","query":"إيجاري وتجديد العقد","expected":["register-renew-ejari-contract-dubai"],"mode":"only_expected"},{"id":"golden-investor-residence","query":"إقامة مستثمر أو إقامة ذهبية","expected":["golden-residency-uae"],"mode":"only_expected"}];
try {
const until=Date.now()+8*60e3;
let ready=false;
while(Date.now()<until){try{const r=await fetch(base+'/intent-search.js?hb-live-check=629',{cache:'no-store'});if(r.ok&&(await r.text()).includes('const scopedResults')){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,15000));}
if(!ready)throw Error('New search code not yet deployed');
for(const [engine,type] of [['chrome',chromium],['firefox',firefox]]){
 const browser=await type.launch(engine==='chrome'?{executablePath:process.env.HB_BROWSER_PATH}:{});
 try{for(const width of [390,1440])for(const item of scenarios){
  const locale=/[\u0600-\u06ff]/.test(item.query)?'ar':'en';
  const page=await browser.newPage({viewport:{width,height:900}});
  const row={engine,width,locale,id:item.id,query:item.query};
  try{
   await page.goto(base+(locale==='en'?'/en':'')+'/discover/',{waitUntil:'domcontentloaded'});
   const form=page.locator('[data-discovery-form]');
   await form.locator('input[name="q"]').fill(item.query);
   await form.locator('button[type="submit"]').click();
   await page.waitForFunction(q=>new URL(location.href).searchParams.get('q')===q,item.query,{timeout:15000});
   row.actual=await page.locator('[data-canonical-service]:visible').evaluateAll(cards=>cards.map(c=>c.dataset.canonicalService));
   const pass=item.mode==='no_match'?row.actual.length===0:item.expected.includes(row.actual[0])&&row.actual.every(s=>item.expected.includes(s));
   if(!pass)throw Error('Unexpected ranked matches');
   if(item.id==='dubai-food-product'){
    await form.locator('select[name="emirate"]').selectOption({label:locale==='en'?'Sharjah':'الشارقة'});
    await page.waitForFunction(()=>document.querySelector('[data-discovery-empty]')?.hidden===false);
    row.filter='PASS';
   }
   row.status='PASS';
  }catch(e){row.status='FAIL';row.error=e.message;}
  finally{cases.push(row);await page.close();}
 }}finally{await browser.close();}
}
} catch (error) { cases.push({status:'FAIL', phase:'setup', error:error.message}); }
const errors=cases.filter(c=>c.status!=='PASS');
await mkdir(out,{recursive:true});await writeFile(join(out,'report.json'),JSON.stringify({scope:'ACTUAL_PRODUCTION_DISCOVERY_UI',sourceSha:process.env.HB_SOURCE_SHA,status:errors.length?'FAIL':'PASS',cases,errors},null,2)+'\n');
console.log(JSON.stringify({total:cases.length,passed:cases.length-errors.length,errors}));
if(errors.length)process.exitCode=1;
