import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
import {documentedRule,serviceIntroduction} from '../../supabase/functions/public-ai-concierge/grounded-facts.ts';
const source=readFileSync(new URL('../../supabase/functions/public-ai-concierge/index.ts',import.meta.url),'utf8');
const start=source.indexOf('function groundedAnswer(');
const end=source.indexOf('\nfunction docLike',start);
assert.ok(start>=0&&end>start);
const answer=new Function('documentedRule','serviceIntroduction',stripTypeScriptTypes(source.slice(start,end))+';return groundedAnswer;')(documentedRule,serviceIntroduction);
const card='https://www.mofa.gov.ae/services/attestation';
const guide="https://www.mofa.gov.ae/en/services/forms/attestations-guide";
const fee="يعرض دليل الوزارة رسمًا قدره 2000 درهم للفئات التجارية المدرجة الصادرة داخل الإمارات أو خارجها، باستثناء فئة «مستند مصدق في الخارج» ضمن الصادر من الإمارات ورسومها 150 درهمًا. راجع فئة المستند والإجمالي قبل الدفع. الفواتير التجارية وشهادات المنشأ خارج نطاق هذه الخدمة.";
function row(){return {title:'تصديق',safeSources:[{source_url:card,title:'Service card',last_verified_at:'2026-10-12',review_required:false},{source_url:guide,title:'Fee guide',last_verified_at:'2026-10-12T16:54:03.346Z',review_required:false}],policy:{version:4,rules:[{id:'fees',reason:fee,sourceRefs:[guide]},{id:'duration',reason:'Reviewed duration',sourceRefs:[card]}]}};}
test('verified fee cites its approved supporting guide rather than first service source',()=>{const result=answer('',row(),'fees');assert.equal(result.text,fee);assert.equal(result.fact_status,'VERIFIED_FACT');assert.equal(result.evidence.source_url,guide);assert.equal(result.evidence.source_title,'Fee guide');assert.equal(result.evidence.last_verified_at,'2026-10-12T16:54:03.346Z');});
test('duration and official start link retain service-card source',()=>{for(const focus of ['duration','link']) assert.equal(answer('',row(),focus).evidence.source_url,card);assert.ok(answer('',row(),'link').text.includes(card));});
test('pending fee source cannot substantiate commercial amounts',()=>{const fixture=row();fixture.safeSources[1].review_required=true;const result=answer('',fixture,'fees');assert.equal(result.fact_status,'MISSING_INFORMATION');assert.ok(!result.text.includes('2000'));assert.equal(result.evidence.source_url,card);});
test('fresh guide does not bypass primary service review guard',()=>{const fixture=row();fixture.safeSources[0].review_required=true;const result=answer('',fixture,'fees');assert.equal(result.fact_status,'MISSING_INFORMATION');assert.equal(result.evidence.review_pending,true);assert.equal(result.evidence.source_url,card);});
