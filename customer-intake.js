import {compatibleEmirate,jurisdictionCode} from './customer-jurisdiction.js?v=20261004-jurisdiction1';
(() => {
 const form=document.querySelector('[data-customer-intake]');if(!form)return;
 const en=document.documentElement.lang==='en',prefix=en?'/en':'',params=new URLSearchParams(location.search),service=form.elements.service;
 let catalog=[];
 let carry=null;
 if(params.get('handoff')==='1')try{
  const saved=JSON.parse(sessionStorage.getItem('hb-public-ai-handoff-v1')||localStorage.getItem('hb-public-ai-handoff-v1')||'null');
  const expiry=saved?.expires_at||(Date.parse(saved?.created_at||'')+30*60*1000);
  if(saved&&expiry>Date.now())carry=saved;
 }catch{}
 const source=params.get('source')||carry?.source_page;const safeSource=typeof source==='string'&&source.startsWith('/')&&!source.startsWith('//')&&!/[\\\u0000-\u001f]/.test(source)?source:location.pathname;
 function selected(){return catalog.find(s=>s.service_slug===service.value);}
 form.elements.emirate.required=true;
 function validateJurisdiction(){const row=selected();form.elements.emirate.setCustomValidity(row&&!compatibleEmirate(row.emirate,form.elements.emirate.value)?(en?'Choose a service matching this emirate. The selected service has a different jurisdiction.':'اختر خدمة تطابق هذه الإمارة؛ الخدمة المختارة تتبع اختصاصًا مختلفًا.'):'');}
 function choose(){const row=selected();if(row){form.elements.goal.value=row.service_name[en?'en':'ar'];form.elements.emirate.value=row.emirate;}validateJurisdiction();}
 form.elements.emirate.addEventListener('change',validateJurisdiction);
 form.addEventListener('input',()=>{document.querySelector('[data-intake-review]').hidden=true;});
 service.addEventListener('change',()=>{carry=null;choose();});
 fetch('/customer-execution-data.json').then(r=>{if(!r.ok)throw Error('catalog');return r.json();}).then(rows=>{
  catalog=rows;for(const row of rows){const o=document.createElement('option');o.value=row.service_slug;o.textContent=row.service_name[en?'en':'ar'];service.append(o);}
  service.value=params.get('service')||carry?.service_slug||'';choose();
  if(carry&&(!selected()||carry.service_slug===selected().service_slug)){
   if(typeof carry.goal==='string')form.elements.goal.value=carry.goal.slice(0,800);
   const incomingEmirate=carry.emirate||[...form.elements.emirate.options].find(o=>jurisdictionCode(o.value)===carry.jurisdiction_code)?.value;
   if(incomingEmirate&&(!selected()||compatibleEmirate(selected().emirate,incomingEmirate)))form.elements.emirate.value=incomingEmirate;
   if(['individual','family','business'].includes(carry.persona))form.elements.persona.value=carry.persona;
  }else carry=null;
  validateJurisdiction();
 }).catch(()=>{service.disabled=true;});
 form.addEventListener('submit',event=>{
  event.preventDefault();validateJurisdiction();if(!form.reportValidity())return;const row=selected(),goal=form.elements.goal.value.trim();if(!goal)return;
  const previous=carry?.conversation_context||{};
  const context={id:crypto.randomUUID(),created_at:new Date().toISOString(),expires_at:Date.now()+30*60*1000,goal,service_id:row?.service_id||null,service_slug:row?.service_slug||null,service_name:row?.service_name||null,jurisdiction_code:jurisdictionCode(form.elements.emirate.value),authority_key:row?.authority?.id||null,emirate:form.elements.emirate.value,persona:form.elements.persona.value,language:en?'en':'ar',source_page:safeSource,known_requirements:row?.requirements||[],transaction_state:'CUSTOMER_REVIEWED_DRAFT',relationship:carry?.relationship||null,entity:carry?.entity||null,action:carry?.action||null,family_members:Array.isArray(carry?.family_members)?carry.family_members.slice(0,12):[],known_facts:carry?.known_facts&&typeof carry.known_facts==='object'?carry.known_facts:{},conversation_context:{turns:Array.isArray(previous.turns)?previous.turns.slice(-8):[],answers:Array.isArray(previous.answers)?previous.answers.slice(-6):[],last_question:goal}};
  try{sessionStorage.setItem('hb-public-ai-handoff-v1',JSON.stringify(context));localStorage.setItem('hb-public-ai-handoff-v1',JSON.stringify(context));}catch{}
  const review=document.querySelector('[data-intake-review]');review.hidden=false;
  const emirateLabel=form.elements.emirate.selectedOptions[0]?.textContent?.trim()||context.emirate;
  review.querySelector('[data-intake-summary]').textContent=[goal,emirateLabel,row?.authority?.[en?'en':'ar']].filter(Boolean).join(' · ');
  review.querySelector('[data-intake-requirements]').textContent=row?.requirements_verified?(en?'Verified requirements remain available in the service guide.':'المتطلبات الموثقة متاحة في دليل الخدمة.'):(en?'A complete verified requirement list is not available for this request. Confirm it with the official source.':'لا تتوفر قائمة متطلبات كاملة موثقة لهذا الطلب؛ أكدها من المصدر الرسمي.');
  review.querySelector('[data-intake-workspace]').href=prefix+'/auth/?return='+encodeURIComponent(prefix+'/os/?handoff=1#ai-intake');
  const message=[en?'Please help me handle this transaction:':'أريد مساعدة في إنجاز هذه المعاملة:',goal,emirateLabel,row?.authority?.[en?'en':'ar'],row?'https://hossambahr.com'+prefix+row.source_page:''].filter(Boolean).join('\n');
  review.querySelector('[data-intake-whatsapp]').href='https://wa.me/971503780460?text='+encodeURIComponent(message);
  const official=review.querySelector('[data-intake-official]');official.hidden=!row?.official_url;if(row)official.href=row.official_url;
 });
})();
