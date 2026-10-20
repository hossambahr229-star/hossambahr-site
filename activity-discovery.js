import {normalizeIntent} from './intent-search.js';

export const ACTIVITY_EMIRATES=[
 ['دبي','Dubai'],['أبوظبي','Abu Dhabi'],['الشارقة','Sharjah'],['عجمان','Ajman'],
 ['رأس الخيمة','Ras Al Khaimah'],['الفجيرة','Fujairah'],['أم القيوين','Umm Al Quwain']
];
const aliases=[['كافتيريا','كافيتريا','cafeteria'],['مواد غذائيه','المواد الغذائيه','اغذيه','foodstuff','foodstuffs','groceries','food'],['ترجمه','translation'],['تجاره الكترونيه','التجاره الالكترونيه','e commerce','ecommerce','online trading'],['مطعم','restaurant']].map(g=>g.map(normalizeIntent));
const stop=new Set(normalizeIntent('عايز عاوز عاوزه اريد ابغي ابي احتاج محتاج افتح فتح تاسيس شركه مشروع نشاط مكتب في دبي ابوظبي ابو ظبي الشارقه عجمان راس الخيمه الفجيره ام القيوين i want need open start set up setup a an the company business in dubai abu dhabi sharjah ajman ras al khaimah fujairah umm quwain').split(' '));

export function activityEmirate(query){
 const q=normalizeIntent(query);
 const found=ACTIVITY_EMIRATES.filter(([ar,en])=>[ar,en].some(value=>q.includes(normalizeIntent(value))));
 return found.length===1?found[0][0]:null;
}


const foodTerms=new Set(normalizeIntent('مواد المواد غذائية الغذائية اغذية الأغذية غذاء تجارة التجارية تجاره تصنيع صناعة الصناعة مصنع توريد تموين food foodstuff foodstuffs groceries trading trade wholesale retail supply services manufacture manufacturing factory products product to').split(' '));
export function foodActivityMode(query){
 const q=normalizeIntent(query);
 if(/تصنيع|صناع|مصنع|manufactur|factory/.test(q))return 'manufacture';
 if(/تموين|توريد|supply|catering/.test(q))return 'supply';
 if(/تجاره|تجاريه|trading|wholesale|retail/.test(q))return 'trade';
 return null;
}
export function foodActivityQuestion(query,records=[],emirate='دبي'){
 if(emirate!=='دبي')return null;
 const q=normalizeIntent(query);
 if(/^\d+$/.test(q)||!aliases[1].some(term=>q.includes(term)))return null;
 const mode=foodActivityMode(query);
 if(!mode)return 'operation';
 if(mode==='manufacture'){
  const words=q.split(' ').filter(w=>w.length>2&&!stop.has(w)&&!foodTerms.has(w));
  const productNamed=words.some(w=>records.some(r=>normalizeIntent(r.a+' '+r.e).includes(w)&&/manufactur/i.test(r.ke+' '+r.e)));
  if(!productNamed)return 'product';
 }
 return null;
}

export function findActivities(records,{query='',emirate='',category=''}={}){
 // This source is explicitly a Dubai activity register. Never relabel its
// codes or licensing conditions as belonging to another emirate.
 if(emirate!=='دبي')return [];
 const q=normalizeIntent(query),terms=q.split(' ').filter(t=>t.length>1&&!stop.has(t));
 const concepts=aliases.filter(group=>group.some(term=>q.includes(term)));
 const mode=foodActivityMode(query),food=aliases[1].some(term=>q.includes(term)),animals=/animal|fodder|feed|pet |اعلاف|حيوان/.test(q);
 return records.filter(r=>!category||r.k===category).filter(r=>{
  if(!food)return true;
  const name=normalizeIntent(r.a+' '+r.e);
  if(!animals&&/fodder|animal feed|اعلاف|الاعلاف/.test(name))return false;
  if(mode==='trade')return /trading/i.test(r.e);
  if(mode==='manufacture')return /manufactur/i.test(r.ke+' '+r.e);
  if(mode==='supply')return /supply|catering|تموين|توريد/.test(name);
  return true;
 }).map(record=>{
  const name=normalizeIntent(record.a+' '+record.e),body=normalizeIntent(name+' '+(record.d||'')+' '+(record.q||'')+' '+(record.g||'')+' '+(record.ge||''));
  let score=q===String(record.c)?10000:0;
  if(concepts.length){for(const group of concepts){const matches=group.filter(term=>name.includes(term));if(matches.length)score+=matches.some(term=>term!=='اغذيه')?100:10;for(const term of matches)if(q.includes(term))score+=200;}}
  else for(const term of terms){if(name.includes(term))score+=20;else if(body.includes(term))score+=2;}
  if(food&&concepts.length)for(const term of terms.filter(t=>!foodTerms.has(t))){if(name.includes(term))score+=120;}
  return {record,score};
 }).filter(r=>!q||r.score>0).sort((a,b)=>b.score-a.score||String(a.record.c).localeCompare(String(b.record.c))).map(r=>r.record);
}

export function activityHandoff({idea,emirate,activity=null,sourcePage='/business-activities/'},now=Date.now()){
 const scoped=emirate==='دبي'&&activity;
 return {goal:String(idea||'').slice(0,800),emirate,persona:'business',language:sourcePage.startsWith('/en/')?'en':'ar',service_slug:null,authority_key:scoped?'det-dubai':null,source_page:sourcePage,created_at:new Date(now).toISOString(),expires_at:now+30*60*1000,known_facts:scoped?{activity_code:String(activity.c),activity_name:activity.a,activity_emirate:'دبي',activity_source:'/dubai-business-activities.html'}:{}};
}
