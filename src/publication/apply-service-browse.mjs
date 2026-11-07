import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { compatibleEmirate } from '../../customer-jurisdiction.js';

const root = resolve(import.meta.dirname, '../..');
const services = JSON.parse(await readFile(join(root, 'transaction-discovery-data.json'), 'utf8'));
const fields = {
  'business-licensing':['الرخص التجارية','Business licensing'],
  'companies-establishments':['الشركات والمنشآت','Companies and establishments'],
  'identity-citizenship':['الهوية والخدمات الشخصية','Identity and citizenship'],
  'residency-visas':['الإقامة والتأشيرات','Residence and visas'],
  'family-sponsorship':['الأسرة والكفالة','Family sponsorship'],
  'work-employees':['العمل والموظفون','Work and employment'],
  'government-approvals':['الموافقات والتصاريح','Government approvals'],
  'contracts-notarization':['العقود والتوثيق','Contracts and notarization'],
  'education-certificates':['التعليم والشهادات','Education and certificates'],
  'real-estate-services':['الخدمات العقارية','Real estate services'],
  'property-rentals':['العقارات والإيجار','Property and tenancy'],
  'legal-notary':['الخدمات القانونية','Legal and notary services'],
  'justice-police':['العدالة والشرطة والغرامات','Justice, police and fines'],
  'financial-business':['الضرائب والخدمات المالية','Tax and financial services'],
  'customs-trade':['الجمارك والتجارة','Customs and trade'],
  'vehicles-transport':['المركبات والنقل','Vehicles and transport'],
};
const operations = {
  issue:['الإصدار والتسجيل','Issue and register'], renew:['التجديد','Renew'],
  amend:['التعديل والتحديث','Amend and update'], cancel:['الإلغاء','Cancel'],
  attest:['التصديق والتوثيق','Attest and notarize'], inquire:['الاستعلام والمتابعة','Inquire and track'],
  approve:['الموافقات والتصاريح','Approvals and permits'], other:['معاملات وأدلة أخرى','Other transactions and guides'],
};
const emirates = [
  ['dubai','دبي','Dubai'],['abu-dhabi','أبوظبي','Abu Dhabi'],['sharjah','الشارقة','Sharjah'],
  ['ajman','عجمان','Ajman'],['rak','رأس الخيمة','Ras Al Khaimah'],['fujairah','الفجيرة','Fujairah'],['uaq','أم القيوين','Umm Al Quwain'],
];
const esc = value => String(value ?? '').replace(/[&<>"']/g, character => ({
  '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;',
})[character]);
function operation(record) {
  const title = record.a.replace(/[أإآ]/g,'ا').replace(/^طلب\s+/,'');
  if (/^(الغاء|تصفيه|تصفية)/.test(title)) return 'cancel';
  if (/^تجديد/.test(title)) return 'renew';
  if (/^(تعديل|تحديث|تغيير|اضافة|إضافة|نقل)/.test(title)) return 'amend';
  if (/^(تصديق|توثيق|اعتماد شهادة)/.test(title)) return 'attest';
  if (/^(استعلام|الاستعلام|متابعة|التحقق)/.test(title)) return 'inquire';
  if (/^(موافقة|اعتماد|شهادة عدم ممانعة|تصريح)/.test(title)) return 'approve';
  if (/^(اصدار|تسجيل|تاسيس|فتح|حجز|استبدال)/.test(title)) return 'issue';
  return 'other';
}
const pathFor = (record, en) => (en ? '/en' : '') + record.u;
const ids = new Set();
for (const record of services) {
  if (!record.id || ids.has(record.id) || !fields[record.c] || !record.i || !record.u) throw Error('Invalid browse record: '+record.s);
  ids.add(record.id);
  for (const en of [false,true]) await access(join(root,pathFor(record,en).slice(1),'index.html'));
}
const authorities = [...new Map(services.map(record => [record.i,[record.r,record.n]])).entries()];
const group = (key,label,records) => ({key,label,records});
const fieldGroups = Object.entries(fields).map(([key,label]) => group('field-'+key,label,services.filter(r=>r.c===key)));
const actionGroups = Object.entries(operations).map(([key,label]) => group('action-'+key,label,services.filter(r=>operation(r)===key)));
const areaGroups = emirates.map(([key,ar,en]) => group('emirate-'+key,[ar,en],services.filter(r=>!r.m.startsWith('اتحادي مع استثناءات')&&compatibleEmirate(r.m,ar))));
areaGroups.push(group('emirate-conditional',['خدمات اتحادية بقيود محلية','Federal services with local exceptions'],services.filter(r=>r.m.startsWith('اتحادي مع استثناءات'))));
const authorityGroups = authorities.map(([key,label]) => group('authority-'+key,label,services.filter(r=>r.i===key)));
function item(record,en) {
  const jurisdiction = en ? record.emirate || record.m : record.m;
  return '<li><a data-browse-service="'+esc(record.id)+'" href="'+esc(pathFor(record,en))+'"><strong>'+esc(en?record.e:record.a)+'</strong><small>'+esc(jurisdiction)+' · '+esc(en?record.n:record.r)+'</small></a></li>';
}
function browseGroup(g,en,field=false) {
  const i=Number(en);
  const list=records=>'<ul>'+records.map(record=>item(record,en)).join('')+'</ul>';
  const content=field?Object.entries(operations).map(([key,label])=>{
    const records=g.records.filter(r=>operation(r)===key);
    return records.length?'<h3>'+esc(label[i])+'</h3>'+list(records):'';
  }).join(''):list(g.records);
  return '<details id="'+esc(g.key)+'" data-browse-group><summary>'+esc(g.label[i])+' <span>'+g.records.length+'</span></summary>'+content+'</details>';
}
function directory(en) {
  const headings=en?['Browse UAE transactions','Browse by service area','Browse by transaction type','Browse by emirate','Browse by authority']:['اختر معاملتك الحكومية','حسب مجال الخدمة','حسب نوع المعاملة','الخدمات حسب الإمارة','حسب الجهة الحكومية'];
  const sections=[['areas',fieldGroups],['actions',actionGroups],['emirates',areaGroups],['authorities',authorityGroups]];
  return '<section id="browse-services" data-service-browse aria-labelledby="browse-services-title"><h2 id="browse-services-title">'+headings[0]+'</h2><p>'+(en?'Open a group to find a service and its authority. Search is available below.':'افتح أحد الأقسام لتصل إلى المعاملة والجهة المختصة. ويمكنك استخدام البحث أدناه.')+'</p>'
    +'<nav aria-label="'+headings[0]+'">'+sections.map(([key],i)=>'<a href="#browse-'+key+'">'+headings[i+1]+'</a>').join('')+'</nav>'
    +sections.map(([key,groups],i)=>'<section id="browse-'+key+'"><h2>'+headings[i+1]+'</h2><div class="service-browse-grid">'+groups.filter(g=>g.records.length).map(g=>browseGroup(g,en,key==='areas')).join('')+'</div></section>').join('')
    +'</section>';
}
const css = '[data-service-browse]{margin-block:24px 36px;padding:clamp(14px,3vw,32px);background:#f9f8f2;border:1px solid #d9e2da;border-radius:20px;color:#172b25}[data-service-browse] nav{display:flex;flex-wrap:wrap;gap:8px;margin:14px 0 22px}[data-service-browse] nav a,[data-service-browse] summary{min-height:44px;padding:9px 12px;border-radius:10px;color:#103f32;background:#fff;border:1px solid #d8e1db;font-weight:700}[data-service-browse] section{margin:20px 0;scroll-margin-top:95px}.service-browse-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,260px),1fr));gap:10px;align-items:start}[data-service-browse] details{min-width:0;background:#fff;border-radius:10px;scroll-margin-top:95px}[data-service-browse] summary{cursor:pointer}[data-service-browse] summary span{float:inline-end;color:#36574b;font-variant-numeric:tabular-nums}[data-service-browse] ul{list-style:none;padding:0 9px;margin:4px 0 12px}[data-service-browse] h3{font-size:1rem;margin:12px 12px 0}[data-service-browse] li a{display:block;min-height:44px;padding:8px 5px;border-bottom:1px solid #e4ebe6;color:#103f32;overflow-wrap:anywhere}[data-service-browse] small{display:block;color:#485c54}[data-service-browse] a:focus-visible,[data-service-browse] summary:focus-visible{outline:3px solid #9e762a;outline-offset:2px}';
const version=createHash('sha256').update(css).digest('hex').slice(0,12);
await writeFile(join(root,'service-browse.css'),css+'\n');
for(const en of [false,true]){
  const prefix=en?'en/':'';
  const file=join(root,prefix,'services/index.html');
  let html=await readFile(file,'utf8');
  html=html.replace(/<!-- hb-browse:start -->[\s\S]*?<!-- hb-browse:end -->/g,'').replace(/<link\b[^>]*data-service-browse-css[^>]*>/g,'');
  const main=/(<main\b[^>]*\bid="main-content"[^>]*>[\s\S]*?<\/h1>)/i;
  if(!main.test(html))throw Error('Missing service directory main: '+prefix);
  html=html.replace(main,tag=>tag+'<!-- hb-browse:start -->'+directory(en)+'<!-- hb-browse:end -->');
  html=html.replace('</head>','<link data-service-browse-css rel="stylesheet" href="/service-browse.css?v='+version+'"></head>');
  await writeFile(file,html);
  const home=join(root,prefix,'index.html');
  let homepage=await readFile(home,'utf8');
  const target=(en?'/en':'')+'/services/#browse-services';
  homepage=homepage.replace(/<span data-home-browse-link>[\s\S]*?<\/span>/g,'');
  homepage=homepage.replace('<div class="premium-popular discovery-entry">', '<div class="premium-popular discovery-entry"><span data-home-browse-link><a data-home-browse-entry href="'+target+'">'+(en?'Browse transactions':'تصفح المعاملات')+'</a></span>');
  await writeFile(home,homepage);
}
const coverage=services.map(r=>({
  id:r.id,slug:r.s,ar:r.a,en:r.e,field:r.c,operation:operation(r),jurisdiction:r.m,authority:r.i,
  routes:{ar:pathFor(r,false),en:pathFor(r,true)},officialKind:r.destinationKind,officialVerified:r.ov,detailsVerified:r.dv,
  browse:['field-'+r.c,'action-'+operation(r),'authority-'+r.i,...areaGroups.filter(g=>g.records.includes(r)).map(g=>g.key)],
}));
await mkdir(join(root,'artifacts/service-browse'),{recursive:true});
await writeFile(join(root,'artifacts/service-browse/coverage.json'),JSON.stringify({records:coverage,services:services.length,authorities:authorities.length,emirates:emirates.length},null,2)+'\n');
