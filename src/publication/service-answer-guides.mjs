const esc=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
export function staticServiceNavigation(html,locale){
 if(locale==='en')return{html,anchors:[],added:false};
 html=html.replace(/<nav\b[^>]*data-static-service-decision[^>]*>[\s\S]*?<\/nav>/gi,'');
 if(/class=["'][^"']*service-decision-nav/.test(html))return{html,anchors:[],added:false};
 const specs=[[/الشروط|الأهلية/,'الشروط','service-decision-1'],[/المستندات/,'المستندات','requirements'],[/^الرسوم|الرسوم الحكومية/,'الرسوم','service-fees-details'],[/مدة الإنجاز|المدة|الوقت المتوقع/,'المدة','service-duration-details'],[/الخطوات|خطوات التنفيذ|خطوات الخدمة|الإجراءات|طريقة التقديم/,'الخطوات','service-decision-3']],found=new Map();
 html=html.replace(/<(section|div)\b([^>]*)>\s*<h2\b([^>]*)>([\s\S]*?)<\/h2>/gi,(whole,tag,attrs,h2attrs,label)=>{const plain=label.replace(/<[^>]*>/g,'').trim(),match=specs.find(([pattern])=>pattern.test(plain));if(!match||found.has(match[1]))return whole;let id=attrs.match(/\bid=["']([^"']+)["']/)?.[1];if(!id){id=match[2];if(new RegExp('\\bid=["\']'+id+'["\']').test(html))return whole;attrs+=' id="'+id+'"';}found.set(match[1],id);return '<'+tag+attrs+'><h2'+h2attrs+'>'+label+'</h2>';});
 if(/\bid=["']service-execution-options["']/.test(html))found.set('التنفيذ','service-execution-options');
 const anchors=[...found].map(([label,id])=>({label,id}));if(!anchors.length)return{html,anchors,added:false};
 const nav='<nav class="service-decision-nav" data-static-service-decision aria-label="خطوات فهم وتنفيذ المعاملة">'+anchors.map(a=>'<a href="#'+esc(a.id)+'">'+a.label+'</a>').join('')+'</nav>';
 html=html.replace(/(<h1\b[^>]*>[\s\S]*?<\/h1>)/i,'$1'+nav);return{html,anchors,added:true};
}
export function relatedTransactionCandidates(service,services,aliases=[]){
 const byId=new Map(services.map(s=>[s.id,s])),byRoute=new Map(services.map(s=>[decodeURIComponent(s.internalRoute),s]));
 const found=new Map();for(const id of service.relatedServiceIds||[]){let t=byId.get(id);if(!t)continue;const alias=aliases.find(a=>a.slug===t.slug);if(alias)t=byRoute.get(decodeURIComponent(alias.target));if(!t||t.id===service.id||t.authority.id!==service.authority.id||t.emirate!==service.emirate||t.classification.main!==service.classification.main)continue;found.set(t.id,t);}return [...found.values()].slice(0,3);
}
export function renderTransactionHelp(entry,locale,officialUrl){
 if(!entry)return'';const en=locale==='en';
 return '<section class="detail-section hb-intent-help" data-service-intent-help><h2>'+(en?'Choose the right transaction':'اختيار المعاملة الصحيحة')+'</h2>'+entry[locale].map(q=>'<details><summary>'+esc(q.question)+'</summary><p>'+esc(q.answer)+'</p></details>').join('')+'<p><a href="'+esc(officialUrl)+'" target="_blank" rel="noopener noreferrer">'+(en?'Check the government source for current requirements ↗':'راجع المصدر الحكومي للمتطلبات الحالية ↗')+'</a></p></section>';
}
