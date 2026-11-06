# Measure the public experience after releases

The public performance workflow runs after a successful main publication and can be run manually. It measures the actual public site in fresh Chromium contexts at 1440 and 390 pixels, with three samples per language and route family: home, discovery, a canonical service, and sign-in. It records raw samples, median TTFB, FCP, observed LCP and layout shift, same-origin transfer sizes, browser version and the last recorded deployed commit. There is no client telemetry change and no authenticated or email submission.

Download the `public-performance-lab` workflow artifact. Compare complete reports from equivalent browser/runner conditions with:

```sh
node scripts/compare-public-performance.mjs before.json after.json > comparison.json
```

For a controlled sign-in comparison, set `HB_EXPECT_AUTH_IDENTITY=absent` before deployment and `present` after. The sample rejects an unexpected public auth stylesheet state. Other routes serve as controls for changes in runner/CDN conditions. Three cold lab samples are a useful diagnostic baseline, not proof that an observed change was caused by a release. Missing observations stay null; incompatible browser/runner conditions do not get a delta.

Observed LCP and layout shift are limited to the navigation and fixed post-font observation window. The measurement follows the layout-shift session-window definition, excludes recent-input shifts, and does not calculate field INP or assert a Core Web Vitals pass. See [LCP](https://web.dev/articles/lcp), [CLS](https://web.dev/articles/cls), and [PageSpeed Insights lab versus field data](https://developers.google.com/speed/docs/insights/v5/about).

For search relevance, use `npm run search:quality` with the canonical customer-intent map. Search impressions, clicks, ranking, indexed coverage and field Core Web Vitals require actual Search Console/CrUX evidence; local search accuracy and lab timings are not substitutes.
