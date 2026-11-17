# Homepage assistant government navigation — 18 November 2026

Real anonymous Production journey: open homepage HB AI, ask تجديد رخصة تجارية في دبي, receive the correct transaction and Invest in Dubai government CTA, click it. The click event was defaultPrevented=true and no navigation request occurred. Baseline report: https://github.com/hossambahr229-star/hossambahr-site/blob/agent/dld-source-review-evidence/diagnostics/home-ai-external-baseline-20261118/report.json (run44180944792).

Root cause: an obsolete capture listener in zero-defect-routing.js cancelled every HTTP(S) anchor on / and /index.html, including official destinations rendered by the real assistant. Remove only that blanket listener. Native external navigation and each feature's existing explicit click/consent behavior remain owned by that feature. No service URLs, authority data, Auth, backend, catalog or design changes.

Eight Node EventTarget runtime regression cases execute the current runtime and ensure it does not cancel native government/WhatsApp destinations on root, index, English and service routes. These are unit checks, not live acceptance. Post-deployment real anonymous assistant journeys must confirm actual outgoing navigation; provider/fallback status remains separate and is not promoted to external-model PASS.
