# HossamBahr Visual Identity Preview

This branch is an approval-only preview. It does not alter Production routes, data, official URLs, search logic, or service records.

## Direction

- Premium UAE digital-services platform, not a government portal imitation.
- Bright warm canvas, deep green for trust and primary actions, restrained muted gold for emphasis.
- Arabic-first hierarchy with generous whitespace and strong horizontal use on desktop.
- Mobile transforms into a one-column, thumb-friendly experience.

## System

- Colors: `--hb-green-*`, `--hb-gold-*`, warm canvas/surfaces, semantic success/danger.
- Typography: platform-native Arabic-capable stack; no external font payload.
- Spacing: responsive gutters and section rhythm using `clamp()`.
- Shape: 8/12/18/28px radius scale.
- Elevation: three low-noise shadow levels.
- Components: header, navigation, search, tabs, cards, badges, inputs, page heroes, detail sections, trust notices, primary/secondary CTAs, footer.
- Accessibility: visible focus rings, reduced-motion mode, AA-oriented contrast, 44–50px controls.
- Performance: one CSS file, no UI framework, fonts, images, video, or new JavaScript dependency.

## Approval scope

The preview runner injects the system locally over the real Homepage, Search Results, Services Directory, Service Detail, and Category pages at desktop, tablet, and mobile sizes. Existing Production files are not visually changed until approval.

## Protected baseline

- Production: `502b63d116c5fe21c6d59ea9b4b78f4e33017c85`
- Product release: `492e1ae9555c6813f64cd8843cb401690d2fcd77`
- Rollback: `backup/production-502b63d-pre-visual-identity-20260821`

## Inventory and preview evidence

- Production routes inventoried: 318.
- Representative templates: Homepage, Search Results, Services Directory, Service Detail, Category.
- Viewports: 1440x1000, 820x1100, and 390x844.
- Chrome preview checks: 30/30 pass.
- Edge preview checks: 30/30 pass.
- Architecture tests: 57/57 pass.
- Horizontal overflow: 0 across the preview matrix.
- JavaScript page errors: 0 across the preview matrix.
- DOM function signatures for forms, inputs, cards, and official/commercial CTA hooks remained unchanged.

Firefox and Safari are not claimed as verified in this approval preview. Safari is not available on the Windows execution host.

## Baseline build note

The clean released tree generates 318 Production routes. Its pre-existing UTF-8 audit is hard-coded for 322 files, including four local preview-only pages that are not part of Production. The mismatch was recorded before visual work and no data, route, registry, or deployment gate was altered to hide it.
