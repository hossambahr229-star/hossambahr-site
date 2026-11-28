import {normalizeIntent} from './intent-search.js';
import {SIRA_SLUGS} from './sira-intent.js';

export const CATEGORY_LABELS={
 'business-licensing':['الرخص التجارية','Business licensing'],
 'companies-establishments':['الشركات والمنشآت','Companies and establishments'],
 'identity-citizenship':['الهوية والخدمات الشخصية','Identity and personal services'],
 'residency-visas':['الإقامة والتأشيرات','Residence and visas'],
 'contracts-notarization':['العقود والتوثيق','Contracts and attestations'],
 'justice-police':['الشرطة والعدالة والغرامات','Police, justice and fines'],
 'work-employees':['العمل والموظفون','Work and employment'],
 'education-certificates':['التعليم والشهادات','Education and certificates'],
 'financial-business':['الضرائب والأعمال المالية','Tax and business finance'],
 'real-estate-services':['الخدمات العقارية','Real estate services'],
 'customs-trade':['الجمارك والتجارة','Customs and trade'],
 'family-sponsorship':['الأسرة والكفالة','Family sponsorship'],
 'legal-notary':['التوثيق والخدمات القانونية','Notary and legal services'],
 'vehicles-transport':['المركبات والنقل','Vehicles and transport'],
 'property-rentals':['العقارات والإيجار','Property and rentals'],
 'government-approvals':['الموافقات الحكومية والتصاريح','Government approvals and permits']
};

export const APPROVAL_TYPES={
 'economic-initial':['موافقة مبدئية اقتصادية','Initial economic approval'],
 'external-approval':['موافقة خارجية','External approval'],
 'noc':['شهادة عدم ممانعة','No-objection certificate'],
 'specialist-licence':['ترخيص أو اعتماد مهني متخصص','Specialist licensing or accreditation'],
 'security-system':['اعتماد نظام أمني','Security system certification'],
 'sector-permit':['تصريح نشاط أو منشأة','Activity or facility permit'],
 'work-permit':['تصريح عمل','Work permit'],
 'residence-permit':['تصريح إقامة أو دخول','Residence or entry permit'],
 'other-permit':['تصريح آخر — راجع نطاق الخدمة','Other permit — check its scope']
};

// Classifies an existing transaction. It never establishes that an activity
// requires an approval; that relationship needs separate official evidence.
export function approvalType(service){
 const slug=service.slug||service.s||'';
 const authority=service.authority?.id||service.i||'';
 const text=normalizeIntent([service.name?.ar||service.a,service.name?.en||service.e,slug].filter(Boolean).join(' '));
 // Payment and tracking operations do not issue an approval or permit.
 if(/\bfines?\b|غرام|مخالف|\btracking\b|\btrack\b|متابعه حاله|استعلام عن حاله/.test(text))return null;
 if(slug===SIRA_SLUGS.system)return 'security-system';
 if(slug===SIRA_SLUGS.activity)return 'specialist-licence';
 if(authority==='mohre'&&/permit|تصريح/.test(text))return 'work-permit';
 if(['icp','gdrfa-dubai'].includes(authority)&&/permit|تصريح|entry|دخول|تاشير/.test(text))return 'residence-permit';
 if(/no objection|\bnoc\b|عدم ممانعه/.test(text))return 'noc';
 if(/initial approval|موافقه مبدئيه/.test(text))return 'economic-initial';
 if(/approval|موافقه/.test(text))return 'external-approval';
 if(['sira-dubai','dha-dubai','mohap','khda','dld-rera'].includes(authority)&&/license|licence|registration|practice card|ترخيص|رخصه|بطاقه مزاوله/.test(text))return 'specialist-licence';
 if(/permit|تصريح/.test(text))return 'sector-permit';
 if((service.classification?.main||service.c)==='government-approvals')return 'other-permit';
 return null;
}

export function capabilityGroups(services){
 const groups=new Map();
 for(const service of services){
  const category=service.classification?.main||service.c;
  if(!category)throw Error('Published service has no category: '+(service.slug||service.s));
  const current=groups.get(category)||{id:category,labels:CATEGORY_LABELS[category]||[category,category],services:[]};
  current.services.push(service.slug||service.s);groups.set(category,current);
 }
 return [...groups.values()];
}

export function recordedActivityApprovals(activity,emirate){
 // Do not treat generic mentions of regulators, fee-like legacy fields or
// category membership as a verified activity-to-approval relationship.
 return (activity.verifiedApprovals||[]).filter(a=>a.verified===true&&a.emirate===emirate&&a.activityCode===String(activity.c||activity.code)&&/^https:\/\//.test(a.sourceUrl||'')&&a.authority);
}
