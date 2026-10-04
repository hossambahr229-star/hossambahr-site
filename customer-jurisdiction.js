export const jurisdictionCode=emirate=>({'دبي':'AE-DU','أبوظبي':'AE-AZ','الشارقة':'AE-SH','عجمان':'AE-AJ','رأس الخيمة':'AE-RK','الفجيرة':'AE-FU','أم القيوين':'AE-UQ'}[emirate]||null);
export function compatibleEmirate(scope,emirate){
 if(!jurisdictionCode(emirate))return false;
 if(scope==='الإمارات عدا دبي'||/ICP.*خارج دبي/.test(scope))return emirate!=='دبي';
 if(scope==='اتحادي'||/^اتحادي مع/.test(scope)||scope==='الإمارات العربية المتحدة')return true;
 return scope===emirate;
}
