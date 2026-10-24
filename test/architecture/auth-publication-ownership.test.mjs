import {readFile} from 'node:fs/promises';import test from 'node:test';import assert from 'node:assert/strict';
const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8');
test('auth validation cannot race the full static-site publisher with a partial main commit',async()=>{
 const workflow=await read('.github/workflows/materialize-auth-runtime.yml');
 assert.match(workflow,/contents:\s*read/);assert.doesNotMatch(workflow,/contents:\s*write|git\s+(?:push|commit)/);
 assert.ok(workflow.includes('node src/auth/apply-auth-runtime.mjs'));
 assert.ok(workflow.includes('Reject legacy Supabase project references'));
 const pkg=JSON.parse(await read('package.json'));assert.ok(pkg.scripts.build.includes('node src/auth/apply-auth-runtime.mjs'));
 const publisher=await read('.github/workflows/final-production-correction.yml');
 assert.ok(publisher.includes('npm run build'));assert.ok(publisher.includes('node src/publication/verify-live-production.mjs'));
 assert.ok(publisher.includes('git push origin HEAD:'));
});
