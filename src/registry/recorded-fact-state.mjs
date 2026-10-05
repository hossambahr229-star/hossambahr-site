/** A publication or recorded-review flag cannot turn a placeholder into a fact. */
export function hasRecordedFact(value){
 if(Array.isArray(value))return value.length>0&&value.every(hasRecordedFact);
 if(value==null)return false;
 if(typeof value==='string'){const text=value.normalize('NFKC').trim();return Boolean(text)&&!/^(NOT_OFFICIALLY_PUBLISHED|غير موثق بعد|غير موثق في سجل الكتالوج|غير متوفر|TBD)$/i.test(text);}
 return true;
}
