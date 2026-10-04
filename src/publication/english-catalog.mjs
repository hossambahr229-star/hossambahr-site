export const emirateEnglish = value => ({'دبي':'Dubai','أبوظبي':'Abu Dhabi','الشارقة':'Sharjah','عجمان':'Ajman','رأس الخيمة':'Ras Al Khaimah','الفجيرة':'Fujairah','أم القيوين':'Umm Al Quwain','اتحادي':'Federal UAE','الإمارات عدا دبي':'UAE outside Dubai','الإمارات الخاضعة لمسار ICP (خارج دبي)':'ICP jurisdictions outside Dubai','اتحادي مع استثناءات الجهات التعليمية المحلية المنشورة':'Federal UAE; published local education exceptions apply'}[value] || value);
export const englishServiceRoute = service => '/en'+service.internalRoute;
export const escapeHtml = value => String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
export function englishDiscoveryRecords(services){
 return services.map(service=>({s:service.slug,u:englishServiceRoute(service),a:service.name.ar,e:service.name.en,m:service.emirate,i:service.authority.id,r:service.authority.ar,n:service.authority.en,c:service.classification.main,k:service.keywords,emirate:emirateEnglish(service.emirate)}));
}
export function serviceCard(service){
 return `<article class="en-service-card" data-service-slug="${escapeHtml(service.slug)}"><p>${escapeHtml(service.authority.en)} · ${escapeHtml(emirateEnglish(service.emirate))}</p><h2><a href="${englishServiceRoute(service)}">${escapeHtml(service.name.en)}</a></h2><a href="${englishServiceRoute(service)}">View requirements and official pathway →</a></article>`;
}
export function officialExcerpt(label,value){
 const values=(Array.isArray(value)?value:[value]).filter(item=>item&&item!=='NOT_OFFICIALLY_PUBLISHED'&&!/^(غير موثق بعد|غير متوفر|TBD)$/i.test(item));
 if(!values.length)return `<section><h2>${escapeHtml(label)}</h2><p>A verified detail is not available in the platform record. Check the official source before applying.</p></section>`;
 return `<section><h2>${escapeHtml(label)}</h2><p>Verified record in its original language. The official authority is the final reference.</p><blockquote lang="ar" dir="rtl">${values.map(item=>`<p>${escapeHtml(item)}</p>`).join('')}</blockquote></section>`;
}
