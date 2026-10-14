import {rankServices} from './intent-search.js';
const input=document.querySelector('#det-search');
if(input){
 const cards=[...document.querySelectorAll('[data-directory-card],[data-service-card]')],empty=document.querySelector('#det-empty'),status=document.querySelector('.result-count');
 const bySlug=new Map(cards.map(card=>{const href=card.querySelector('a[href^="/services/"]')?.getAttribute('href')||'';let slug=href.split('/').filter(Boolean).at(-1)||'';try{slug=decodeURIComponent(slug);}catch{}return[slug,card];}));
 let catalog,sequence=0;
 async function run(event){
  event?.preventDefault();const current=++sequence,query=input.value.trim();
  try{
   if(!catalog){const response=await fetch('/intent-search-data.js');if(!response.ok)throw Error('catalog');const raw=await response.text();const payload=raw.match(/^window\.HB_INTENT_SERVICES=([\s\S]*);\s*$/);if(!payload)throw Error('catalog format');catalog=JSON.parse(payload[1]);}
   if(current!==sequence)return;
   const found=query?rankServices(query,catalog):catalog,order=new Set(found.map(s=>s.s));
   for(const [slug,card]of bySlug)card.hidden=!order.has(slug);
   for(const item of found){const card=bySlug.get(item.s);if(card)card.parentElement.append(card);}
   if(empty)empty.hidden=!!found.length;if(status)status.textContent=found.length+' خدمة مطابقة';
   const url=new URL(location.href);if(query)url.searchParams.set('q',query);else url.searchParams.delete('q');history.replaceState(null,'',url);
  }catch{
   if(current!==sequence)return;for(const card of cards)card.hidden=false;if(empty)empty.hidden=true;if(status)status.textContent='تعذر البحث الآن؛ جميع روابط الخدمات متاحة أدناه.';
  }
 }
 document.querySelector('#det-search-button')?.addEventListener('click',run);input.form?.addEventListener('submit',run);input.addEventListener('input',run);
 const query=new URLSearchParams(location.search).get('q');if(query)input.value=query;run();
}
