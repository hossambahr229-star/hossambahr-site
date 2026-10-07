import {hasRecordedFact} from '../registry/recorded-fact-state.mjs';
import {recordedDetailTranslations} from './recorded-detail-translations.mjs';
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
 const values=(Array.isArray(value)?value:[value]).filter(hasRecordedFact);
 if(!values.length)return `<section><h2>${escapeHtml(label)}</h2><p>A verified detail is not available in the platform record. Check the official source before applying.</p></section>`;
 const translated=values.map(item=>recordedDetailTranslations[item]);
 if(translated.every(Boolean))return `<section><h2>${escapeHtml(label)}</h2><p>HOSSAM BAHR explanatory translation of the recorded Arabic details. This is not the authority's official English wording.</p><div lang="en" dir="ltr" data-platform-detail-translation>${translated.map(item=>`<p>${escapeHtml(item)}</p>`).join('')}</div><details><summary>Read the recorded Arabic text</summary><blockquote lang="ar" dir="rtl">${values.map(item=>`<p>${escapeHtml(item)}</p>`).join('')}</blockquote></details></section>`;
 return `<section><h2>${escapeHtml(label)}</h2><p>An English translation is not yet available. This verified detail remains available in its original language below; use the official source above as the final reference.</p><details><summary>Read the verified recorded Arabic text</summary><blockquote lang="ar" dir="rtl">${values.map(item=>`<p>${escapeHtml(item)}</p>`).join('')}</blockquote></details></section>`;
}
