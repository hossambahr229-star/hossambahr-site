// Shared by public directory ranking and the Edge retrieval boundary.
export function siraIntent(input) {
 const q=String(input||'').toLowerCase().normalize('NFKD').replace(/[\u064B-\u065F\u0670]/g,'').replace(/[أإآٱ]/g,'ا').replace(/ة/g,'ه').replace(/ى/g,'ي').replace(/[^\p{L}\p{N}\s]/gu,' ').replace(/\s+/g,' ').trim();
 const named=/(?:\bsira\b|سيرا|مؤسسه تنظيم الصناعه الامنيه|security industry regulatory agency)/.test(q);
 const systems=/(?:كاميرات مراقبه|انظمه امنيه|الانظمه الامنيه|نظام امني|النظام الامني|security systems?|cctv)/.test(q);
 const activity=/(?:نشاط امني|النشاط الامني|انشطه امنيه|الانشطه الامنيه|security activit(?:y|ies))/.test(q);
 if(!named&&!systems&&!activity)return null;
 const changed=/(?:تجديد|اجدد|الغاء|الغي|تعديل|\brenew|\bcancel|\bamend|\bmodify)/.test(q);
 return changed?'unsupported':systems?'system':activity?'activity':'general';
}
export const SIRA_SLUGS={activity:'sira-new-security-activity-license-dubai',system:'sira-security-system-certification-dubai'};
