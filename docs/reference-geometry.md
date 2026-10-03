# Approved desktop geometry

Reference: WhatsApp Image 2026-10-03 at 5.32.17 PM.jpeg (1536 × 1024).
Measurement space: 1440 × 960, image coordinates multiplied by 1440/1536.
This conversion measures CSS lengths; the page itself is never scaled.

| Region | Reference coordinates at 1536 | Target at 1440 |
| --- | --- | --- |
| Header | y 0–65 | y 0–61 |
| Hero | y 65–387 | y 61–363, h 302 |
| Hero photograph/content | x 0–1140 | x 0–1069 |
| AI panel | x 1140–1536 | x 1069–1440, w 371 |
| Content gutters | x 33 and 1503 | 31 each |
| Search | x 464–1101, y 265–314 | x 435–1032, y 248–294 |
| Categories | y 391–515 | y 367–483, h 116 |
| Featured cards | y 529–665 | y 496–623, h 127 |
| Metrics | y 684–755 | y 641–708, h 66 |
| How it works | y 770–843 | y 722–790 |
| Consultation | x 1180–1503, y 770–865 | x 1106–1409, y 722–811 |
| Authorities | y 859–933 | y 805–875 |
| Bottom CTA | y 947–1024 | y 888–960 (continues below crop) |

CSS tokens live in home-geometry.css. apply-home-geometry.mjs is the last
build step and appends its stylesheet after older runtime styles. Main, header,
sections and footer use a common 1440 maximum and 31px desktop inner gutter.
Responsive widths: 1366, then 430/390/360. No zoom or transform scaling.

Acceptance requires visual review as well as bounding rectangles: container
edges within 4px, main section boundaries within 8px, no clipped input/chips,
no horizontal document overflow, and preserved search and AI panel behavior.
An image diff measures remaining differences and is not an automatic PASS.

Photographic assets and the AI character were reconstructed from the approved
image using the built-in image tool; these are approximate reconstructions,
not original source layers. Category icons are code-native SVGs. Authority
images are stored locally with their official source URLs in
assets/authorities/sources.json. HB marks use the existing circular master SVG.
Published registry statistics remain factual rather than copying unverified
customer, satisfaction or turnaround claims from the design image.
The image ends before the footer; footer geometry has no approved reference.
External model acceptance remains separate and requires external_model_used=true.

Run scripts/reference-geometry-gate.mjs with Playwright and Sharp installed;
HB_BROWSER_PATH selects the browser and HB_BASE_URL optionally targets live
production. The gate captures all five viewports, checks image/font loading,
search navigation and AI-panel opening, and emits a 50% overlay and pixel diff.
The GitHub workflow builds the source before this gate. A geometry PASS does
not declare pixel-fidelity PASS. Local architecture tests: 238 passed.
