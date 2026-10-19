export const RERA_APPROVAL_SLUGS={advertisement:'dld-real-estate-ad-permit-dubai',practice:'real-estate-professional-practice-card-dubai'} as const;
export function reraApprovalKind(input:string){
 const q=String(input||'').toLowerCase().normalize('NFKD').replace(/[\u064B-\u065F\u0670]/g,'').replace(/[أإآٱ]/g,'ا').replace(/ة/g,'ه').replace(/ى/g,'ي');
 if(!/(?:ريرا|\brera\b)/.test(q))return null;
 const kind=/(?:اعلان|advertis)/.test(q)?'advertisement':/(?:مزاول|مهن|professional|practice)/.test(q)?'practice':/(?:موافق|تصريح|approval|permit|certification)/.test(q)?'general':null;
 if(!kind)return null;
 return /(?:تجديد|الغاء|renew|cancel)/.test(q)?'unsupported':kind;
}
