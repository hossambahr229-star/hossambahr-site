# Authority layout correction

Actual PR654 Production screenshots exposed a retained legacy max-width:800px on Arabic authority heroes inside a 1280px page shell, leaving a large blank area; authority introduction/language links had no gutters on mobile. SIRA also retained an internal broken-CTA metric and audit label.

Use a generator-owned page marker to scope full-width hero alignment and one responsive gutter token to current authority content/indexes. Keep H1s, palette, global header, all services/links, counts, search and pathway behavior. Remove only the exact internal CTA diagnostic metric; retain real service counts and separate inline count labels visibly. No homepage redesign, scale transform, registry change or unverified government detail.

Required acceptance: existing full build/architecture gates plus actual 390/1440 authority screenshots and measured hero/main alignment and content gutters, Arabic/English search/pathway preservation. Reference pixel-fidelity/human acceptance remain separate.
