// Resolve explicit transaction objects before general lexical ranking.
// Candidates still come exclusively from the source-backed published catalog.
export type TransactionObject = {kind:string; action:string; freeZone?:boolean; jurisdiction?:string|null; authority?:string|null; entry?:string};
export function transactionObject(q:string,jurisdiction:string|null=null):TransactionObject|null {
 const cancel=/الغاء|الغي|اغلاق|اغلق|اقفل|تصفيه|cancel|clos(?:e|ing)|liquidat|dissolv/.test(q);
 const renew=/تجديد|اجدد|جدد|renew/.test(q);
 const amend=/تعديل|اغير|غير|اضافه|اضيف|ادخل|ادخال|حذف|انسحاب|new partner|new shareholder|add|chang|amend/.test(q);
 const permit=/تصريح|permit/.test(q);
 const freeZone=/free ?zone|منطقه (?:ال)?حره|\bdmcc\b|\bshams\b|\bdifc\b|\badgm\b|\bjafza\b/.test(q);
 const visa=/تاشير|فيزا|\bvisa\b/.test(q);
 const businessExploration=/استكشاف\s+(?:فرص\s+)?(?:تاسيس\s+)?(?:ال)?(?:اعمال|استثمار)|\b(?:business|investment)(?:[\s-]+(?:establishment|opportunit(?:y|ies)))*[\s-]+explor(?:ation|ing)?\b|\bexplor(?:e|ing|ation)(?:[\s-]+(?:of|for))?[\s-]+(?:business|investment)\b|\bbusiness[\s-]+opportunit(?:y|ies)[\s-]+visa\b/.test(q);
 const jobExploration=/استكشاف\s+(?:فرص\s+)?(?:ال)?(?:عمل|وظيف|شغل)|(?:ابحث|بحث|ادور|بدور|الاقي)\s+(?:(?:عن|علي|على)\s+)?(?:ال)?(?:عمل|وظيف|شغل)|\bjob[\s-]*seek(?:er|ing)?\b|\b(?:job|work|employment)[\s-]+(?:explor(?:ation|ing)?|search)\b|\b(?:search|look(?:ing)?|seek(?:ing)?)(?:[\s-]+for)?[\s-]+(?:a[\s-]+)?(?:job|work|employment)\b/.test(q);
 if(visa&&(businessExploration||jobExploration))return {kind:businessExploration&&jobExploration?'exploration-visa-ambiguous':businessExploration?'business-exploration-visa':'job-exploration-visa',action:explorationOperation(q)||'issue',jurisdiction,authority:explorationAuthority(q)};
 const visit=visitVisaObject(q,jurisdiction);if(visit)return visit;
 if(/قياد|driving/.test(q)&&/رخص|licen/.test(q))return{kind:'driving',action:renew?'renew':cancel?'cancel':'other'};
 if(/موافقه (?:ال)?مبد[يئ]يه|initial approval/.test(q)&&/رخص|اقتصاد|business|licen|economic/.test(q))return{kind:'initial-approval',freeZone,action:cancel?'cancel':renew?'renew':'issue'};
 if(/جمارك|customs/.test(q)){
  if(/سيار|مركب|vehicle|car\b/.test(q)&&/تخليص|clearance/.test(q))return{kind:'customs-vehicle',action:'clearance'};
  if(/سجل|تسجيل|register|registration/.test(q)&&/منشا|شرك|business|company|establishment/.test(q))return{kind:'customs-business',action:'register'};
 }
 if(/مدير|manager/.test(q)&&/شرك|company/.test(q)&&amend)return{kind:'company-manager',freeZone,action:'amend'};
 if(/شريك|partner|shareholder/.test(q)&&amend&&!/اقام|تاشير|كفال|residen|visa|spouse|family/.test(q))return{kind:'company-partner',freeZone,action:'amend'};
 if(/وكاله|power of attorney/.test(q)&&/اصدق|تصديق|توثيق|ratif|attest|notari/.test(q)&&!/توظيف|recruit|employment agency/.test(q))return{kind:'legal-poa',action:'attest'};
 if(/خارجيه|foreign affairs|mofa/.test(q)&&/شخصي|personal/.test(q)&&/مستند|وثيق|document/.test(q)&&/تصديق|اصدق|attest/.test(q))return{kind:'personal-attestation',action:'attest'};
 if(permit&&/جز[يئ]ي|part time|part-time/.test(q))return{kind:'part-time-work',action:cancel?'cancel':renew?'renew':'issue'};
 if(/شكوي|شكوه|complaint/.test(q)&&/عمالي|labour|labor/.test(q)&&!/مساعد|منزلي|domestic/.test(q))return{kind:'labour-complaint',action:'submit'};
 if(/بطاقه/.test(q)&&/مندوب علاقات عامه/.test(q)||/public relations officer card|\bpro card\b/.test(q))return{kind:'pro-card',action:cancel?'cancel':renew?'renew':'issue'};
 const agency=/وكاله (?:ال)?(?:توظيف|توسط)|شرك(?:ه|تي|تنا|تك) (?:ال)?توظيف|recruitment company|staffing agency|temporary employment agency|recruitment agency|employment agency|mediation agency/.test(q);
 const directCompany=/الغي (?:ال)?شرك(?:ه|تي|تنا|تك)|الغاء (?:ال)?شرك(?:ه|تي|تنا|تك)|اغلق (?:ال)?شرك(?:ه|تي|تنا|تك)|اغلاق (?:ال)?شرك(?:ه|تي|تنا|تك)|اقفل (?:ال)?شرك(?:ه|تي|تنا|تك)|تصفيه (?:ال)?شرك(?:ه|تي|تنا|تك)|(?:cancel|close|liquidate|dissolve) (?:a |the |my )?(?:company|business)|(?:الغاء|الغي|اغلاق|تصفيه).*رخصه (?:تجاريه|اقتصاديه)/.test(q);
 const companyPermits=/(?:company s|company) work permits|تصاريح عمل.*شرك/.test(q);
 if(cancel&&directCompany&&!agency&&!companyPermits)return{kind:'company-closure',freeZone,action:'cancel'};
 return null;
}
export function transactionObjectMatches(intent:TransactionObject,title:string,authority:string):boolean {
 const t=title.toLowerCase(),a=authority.toLowerCase();
 if(intent.freeZone&&['initial-approval','company-manager','company-partner','company-closure'].includes(intent.kind))return false;
 switch(intent.kind){
 case 'tourism-visa':
 case 'friend-relative-visit-visa':{
  if(intent.action!=='issue'||!intent.jurisdiction||intent.jurisdiction==='AE')return false;
  const dubai=intent.jurisdiction==='AE-DU',expected=dubai?'gdrfa-dubai':'icp';
  if(a!==expected||(intent.authority&&intent.authority!==a)||!(/تاشير|visa/.test(t)))return false;
  if(/(?:5|خمس|five)[ -]?(?:سنوات|سنه|years?)|استكشاف|explor|residen|اقامه/.test(t))return false;
  if(dubai&&(intent.entry!=='single'||!(/دخول واحد|single[ -]entry/.test(t))))return false;
  return intent.kind==='tourism-visa'?/سياحي|touris/.test(t):/زياره.*(?:قريب|صديق)|visit.*(?:friend|relative)/.test(t);
 }
 case 'business-exploration-visa':
 case 'job-exploration-visa':{
  if(intent.action!=='issue'||!intent.jurisdiction||intent.jurisdiction==='AE')return false;
  const expected=intent.jurisdiction==='AE-DU'?'gdrfa-dubai':intent.jurisdiction.startsWith('AE-')?'icp':null;
  if(!expected||a!==expected||(intent.authority&&a!==intent.authority))return false;
  if(!/تاشير|فيزا|visa/.test(t))return false;
  return intent.kind==='business-exploration-visa'?/استكشاف.*(?:تاسيس|اعمال)|business.*(?:explor|opportunit)|(?:explor|opportunit).*business/.test(t):/استكشاف.*عمل|job.*explor|job[\s-]*seek/.test(t);
 }
 case 'company-closure':return !/mohre/.test(a)&&/الغاء|تصفيه|cancel|liquidat/.test(t)&&/رخص|شرك|licen|company/.test(t);
 case 'driving':return intent.action==='renew'&&/قياد|driv/.test(t)&&/تجديد|renew/.test(t);
 case 'initial-approval':return intent.action==='issue'&&/موافقه (?:ال)?مبد[يئ]يه|initial approval/.test(t);
 case 'customs-vehicle':return /customs|جمارك/.test(a)&&/مركب|سيار|vehicle/.test(t)&&/تخليص|clearance/.test(t);
 case 'customs-business':return /customs|جمارك/.test(a)&&/تسجيل|registration/.test(t)&&/منشا|business/.test(t);
 case 'company-manager':return /مدير|manager/.test(t)&&/تعديل|chang/.test(t);
 case 'company-partner':return !/mohre/.test(a)&&/شريك|partner|shareholder/.test(t)&&/اضافه|انسحاب|حذف|adding|add or|withdraw|remov/.test(t);
 case 'legal-poa':return /وكالات|وكاله|power of attorne/.test(t)&&/تصديق|ratif|attest/.test(t);
 case 'personal-attestation':return /mofa|خارجيه/.test(a)&&/شخصي|personal/.test(t)&&/تصديق|attest/.test(t);
 case 'part-time-work':return intent.action==='issue'&&/جز[يئ]ي|part time|part-time/.test(t)&&/تصريح|permit/.test(t);
 case 'labour-complaint':return /شكوي|complaint/.test(t)&&/قطاع الخاص|private sector/.test(t);
 case 'pro-card':return intent.action==='issue'&&/مندوب علاقات عامه|public relations officer/.test(t);
 default:return false;
 }
}

export function transactionObjectNeedsEmirate(intent:TransactionObject):boolean {return !['personal-attestation','part-time-work','labour-complaint','pro-card'].includes(intent.kind);}

function explorationOperation(q:string):string|null {
 if(/الغاء|الغي|cancel/.test(q))return 'cancel';
 if(/تجديد|اجدد|جدد|renew/.test(q))return 'renew';
 if(/تعديل|تمديد|نقل|تحويل|\b(?:amend|modify|extend|extension|transfer)\b/.test(q))return 'amend';
 return null;
}
function explorationAuthority(q:string):string|null {
 const icp=/\bicp\b|الهي[يئ]ه الاتحاديه|الاتحاديه للهويه/.test(q),dubai=/\bgdrfa\b|الاداره العامه للاقامه|دبي للاقامه|اقامه دبي/.test(q);
 return icp&&dubai?'__CONFLICT__':icp?'icp':dubai?'gdrfa-dubai':null;
}
// Carry only an already identified exploration-visa object, never arbitrary prior topics.
export function explorationVisaFollowUp(serviceSlug:string,jurisdiction:string|null,action:string|null,q:string):TransactionObject|null {
 const kinds:Record<string,string>={
  'تأشيرة-استكشاف-فرص-تأسيس-الأعمال-عبر-icp-خارج-دبي':'business-exploration-visa',
  'تأشيرة-استكشاف-فرص-تأسيس-الأعمال-في-دبي':'business-exploration-visa',
  'تأشيرة-استكشاف-فرص-عمل-عبر-icp-خارج-دبي':'job-exploration-visa',
  'تأشيرة-استكشاف-فرص-عمل-في-دبي':'job-exploration-visa'
 };
 const kind=kinds[serviceSlug];if(!kind)return null;
 const explicit=transactionObject(q,jurisdiction);
 if(explicit)return /exploration-visa/.test(explicit.kind)?explicit:null;
 if(/تاشير|فيزا|\bvisa\b/.test(q))return null;
 return{kind,jurisdiction,authority:explorationAuthority(q),action:explorationOperation(q)||(action&&['issue','renew','cancel','amend','transfer'].includes(action)?action:'issue')};
}

// A visit visa is distinct from residence sponsorship, exploration and employment.
function visitVisaObject(q:string,jurisdiction:string|null):TransactionObject|null {
 if(!/تاشير|فيزا|\bvisa\b/.test(q)||/(?:5|خمس|five)[ -]?(?:سنوات|سنه|years?)|استكشاف|explor|residen|اقامه|work permit|تصريح عمل/.test(q))return null;
 const tourism=/سياحي|touris/.test(q),visitor=/زياره.*(?:قريب|صديق)|(?:قريب|صديق).*زياره|visit.*(?:friend|relative)|(?:friend|relative).*visit/.test(q);
 if(!tourism&&!visitor)return null;
 return{kind:tourism&&visitor?'visit-visa-ambiguous':tourism?'tourism-visa':'friend-relative-visit-visa',action:explorationOperation(q)||'issue',jurisdiction,authority:explorationAuthority(q),entry:/متعدد|multiple|multi entry/.test(q)?'multiple':/دخول واحد|single entry|single-entry/.test(q)?'single':'unspecified'};
}
export function visitVisaFollowUp(serviceSlug:string,jurisdiction:string|null,action:string|null,q:string,priorGoal:string):TransactionObject|null {
 const kinds:Record<string,string>={
 'تأشيرة-سياحية-عبر-icp-خارج-دبي':'tourism-visa',
 'تأشيرة-سياحية-لدخول-واحد-في-دبي':'tourism-visa',
 'تأشيرة-زيارة-قريب-أو-صديق-عبر-icp-خارج-دبي':'friend-relative-visit-visa',
 'تأشيرة-زيارة-قريب-أو-صديق-لدخول-واحد-في-دبي':'friend-relative-visit-visa'};
 const kind=kinds[serviceSlug];if(!kind)return null;
 const explicit=transactionObject(q,jurisdiction);if(explicit)return /^(?:tourism-visa|friend-relative-visit-visa|visit-visa-ambiguous)$/.test(explicit.kind)?explicit:null;
 if(/تاشير|فيزا|\bvisa\b/.test(q))return null;
 const entry=/متعدد|multiple|multi entry/.test(q)?'multiple':/دخول واحد|single entry|single-entry/.test(q)?'single':visitVisaObject(priorGoal,jurisdiction)?.entry||(serviceSlug.includes('لدخول-واحد')?'single':'unspecified');
 return{kind,jurisdiction,entry,authority:explorationAuthority(q),action:explorationOperation(q)||(action&&['issue','renew','cancel','amend','transfer'].includes(action)?action:'issue')};
}
