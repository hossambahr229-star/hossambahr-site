import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,cp,mkdir,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
test('real generator preserves the hero and produces scoped, repeatable discovery',async()=>{
 const root=await mkdtemp(join(tmpdir(),'hb-discovery-'));
 try{
 const files=['service-pathways.js','service-capabilities.js','business-domains.js','intent-search.js','sira-intent.js','activity-discovery.js','business-activities-discovery.js','transaction-discovery.js','transaction-discovery.css','src/publication/generate-transaction-discovery.mjs','src/publication/generate-capability-coverage.mjs','src/publication/english-catalog.mjs','src/publication/recorded-detail-translations.mjs','src/registry/recorded-fact-state.mjs'];
 for(const file of files){await mkdir(join(root,file,'..'),{recursive:true});await cp(resolve(file),join(root,file));}
 await writeFile(join(root,'package.json'),'{"type":"module"}');await mkdir(join(root,'en'),{recursive:true});
 for(const prefix of ['','/en'])await writeFile(join(root,prefix?'en/index.html':'index.html'),`<html><head></head><body><nav class="desktop-nav"><a href="${prefix}/services/">Services</a></nav><details class="mobile-menu"><summary>Menu</summary><nav><a href="${prefix}/services/">Services</a></nav></details><section class="hero">APPROVED HERO UNCHANGED</section><section class="premium-discovery"><div class="premium-category-grid"><a href="/services/">Old broad categories</a></div></section></body></html>`);
 const service={id:'one',slug:'initial-approval',name:{ar:'موافقة مبدئية',en:'Initial approval'},authority:{id:'det-dubai',ar:'اقتصادية دبي',en:'Dubai Economy'},emirate:'دبي',internalRoute:'/services/initial-approval/',classification:{main:'business-licensing'},keywords:[],verificationStatus:'VERIFIED',verification:{officialLinkVerified:true,detailsVerified:false},officialCtaUrl:'https://app.invest.dubai.ae/',officialInformationUrl:'https://app.invest.dubai.ae/',destinationKind:'OFFICIAL_INFORMATION',documents:[],governmentFees:[],conditions:[],processingTime:null};
 await writeFile(join(root,'src/registry/published-services.json'),JSON.stringify({services:[service]}));
 await mkdir(join(root,'content'),{recursive:true});await writeFile(join(root,'content/backend-public-catalog-snapshot-2026-10-16.json'),JSON.stringify({reviewedAt:'2026-10-16',publicBindings:1,services:[{service_slug:service.slug}]}));
 await writeFile(join(root,'dubai-activities-data.js'),'window.DUBAI_ACTIVITIES='+JSON.stringify([{c:'1',a:'كافتيريا',e:'Cafeteria',x:999,o:1}])+';');
 const run=()=>execFileSync(process.execPath,['src/publication/generate-transaction-discovery.mjs'],{cwd:root,encoding:'utf8'});
 run();const first=await readFile(join(root,'index.html'),'utf8');run();assert.equal(await readFile(join(root,'index.html'),'utf8'),first);assert.match(first,/APPROVED HERO UNCHANGED/);assert.match(first,/data-home-domains/);assert.match(first,/data-business-domain="approvals"/);assert.match(first,/href="\/approvals\/"/);assert.equal((first.match(/home-capability-explorer/g)||[]).length,2);
 const en=await readFile(join(root,'en/business-activities/index.html'),'utf8');assert.match(en,/data-activity-discovery/);assert.match(en,/href="\/business-activities\/"/);assert.match(en,/business-activities-discovery.js/);
 const data=JSON.parse(await readFile(join(root,'activity-discovery-data.json'),'utf8'));assert.equal(data.jurisdiction,'AE-DU');assert.equal(data.records[0].x,undefined);
 const coverage=JSON.parse(await readFile(join(root,'service-capability-coverage.json'),'utf8'));assert.equal(coverage.summary.structuralOrphans,0);assert.equal(coverage.activities[0].governmentFees,null);assert.deepEqual(coverage.activities[0].verifiedRequiredApprovals,[]);
 }finally{await rm(root,{recursive:true,force:true});}
});
