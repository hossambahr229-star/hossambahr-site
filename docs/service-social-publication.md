# Service-specific social publication

The existing published registry is the sole source of service identity, language, scope, authority and approval status. Original sector artwork uses the master HB mark, bundled Cairo fonts and shared identity tokens. It makes no government-affiliation, fee, duration or completion claims.

Run `node src/registry/generate-published-registry.mjs` and `npm run social:generate` with Playwright 1.55 and Chrome available. This explicit renderer writes content-addressed 1200×630 JPEGs and a manifest. Unchanged, byte-verified assets are reused. Older hashes are retained for cached previews. No browser dependency is required by the normal build.

The normal build applies static OG/Twitter metadata after the bilingual canonical finalizer and validates every public service page and image. Legacy aliases use the matching canonical-language image rather than receiving competing assets. The main publisher regenerates stale/missing artwork before the accepted build.

Source artwork and metadata checks do not prove social-platform cache refresh, authenticated Facebook debugger acceptance, service execution, external AI, or protected account/document acceptance. Verify public HTTP metadata and image MIME/dimensions after deployment; record third-party cache/login limitations separately.
