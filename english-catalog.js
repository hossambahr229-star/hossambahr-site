import {rankServices} from './intent-search.js';
const form=document.querySelector('[data-en-search]');
if(form){
 const input=form.querySelector('input'),status=document.querySelector('[data-en-search-status]'),empty=document.querySelector('[data-en-search-empty]');
 const cards=[...document.querySelectorAll('[data-service-slug]')];
 let services;
 async function search(event){
  event?.preventDefault();
  try{
   if(!services){const response=await fetch('/english-catalog-data.json');if(!response.ok)throw Error('catalog');services=await response.json();}
   const query=input.value.trim(),results=query?rankServices(query,services):services;
   const order=new Map(results.map((item,index)=>[item.s,index]));
   for(const card of cards){card.hidden=!order.has(card.dataset.serviceSlug);card.style.order=String(order.get(card.dataset.serviceSlug)??cards.length);}
   status.textContent=results.length+' matching services';empty.hidden=results.length>0;
   const url=new URL(location.href);if(query)url.searchParams.set('q',query);else url.searchParams.delete('q');history.replaceState(null,'',url);
  }catch{status.textContent='Search is temporarily unavailable. You can still browse the service directory below.';for(const card of cards)card.hidden=false;empty.hidden=true;}
 }
 form.addEventListener('submit',search);
 const query=new URLSearchParams(location.search).get('q');if(query){input.value=query;search();}
}


// Normalize English service pages without waiting for full catalog rematerialization.
const executionSection=document.querySelector('[data-customer-execution]');
if(executionSection){
 const action=executionSection.querySelector('a[href]');
 const title=document.querySelector('main h1')?.textContent?.trim()||'UAE transaction';
 if(action){
  const message=['Hello, I would like HOSSAM BAHR to handle this transaction:',title,'Service: '+location.origin+location.pathname].join('\n');
  action.href='https://wa.me/971503780460?text='+encodeURIComponent(message);
  action.target='_blank';action.rel='noopener noreferrer';action.dataset.commercialCta='verified';
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
