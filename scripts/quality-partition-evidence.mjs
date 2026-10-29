import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
export function continuityPartition(env=process.env){
 const count=Number(env.HB_QA_PARTITION_COUNT??1),index=Number(env.HB_QA_PARTITION_INDEX??0);
 assert.ok(Number.isInteger(count)&&count>=1&&count<=10,'Invalid partition count');
 assert.ok(Number.isInteger(index)&&index>=0&&index<count,'Invalid partition index');
 const scenarioIndices=Array.from({length:100},(_,i)=>i).filter(i=>i%count===index),includesExact=index===0;
 return {index,count,scenarioIndices,includesExact,expectedTurns:scenarioIndices.length*2+(includesExact?6:0)};
}
export async function writeQualityEvidence(report,env=process.env){
 if(env.HB_QA_RESULT_FILE){await mkdir(dirname(env.HB_QA_RESULT_FILE),{recursive:true});await writeFile(env.HB_QA_RESULT_FILE,JSON.stringify(report,null,2));}
}
export function summarizeQualityEvidence(independent,parts){
 assert.equal(independent.status,'PASS');assert.equal(independent.metrics.total,100);
 assert.equal(independent.metrics.wrong_route_rate,0);assert.equal(independent.metrics.unsupported_claim_guard_failures,0);
 assert.ok(independent.metrics.dead_end_rate<=.10);assert.ok(independent.metrics.fallback_rate<=.10);
 assert.equal(parts.length,3);const seen=[],budgets=[100];let turns=0,scenarios=0;
 for(let index=0;index<3;index++){
  const p=parts.find(p=>p.partition?.index===index),expected=continuityPartition({HB_QA_PARTITION_COUNT:3,HB_QA_PARTITION_INDEX:index});
  assert.ok(p,'Missing continuity partition '+index);assert.equal(p.status,'PASS');assert.equal(p.partition.count,3);
  assert.deepEqual(p.scenarioIndices,expected.scenarioIndices);assert.equal(p.includesExact,expected.includesExact);
  assert.equal(p.totalTurns,expected.expectedTurns);assert.equal(p.scenarios,expected.scenarioIndices.length+(expected.includesExact?1:0));
  for(const metric of ['lost_context_rate','unnecessary_clarification_rate','generic_fallback_rate','wrong_route_rate','dead_end_rate','unsupported_claim_rate'])assert.equal(p[metric],0,metric);
  seen.push(...p.scenarioIndices);turns+=p.totalTurns;scenarios+=p.scenarios;budgets.push(p.totalTurns);
 }
 assert.deepEqual(seen.sort((a,b)=>a-b),Array.from({length:100},(_,i)=>i));
 assert.equal(turns,206);assert.equal(scenarios,101);assert.ok(budgets.every(n=>n<=120));
 return {status:'PASS',independentPrompts:100,conversationScenarios:scenarios,conversationTurns:turns,totalPublicRequests:100+turns,perJobRequestBudgets:budgets,quotaBypass:false,externalModelAcceptance:'NOT_DECLARED'};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const dir=process.argv[2]||'qa-results',load=async f=>JSON.parse(await readFile(resolve(dir,f),'utf8'));
 const summary=summarizeQualityEvidence(await load('independent.json'),await Promise.all([0,1,2].map(i=>load('continuity-'+i+'.json'))));
 await writeFile(resolve(dir,'complete.json'),JSON.stringify(summary,null,2));console.log(JSON.stringify(summary,null,2));
}
