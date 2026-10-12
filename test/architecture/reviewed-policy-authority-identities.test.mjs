import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
test('Reviewed residence/attestation policy publication uses canonical authority identities and only reviewed fields',()=>{
 const read=path=>JSON.parse(fs.readFileSync(new URL('../../'+path,import.meta.url),'utf8'));
 const manifest=read('content/residence-attestation-policy-field-sync-2026-10-12.json');
 const published=read('src/registry/published-services.json').services;
 const review=read('content/moe-edas-field-review-2026-10-08.json');
 const sql=fs.readFileSync(new URL('../../supabase/migrations/20261012064200_fix_reviewed_gdrfa_policy_authority_key.sql',import.meta.url),'utf8');
 const plans=JSON.parse(sql.match(/\$plans\$([\s\S]*?)\$plans\$::jsonb/)[1]);
 assert.equal(plans.length,16);
 for(const plan of plans){
  const service=published.find(s=>s.slug===plan.slug),card=review.records.find(r=>r.slug===plan.slug),record=manifest.facts.find(r=>r.slug===plan.slug);
  assert.ok(service&&card&&record,plan.slug);
  assert.equal(plan.authority,service.authority.id,plan.slug+' canonical authority');
  assert.deepEqual(record,plan,plan.slug+' recorded migration provenance');
  assert.equal(plan.source,card.source,plan.slug+' reviewed official source');
  for(const field of plan.fields){assert.ok(['fees','duration'].includes(field)&&card.fields.includes(field),plan.slug+' reviewed field');assert.ok(plan[field]&&!/غير موثق|غير مسجل/.test(plan[field]),plan.slug+' no invented missing fact');}
 }
});
