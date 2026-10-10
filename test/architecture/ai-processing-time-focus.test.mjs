import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {stripTypeScriptTypes} from 'node:module';
import {detectJurisdiction,detectRelationship} from '../../supabase/functions/public-ai-concierge/semantic-context.ts';
test('English processing-time questions request duration and retain follow-up context',()=>{
 const source=fs.readFileSync(new URL('../../supabase/functions/public-ai-concierge/index.ts',import.meta.url),'utf8');
 const utilities=source.slice(source.indexOf('function normalize('),source.indexOf('type SemanticState'));
 const focus=source.slice(source.indexOf('function isContextualFollowUp('),source.indexOf('function groundedAnswer('));
 const fn=Function('detectJurisdiction','detectRelationship',stripTypeScriptTypes(utilities+focus,{mode:'strip'})+'return {answerFocus,isContextualFollowUp};')(detectJurisdiction,detectRelationship);
 for(const q of ['What is the processing time?','What is the turnaround time?','How long does it take?','كم المدة؟'])assert.equal(fn.answerFocus(q),'duration',q);
 for(const q of ['What is the processing time?','What is the turnaround time?'])assert.equal(fn.isContextualFollowUp(q),true,q);
 assert.equal(fn.answerFocus('What are the government fees?'),'fees');assert.equal(fn.answerFocus('What documents are required?'),'documents');assert.equal(fn.answerFocus('What are the conditions?'),'conditions');
});
