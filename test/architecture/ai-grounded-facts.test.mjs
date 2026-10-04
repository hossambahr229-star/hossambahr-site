import test from 'node:test';
import assert from 'node:assert/strict';
import {documentedRule,hasDocumentedValue,serviceIntroduction} from '../../supabase/functions/public-ai-concierge/grounded-facts.ts';
const source={source_url:'https://official.example/service',review_required:false};
test('missing detail placeholders cannot become government facts despite a source reference',()=>{
 for(const reason of ['غير موثق بعد','غير موثق حاليًا','not verified yet','TBD','']) {
  assert.equal(documentedRule([{id:'conditions',reason,sourceRefs:[source.source_url]}],'conditions',[source]),null);
 }
 assert.equal(hasDocumentedValue('الفحص الطبي لمن تجاوز 18 عامًا.'),true);
});
test('documented facts require their own approved source association',()=>{
 const rule={id:'fees',reason:'200 درهم',sourceRefs:[source.source_url]};
 assert.equal(documentedRule([rule],'fees',[]),null);
 assert.equal(documentedRule([rule],'fees',[{...source,review_required:true}]),null);
 assert.equal(documentedRule([{...rule,sourceRefs:['https://unrelated.example']}],'fees',[source]),null);
 assert.deepEqual(documentedRule([rule],'fees',[source]),{value:'200 درهم',source_refs:[source.source_url]});
});
test('direct service introduction states the jurisdiction once',()=>{
 const text=serviceIntroduction('تجديد إقامة أفراد الأسرة في دبي','GDRFA دبي','دبي');
 assert.ok(!text.includes('في دبي في دبي'));assert.ok(!text.endsWith(' في دبي.'));
 assert.ok(serviceIntroduction('تجديد إقامة','ICP','أبوظبي').endsWith(' في أبوظبي.'));
});
