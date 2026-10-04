import test from 'node:test';import assert from 'node:assert/strict';
import {detectRelationship,mergeSemanticContext} from '../../supabase/functions/public-ai-concierge/semantic-context.ts';
import {responseContext,jurisdictionCandidates} from '../../supabase/functions/public-ai-concierge/response-context.ts';

test('emirate switch excludes stale local authorities and retains federal services',()=>{
 const rows=['AE-DU','AE-AZ','AE','AE-SH'].map(code=>({jurisdiction:{code}}));
 assert.deepEqual(jurisdictionCandidates(rows,'AE-AZ').map(row=>row.jurisdiction.code),['AE-AZ','AE']);
 assert.deepEqual(jurisdictionCandidates(rows,'AE-DU').map(row=>row.jurisdiction.code),['AE-DU','AE']);
 assert.equal(jurisdictionCandidates(rows,null),rows);
});
test('wife renewal → children → emirate change preserves the current transaction',()=>{
 let semantic=mergeSemanticContext('عايز أجدد إقامة مراتي في دبي',null,'');
 const result={matches:[{service_slug:'family-renewal-dubai',authority:{key:'gdrfa-dubai'}}],answer:{focus:'overview'}};
 const streamed=responseContext(semantic,result,'تجديد إقامة الزوجة في دبي',null);
 assert.equal(streamed.action,'renew');assert.equal(streamed.service_slug,'family-renewal-dubai');
 semantic=mergeSemanticContext('والأولاد؟',{...semantic,action:streamed.action,service_slug:streamed.service_slug},'');
 assert.equal(semantic.relationship,'children');assert.deepEqual(semantic.family_members,['wife','children']);assert.equal(semantic.action,'renew');
 semantic=mergeSemanticContext('طب في أبوظبي؟',semantic,'');
 assert.equal(semantic.jurisdiction,'AE-AZ');assert.equal(semantic.relationship,'children');assert.equal(semantic.action,'renew');
});
test('definite children aliases and Arabic conjunctions match the same relationship',()=>{
 for(const term of ['والأولاد؟','الأبناء','والأطفال','the children','and my kids'])assert.equal(detectRelationship(term),'children',term);
});
test('new match supersedes stale service and authority, while clarification stays explicit',()=>{
 const s={service_slug:'old-service',authority_key:'gdrfa-dubai',action:'renew',jurisdiction:'AE-AZ',known_facts:{inside_country:true}};
 const result={matches:[{service_slug:'icp-service',authority:{key:'icp'}}],answer:{focus:'fees',fact_status:'MISSING_INFORMATION'}};
 const c=responseContext(s,result,'رسوم التجديد في أبوظبي',null);
 assert.equal(c.service_slug,'icp-service');assert.equal(c.authority_key,'icp');assert.equal(c.pending_clarification,null);assert.equal(c.action,'renew');assert.deepEqual(c.known_facts,s.known_facts);
 const q=responseContext(s,{matches:[],answer:{fact_status:'NEEDS_CLARIFICATION'},follow_up_questions:['من هو الكفيل؟']},'سؤال',null);
 assert.equal(q.pending_clarification,'من هو الكفيل؟');
});
