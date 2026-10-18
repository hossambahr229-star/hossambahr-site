import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {recordedDetailTranslations} from '../src/publication/recorded-detail-translations.mjs';
import {hasRecordedFact} from '../src/registry/recorded-fact-state.mjs';
test('UAQ name booking uses the local official card and keeps unpublished amounts unknown',async()=>{
 const c=JSON.parse(await readFile(new URL('../content/government-coverage-expansion.json',import.meta.url),'utf8'));
 const a=c.authorities.find(x=>x.id==='uaq-business');const s=a.newVerifiedServices.find(x=>x.slug==='umm-al-quwain-trade-name-official-path');
 assert.equal(s.officialUrl,'https://ded.uaq.ae/en/our-activities/service/bookingtradename.html');
 assert.equal(s.destinationKind,'DIRECT_SERVICE');assert.ok(a.officialDomains.includes('ded.uaq.ae'));
 assert.equal(hasRecordedFact(s.fees),false);assert.equal(hasRecordedFact(s.duration),false);
 for(let i=0;i<s.requirements.length;i++)assert.equal(recordedDetailTranslations[s.requirements[i]],s.localizedDetails.en.documents[i]);
 assert.equal(recordedDetailTranslations[s.conditions],s.localizedDetails.en.eligibility);
 assert.equal(s.requirements.length,7);assert.equal(s.localizedDetails.en.documents.length,7);
 assert.match(s.requirements.join(' '),/ثلاثة أسماء/);assert.match(s.localizedDetails.en.documents.join(' '),/Three written trade names/);
 assert.match(s.conditions,/لا يمثل إصدار الرخصة/);assert.match(s.localizedDetails.en.eligibility,/not licence issuance/);
 assert.equal(c.authorities.flatMap(x=>x.newVerifiedServices).filter(x=>x.slug===s.slug).length,1);
});
