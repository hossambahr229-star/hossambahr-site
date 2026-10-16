import {serviceBusinessDomain} from './business-domains.js';
import {rankServices,normalizeIntent} from './intent-search.js';
import {compatibleEmirate} from './customer-jurisdiction.js';

export function entryMode(query){
 const q=normalizeIntent(query);
 return /(?:عايز|عاوزه|اريد|ابي|ابغي|احتاج|الرخصه انتهت|i want|i need|how do i|my licen[cs]e expired)/i.test(q)?'describe':'exact';
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
  if(q&&entryMode(q)==='describe'){event.preventDefault();location.assign(prefix+'/ai/?q='+encodeURIComponent(q));}
 },true);
 document.querySelector('.discovery-entry>a[href*="/ai/"]')?.addEventListener('click',event=>{
  const draft=home?.querySelector('input')?.value.trim().slice(0,800);
  if(!draft)return;
  event.preventDefault();location.assign(prefix+'/ai/?q='+encodeURIComponent(draft)+'#government-search');
 });
 const form=document.querySelector('[data-discovery-form]');
 if(form){
  const cards=[...document.querySelectorAll('[data-canonical-service]')],status=document.querySelector('[data-discovery-status]'),empty=document.querySelector('[data-discovery-empty]');
  const params=new URLSearchParams(location.search);
  for(const key of ['q','emirate','authority','category','domain','approval'])if(form.elements[key]){if(params.has(key)||key!=='approval')form.elements[key].value=params.get(key)||'';}
  let records;
  async function render(event){
   event?.preventDefault();
   try{
    if(!records){const response=await fetch('/transaction-discovery-data.json');if(!response.ok)throw Error('catalog');records=await response.json();if(form.dataset.discoveryScope==='approvals')records=records.filter(s=>s.ap);}
    const selection={query:form.elements.q.value,emirate:form.elements.emirate.value,authority:form.elements.authority.value,category:form.elements.category.value,domain:form.elements.domain?.value||'',approval:form.elements.approval?.value||''};
    const found=discoverServices(records,selection),order=new Map(found.map((s,i)=>[s.s,i]));
    for(const card of cards)card.hidden=!order.has(card.dataset.canonicalService);
    const bySlug=new Map(cards.map(card=>[card.dataset.canonicalService,card]));
    for(const record of found){const card=bySlug.get(record.s);if(card)card.parentElement.append(card);}
    status.textContent=en?`${found.length} matching services`:`${found.length} خدمة مطابقة`;
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
