(() => {
 const form=document.querySelector('[data-customer-intake]');if(!form)return;
 const en=document.documentElement.lang==='en',prefix=en?'/en':'',params=new URLSearchParams(location.search),service=form.elements.service;
 let catalog=[];
 const source=params.get('source');const safeSource=source&&source.startsWith('/')&&!source.startsWith('//')&&!/[\\\u0000-\u001f]/.test(source)?source:location.pathname;
 function selected(){return catalog.find(s=>s.service_slug===service.value);}
 function choose(){const row=selected();if(!row)return;form.elements.goal.value=row.service_name[en?'en':'ar'];form.elements.emirate.value=row.emirate;}
 service.addEventListener('change',choose);
 fetch('/customer-execution-data.json').then(r=>{if(!r.ok)throw Error('catalog');return r.json();}).then(rows=>{
  catalog=rows;for(const row of rows){const o=document.createElement('option');o.value=row.service_slug;o.textContent=row.service_name[en?'en':'ar'];service.append(o);}service.value=params.get('service')||'';choose();
 }).catch(()=>{service.disabled=true;});
 form.addEventListener('submit',event=>{
  event.preventDefault();const row=selected(),goal=form.elements.goal.value.trim();if(!goal)return;
  const context={id:crypto.randomUUID(),created_at:new Date().toISOString(),goal,service_id:row?.service_id||null,service_slug:row?.service_slug||null,service_name:row?.service_name||null,jurisdiction_code:null,authority_key:row?.authority?.id||null,emirate:form.elements.emirate.value,persona:form.elements.persona.value,language:en?'en':'ar',source_page:safeSource,known_requirements:row?.requirements||[],transaction_state:'CUSTOMER_REVIEWED_DRAFT',conversation_context:{turns:[],answers:[],last_question:goal}};
  try{sessionStorage.setItem('hb-public-ai-handoff-v1',JSON.stringify(context));localStorage.setItem('hb-public-ai-handoff-v1',JSON.stringify(context));}catch{}
  const review=document.querySelector('[data-intake-review]');review.hidden=false;
  review.querySelector('[data-intake-summary]').textContent=[goal,context.emirate,row?.authority?.[en?'en':'ar']].filter(Boolean).join(' · ');
  review.querySelector('[data-intake-requirements]').textContent=row?.requirements_verified?(en?'Verified requirements remain available in the service guide.':'المتطلبات الموثقة متاحة في دليل الخدمة.'):(en?'A complete verified requirement list is not available for this request. Confirm it with the official source.':'لا تتوفر قائمة متطلبات كاملة موثقة لهذا الطلب؛ أكدها من المصدر الرسمي.');
  review.querySelector('[data-intake-workspace]').href=prefix+'/auth/?return='+encodeURIComponent('/os/?handoff=1#ai-intake');
  const message=[en?'Please help me handle this transaction:':'أريد مساعدة في إنجاز هذه المعاملة:',goal,context.emirate,row?.authority?.[en?'en':'ar'],row?'https://hossambahr.com'+row.source_page:''].filter(Boolean).join('\n');
  review.querySelector('[data-intake-whatsapp]').href='https://wa.me/971503780460?text='+encodeURIComponent(message);
  const official=review.querySelector('[data-intake-official]');official.hidden=!row?.official_url;if(row)official.href=row.official_url;
 });
})();
