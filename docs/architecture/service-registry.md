# Service Registry architecture

## Decision

Every published government service must be represented by exactly one entity in
`src/registry/registry.json`. Routes, service pages, authority/category listings,
related-service links, and the search index must be derived from that entity. No
page generator may maintain a parallel service list.

The registry is intentionally empty during the architecture phase. Legacy records
will be imported only after they are normalized and supported by verification
evidence.

## Source layers

1. `src/registry/` owns service entities and controlled reference catalogs.
2. `src/core/registry-validator.mjs` blocks ambiguous or orphaned records.
3. `src/core/route-policy.mjs` is the only route derivation policy.
4. `src/core/search-index.mjs` derives search results from verified entities only.
5. `buildRouteManifest` derives service, authority, and category routes from the same catalogs.
6. Renderers consume these outputs; they do not invent services, routes, or links.

## Publication gates

A published service must:

- reference a known emirate, authority, main category, and subcategory;
- have a unique stable ID and slug;
- expose a dedicated `/services/{slug}/` route;
- include bilingual identity, description, audiences, request type, eligibility,
  exceptions, duration, keywords, steps, and exact official execution links;
- attach checked official sources whose domains belong to the selected authority;
- record a tested-at timestamp and evidence for every execution link;
- have `verified` status, review metadata, and evidence;
- reference only other registry entities for related and alternative services.
- contain no fields outside the canonical entity contract.

The homepage may link only to internal discovery routes. Government execution links
are restricted to the relevant service-detail page.

Publication also requires the business acceptance record defined in
`docs/business-acceptance.md`; architecture validation alone can never authorize
delivery or publication.

## Identity boundary

The architecture does not redefine the visual system. The old identity is a locked
external constraint recorded in `src/identity/heritage-contract.json`. Git history
identifies commit `f0de873` as the direct parent of the explicit homepage redesign.
Its CSS and homepage blobs plus a rendered screenshot are the regression baseline.
The later `heritage-identity.css` overlay is documented as a divergence, not silently
treated as the historical source.

## Progressive approval order

1. Verify and freeze the historical identity reference.
2. Normalize authority, emirate, and category catalogs.
3. Select one authority as the only active review scope.
4. Review one service through every business criterion and retain evidence.
5. Approve the service dossier only after all checks pass.
6. Create its Service Entity only after dossier approval.
7. Finish every service for the active authority before unlocking the next authority.
8. Generate pages, search, navigation, and audit artifacts solely from the registry.

## Review inventory

`src/review/service-review-inventory.json` is a read-only work inventory, not a
migration staging area and not a second service registry. It preserves one pointer
for every legacy record and states exactly which business criteria are missing,
unstructured, or untested. Inventory records cannot be rendered, searched, approved
in bulk, or converted into Service Entities before an individual dossier passes.

`src/review/reference-review-inventory.json` applies the same quarantine rule to
legacy authority, emirate, and sector labels. Composite values such as two authorities
or two routing jurisdictions are decisions to split or model explicitly; they are not
silently accepted as canonical catalog entries.
