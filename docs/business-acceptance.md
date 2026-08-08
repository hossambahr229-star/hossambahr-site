# Business acceptance policy

Technical success is not delivery acceptance. A service is accepted only when the
business evaluator returns no failed criterion.

## Service acceptance

Each service must have a dedicated non-empty page, bilingual accurate description,
explicit document status, separate government-fee and platform-service-fee status, completion duration, government authority,
jurisdiction, keywords, reviewed relations, FAQ, and a tested exact official
execution or service-card link.

## Discovery acceptance

The generated search index must return the service through all of these dimensions:

1. service name;
2. keywords;
3. government authority;
4. emirate or federal jurisdiction;
5. activity;
6. licence type, including an explicit no-licence-required classification where applicable;
7. classification number;
8. related service.

## Classification acceptance

A service must reference controlled main category, subcategory, authority,
jurisdiction, and customer-type records. Free-text legacy labels do not satisfy this
criterion.

## Government-link acceptance

Every execution link must use an authority-approved hostname, target the exact
transaction or exact official service card, record the last test time, and retain
test evidence. A generic authority homepage does not pass.

## Journey acceptance

The tested route from the homepage to government execution must take no more than
two clicks. The expected primary route is homepage search result → service page →
execution. The test record and evidence are stored in the same Service Entity.

## Final decision

The project decision remains `REJECT` until every legacy service is mapped to one
canonical Service Entity and every entity passes page, content, classification,
discovery, official-link, manual-test, journey, and historical-identity regression
criteria. Build, route, test, file, and commit counts are evidence only and never
change the business decision by themselves.

## Progressive review lock

Only one authority and one service dossier may be active. The dossier must pass the
21 business checks in their prescribed order. Later checks and later services remain
locked until the active dossier is approved. Approval permits review of the next
service within the same authority, but it does not create a route or registry record.
Routes, registry insertion, relationship materialization, and publish readiness are
separate ordered lifecycle gates. Every other authority remains locked until all
services of the active authority are approved, tested, linked, registered,
business-accepted, and publish-ready.
