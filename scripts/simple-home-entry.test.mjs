import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {simplifyHomepageEntry} from '../src/publication/home-simple-entry.mjs';
for(const locale of ['ar','en'])test('rebuilt '+locale+' entry stays stable across repeated publication with tracking and localized search',()=>{
 const p=locale==='en'?'/en':'',html=readFileSync(locale==='en'?'en/index.html':'index.html','utf8'),t=(ar,en)=>locale==='en'?en:ar;
 assert.equal(simplifyHomepageEntry(html,{p,t}),html,'Repeated publication cannot restore competing hero controls');
 assert.ok(html.includes('data-home-entry="simple"'));
 assert.ok(html.includes('class="home-account-entry" href="'+p+'/account/"'));
 assert.ok(html.includes('action="'+p+'/discover/"'));
 assert.equal((html.match(/data-business-domain=/g)||[]).length,11);
 assert.equal((html.match(/data-home-service=/g)||[]).length,11);
});