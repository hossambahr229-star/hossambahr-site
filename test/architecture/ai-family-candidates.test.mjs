import test from 'node:test';import assert from 'node:assert/strict';
import {familyCandidate} from '../../supabase/functions/public-ai-concierge/family-candidates.ts';
import {relationshipCompatibility} from '../../supabase/functions/public-ai-concierge/semantic-context.ts';
import {detectJurisdiction,semanticDomainCompatibility} from '../../supabase/functions/public-ai-concierge/semantic-context.ts';
import fs from 'node:fs';import {stripTypeScriptTypes} from 'node:module';
const row=(title,category='family-sponsorship',authority='icp')=>({title,binding:{service_slug:title,metadata:{category}},authority:{authority_key:authority}});
test('Arabic residence is not a parent substring and parents stay incompatible with children',()=>{
 assert.ok(relationshipCompatibility('تجديد إقامة أفراد الأسرة','children')>0);
 assert.ok(relationshipCompatibility('إصدار إقامة للوالدين','children')<0);
 assert.ok(relationshipCompatibility('إصدار إقامة للوالدين','mother')>0);
});
test('children renewal can use the general ICP renewal card without becoming parental issuance',()=>{
 assert.equal(familyCandidate(row('تجديد تصريح إقامة عبر ICP (خارج دبي)','residency-visas'),'children','renew',true).allowed,true);
 assert.equal(familyCandidate(row('إصدار إقامة للوالدين عبر ICP'),'children','renew',true).allowed,false);
 assert.equal(familyCandidate(row('إصدار تصريح إقامة عبر ICP (خارج دبي)','residency-visas'),'children','renew',true).allowed,false);
 assert.equal(familyCandidate(row('إصدار إقامة لأفراد الأسرة في دبي'),'wife','renew',true).allowed,false);
});
test('general ICP exception does not admit employment, investor or unrelated services',()=>{
 for(const title of ['تجديد إقامة موظف','إصدار الإقامة الذهبية للمستثمرين','تجديد رخصة تجارية'])assert.equal(familyCandidate(row(title,'residency-visas'),'children','renew',true).allowed,false);
 assert.equal(familyCandidate(row('تجديد تصريح إقامة عبر ICP','residency-visas','gdrfa-dubai'),'children','renew',true).allowed,false);
});
test('actual production ranker selects ICP renewal after a children emirate switch',()=>{
 const source=fs.readFileSync(new URL('../../supabase/functions/public-ai-concierge/index.ts',import.meta.url),'utf8');
 const utilities=source.slice(source.indexOf('function normalize('),source.indexOf('type SemanticState'));
 const ranking=source.slice(source.indexOf('function specialBoost('),source.indexOf('async function selectSemanticCandidate'));
 const code=stripTypeScriptTypes(utilities+ranking, {mode:'strip'})+'\nreturn rank;';
 const rank=Function('detectJurisdiction','relationshipCompatibility','semanticDomainCompatibility','familyCandidate',code)(detectJurisdiction,relationshipCompatibility,semanticDomainCompatibility,familyCandidate);
 const rows=[row('تجديد تصريح إقامة عبر ICP (خارج دبي)','residency-visas'),row('إصدار إقامة للوالدين عبر ICP (خارج دبي)'),row('إصدار تصريح إقامة عبر ICP (خارج دبي)','residency-visas')].map(r=>({...r,jurisdiction:{code:'AE'},haystack:''}));
 const ranked=rank('تجديد إقامة أفراد الأسرة في دبي طب في أبوظبي',rows,'children','renew');
 assert.equal(ranked.length,1);assert.equal(ranked[0].title,rows[0].title);
});
