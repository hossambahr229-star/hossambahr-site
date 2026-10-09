import test from 'node:test';import assert from 'node:assert/strict';import{readFileSync}from'node:fs';
test('uncompleted issuance-fee refunds never use financial-guarantee transaction 376',()=>{
 const overrides=JSON.parse(readFileSync(new URL('../../content/execution-route-overrides.json',import.meta.url),'utf8')).services;
 const review=JSON.parse(readFileSync(new URL('../../content/icp-issuance-refund-route-review-2026-10-09.json',import.meta.url),'utf8'));
 const matrix=JSON.parse(readFileSync(new URL('../../service-matrix.json',import.meta.url),'utf8')).services;
 const slug=review.slug,row=matrix.find(x=>x.slug===slug),override=overrides[slug];
 assert.equal(review.officialTransactionNames.refundFees,375);assert.equal(review.officialTransactionNames.refundDeposit,376);
 assert.equal(override.mode,'official-service-card');assert.equal(override.executionUrl,null);assert.equal(override.officialCardUrl,review.officialCard);
 assert.equal(row.executionUrl,null);assert.equal(row.officialRouteMode,'official-service-card');assert.equal(row.officialCardUrl,review.officialCard);
});
