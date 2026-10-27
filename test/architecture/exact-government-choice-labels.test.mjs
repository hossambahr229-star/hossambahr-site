import test from'node:test';import assert from'node:assert/strict';import{readFile}from'node:fs/promises';import{runInNewContext}from'node:vm';
const source=(await readFile(new URL('../../zero-defect-routing.js',import.meta.url),'utf8')).replaceAll('\r\n','\n');
const start=source.indexOf('function enhanceVerifiedGovernmentHandoff()'),end=source.indexOf('\n  function modernizePresentation()',start);
assert.ok(start>=0&&end>start);
function enhance(anchors){runInNewContext(source.slice(start,end)+'\nenhanceVerifiedGovernmentHandoff();',{location:{pathname:'/services/example/'},document:{querySelectorAll:()=>anchors,createElement:()=>({})}});}
test('government handoff preserves exact transaction duration and category labels',()=>{
 const choices=[60,90,120].map(days=>({textContent:'استكشاف فرص عمل – '+days+' يوماً',dataset:{governmentCta:'verified'},href:'https://smartservices.icp.gov.ae/#/request/'+days,closest:selector=>selector==='.exact-route-choices'?{}:null}));
 const before=choices.map(a=>({text:a.textContent,href:a.href}));enhance(choices);
 assert.deepEqual(choices.map(a=>({text:a.textContent,href:a.href})),before);assert.ok(choices.every(a=>a.dataset.governmentCta==='verified'));
});
test('ordinary government handoff still explains the official destination',()=>{
 const notes=[],anchor={textContent:'Continue',dataset:{governmentCta:'verified'},closest:()=>null,parentNode:{insertBefore:n=>notes.push(n)}};
 enhance([anchor]);assert.equal(anchor.textContent,'افتح صفحة الخدمة الحكومية ↗');assert.equal(anchor.dataset.handoffReady,'true');assert.equal(notes.length,1);
});