import test from "node:test";
import assert from "node:assert/strict";
import { selectModel,buildModelExecutionEnvelope } from "../../src/global/ai/model-router.mjs";
import { resolveTenantContext,isSovereign,assertResidency } from "../../src/global/tenant/tenant-context.mjs";

test("AI router selects only capability and data-class compliant models",()=>{
  const route={active:true,maxDataClass:"confidential",requiredCapabilities:["vision"],preferredModels:[{provider:"a",modelKey:"x"},{provider:"b",modelKey:"y"}]};
  const models=[
    {provider:"a",modelKey:"x",status:"active",capabilityTags:["vision"],allowedDataClasses:["public"]},
    {provider:"b",modelKey:"y",status:"active",capabilityTags:["vision","reasoning"],allowedDataClasses:["confidential"],regions:["UAE"]}
  ];
  const selected=selectModel({route,models,region:"UAE"});
  assert.equal(selected.provider,"b");
  assert.equal(buildModelExecutionEnvelope({routeKey:"doc",model:selected,purpose:"document review",dataClass:"confidential"}).modelKey,"y");
});

test("tenant context enforces sovereign data residency",()=>{
  const context=resolveTenantContext({tenant:{id:"t1",tenantKey:"gov",status:"active",deploymentMode:"sovereign",dataResidencyRegion:"UAE"}});
  assert.equal(isSovereign(context),true);
  assert.equal(assertResidency(context,"UAE"),true);
  assert.throws(()=>assertResidency(context,"EU"));
});
