import test from "node:test";
import assert from "node:assert/strict";
import {buildBusinessPassport,buildEmploymentPassport,canSharePortableProfile} from "../../src/global/passport/passport-builder.mjs";
import {calculateCommission,batchProgress} from "../../src/global/marketplace/commerce-engine.mjs";

test("portable profiles include only verified non-expired credentials",()=>{
  const creds=[
    {id:"ok",verificationStatus:"source_backed"},
    {id:"bad",verificationStatus:"unverified"},
    {id:"expired",verificationStatus:"human_reviewed",expiresAt:"2020-01-01"}
  ];
  const business=buildBusinessPassport({ownerUserId:"u",subjectNodeId:"n",business:{legalName:"Example LLC",jurisdictionCode:"AE-DU"},credentials:creds});
  assert.deepEqual(business.credentialRefs,["ok"]);
  assert.equal(canSharePortableProfile(business),false);
  const employment=buildEmploymentPassport({ownerUserId:"u",subjectNodeId:"p",employment:{occupation:"Manager"},credentials:creds});
  assert.equal(employment.profileType,"employment_passport");
});

test("commission engine supports fixed and percentage without hidden rounding drift",()=>{
  assert.equal(calculateCommission({rule:{calculationType:"fixed",value:75},baseAmount:1000}),75);
  assert.equal(calculateCommission({rule:{calculationType:"percentage",value:7.5},baseAmount:1000}),75);
  assert.deepEqual(batchProgress({totalItems:10,completedItems:7,failedItems:1}),{percent:80,complete:false});
});
