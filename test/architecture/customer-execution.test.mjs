import test from 'node:test';import assert from 'node:assert/strict';
import {customerContext,executionHref,executionPage} from '../../src/publication/customer-execution.mjs';
import {compatibleEmirate,jurisdictionCode} from '../../customer-jurisdiction.js';
test('customer draft never pairs a local service with a different emirate or ICP with Dubai',()=>{
 assert.equal(compatibleEmirate('دبي','أبوظبي'),false);assert.equal(compatibleEmirate('دبي','دبي'),true);assert.equal(compatibleEmirate('الإمارات الخاضعة لمسار ICP (خارج دبي)','دبي'),false);assert.equal(compatibleEmirate('الإمارات الخاضعة لمسار ICP (خارج دبي)','أبوظبي'),true);
 for(const e of ['دبي','أبوظبي','الشارقة','عجمان','رأس الخيمة','الفجيرة','أم القيوين']){assert.ok(jurisdictionCode(e));assert.equal(compatibleEmirate('اتحادي',e),true);}assert.equal(compatibleEmirate('اتحادي','unknown'),false);
});
test('assisted handoff retains service identity and includes only verified requirements',()=>{
 const service={id:'test:family',slug:'family',name:{ar:'أسرة',en:'Family'},emirate:'دبي',authority:{id:'gdrfa',ar:'الإدارة',en:'GDRFA'},internalRoute:'/services/family/',officialInformationUrl:'https://gdrfad.gov.ae/',documents:{items:['unverified']},verification:{requirementsVerified:false}};
 const c=customerContext(service);assert.equal(c.service_id,service.id);assert.equal(c.authority.id,'gdrfa');assert.deepEqual(c.requirements,[]);assert.match(executionHref(service,'en'),/^\/en\/contact\/\?service=family&source=/);
 service.verification.requirementsVerified=true;assert.deepEqual(customerContext(service).requirements,['unverified']);
});
test('contact is a customer intake in both languages and pricing does not invent charges',()=>{
 for(const locale of ['ar','en']){const html=executionPage(locale);assert.match(html,/data-customer-intake/);assert.match(html,/data-intake-workspace/);assert.match(html,/data-intake-official/);assert.match(html,/data-intake-whatsapp/);assert.doesNotMatch(html,/self\.__next_f/);assert.match(html,new RegExp(`lang="${locale}"`));const pricing=executionPage(locale,true);assert.match(pricing,/\/contact\//);assert.doesNotMatch(pricing,/\d+\s*(?:AED|درهم)/);}
});
