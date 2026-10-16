import {normalizeIntent} from './intent-search.js';

export const ACTIVITY_EMIRATES=[
 ['دبي','Dubai'],['أبوظبي','Abu Dhabi'],['الشارقة','Sharjah'],['عجمان','Ajman'],
 ['رأس الخيمة','Ras Al Khaimah'],['الفجيرة','Fujairah'],['أم القيوين','Umm Al Quwain']
];
const aliases=[['كافتيريا','كافيتريا','cafeteria'],['مواد غذائيه','اغذيه','foodstuff','foodstuffs','groceries'],['ترجمه','translation'],['تجاره الكترونيه','الكتروني','e commerce','ecommerce','online trading'],['مطعم','restaurant']].map(g=>g.map(normalizeIntent));
const stop=new Set(normalizeIntent('عايز عاوز عاوزه اريد ابغي ابي احتاج محتاج افتح فتح تاسيس شركه مشروع نشاط مكتب في دبي ابوظبي ابو ظبي الشارقه عجمان راس الخيمه الفجيره ام القيوين i want need open start set up setup a an the company business in dubai abu dhabi sharjah ajman ras al khaimah fujairah umm quwain').split(' '));

export function activityEmirate(query){
 const q=normalizeIntent(query);
 const found=ACTIVITY_EMIRATES.filter(([ar,en])=>[ar,en].some(value=>q.includes(normalizeIntent(value))));
 return found.length===1?found[0][0]:null;
}

export function findActivities(records,{query='',emirate='',category=''}={}){
 // This source is explicitly a Dubai activity register. Never relabel its
// codes or licensing conditions as belonging to another emirate.
 if(emirate!=='دبي')return [];
 const q=normalizeIntent(query),terms=q.split(' ').filter(t=>t.length>1&&!stop.has(t));
 const concepts=aliases.filter(group=>group.some(term=>q.includes(term)));
 return records.filter(r=>!category||r.k===category).map(record=>{
  const name=normalizeIntent(record.a+' '+record.e),body=normalizeIntent(name+' '+(record.d||'')+' '+(record.q||'')+' '+(record.g||'')+' '+(record.ge||''));
  let score=q===String(record.c)?10000:0;
  if(concepts.length){for(const group of concepts)if(group.some(term=>name.includes(term)))score+=100;}
  else for(const term of terms){if(name.includes(term))score+=20;else if(body.includes(term))score+=2;}
  return {record,score};
 }).filter(r=>!q||r.score>0).sort((a,b)=>b.score-a.score||String(a.record.c).localeCompare(String(b.record.c))).map(r=>r.record);
}

export function activityHandoff({idea,emirate,activity=null,sourcePage='/business-activities/'},now=Date.now()){
 const scoped=emirate==='دبي'&&activity;
 return {goal:String(idea||'').slice(0,800),emirate,persona:'business',language:sourcePage.startsWith('/en/')?'en':'ar',service_slug:null,authority_key:scoped?'det-dubai':null,source_page:sourcePage,created_at:new Date(now).toISOString(),expires_at:now+30*60*1000,known_facts:scoped?{activity_code:String(activity.c),activity_name:activity.a,activity_emirate:'دبي',activity_source:'/dubai-business-activities.html'}:{}};
}
