import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root=resolve(import.meta.dirname,'../..');
const read=path=>readFile(resolve(root,path),'utf8');

test('Phase 9.1 central tokens and critical surfaces are state-safe',async()=>{
  const [tokens,css,activity,stabilizer]=await Promise.all([
    read('brand-tokens.css'),read('intent-first.css'),read('dubai-business-activities.html'),read('src/publication/stabilize-homepage-runtime.mjs')
  ]);
  for(const name of ['--brand-green','--brand-green-dark','--brand-green-soft','--brand-gold','--brand-gold-muted','--brand-ivory','--brand-surface','--brand-text','--brand-text-muted','--brand-border','--brand-success','--focus-ring']){
    assert.match(tokens,new RegExp(name.replace('--','\\-\\-')));
  }
  assert.match(css,/\.action-start-grid > a:visited/);
  assert.match(css,/\.action-start-grid > a:focus-visible/);
  assert.match(css,/\.action-start-grid > a:is\(:hover,:focus-visible,:active\) > b/);
  assert.match(css,/\.activities-hero h1 em/);
  assert.match(activity,/brand-tokens\.css\?v=phase9-1-/);
  assert.match(stabilizer,/data-hb-design-tokens="phase9-1"/);
});

test('Phase 9.1 visual QA script covers required viewports and surfaces',async()=>{
  const script=await read('src/publication/verify-phase9-1-visual-quality.mjs');
  for(const width of ['390','430','1440'])assert.match(script,new RegExp(`width:${width}`));
  for(const surface of ['homepage','services','activities','service-detail','mohre','updates','login'])assert.match(script,new RegExp(`name:'${surface}'`));
  assert.match(script,/post-load DOM mutation/);
  assert.match(script,/horizontal overflow/);
  assert.match(script,/visible zero-size critical controls/);
  assert.match(script,/focus ring missing/);
});
