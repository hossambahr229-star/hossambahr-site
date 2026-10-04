import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
import {documentedRule} from '../../supabase/functions/public-ai-concierge/grounded-facts.ts';
test('actual catalog condition assembly cannot leak unverified placeholders into cards or model grounding',()=>{
 const source=readFileSync(new URL('../../supabase/functions/public-ai-concierge/index.ts',import.meta.url),'utf8');
 const start=source.indexOf('const verifiedConditions =');
 assert.ok(start>0);
 const code=stripTypeScriptTypes(source.slice(start,source.indexOf('const haystack =',start)),{mode:'strip'});
 const assemble=Function('rules','safeSources','documentedRule',code+'return conditions;');
 const url='https://official.example/service';
 for(const reason of ['غير موثق بعد','TBD','200 AED']) assert.deepEqual(assemble([{id:'conditions',reason,sourceRefs:[]}],[{source_url:url}],documentedRule),[]);
 assert.deepEqual(assemble([{id:'conditions',reason:'Published eligibility',sourceRefs:[url]}],[{source_url:url,review_required:true}],documentedRule),[]);
 assert.deepEqual(assemble([{id:'conditions',reason:'Published eligibility',sourceRefs:[url]}],[{source_url:url,review_required:false}],documentedRule),['Published eligibility']);
});
