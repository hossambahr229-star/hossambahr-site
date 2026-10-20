import assert from 'node:assert/strict';import{readFile}from'node:fs/promises';
import{dubaiSponsorshipCandidate}from'../supabase/functions/public-ai-concierge/family-candidates.ts';
const d=JSON.parse(await readFile(new URL('../transaction-discovery-data.json',import.meta.url),'utf8'));
const rows=d.map(s=>({binding:{service_slug:s.s},jurisdiction:{code:s.m==='دبي'?'AE-DU':'AE'},authority:{authority_key:s.i}}));
const parent='إصدار-إقامة-للوالدين-ضمن-الحالات-الإنسانية-في-دبي';
for(const relation of ['mother','father','parents'])assert.equal(dubaiSponsorshipCandidate(rows,relation,'sponsor','AE-DU')?.binding.service_slug,parent,relation);
for(const relation of ['wife','husband','son','daughter','children'])assert.equal(dubaiSponsorshipCandidate(rows,relation,'sponsor','AE-DU')?.binding.service_slug,'family-residency-uae',relation);
assert.equal(dubaiSponsorshipCandidate(rows,'mother','renew','AE-DU'),null);
assert.equal(dubaiSponsorshipCandidate(rows,'mother','sponsor','AE-SH'),null);
assert.equal(dubaiSponsorshipCandidate(rows.filter(r=>r.binding.service_slug!==parent),'mother','sponsor','AE-DU'),null);
console.log('PASS: parent-specific Dubai issuance, preserved spouse/children, no issuance substitute for renewal, scope or missing record');

for(const relation of ['mother','father','parents'])for(const goal of ['أريد إقامة لوالدتي في دبي','Issue a residence permit for my mother in Dubai'])assert.equal(dubaiSponsorshipCandidate(rows,relation,'issue','AE-DU',goal)?.binding.service_slug,parent);
assert.equal(dubaiSponsorshipCandidate(rows,'mother','issue','AE-DU','Issue a visit visa for my mother in Dubai'),null);
assert.equal(dubaiSponsorshipCandidate(rows,'children','issue','AE-DU','Issue newborn residence in Dubai'),null);
assert.equal(dubaiSponsorshipCandidate(rows,'mother','renew','AE-DU','Renew my mother residence in Dubai'),null);
assert.equal(dubaiSponsorshipCandidate(rows.filter(r=>r.binding.service_slug!==parent),'mother','issue','AE-DU','أريد إقامة لوالدتي في دبي'),null);
console.log('PASS: literal parent residence issuance maps to parents, not generic family; visits, newborns and renewals are not coerced');
