import test from 'node:test';import assert from 'node:assert/strict';import {auditCustomerService,summarizeCustomerAudit} from '../../src/publication/customer-catalog-audit.mjs';
test('publication verification never turns missing customer fields into full acceptance',()=>{
 const row=auditCustomerService({id:'one',slug:'one',name:{ar:'خدمة',en:'Service'},verificationStatus:'VERIFIED',verification:{detailsVerified:true,feesVerified:true},governmentFees:{text:'NOT_OFFICIALLY_PUBLISHED'},internalRoute:'/services/one/'});
 assert.equal(row.fields.fees,'MISSING');assert.equal(row.fields.aliases,'MISSING');assert.equal(row.fields.ai_discoverability,'MISSING');assert.equal(row.fullyVerified,false);assert.equal(summarizeCustomerAudit([row]).fullyVerifiedServices,0);
});
test('a present unverified government value remains unverified',()=>{const row=auditCustomerService({governmentFees:{text:'unverified fee'},verification:{feesVerified:false}});assert.equal(row.fields.fees,'NOT_VERIFIED');});
