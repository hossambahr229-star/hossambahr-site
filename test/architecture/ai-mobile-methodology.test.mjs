import test from 'node:test';import assert from 'node:assert/strict';import{readFileSync}from'node:fs';import{createHash}from'node:crypto';
const read=p=>readFileSync(new URL('../../'+p,import.meta.url),'utf8');
test('mobile HB AI has a source-methodology control in both locales and a fresh stylesheet',()=>{
 const css=read('ai/hb-ai.css'),version=createHash('sha256').update(css).digest('hex').slice(0,12);
 assert.ok(css.includes('@media(max-width:600px){.hb-ai-nav a.hb-ai-methodology{display:inline-flex'));
 for(const [file,path,label]of [['ai/index.html','/methodology/','منهجية التحقق'],['en/ai/index.html','/en/methodology/','Verification methodology']]){
  const html=read(file);assert.ok(html.includes('class="hb-ai-methodology" href="'+path+'" aria-label="'+label+'"'));
  assert.ok(html.includes('/ai/hb-ai.css?v='+version));
 }
});
test('live readiness includes the newly materialized English guide and both AI shells',()=>{
 const source=read('src/publication/verify-live-production.mjs');
 assert.ok(source.includes("'/ai/', '/en/ai/', '/en/methodology/'"));
 assert.ok(source.includes('comparableDigest(live, route) === localDigest'));
 assert.ok(source.includes('attempt <= 24'));
});
