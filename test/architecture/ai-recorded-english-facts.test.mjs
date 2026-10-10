import test from 'node:test';import assert from 'node:assert/strict';
import {englishResult} from '../../supabase/functions/public-ai-concierge/english-response.ts';
import {recordedFactTranslations} from '../../supabase/functions/public-ai-concierge/recorded-fact-translations.ts';
import {recordedDetailTranslations} from '../../src/publication/recorded-detail-translations.mjs';
const source='https://added.gov.ae/en/set-up/establish-your-business';
function original(text,focus='approvals',grounded=true){return {confidence:'high',matches:[{service_slug:'abu-dhabi-economic-initial-approval-guide',service_name_en:'Initial Approval for Business Establishment in Abu Dhabi'}],answer:{text,focus,fact_status:'VERIFIED_FACT',grounded,evidence:{source_url:source,supporting_rule:{value:text,source_refs:[source]}}},engine:{external_model_used:false,provider_failure:{category:'QUOTA_BILLING',status:429}}};}
test('actual English approval regression uses recorded wording and preserves source and provider blocker',()=>{
 const input=original('الموافقات الإضافية للأنشطة المنظمة عند انطباقها.');
 const result=englishResult(input);assert.equal(result.answer.text,'Additional approvals for regulated activities, where applicable.');
 assert.deepEqual(result.answer.evidence,input.answer.evidence);assert.deepEqual(result.engine,input.engine);assert.deepEqual(result.matches,input.matches);
});
test('English overview retains qualified guidance boundaries instead of silently dropping them',()=>{
 const fact='هذا دليل لرحلة التأسيس والموافقة المبدئية؛ العقود والموقع والموافقات تعتمد على النشاط والشكل القانوني. الرابط لا يرسل طلب تنفيذ.';
 const result=englishResult(original(fact,'overview'));assert.match(result.answer.text,/depend on activity and legal form/);assert.match(result.answer.text,/does not submit an application/);
});
test('unknown or ungrounded facts are never presented as translated verified wording',()=>{
 const unknown='متطلب جديد غير مسجل.';assert.match(englishResult(original(unknown)).answer.text,/original language/);
 const known='الموافقات الإضافية للأنشطة المنظمة عند انطباقها';const ungrounded=englishResult(original(known,'approvals',false));assert.match(ungrounded.answer.text,/original language/);assert.match(ungrounded.answer.text,/الموافقات/);
});
test('deployed translation module remains identical to canonical explanatory publication wording',()=>{assert.deepEqual(recordedFactTranslations,recordedDetailTranslations);});
