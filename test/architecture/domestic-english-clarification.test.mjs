import test from 'node:test';import assert from 'node:assert/strict';
import {englishResult} from '../../supabase/functions/public-ai-concierge/english-response.ts';
import {domesticResidenceClarification} from '../../src/global/ai/clarification-quality.mjs';
test('English domestic residence clarification preserves the customer object and missing jurisdiction',()=>{
 const original={understood_intent:'إقامة عامل/عاملة مساعدة',matches:[],answer:{fact_status:'NEEDS_CLARIFICATION',focus:'clarification',grounded:false,evidence:{}},follow_up_questions:['الإقامة صادرة من أي إمارة؟'],engine:{external_model_used:false}};
 const translated=englishResult(original);assert.equal(domesticResidenceClarification(translated.answer.text),true);assert.match(translated.answer.text,/separate from employment contracts and work permits/);assert.equal(translated.answer.fact_status,'NEEDS_CLARIFICATION');assert.deepEqual(translated.engine,original.engine);assert.deepEqual(translated.matches,[]);
});
test('quality gate accepts bilingual object-specific clarification and rejects generic or wrong-object answers',()=>{
 assert.equal(domesticResidenceClarification('إقامة العامل المساعد صادرة من أي إمارة؟'),true);
 assert.equal(domesticResidenceClarification('Which emirate issued the domestic worker residence?'),true);
 assert.equal(domesticResidenceClarification('Which emirate is this transaction in?'),false);
 assert.equal(domesticResidenceClarification('The employee work permit is ready.'),false);
 assert.equal(domesticResidenceClarification('Domestic worker residence is ready.'),false);
});
