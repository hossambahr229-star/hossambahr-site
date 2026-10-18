import {approvalType} from './service-capabilities.js';
// A projection of existing services; never a second catalog or an approval rule.
export const BUSINESS_DOMAINS = [
 {id:'business',ar:'الشركات والرخص',en:'Companies and licences',hintAr:'تأسيس · تعديل · تجديد · إلغاء',hintEn:'Set up · amend · renew · close',icon:'buildings'},
 {id:'activities',ar:'الأنشطة الاقتصادية والأكواد',en:'Business activities and codes',hintAr:'ابحث بفكرة مشروعك',hintEn:'Search by your business idea',icon:'grid'},
 {id:'approvals',ar:'الموافقات والتصاريح والأمن',en:'Approvals, permits and security',hintAr:'مبدئية · خارجية · SIRA',hintEn:'Initial · external · SIRA',icon:'government'},
 {id:'residence',ar:'الإقامة والتأشيرات والهوية',en:'Residence, visas and identity',hintAr:'العائلة · الزيارة · التجديد',hintEn:'Family · visits · renewal',icon:'people'},
 {id:'work',ar:'العمل والموارد البشرية',en:'Work and employment',hintAr:'تصاريح · عقود · WPS',hintEn:'Permits · contracts · WPS',icon:'work'},
 {id:'investors',ar:'المستثمرون والمناطق الحرة',en:'Investors and free zones',hintAr:'مسارات الاستثمار والمنشآت',hintEn:'Investment and establishment routes',icon:'buildings'},
 {id:'property',ar:'العقارات والإيجاري وRERA',en:'Property, Ejari and RERA',hintAr:'إيجار · تسجيل · تصاريح',hintEn:'Rentals · registration · permits',icon:'house'},
 {id:'documents',ar:'العقود والتوكيلات والتصديقات',en:'Contracts, powers and attestations',hintAr:'توثيق · وكالة · مستندات',hintEn:'Notary · powers · documents',icon:'document'},
 {id:'health-education',ar:'الصحة والتعليم والشهادات',en:'Health, education and certificates',hintAr:'تراخيص صحية · معادلات',hintEn:'Health licensing · equivalency',icon:'document'},
 {id:'transport-customs',ar:'النقل والجمارك',en:'Transport and customs',hintAr:'RTA · تجارة · تخليص',hintEn:'RTA · trade · clearance',icon:'plane'},
 {id:'fines-tax',ar:'المخالفات والضرائب',en:'Fines and taxes',hintAr:'استعلام · سداد · تسجيل',hintEn:'Enquiry · payment · registration',icon:'government'}
];
export function serviceBusinessDomain(s) {
 const slug=s.slug||s.s||'',category=s.classification?.main||s.c,authority=s.authority?.id||s.i;
 if(slug==='ajman-business-activity-inquiry')return 'activities';
 if(/free-zone|golden-residency|green-residence-partner-investor/.test(slug)||authority==='fujairah-free-zone')return 'investors';
 if(['dha-dubai','moe'].includes(authority)||category==='education-certificates')return 'health-education';
 if(['real-estate-services','property-rentals'].includes(category))return 'property';
 if(['contracts-notarization','legal-notary'].includes(category))return 'documents';
 if(['customs-trade','vehicles-transport'].includes(category))return 'transport-customs';
 if(['economic-initial','external-approval','noc','security-system','sector-permit','specialist-licence'].includes(approvalType(s)))return 'approvals';
 if(category==='government-approvals')return 'approvals';
 if(['residency-visas','identity-citizenship','family-sponsorship'].includes(category)||slug==='تقرير-تفاصيل-الإقامة-عبر-icp')return 'residence';
 if(category==='work-employees')return 'work';
 if(['financial-business','justice-police'].includes(category))return 'fines-tax';
 if(['business-licensing','companies-establishments'].includes(category))return 'business';
 throw Error('Unmapped published business domain: '+slug+' '+category);
}
export function businessDomainGroups(services) {
 const assigned=new Map(BUSINESS_DOMAINS.map(d=>[d.id,[]]));
 for(const service of services)assigned.get(serviceBusinessDomain(service)).push(service);
 return BUSINESS_DOMAINS.map(d=>({...d,services:assigned.get(d.id)})).filter(d=>d.services.length||d.id==='activities');
}
export function serviceReadiness(s) {
 if(!(s.verification?.detailsVerified??s.dv))return 'PARTIAL';
 if((s.destinationKind||'')==='OFFICIAL_GUIDANCE')return 'OFFICIAL_GUIDANCE';
 return 'VERIFIED_INFORMATION_AND_OFFICIAL_ROUTE';
}
