import {emirateEnglish} from '../publication/english-catalog.mjs';
export const searchOrigin='https://hossambahr.com';
export const normalizeSearchText=value=>String(value??'').normalize('NFKD').replace(/[\u064b-\u065f\u0670]/g,'').replace(/[أإآ]/g,'ا').toLowerCase().replace(/[^a-z0-9\u0600-\u06ff]/g,'');
export const stripSearchBrand=value=>String(value??'').replace(/\s*[|—–-]\s*hossam\s*bahr\s*$/i,'').trim();
const authorityTags={'sira-dubai':'SIRA','mohre':'MOHRE','icp':'ICP','rta-dubai':'RTA','gdrfa-dubai':'GDRFA Dubai','dha-dubai':'DHA','fta':'FTA','det-dubai':'DET','mofa':'MOFA'};
export function serviceSearchScope(service,locale){
 const scope=service.emirate;
 if(scope==='اتحادي')return locale==='en'?'UAE':'الإمارات';
 if(scope==='الإمارات عدا دبي'||scope==='الإمارات الخاضعة لمسار ICP (خارج دبي)')return locale==='en'?'UAE outside Dubai':'الإمارات خارج دبي';
 if(scope==='اتحادي مع استثناءات الجهات التعليمية المحلية المنشورة')return locale==='en'?'UAE; local education jurisdiction applies':'الإمارات؛ وفق اختصاص الجهة التعليمية';
 return locale==='en'?emirateEnglish(scope):scope;
}
function hasScope(text,service,locale){
 if(/خارج دبي|عدا دبي/.test(service.emirate))return locale==='en'?/outside\s+dubai/i.test(text):/خارج\s+دبي|عدا\s+دبي/.test(text);
 if(service.emirate==='اتحادي')return locale==='en'?/\buae\b|united arab emirates|emirati/i.test(text):/الإمارات|الامارات|إماراتي|اماراتي/.test(text);
 if(service.emirate==='اتحادي مع استثناءات الجهات التعليمية المحلية المنشورة')return /local education jurisdiction applies|وفق اختصاص الجهة التعليمية/i.test(text);
 return normalizeSearchText(text).includes(normalizeSearchText(serviceSearchScope(service,locale)));
}
export function serviceSearchPresentation(service,locale,current={}){
 const en=locale==='en',name=service.name[locale],scope=serviceSearchScope(service,locale),guidance=service.destinationKind==='OFFICIAL_GUIDANCE';
 let subject=stripSearchBrand(current.title||name);
 if(!hasScope(subject,service,locale))subject+=' — '+scope;
 if(guidance&&!(en?/\bguide\b|guidance|requirements/i.test(subject):/دليل|إرشاد|متطلبات/.test(subject)))subject+=en?' — Guide':' — دليل';
 const tag=authorityTags[service.authority.id],tagToken=tag?.split(' ')[0];
 if(tag&&!new RegExp('(^|[^a-z0-9])'+tagToken+'([^a-z0-9]|$)','i').test(subject))subject+=' | '+tag;
 const brand=String(current.title||'').match(/hossam\s*bahr\s*$/i)?.[0]?.trim()||'HOSSAM BAHR';
 const title=subject+' | '+brand;
 const description=en
  ?subject+'. '+service.authority.en+'. '+(guidance?'Official guidance and available transaction routes.':'Check available requirements, fee information and official transaction routes.')
  :current.description||service.description||name+' — '+scope+'. راجع المعلومات المتاحة والمصدر الرسمي ومسارات إنجاز المعاملة.';
 if(en&&/[\u0600-\u06ff]/.test(title+description))throw Error('English search presentation contains untranslated text: '+service.id);
 const primary=stripSearchBrand(title).replace(/\s*[|—]\s*/g,' ').trim();
 const queryName=name+(hasScope(name,service,locale)?'':(en?' in ':' في ')+scope);
 const questions=serviceSearchQuestions(queryName,locale,guidance);

 return {title,description,primaryQuery:primary,scope,authority:service.authority[locale],destinationKind:service.destinationKind,analystQueryCandidates:questions,queryEvidence:'ANALYST_DERIVED_FROM_EXISTING_SERVICE_SCOPE_NOT_MEASURED_GOOGLE_QUERIES',searchVolume:null,googlePosition:null};
}

export function serviceSearchQuestions(name,locale,guidance=false){
 const subject=String(name).trim();
 if(locale==='en')return [
  guidance?'What does “'+subject+'” explain?':'What are the steps for “'+subject+'”?',
  'Where can I check the requirements for “'+subject+'”?',
  'Where can I verify the published fees for “'+subject+'”?',
  'What is the official route for “'+subject+'”?'
 ];
 return [
  guidance?'ما الذي يوضحه «'+subject+'»؟':'ما خطوات «'+subject+'»؟',
  'أين أجد متطلبات «'+subject+'»؟',
  'أين أتحقق من الرسوم المنشورة المتعلقة بـ«'+subject+'»؟',
  'ما المسار الرسمي لـ«'+subject+'»؟'
 ];
}
