import {serviceBusinessDomain} from './business-domains.js?v=ead34bcfece9';
import {rankServices,normalizeIntent,reraApprovalIntent} from './intent-search.js?v=0aee704a1223';
import {compatibleEmirate} from './customer-jurisdiction.js?v=7be21562672e';

export function entryMode(query){
 const q=normalizeIntent(query);
 return /(?:عايز|عاوزه|اريد|ابي|ابغي|احتاج|الرخصه انتهت|i want|i need|how do i|my licen[cs]e expired)/i.test(q)?'describe':'exact';
}

export function entryDestination(query){
 const q=normalizeIntent(query);
 const changing=/(?:تجديد|جدد|الغاء|الغي|تعديل|اضافه|اضيف|renew|cancel|amend|add activity)/i.test(q);
 const starting=/(?:افتح|فتح|ابدا|تاسيس|انشاء|open|start|set up|setup)/i.test(q);
 const specificIdea=/(?:كافتيريا|كافيتريا|مواد غذاييه|مواد غذائيه|foodstuff)/i.test(q);
 const approval=/(?:موافق|تصريح|ترخيص نشاط|approval|permit)/i.test(q);
 const idea=/(?:كافتيريا|كافيتريا|مطعم|مقهي|كافيه|صالون|بقاله|متجر|محل|تجاره الكترونيه|cafeteria|cafe|coffee shop|restaurant|salon|grocery|shop|store|ecommerce|e commerce)/i.test(q);
 if(((starting&&idea)||specificIdea)&&!changing&&!approval)return 'business-activities';
 return entryMode(query)==='describe'?'ai':'services';
}

export function discoverServices(records,{query='',emirate='',authority='',category='',domain='',approval=''}={}){
 const candidates=records.filter(s=>(!emirate||compatibleEmirate(s.m,emirate))&&(!authority||s.i===authority)&&(!category||s.c===category)&&(!domain||(s.bd||serviceBusinessDomain(s))===domain)&&(!approval||(approval==='business'?s.ap&&!['work-permit','residence-permit'].includes(s.ap):s.ap===approval)));
 return query.trim()?rankServices(query,candidates):candidates;
}

if(typeof document!=='undefined'){
 const en=document.documentElement.lang==='en',prefix=en?'/en':'';
 const home=document.querySelector('.premium-intent-search');
 home?.addEventListener('submit',event=>{
  const q=home.querySelector('input')?.value.trim();
  if(q){const destination=entryDestination(q);if(destination!=='services'){event.preventDefault();location.assign(prefix+'/'+destination+'/?q='+encodeURIComponent(q));}}
 },true);
 document.querySelector('.discovery-entry>a[href*="/ai/"]')?.addEventListener('click',event=>{
  const draft=home?.querySelector('input')?.value.trim().slice(0,800);
  if(!draft)return;
  const destination=entryDestination(draft)==='business-activities'?'business-activities':'ai';
  event.preventDefault();location.assign(prefix+'/'+destination+'/?q='+encodeURIComponent(draft)+(destination==='ai'?'#government-search':''));
 });
 const form=document.querySelector('[data-discovery-form]');
 if(form){
  const cards=[...document.querySelectorAll('[data-canonical-service]')],status=document.querySelector('[data-discovery-status]'),empty=document.querySelector('[data-discovery-empty]');
  const params=new URLSearchParams(location.search);
  for(const key of ['q','emirate','authority','category','domain','approval'])if(form.elements[key]){if(params.has(key)||key!=='approval')form.elements[key].value=params.get(key)||'';}
  const advanced=form.querySelector('.discovery-advanced');
  if(advanced&&!form.hasAttribute('data-discovery-compact')&&['authority','domain','category'].some(key=>params.get(key)))advanced.open=true;
  let records;
  async function render(event){
   event?.preventDefault();
   try{
    if(!records){const response=await fetch('/transaction-discovery-data.json');if(!response.ok)throw Error('catalog');records=await response.json();if(form.dataset.discoveryScope==='approvals')records=records.filter(s=>s.ap);}
    const selection={query:form.elements.q.value,emirate:form.elements.emirate.value,authority:form.elements.authority.value,category:form.elements.category.value,domain:form.elements.domain?.value||'',approval:form.elements.approval?.value||''};
    const selectedStatus=document.querySelector('[data-discovery-selection]');
    if(selectedStatus){
     const labels=['domain','authority','category'].filter(key=>selection[key]).map(key=>form.elements[key].selectedOptions[0]?.textContent).filter(Boolean);
     selectedStatus.textContent=labels.length?(en?'Showing: ':'يعرض الآن: ')+labels.join(' · '):'';
     selectedStatus.hidden=!labels.length;
    }
    const found=discoverServices(records,selection),order=new Map(found.map((s,i)=>[s.s,i]));
    for(const card of cards)card.hidden=!order.has(card.dataset.canonicalService);
    const bySlug=new Map(cards.map(card=>[card.dataset.canonicalService,card]));
    for(const record of found){const card=bySlug.get(record.s);if(card)card.parentElement.append(card);}
    status.textContent=en?`${found.length} matching services`:`${found.length} خدمة مطابقة`;
    if(reraApprovalIntent(selection.query)&&found.length>1)status.textContent+=en?' — Which approval do you need: a real estate advertisement permit or a professional practice card?':' — أي موافقة تقصد: تصريح إعلان عقاري أم بطاقة مزاولة مهنة عقارية؟';
    empty.hidden=!!found.length;
    const url=new URL(location.href);for(const [key,value] of Object.entries({q:selection.query,emirate:selection.emirate,authority:selection.authority,category:selection.category,domain:selection.domain,approval:selection.approval})){if(value)url.searchParams.set(key,value);else url.searchParams.delete(key);}history.replaceState(null,'',url);const language=document.querySelector('[data-discovery-language]');if(language){const target=new URL(language.href,location.origin);target.search=url.search;language.href=target.pathname+target.search;}
   }catch{status.textContent=en?'Filtering is unavailable. All service links remain available below.':'تعذر التصفية الآن. روابط الخدمات متاحة أدناه.';for(const card of cards)card.hidden=false;}
  }
  form.addEventListener('submit',render);form.addEventListener('change',render);render();
 }
}


if(typeof document!=='undefined'){
 document.addEventListener('keydown',event=>{if(event.key==='Escape')for(const menu of document.querySelectorAll('.capability-explorer[open]')){menu.open=false;menu.querySelector('summary')?.focus();}});
 document.addEventListener('click',event=>{for(const menu of document.querySelectorAll('.home-capability-explorer[open]'))if(!menu.contains(event.target))menu.open=false;});
}
