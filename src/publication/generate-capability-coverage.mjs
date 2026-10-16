import {readFile,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {approvalType,capabilityGroups,recordedActivityApprovals} from '../../service-capabilities.js';

export async function writeCapabilityCoverage(root,services){
 const source=await readFile(join(root,'dubai-activities-data.js'),'utf8');
 const activities=JSON.parse(source.slice(source.indexOf('=')+1).replace(/;\s*$/,''));
 if(!Array.isArray(activities))throw Error('Existing Dubai activity source is not an array');
 await writeFile(join(root,'activity-discovery-data.json'),JSON.stringify({source:'dubai-activities-data.js',jurisdiction:'AE-DU',records:activities.map(({c,a,e,k,ke,g,ge,l})=>({c,a,e,k,ke,g,ge,l}))}));
 const groups=capabilityGroups(services),seen=new Set();
 const serviceRows=services.map(s=>{
  if(seen.has(s.slug))throw Error('Duplicate published service: '+s.slug);seen.add(s.slug);
  const official=s.verification.officialLinkVerified?s.officialCtaUrl:null;
  return {businessDomain:s.classification.main,category:s.classification,customerIntent:s.name,service:s.slug,emirate:s.emirate,authority:s.authority,approvalType:approvalType(s),activity:s.economicActivity||null,verifiedRequiredApprovals:[],approvalRelationshipStatus:'NOT_ESTABLISHED_BY_SERVICE_CLASSIFICATION',officialSource:s.officialInformationUrl,documents:s.documents,governmentFees:s.governmentFees,processingTime:s.processingTime,eligibility:s.conditions,verification:s.verification,serviceRoute:s.internalRoute,englishRoute:'/en'+s.internalRoute,discoveryRoute:'/discover/?category='+encodeURIComponent(s.classification.main),governmentSelfService:{url:official,kind:s.destinationKind},assisted:{review:'/contact/?service='+encodeURIComponent(s.slug)+'&handoff=1',whatsAppNumber:'971503780460',kind:'ASSISTANCE_NOT_GOVERNMENT_SUBMISSION'},executionStatus:'OFFICIAL_ROUTE_OR_GUIDANCE_WITH_ASSISTANCE; PROTECTED_EXECUTION_NOT_LIVE_VERIFIED'};
 });
 const report={schemaVersion:1,generatedFrom:['src/registry/published-services.json','dubai-activities-data.js'],sourceHash:createHash('sha256').update(JSON.stringify(services)).update(source).digest('hex'),scope:'Generated coverage projection, not a competing registry. A transaction type never establishes a required activity approval. Recorded Dubai activity codes are not generalized to other emirates.',summary:{services:services.length,activities:activities.length,activityEmirates:['دبي'],categories:groups.length,structuralOrphans:serviceRows.filter(r=>!r.discoveryRoute||!r.serviceRoute).length,fullyRecorded:services.filter(s=>s.verification.detailsVerified).length,partial:services.filter(s=>!s.verification.detailsVerified).length},domains:groups,services:serviceRows,activities:activities.map(a=>({code:String(a.c),name:{ar:a.a,en:a.e},category:{ar:a.k,en:a.ke},group:{ar:a.g,en:a.ge},emirate:'دبي',authority:'det-dubai',recordedSource:'/dubai-business-activities.html',officialLookup:'https://app.invest.dubai.ae/search-business-activities',reviewedAt:a.l||null,verifiedRequiredApprovals:recordedActivityApprovals(a,'دبي'),governmentFees:null,documents:null,regulatoryStatus:'ACTIVITY_NAME_AND_CODE_RECORDED; SPECIFIC_REQUIREMENTS_UNVERIFIED'})),businessScopeGaps:[{domain:'corporate-bank-account-assistance',status:'NO_PUBLISHED_VERIFIED_SERVICE_ESTABLISHED',note:'Owner-directed scope to verify against actual business capability; never presented as enabled government execution.'}]};
 await writeFile(join(root,'service-capability-coverage.json'),JSON.stringify(report));
 return {activities,report};
}
