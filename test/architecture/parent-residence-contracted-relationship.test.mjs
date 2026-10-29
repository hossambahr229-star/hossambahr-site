import test from 'node:test';
import assert from 'node:assert/strict';
import {detectRelationship,detectRelationships,mergeSemanticContext} from '../../supabase/functions/public-ai-concierge/semantic-context.ts';
test('contracted Arabic lam preserves the exact family relationship',()=>{
 for(const [word,relationship] of [['للوالدين','parents'],['للوالدة','mother'],['للوالد','father'],['للأولاد','children'],['للمدام','wife'],['لابني','son']]){
  assert.equal(detectRelationship('أريد إصدار إقامة '+word),relationship,word);
  assert.ok(detectRelationships('أريد إصدار إقامة '+word).includes(relationship),word);
 }
});
test('parents remain parents through fees and Dubai jurisdiction switch',()=>{
 const goal='أريد إصدار إقامة للوالدين في الشارقة. ما شروط الكفالة؟';
 const first=mergeSemanticContext(goal,null,goal);
 assert.equal(first.relationship,'parents');assert.equal(first.jurisdiction,'AE-SH');assert.equal(first.action,'issue');
 const fees=mergeSemanticContext('والرسوم؟',first,goal);
 const dubai=mergeSemanticContext('ولو في دبي؟',fees,goal);
 assert.equal(dubai.relationship,'parents');assert.deepEqual(dubai.family_members,['parents']);assert.equal(dubai.jurisdiction,'AE-DU');assert.equal(dubai.action,'issue');
});
test('stale sessions recover the explicit parent from the original goal',()=>{
 const result=mergeSemanticContext('ولو في دبي؟',{relationship:null,action:'issue',jurisdiction:'AE-SH'},'أريد إصدار إقامة للوالدين في الشارقة');
 assert.equal(result.relationship,'parents');assert.equal(result.jurisdiction,'AE-DU');
});
test('ordinary non-family requests remain unclassified',()=>{
 for(const goal of ['أريد تصريح للمنشأة','ولو في دبي؟','أبي أفتح شركة'])assert.equal(detectRelationship(goal),null,goal);
});