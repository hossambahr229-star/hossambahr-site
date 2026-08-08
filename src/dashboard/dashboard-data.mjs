const AUTHORITY_MATCHERS = Object.freeze({
  det: ['det ', 'دائرة الاقتصاد والسياحة'],
  mohre: ['mohre ', 'وزارة الموارد البشرية'],
  icp: ['icp ', 'الهيئة الاتحادية للهوية والجنسية'],
  'gdrfa-dubai': ['gdrfa-dubai ', 'الإدارة العامة للإقامة وشؤون الأجانب'],
  fta: ['fta ', 'الهيئة الاتحادية للضرائب'],
  mofa: ['mofa ', 'وزارة الخارجية'],
  moe: ['moe ', 'وزارة التربية والتعليم'],
  rta: ['rta ', 'هيئة الطرق والمواصلات'],
  municipalities: ['بلدية'],
  rera: ['rera ', 'مؤسسة التنظيم العقاري'],
  sera: ['sera ', 'هيئة الشارقة للتعليم الخاص'],
  dha: ['dha ', 'هيئة الصحة بدبي'],
  doh: ['doh ', 'دائرة الصحة'],
  customs: ['جمارك', 'customs'],
  police: ['شرطة', 'police'],
  notary: ['كاتب العدل', 'notary'],
  ejari: ['إيجاري', 'ejari']
});

export const BUSINESS_AREAS = Object.freeze([
  { id: 'company-setup', nameAr: 'تأسيس الشركات', terms: ['companies-establishments'] },
  { id: 'work-labor', nameAr: 'العمل والعمال', terms: ['work-employees'] },
  { id: 'residency', nameAr: 'الإقامة', terms: ['الإقامة', 'residency-visas', 'family-sponsorship'] },
  { id: 'visits', nameAr: 'الزيارات', terms: ['التأشيرات', 'تأشيرات الدخول'] },
  { id: 'licenses', nameAr: 'الرخص', terms: ['التراخيص الاقتصادية'] },
  { id: 'economic-activities', nameAr: 'الأنشطة الاقتصادية', terms: ['النشاط الاقتصادي', 'الأنشطة الاقتصادية'] },
  { id: 'identity-passports', nameAr: 'الهوية والجوازات', terms: ['identity-citizenship'] },
  { id: 'real-estate', nameAr: 'الخدمات العقارية', terms: ['العقارات', 'property-rentals'] },
  { id: 'notarization', nameAr: 'التوثيق', terms: ['contracts-notarization'] },
  { id: 'banking', nameAr: 'الخدمات البنكية', terms: ['financial-business'] }
]);

function authorityBucket(candidate, templateIds) {
  const haystack = `${candidate.businessDimensions.authorityGroup} ${candidate.businessDimensions.authorityLabel}`.toLowerCase();
  for (const authorityId of templateIds.filter((id) => id !== 'other-authorities')) {
    if ((AUTHORITY_MATCHERS[authorityId] ?? [`${authorityId} `]).some((term) => haystack.includes(term.toLowerCase()))) return authorityId;
  }
  return 'other-authorities';
}

function percentage(value, total) {
  return total ? Math.round((value / total) * 1000) / 10 : 0;
}

function serviceState(candidate, dossiers, registryByLegacyId) {
  const dossier = dossiers.find((item) => item.legacyId === candidate.legacyId);
  const service = registryByLegacyId.get(candidate.legacyId);
  return {
    inReview: dossier?.status === 'in-review',
    approved: dossier?.status === 'approved',
    publishReady: Boolean(service?.lifecycle?.publishReadyAt && service?.businessAcceptance?.status === 'passed')
  };
}

export function buildDashboardData({ inventory, dossiers, registry, authorityTemplates }) {
  const templateIds = authorityTemplates.templates.map((item) => item.authorityId);
  const registryByLegacyId = new Map();
  for (const service of registry.services ?? []) for (const legacyId of service.sourceLegacyIds ?? []) registryByLegacyId.set(legacyId, service);
  const authorityRows = authorityTemplates.templates.map((template) => {
    const candidates = inventory.candidates.filter((candidate) => authorityBucket(candidate, templateIds) === template.authorityId);
    const states = candidates.map((candidate) => serviceState(candidate, dossiers, registryByLegacyId));
    const underReview = states.filter((state) => state.inReview).length;
    const approved = states.filter((state) => state.approved).length;
    const readyToPublish = states.filter((state) => state.publishReady).length;
    return {
      authorityId: template.authorityId,
      authority: template.label,
      totalServices: candidates.length,
      underReview,
      approved,
      readyToPublish,
      remaining: candidates.length - readyToPublish,
      completionPercent: percentage(readyToPublish, candidates.length)
    };
  });

  const businessAreaRows = BUSINESS_AREAS.map((area) => {
    const candidates = inventory.candidates.filter((candidate) => {
      const category = candidate.businessDimensions.categoryGroup.toLowerCase();
      return area.terms.some((term) => category.includes(term.toLowerCase()));
    });
    const ready = candidates.filter((candidate) => serviceState(candidate, dossiers, registryByLegacyId).publishReady).length;
    return {
      areaId: area.id,
      area: area.nameAr,
      totalServices: candidates.length,
      readyToPublish: ready,
      remaining: candidates.length - ready,
      completionPercent: percentage(ready, candidates.length),
      taxonomyCoverageKnown: candidates.length > 0
    };
  });

  return {
    generatedAt: new Date().toISOString(),
    decision: authorityRows.every((row) => row.totalServices === row.readyToPublish) && inventory.candidates.length > 0 ? 'ACCEPT' : 'REJECT',
    policy: { frameworkFirst: true, progressiveMigration: true, bulkMigrationAllowed: false, routesBeforeApprovalAllowed: false },
    project: authorityRows,
    businessAcceptance: { authorities: authorityRows, businessAreas: businessAreaRows }
  };
}
