// Resolve explicit transaction objects before general lexical ranking.
// Candidates still come exclusively from the source-backed published catalog.
export type TransactionObject = {kind:string; action:string};
export function transactionObject(q:string):TransactionObject|null {
 const cancel=/الغاء|الغي|اغلاق|اغلق|اقفل|تصفيه|cancel|clos(?:e|ing)|liquidat|dissolv/.test(q);
 const renew=/تجديد|اجدد|جدد|renew/.test(q);
 const amend=/تعديل|اغير|غير|اضافه|اضيف|add|chang|amend/.test(q);
 const permit=/تصريح|permit/.test(q);
 if(/قياد|driving/.test(q)&&/رخص|licen/.test(q))return{kind:'driving',action:renew?'renew':cancel?'cancel':'other'};
 if(/موافقه مبدئيه|initial approval/.test(q)&&/رخص|اقتصاد|business|licen|economic/.test(q))return{kind:'initial-approval',action:cancel?'cancel':renew?'renew':'issue'};
 if(/جمارك|customs/.test(q)){
  if(/سيار|مركب|vehicle|car\b/.test(q)&&/تخليص|clearance/.test(q))return{kind:'customs-vehicle',action:'clearance'};
  if(/سجل|تسجيل|register|registration/.test(q)&&/منشا|شرك|business|company|establishment/.test(q))return{kind:'customs-business',action:'register'};
 }
 if(/مدير|manager/.test(q)&&/شرك|company/.test(q)&&amend)return{kind:'company-manager',action:'amend'};
 if(/شريك|partner|shareholder/.test(q)&&/رخص|شرك|licen|company/.test(q)&&amend)return{kind:'company-partner',action:'amend'};
 if(/وكاله|power of attorney/.test(q)&&/اصدق|تصديق|توثيق|ratif|attest|notari/.test(q)&&!/توظيف|recruit|employment agency/.test(q))return{kind:'legal-poa',action:'attest'};
 if(/خارجيه|foreign affairs|mofa/.test(q)&&/شخصي|personal/.test(q)&&/مستند|وثيق|document/.test(q)&&/تصديق|اصدق|attest/.test(q))return{kind:'personal-attestation',action:'attest'};
 if(permit&&/جزئي|part time|part-time/.test(q))return{kind:'part-time-work',action:cancel?'cancel':renew?'renew':'issue'};
 if(/شكوي|شكوه|complaint/.test(q)&&/عمالي|labour|labor/.test(q)&&!/مساعد|منزلي|domestic/.test(q))return{kind:'labour-complaint',action:'submit'};
 if(/بطاقه/.test(q)&&/مندوب علاقات عامه/.test(q)||/public relations officer card|\bpro card\b/.test(q))return{kind:'pro-card',action:cancel?'cancel':renew?'renew':'issue'};
 const agency=/وكاله.*توظيف|وكاله.*توسط|recruitment agency|employment agency|mediation agency/.test(q);
 const directCompany=/الغي (?:ال)?شركه|الغاء (?:ال)?شركه|اغلق (?:ال)?شركه|اقفل (?:ال)?شركه|تصفيه (?:ال)?شركه|(?:cancel|close|liquidate|dissolve) (?:a |the |my )?(?:company|business)|(?:الغاء|الغي|اغلاق|تصفيه).*رخصه (?:تجاريه|اقتصاديه)/.test(q);
 const companyPermits=/(?:company s|company) work permits|تصاريح عمل.*شرك/.test(q);
 if(cancel&&directCompany&&!agency&&!companyPermits)return{kind:'company-closure',action:'cancel'};
 return null;
}
export function transactionObjectMatches(intent:TransactionObject,title:string,authority:string):boolean {
 const t=title.toLowerCase(),a=authority.toLowerCase();
 switch(intent.kind){
 case 'company-closure':return !/mohre/.test(a)&&/الغاء|تصفيه|cancel|liquidat/.test(t)&&/رخص|شرك|licen|company/.test(t);
 case 'driving':return intent.action==='renew'&&/قياد|driv/.test(t)&&/تجديد|renew/.test(t);
 case 'initial-approval':return intent.action==='issue'&&/موافقه مبدئيه|initial approval/.test(t);
 case 'customs-vehicle':return /customs|جمارك/.test(a)&&/مركب|سيار|vehicle/.test(t)&&/تخليص|clearance/.test(t);
 case 'customs-business':return /customs|جمارك/.test(a)&&/تسجيل|registration/.test(t)&&/منشا|business/.test(t);
 case 'company-manager':return /مدير|manager/.test(t)&&/تعديل|chang/.test(t);
 case 'company-partner':return !/mohre/.test(a)&&/شريك|partner|shareholder/.test(t)&&/اضافه|انسحاب|حذف|adding|add or|withdraw|remov/.test(t);
 case 'legal-poa':return /وكالات|وكاله|power of attorne/.test(t)&&/تصديق|ratif|attest/.test(t);
 case 'personal-attestation':return /mofa|خارجيه/.test(a)&&/شخصي|personal/.test(t)&&/تصديق|attest/.test(t);
 case 'part-time-work':return intent.action==='issue'&&/جزئي|part time|part-time/.test(t)&&/تصريح|permit/.test(t);
 case 'labour-complaint':return /شكوي|complaint/.test(t)&&/قطاع الخاص|private sector/.test(t);
 case 'pro-card':return intent.action==='issue'&&/مندوب علاقات عامه|public relations officer/.test(t);
 default:return false;
 }
}
