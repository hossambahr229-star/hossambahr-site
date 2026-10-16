import {findActivities,activityEmirate,activityHandoff,ACTIVITY_EMIRATES} from './activity-discovery.js';
import {compatibleEmirate} from './customer-jurisdiction.js';
import {normalizeIntent} from './intent-search.js';

const form=typeof document!=='undefined'&&document.querySelector('[data-activity-discovery]');
if(form){
 const en=document.documentElement.lang==='en',prefix=en?'/en':'',t=(ar,english)=>en?english:ar;
 const status=document.querySelector('[data-activity-status]'),grid=document.querySelector('[data-activity-results]'),more=document.querySelector('[data-activity-more]');
 const escape=value=>String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
 let activities,services,found=[],visible=12,query='',emirate='',requestId=0;
 async function catalog(){if(!services){const response=await fetch('/transaction-discovery-data.json');if(!response.ok)throw Error('catalog');services=await response.json();}return services;}
 const emirateLabel=value=>en?ACTIVITY_EMIRATES.find(([ar])=>ar===value)?.[1]||value:value;
 function requestLinks(activity=null){
  const text=[t('أريد مساعدة في نشاط مشروعي:','Please help me with this business activity:'),query,emirateLabel(emirate),activity?(en?activity.e:activity.a):'',activity?t('كود دبي: ','Dubai code: ')+activity.c:''].filter(Boolean).join('\n');
  return `<div class="hb-service-pathways"><a href="${prefix}/contact/?handoff=1" data-activity-handoff="${activity?escape(activity.c):''}">${t('جهّز طلب مساعدة حسام بحر','Prepare an assisted request')}</a><a href="https://wa.me/971503780460?text=${encodeURIComponent(text)}" target="_blank" rel="noopener noreferrer">${t('تواصل عبر واتساب','Contact on WhatsApp')}</a></div>`;
 }
 function renderActivities(){
  grid.innerHTML=found.slice(0,visible).map(a=>`<article data-activity-code="${escape(a.c)}"><p>${escape(emirateLabel('دبي'))} · ${escape(en?a.ke:a.k)}</p><h2>${escape(en?a.e:a.a)}</h2><p>${t('الكود المسجل في دبي:','Recorded Dubai code:')} <b dir="ltr">${escape(a.c)}</b></p><p>${escape(en?a.ge:a.g)}</p><p class="activity-source-limit">${t('الموافقات والمستندات والرسوم الخاصة بهذا النشاط غير مؤكدة في السجل الحالي؛ لا تُستنتج من اسم النشاط. أكدها لدى الجهة قبل التقديم.','Activity-specific approvals, documents and fees are not verified in the current record. They cannot be inferred from the activity name. Confirm them with the authority before applying.')}</p><a href="https://app.invest.dubai.ae/search-business-activities" target="_blank" rel="noopener noreferrer">${t('تحقق من النشاط لدى جهة دبي الرسمية ↗','Check the activity in the official Dubai lookup ↗')}</a>${requestLinks(a)}</article>`).join('');
  more.hidden=found.length<=visible;status.textContent=t(`${found.length} نشاطًا مسجلًا مطابقًا في دبي؛ عرض ${Math.min(visible,found.length)}.`,`${found.length} matching recorded Dubai activities; showing ${Math.min(visible,found.length)}.`);
 }
 async function search(event){
  event?.preventDefault();const currentRequest=++requestId;query=form.elements.q.value.trim().slice(0,800);const inferred=activityEmirate(query);emirate=inferred||form.elements.emirate.value;
  if(inferred)form.elements.emirate.value=inferred;
  if(!emirate){status.textContent=t('في أي إمارة تريد بدء النشاط؟ اختر إمارة واحدة.','In which emirate do you want to start? Choose one emirate.');grid.replaceChildren();more.hidden=true;return;}
  const url=new URL(location.href);url.searchParams.set('q',query);url.searchParams.set('emirate',emirate);history.replaceState(null,'',url);document.querySelectorAll('[data-discovery-language]').forEach(link=>{const target=new URL(link.href);target.search=url.search;link.href=target.href;});
  status.textContent=t('جارٍ البحث في السجل الموجود…','Searching the existing register…');grid.replaceChildren();more.hidden=true;
  try{
   if(emirate==='دبي'){
    if(!activities){const response=await fetch('/activity-discovery-data.json'+new URL(import.meta.url).search);if(!response.ok)throw Error('activities');const data=await response.json();if(data.source!=='dubai-activities-data.js'||data.jurisdiction!=='AE-DU'||!Array.isArray(data.records))throw Error('scope');activities=data.records;}
    if(currentRequest!==requestId)return;
    found=findActivities(activities,{query,emirate});visible=12;renderActivities();
    if(!found.length){const online=/تجاره الكترونيه|e commerce|ecommerce/.test(normalizeIntent(query));status.textContent=online?t('ما المنتجات أو الخدمات التي ستبيعها عبر الإنترنت؟ لا يثبت وصف التجارة الإلكترونية وحده كود نشاط في سجلنا الحالي.','What products or services will you sell online? E-commerce alone does not establish an activity code in the current register.'):t('لم نجد نشاطًا مطابقًا موثوقًا في سجل دبي. غيّر وصف المشروع أو اطلب المساعدة لتحديده.','No matching activity was found in the recorded Dubai register. Refine your idea or ask for help identifying it.');grid.innerHTML=requestLinks();}
   }else{
    found=[];const records=await catalog();if(currentRequest!==requestId)return;const candidates=records.filter(s=>compatibleEmirate(s.m,emirate)&&s.m===emirate&&['business-licensing','companies-establishments'].includes(s.c)&&/issuance|setup|initial approval|اصدار|تاسيس|موافقه مبدئيه/.test(normalizeIntent(s.a+' '+s.e+' '+s.s))&&!/renew|cancel|amend|تجديد|الغاء|تعديل/.test(normalizeIntent(s.a+' '+s.e))).slice(0,4);
    status.textContent=t(`لا نملك هنا سجل أكواد أنشطة موثقًا لـ${emirate}. لا نعرض أكواد دبي؛ هذه مسارات الترخيص المحلية التالية لتأكيد نشاطك.`,`A verified activity-code register for ${emirateLabel(emirate)} is not available here. Dubai codes are not shown. These local licensing pathways can help confirm your activity.`);
    grid.innerHTML=candidates.map(s=>`<article data-local-licensing-service="${escape(s.s)}"><p>${escape(en?s.n:s.r)} · ${escape(emirateLabel(emirate))}</p><h2><a href="${prefix+s.u}">${escape(en?s.e:s.a)}</a></h2><p>${t('مسار ترخيص محلي؛ لا يثبت كود النشاط أو موافقاته. راجع نطاق الخدمة والمصدر الرسمي.','Local licensing pathway; it does not establish an activity code or required approvals. Check the service scope and official source.')}</p><a href="${prefix+s.u}">${t('راجع الجهة والخطوات والرسوم الموثقة','Review the authority, steps and recorded fees')}</a></article>`).join('');
    grid.insertAdjacentHTML('beforeend',`<article><h2>${t('تأكيد نشاط المشروع والخطوة التالية','Confirm the business activity and next step')}</h2>${requestLinks()}</article>`);
   }
  }catch{if(currentRequest!==requestId)return;status.textContent=t('تعذر تحميل السجل الآن؛ يمكنك الرجوع إلى الدليل أو طلب المساعدة دون ادعاء وجود نتيجة.','The register could not be loaded. Use the directory or ask for assistance; no match is claimed.');grid.innerHTML=`<a href="${prefix}/discover/">${t('دليل الخدمات','Service directory')}</a>${requestLinks()}`;}
 }
 form.addEventListener('submit',search);more.addEventListener('click',()=>{visible+=12;renderActivities();});
 document.querySelectorAll('[data-activity-example]').forEach(button=>button.addEventListener('click',()=>{form.elements.q.value=button.dataset.activityExample;form.requestSubmit();}));
 grid.addEventListener('click',event=>{const link=event.target.closest('[data-activity-handoff]');if(!link)return;const activity=emirate==='دبي'?found.find(a=>String(a.c)===link.dataset.activityHandoff):null;const context=activityHandoff({idea:query,emirate,activity,sourcePage:location.pathname});try{sessionStorage.setItem('hb-public-ai-handoff-v1',JSON.stringify(context));localStorage.setItem('hb-public-ai-handoff-v1',JSON.stringify(context));}catch{}});
 const params=new URLSearchParams(location.search);if(params.get('q')){form.elements.q.value=params.get('q');form.elements.emirate.value=params.get('emirate')||'';form.requestSubmit();}
}
