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
- include Arabic and English identity, keywords, steps, and exact official execution links;
- attach checked official sources whose domains belong to the selected authority;
- record a tested-at timestamp and evidence for every execution link;
- have `verified` status, review metadata, and evidence;
- reference only other registry entities for related and alternative services.
- contain no fields outside the canonical entity contract.

The homepage may link only to internal discovery routes. Government execution links
are restricted to the relevant service-detail page.

## Identity boundary

The architecture does not redefine the visual system. The old identity is a locked
external constraint recorded in `src/identity/heritage-contract.json`. Its canonical
tokens and layouts remain pending until they are compared with an approved historical
reference; current generated CSS is not silently treated as that reference.

## Migration order

1. Verify and freeze the historical identity reference.
2. Normalize authority, emirate, and category catalogs.
3. Convert each legacy record into the entity contract without publishing it.
4. Review official sources and attach link/service evidence.
5. Change the entity to `verified` only after manual journey verification.
6. Generate pages, search, navigation, and audit artifacts solely from the registry.
