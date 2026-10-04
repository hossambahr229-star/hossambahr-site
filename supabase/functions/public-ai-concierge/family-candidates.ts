import {relationshipCompatibility, semanticDomainCompatibility, type FamilyRelationship, type SemanticAction} from './semantic-context.ts';
const normalize=(value:unknown)=>String(value||'').toLowerCase().replace(/[\u064B-\u065F\u0670]/g,'').replace(/[إأآ]/g,'ا').replace(/ة/g,'ه').replace(/[^\p{L}\p{N}]+/gu,' ').trim();
export function familyCandidate(row:any, relationship:FamilyRelationship|null, action:SemanticAction, residenceRequest:boolean, requestedGoal:unknown="") {
 const identity=normalize(row.binding.service_slug+' '+row.title);
 let domain=semanticDomainCompatibility(row.binding.metadata?.category||'',relationship);
 // ICP publishes a general permit issuance/renewal card covering family residence too.
 const generalICP=row.authority?.authority_key==='icp' && /(?:اصدار|تجديد) تصريح اقامه عبر icp/.test(normalize(row.title));
 if(relationship && residenceRequest && generalICP) domain=4;
 const relation=relationshipCompatibility(identity,relationship);
 const newborn=/(?:^| )(?:ل?مولود|المولود|newborn|new born)(?: |$)/.test(identity);
 const requestedNewborn=/(?:^| )(?:ل?مولود|المولود|newborn|new born)(?: |$)/.test(normalize(requestedGoal));
 const child=["children","son","daughter"].includes(String(relationship));
 const wrongNewborn=Boolean(relationship && residenceRequest && newborn && (!child || !requestedNewborn));
 const actions={issue:/اصدار|\b(?:issue|issuance|new)\b/,renew:/تجديد|\brenew(?:al)?\b/,amend:/تعديل|\b(?:amend|modify)\b/,cancel:/الغاء|\bcancel(?:lation)?\b/,transfer:/نقل|تحويل|\btransfer\b/};
 const wrongAction=relationship && residenceRequest && action && action!=='sponsor' && !actions[action].test(identity);
 return {domain,relation,allowed:!relationship || (domain>=0 && relation>=0 && !wrongAction && !wrongNewborn)};
}
