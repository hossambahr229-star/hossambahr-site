import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdtempSync,mkdirSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const workflow=readFileSync(new URL('../../.github/workflows/final-production-correction.yml',import.meta.url),'utf8');
const block=workflow.split('      - name: Commit the verified generated site\n')[1].split('        run: |\n')[1].split('      - name: Wait for and byte-verify live Production')[0].split('\n').map(line=>line.startsWith('          ')?line.slice(10):line).join('\n');
for(const scenario of ['already-published-generated','newer-source','fresh-build']){
 test('Production evidence lineage: '+scenario,{skip:process.platform==='win32'},()=>{
  const root=mkdtempSync(join(tmpdir(),'hb-evidence-lineage-')),repo=join(root,'repo'),remote=join(root,'remote.git'),output=join(root,'outputs');
  mkdirSync(repo);const git=(...args)=>execFileSync('git',args,{cwd:repo,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
  try{
   git('init','-b','main');git('config','user.name','Release fixture');git('config','user.email','fixture@example.invalid');
   mkdirSync(join(repo,'src'));writeFileSync(join(repo,'src','source.js'),'export const value=1;');writeFileSync(join(repo,'index.html'),'old');
   git('add','.');git('commit','-m','Reviewed source');const source=git('rev-parse','HEAD');
   execFileSync('git',['clone','--bare',repo,remote],{stdio:'pipe'});git('remote','add','origin',remote);
   let published=source;
   if(scenario!=='fresh-build'){
    if(scenario==='newer-source')writeFileSync(join(repo,'src','source.js'),'export const value=2;');
    writeFileSync(join(repo,'index.html'),'public');
    git('add','.');git('commit','-m',scenario==='newer-source'?'New reviewed source':'Generated release [verified generated site] [skip ci]');
    published=git('rev-parse','HEAD');git('push','origin','main');git('reset','--hard',source);
   }
   // Rebuilt output must not be labelled with an unpushed local commit.
   writeFileSync(join(repo,'index.html'),'rebuilt');
   const shell=block.replaceAll('${{ github.ref_name }}','main').replaceAll('${{ github.sha }}',source);
   execFileSync('bash',['-e','-o','pipefail','-c',shell],{cwd:repo,env:{...process.env,GITHUB_OUTPUT:output},stdio:'pipe'});
   const state=readFileSync(output,'utf8');
   if(scenario==='already-published-generated'){assert.equal(git('rev-parse','HEAD'),published);assert.match(state,/release_current=true/);assert.equal(readFileSync(join(repo,'index.html'),'utf8'),'rebuilt');}
   if(scenario==='newer-source'){assert.equal(git('rev-parse','HEAD'),source);assert.match(state,/release_current=false/);assert.equal(git('rev-parse','origin/main'),published);}
   if(scenario==='fresh-build'){assert.equal(git('rev-parse','HEAD'),git('rev-parse','origin/main'));assert.notEqual(git('rev-parse','HEAD'),source);assert.match(state,/release_current=true/);}
  }finally{rmSync(root,{recursive:true,force:true});}
 });
}
test('Unverified and superseded releases cannot upload stale Production screenshots',()=>{
 assert.match(workflow,/id: sync_generated/);
 assert.match(workflow,/if: github\.ref_name == 'main' && steps\.sync_generated\.outputs\.release_current == 'true'/);
 assert.match(workflow,/- name: Upload live comparison evidence\n\s+if: always\(\) && github\.ref_name == 'main' && steps\.live_bytes\.outcome == 'success'/);
});
