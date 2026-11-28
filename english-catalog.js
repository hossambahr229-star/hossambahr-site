import {rankServices} from './intent-search.js';
import {filterDirectoryServices} from './english-directory-filters.js';
const form=document.querySelector('[data-en-search]');
if(form){
 const input=form.querySelector('input'),status=document.querySelector('[data-en-search-status]'),empty=document.querySelector('[data-en-search-empty]');
 const controls=Object.fromEntries(['emirate','authority','category'].map(key=>[key,form.elements.namedItem(key)]).filter(([,select])=>select));
 const panel=form.querySelector('.en-directory-filter-panel');
 const wide=()=>window.matchMedia('(min-width: 801px)').matches;
 const cards=[...document.querySelectorAll('[data-service-slug]')],bySlug=new Map(cards.map(card=>[card.dataset.serviceSlug,card]));
 let catalogPromise,revision=0;
 function restore(){const params=new URLSearchParams(location.search);input.value=params.get('q')||'';for(const [key,select]of Object.entries(controls)){const value=params.get(key)||'';select.value=[...select.options].some(o=>o.value===value)?value:'';}if(panel)panel.open=wide()||Object.values(controls).some(select=>select.value);}
 async function search(event){
  event?.preventDefault();const request=++revision;
  try{
   catalogPromise??=fetch('/english-catalog-data.json').then(response=>{if(!response.ok)throw Error('catalog');return response.json();});
   const services=await catalogPromise;if(request!==revision)return;
   const query=input.value.trim(),filters=Object.fromEntries(Object.entries(controls).map(([key,select])=>[key,select.value]));
   const results=filterDirectoryServices(query?rankServices(query,services):services,filters),order=new Set(results.map(item=>item.s));
   for(const card of cards)card.hidden=!order.has(card.dataset.serviceSlug);
   for(const result of results){const card=bySlug.get(result.s);if(card)card.parentElement.append(card);}
   status.textContent=results.length+' matching services';empty.hidden=results.length>0;
   const url=new URL(location.href);for(const [key,value]of Object.entries({q:query,...filters})){if(value)url.searchParams.set(key,value);else url.searchParams.delete(key);}history.replaceState(null,'',url);
  }catch{if(request!==revision)return;catalogPromise=null;status.textContent='Search is temporarily unavailable. You can still browse the service directory below.';for(const card of cards)card.hidden=false;empty.hidden=true;}
 }
 form.addEventListener('submit',search);
 for(const select of Object.values(controls))select.addEventListener('change',search);
 form.addEventListener('reset',event=>{event.preventDefault();input.value='';for(const select of Object.values(controls))select.value='';if(panel)panel.open=wide();search();});
 window.addEventListener('popstate',()=>{restore();search();});restore();
 if(input.value||Object.values(controls).some(select=>select.value))search();
}
// Normalize English service pages without waiting for full catalog rematerialization.
const executionSection=document.querySelector('[data-customer-execution]');
if(executionSection){
 const action=executionSection.querySelector('a[href]');
 const title=document.querySelector('main h1')?.textContent?.trim()||'UAE transaction';
 if(action){
  const encodedSlug=location.pathname.split('/').filter(Boolean).at(-1)||'';
  let slug=encodedSlug;try{slug=decodeURIComponent(encodedSlug);}catch{}
  action.href='/en/contact/?service='+encodeURIComponent(slug)+'&source='+encodeURIComponent(location.pathname)+'&handoff=1';
  action.removeAttribute('target');action.dataset.commercialCta='verified';
 }
}
for(const section of document.querySelectorAll('main section')){
 const notice=[...section.querySelectorAll(':scope > p')].find(p=>p.textContent.includes('English translation is not yet available'));
 const quote=section.querySelector(':scope > blockquote[lang="ar"]');
 if(!notice||!quote)continue;
 const details=document.createElement('details'),summary=document.createElement('summary');
 summary.textContent='Read the verified recorded Arabic text';
 quote.replaceWith(details);details.append(summary,quote);
}

