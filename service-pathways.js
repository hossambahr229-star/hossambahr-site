const escape=value=>String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
export const WHATSAPP_NUMBER='971503780460';
export function pathwayRecord(service,locale='ar'){
 const emirates={'دبي':'Dubai','أبوظبي':'Abu Dhabi','الشارقة':'Sharjah','عجمان':'Ajman','رأس الخيمة':'Ras Al Khaimah','الفجيرة':'Fujairah','أم القيوين':'Umm Al Quwain','اتحادي':'Federal'};
 return {...((service.destinationKind||service.destination_kind)==='OFFICIAL_GUIDANCE'?{kind:'OFFICIAL_GUIDANCE'}:{}),slug:service.service_slug||service.slug,id:service.service_id||service.id,name:service.service_name||service.name,emirate:service.emirate,emirate_en:service.emirate_en||emirates[service.emirate]||'See service jurisdiction',authority:service.authority,route:service.source_page||service.internalRoute,variantCards:service.officialVariantCards||service.official_variant_cards||[],official:(locale==='en'&&(service.official_execution_url_en||service.officialCtaUrlEn))||service.official_execution_url||service.officialCtaUrl||service.official_url};
}
export function whatsappHref(service,locale='ar',summary=''){
 const s=pathwayRecord(service,locale),en=locale==='en';
 const text=[en?'Hello HOSSAM BAHR, I would like help with this transaction:':'مرحبًا HOSSAM BAHR، أريد المساعدة في إنجاز المعاملة التالية:',
  (en?'Service: ':'الخدمة: ')+(s.name?.[locale]||s.name?.ar||s.slug),
  (en?'Emirate / jurisdiction: ':'الإمارة / الاختصاص: ')+(en?s.emirate_en||s.emirate:s.emirate),
  (en?'Authority: ':'الجهة: ')+(s.authority?.[locale]||s.authority?.ar||''),
  (en?'Service reference: ':'مرجع الخدمة: ')+s.id,
  (en?'Service link: ':'رابط الخدمة: ')+'https://hossambahr.com'+(en?'/en':'')+s.route,
  summary,
  en?'Please help me confirm the scope and next steps.':'أرجو مساعدتي في تأكيد نطاق الخدمة والخطوات التالية.'].filter(Boolean).join('\n');
 return 'https://wa.me/'+WHATSAPP_NUMBER+'?text='+encodeURIComponent(text);
}
export function pathwayMarkup(service,locale='ar'){
 const s=pathwayRecord(service,locale),en=locale==='en',p=en?'/en':'';
 const chooseDuration=s.variantCards.length>1,officialHref=chooseDuration?p+s.route+'#official-variant-options':s.official;
 const review=p+'/contact/?service='+encodeURIComponent(s.slug)+'&source='+encodeURIComponent(p+s.route)+'&handoff=1';
 return `<div class="hb-service-pathways" data-hb-pathways="${escape(s.slug)}" aria-label="${en?'Choose how to proceed':'اختر طريقة إنجاز المعاملة'}"><a class="hb-path-official"${s.kind==='OFFICIAL_GUIDANCE'?' data-destination-kind="official-guidance"':''} href="${escape(officialHref)}"${chooseDuration?' data-government-duration-selection':' target="_blank" rel="noopener noreferrer"'}>${chooseDuration?(en?'Choose visa duration →':'اختر مدة التأشيرة ←'):s.kind==='OFFICIAL_GUIDANCE'?(en?'Official guidance ↗':'الدليل الحكومي الرسمي ↗'):(en?'Government self-service ↗':'أنجزها بنفسي رسميًا ↗')}</a><a class="hb-path-assisted" data-hb-direct-whatsapp href="${escape(whatsappHref(service,locale))}" target="_blank" rel="noopener noreferrer">${en?'With HOSSAM BAHR · WhatsApp':'أنجزها مع حسام بحر · واتساب'}</a><a class="hb-path-track" href="${escape(review)}">${en?'Or prepare a request and track it in the platform →':'أو جهّز طلبًا وتابعه داخل المنصة ←'}</a></div>`;
}

export function officialVariantMarkup(service,locale='ar'){
 const cards=service.officialVariantCards||service.official_variant_cards||[];if(cards.length<2)return '';
 const en=locale==='en';const durations=new Set();
 for(const card of cards){const url=new URL(card.informationUrl);if(!Number.isInteger(card.durationDays)||card.durationDays<=0||durations.has(card.durationDays)||url.protocol!=='https:'||url.hostname!=='icp.gov.ae'||url.pathname!=='/en/services-details/'||!url.searchParams.get('serviceid')||!card.reviewedAt)throw Error('Invalid reviewed ICP duration card');durations.add(card.durationDays);}
 return '<section id="official-variant-options" class="hb-official-variants" data-hb-official-variants><h2>'+(en?'Choose your visa duration':'اختر مدة التأشيرة')+'</h2><p>'+(en?'Open the ICP information card for the duration you need, then use the application channel shown by the authority. Check each card separately; missing fees or conditions are not an exemption.':'افتح بطاقة ICP الخاصة بالمدة المطلوبة، ثم اتبع قناة التقديم التي تعرضها الجهة. راجع كل بطاقة على حدة؛ غياب رسم أو شرط من إحدى البطاقات لا يعني الإعفاء منه.')+'</p><div>'+cards.map(card=>'<a data-official-variant-days="'+card.durationDays+'" href="'+escape(card.informationUrl)+'" target="_blank" rel="noopener noreferrer">'+(en?'Official '+card.durationDays+'-day visa card ↗':'بطاقة التأشيرة الرسمية — '+card.durationDays+' يومًا ↗')+'</a>').join('')+'</div></section>';
}

if(typeof document!=='undefined'){
 const locale=document.documentElement.lang==='en'?'en':'ar';
 fetch('/customer-execution-data.json'+(new URL(import.meta.url).search||''),{cache:'no-cache'}).then(r=>{if(!r.ok)throw Error('catalog');return r.json();}).then(rows=>{
  const byRoute=new Map(rows.map(row=>[new URL(row.source_page,location.origin).pathname,row]));
  const stage=document.querySelector('.hero-search-stage');
  if(stage&&document.querySelector('.hb-chat-shell')){
   const shell=stage.querySelector('.hb-chat-shell'),form=stage.querySelector('.primary-search');
   const welcome=document.createElement('div');welcome.className='hb-ai-welcome';
   const title=document.createElement('h2');title.textContent=locale==='en'?'Hello, how can I help?':'مرحبًا، ماذا تريد إنجازه؟';
   const note=document.createElement('p');note.textContent=locale==='en'?'Describe your transaction or choose an example.':'صف معاملتك أو اختر مثالًا لبدء المحادثة.';
   const examples=document.createElement('div');examples.className='hb-ai-welcome-examples';
   const prompts=locale==='en'?['Sponsor my wife in Dubai','Renew my trade licence in Dubai','Start a company in Sharjah','Cancel a work permit','Renew my residence','Transfer an employee to my company']:['عايز أجيب زوجتي دبي','تجديد رخصة تجارية في دبي','أريد تأسيس شركة في الشارقة','إلغاء تصريح عمل','تجديد إقامتي','نقل موظف إلى شركتي'];
   for(const prompt of prompts){const b=document.createElement('button');b.type='button';b.textContent=prompt;b.onclick=()=>{const input=form.querySelector('textarea');if(input){input.value=prompt;form.requestSubmit();}};examples.append(b);}
   welcome.append(title,note,examples);shell.prepend(welcome);
   const tools=document.createElement('nav');tools.className='hb-ai-conversation-tools';
   const expand=document.createElement('a');expand.href=(locale==='en'?'/en':'')+'/ai/';expand.textContent=locale==='en'?'Open full conversation ↗':'افتح المحادثة الكاملة ↗';tools.append(expand);
   const fresh=document.createElement('button');fresh.type='button';fresh.textContent=locale==='en'?'New conversation':'محادثة جديدة';fresh.onclick=()=>document.dispatchEvent(new Event('hb-ai-new-conversation'));
   tools.append(fresh);shell.prepend(tools);
  }
  document.addEventListener('click',event=>{
   const button=event.target.closest('.hb-chat-primary');if(!button)return;
   const slug=new URL(button.href,location.origin).searchParams.get('service');const row=rows.find(s=>s.service_slug===slug);if(!row)return;
   event.preventDefault();event.stopImmediatePropagation();
   const dialog=document.createElement('dialog');dialog.className='hb-whatsapp-consent';
   const heading=document.createElement('h2');heading.textContent=locale==='en'?'Review your WhatsApp message':'راجع رسالة واتساب';
   const explanation=document.createElement('p');explanation.textContent=locale==='en'?'Only the public service context is included. Your conversation and documents are not shared.':'تتضمن الرسالة بيانات الخدمة العامة فقط. لا تُشارك المحادثة أو المستندات.';
   const preview=document.createElement('pre');const href=whatsappHref(row,locale);preview.textContent=new URL(href).searchParams.get('text');
   const proceed=document.createElement('a');proceed.className='hb-consent-continue';proceed.href=href;proceed.target='_blank';proceed.rel='noopener noreferrer';proceed.textContent=locale==='en'?'Continue to WhatsApp':'متابعة إلى واتساب';
   const cancel=document.createElement('button');cancel.type='button';cancel.textContent=locale==='en'?'Cancel':'إلغاء';cancel.onclick=()=>dialog.close();
   const actions=document.createElement('div');actions.className='hb-consent-actions';actions.append(proceed,cancel);
   dialog.append(heading,explanation,preview,actions);dialog.addEventListener('close',()=>{dialog.remove();button.focus();},{once:true});document.body.append(dialog);dialog.showModal();
  },true);
  const rowFor=a=>{try{const u=new URL(a.getAttribute('href'),location.origin);if(u.origin!==location.origin)return;return byRoute.get(u.pathname.replace(/^\/en\//,'/'));}catch{}};
  let queued=false;
  function decorate(){queued=false;
   for(let card of document.querySelectorAll('main article,main .card,main .service-card,main .service-row,main .service-list li,[data-canonical-service],[data-service-slug],.intent-result-card')){
    if(card.closest('.hb-service-pathways,.hb-pathway-card,.hb-chat-thread')||card.querySelector('[data-hb-pathways]'))continue;
    const links=[...(card.matches('a[href]')?[card]:[]),...card.querySelectorAll('a[href]')];
    const matches=[...new Map(links.map(rowFor).filter(Boolean).map(s=>[s.service_slug,s])).values()];
    if(matches.length!==1)continue;
    if(card.matches('a')){const wrapper=document.createElement('div');wrapper.className='hb-pathway-card';card.replaceWith(wrapper);wrapper.append(card);card=wrapper;}
    const template=document.createElement('template');template.innerHTML=pathwayMarkup(matches[0],locale);card.append(template.content);
   }
  }
  const observer=new MutationObserver(()=>{if(!queued){queued=true;requestAnimationFrame(decorate);}});
  decorate();observer.observe(document.body,{childList:true,subtree:true});
 }).catch(()=>{/* Static server-rendered pathways remain available. */});
}

