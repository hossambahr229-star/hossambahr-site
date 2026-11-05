# Customer search intent quality

This owner-supplied phrase map references the existing canonical service slugs. It does not publish services, duplicate the catalog, create emirate doorway pages, or assert keyword volumes. Public search and official terminology were reviewed on 5 November 2026; measured Google impressions, clicks and positions remain unavailable without authorized Search Console data.

Run `npm run search:quality` after the normal source build. The report in `artifacts/customer-search-quality/report.json` separates top-result accuracy from complete result-set relevance and records the source SHA when HB_SOURCE_SHA is set. It is a local engine check, not live browser or external-model acceptance. The permanent architecture regressions use the same recorded customer scenarios and preserve the existing SIRA, formation and jurisdiction rules.

The initial measured baseline is main a9b5de7702d4b328e4dd60ed60f6624fc407821d. The observed Production query «محتاج كوته عمال» returned 27 services with an unrelated cancellation first. Local baseline «إلغاء مؤسسة فردية في دبي» returned 127 results with visa cancellation first. Preserve the separately captured before/after and live browser reports; do not interpret a smaller result count alone as accuracy.

Queries involving an unsupported quota cancellation, domestic-worker quota or free-zone quota do not silently select the Ministry establishment quota transaction. An emirate with no matching published business-cancellation service does not inherit another emirate's route. Exact service identities and explicit NOC/card/residence/employment operations keep their existing resolution.

Useful official terminology references: [Dubai business setup](https://www.investindubai.gov.ae/ar/business-setup), [Dubai business closure](https://www.dubai.ae/ar/investing/closing-your-business), [Dubai family residence renewal](https://gdrfad.gov.ae/ar/services/95222a46-56f2-11ea-0320-0050569629e8), [MOHRE work-permit quotas](https://www.mohre.gov.ae/en/services/work-permit-quotas-for-establishments-2022). These links inform transaction terminology, not unverified fees or eligibility.
