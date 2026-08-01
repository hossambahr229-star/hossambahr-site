import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const ROOT = new URL('../../', import.meta.url);
const OUTPUT = new URL('./legacy-candidates.json', import.meta.url);
const REFERENCE_OUTPUT = new URL('./legacy-reference-candidates.json', import.meta.url);

async function json(relativePath) {
  return JSON.parse(await readFile(new URL(relativePath, ROOT), 'utf8'));
}

function asciiSlug(value) {
  return value.toLocaleLowerCase('en').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function proposedIdentifier(legacy, current) {
  if (current?.slug) return current.slug;
  if (legacy.id.startsWith('guide:')) return asciiSlug(legacy.id.replace(/^guide:/, ''));

  const readable = asciiSlug(legacy.serviceName) || 'service';
  const stableSuffix = createHash('sha256').update(legacy.id).digest('hex').slice(0, 10);
  return `legacy-${readable}-${stableSuffix}`;
}

const SIMPLE_EMIRATE_IDS = new Map([
  ['اتحادي', 'federal'],
  ['أبوظبي', 'abu-dhabi'],
  ['دبي', 'dubai'],
  ['الشارقة', 'sharjah'],
  ['عجمان', 'ajman'],
  ['أم القيوين', 'umm-al-quwain'],
  ['رأس الخيمة', 'ras-al-khaimah'],
  ['الفجيرة', 'fujairah']
]);
const KNOWN_AUTHORITY_IDS = new Map([
  ['وزارة الموارد البشرية والتوطين (MOHRE)', 'mohre'],
  ['MOHRE', 'mohre'],
  ['الهيئة الاتحادية للهوية والجنسية والجمارك وأمن المنافذ (ICP)', 'icp'],
  ['ICP', 'icp'],
  ['الإدارة العامة للإقامة وشؤون الأجانب في دبي (GDRFA)', 'gdrfa-dubai'],
  ['GDRFA Dubai', 'gdrfa-dubai'],
  ['دائرة الاقتصاد والسياحة في دبي (DET)', 'det'],
  ['دائرة الاقتصاد والسياحة DET', 'det'],
  ['DET', 'det'],
  ['DET - قطاع السياحة', 'det'],
  ['DET / نظام الفعاليات', 'det'],
  ['الهيئة الاتحادية للضرائب (FTA)', 'fta'],
  ['وزارة الخارجية', 'mofa'],
  ['وزارة التربية والتعليم', 'moe'],
  ['دائرة التنمية الاقتصادية في عجمان', 'ajman-ded'],
  ['هيئة المنطقة الحرة بالفجيرة', 'fujairah-free-zone']
]);

function hasText(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function field(state, source, note) {
  return { state, source, note };
}

const tree = await json('content/government-service-tree.json');
const matrix = await json('service-matrix.json');
const authorityCatalog = await json('src/registry/authorities.json');
const matrixById = new Map(matrix.services.map((service) => [service.id, service]));
const authorityById = new Map(authorityCatalog.authorities.map((authority) => [authority.id, authority]));

function authorityGroup(legacy, current) {
  const candidateId = authorityById.has(current?.authority?.slug)
    ? current.authority.slug
    : KNOWN_AUTHORITY_IDS.get(legacy.authority);
  const authority = authorityById.get(candidateId);
  return authority ? `${authority.id} — ${authority.name.ar}` : `غير محسوم — ${legacy.authority}`;
}

const candidates = tree.services.map((legacy, sourceIndex) => {
  const current = matrixById.get(legacy.id) ?? null;
  const proposedSlug = proposedIdentifier(legacy, current);
  const mapping = {
    id: field('candidate', 'government-service-tree.id', 'Stable only after collision and meaning review.'),
    slug: field(current ? 'candidate' : 'needs-information', current ? 'service-matrix.slug' : 'government-service-tree.id', current ? 'Existing generated slug; route semantics still require review.' : 'Derived for migration tracking only; not publishable.'),
    nameAr: field(hasText(legacy.platformTitle) ? 'candidate' : 'missing', 'government-service-tree.platformTitle', 'Arabic title requires official-source comparison.'),
    nameEn: field(hasText(legacy.serviceName) ? 'candidate' : 'missing', 'government-service-tree.serviceName', 'English title requires official-source comparison.'),
    description: field(hasText(legacy.description) ? 'arabic-only-candidate' : 'missing', 'government-service-tree.description', 'Requires official comparison and an English value.'),
    audiences: field(hasText(legacy.audience) ? 'unstructured' : 'missing', 'government-service-tree.audience', 'Free text requires bilingual structured normalization.'),
    requestType: field(hasText(legacy.requestType) ? 'arabic-only-candidate' : 'missing', 'government-service-tree.requestType', 'Requires official comparison and an English value.'),
    emirateId: field('needs-normalization', 'government-service-tree.emirate', 'Legacy free text must reference the controlled emirate catalog.'),
    authorityId: field(current?.authority?.slug ? 'candidate' : 'needs-normalization', current ? 'service-matrix.authority.slug' : 'government-service-tree.authority', 'Authority and official domains must be verified.'),
    mainCategory: field(current?.category ? 'candidate' : 'needs-normalization', current ? 'service-matrix.category' : 'government-service-tree.sector', 'Must reference the controlled main-category catalog.'),
    subCategory: field('missing', null, 'No canonical subcategory exists in the legacy data.'),
    customerTypeIds: field('needs-normalization', 'government-service-tree.audience', 'Legacy audience text must map to one or more controlled customer types.'),
    activityIds: field('missing', null, 'Economic or regulated activity identifiers are absent.'),
    licenseTypeIds: field('missing', null, 'Applicable license types are not modeled.'),
    classificationNumbers: field('missing', null, 'Official or platform classification numbers are absent.'),
    keywords: field('missing', null, 'Arabic and English search keywords are absent.'),
    documents: field((legacy.requirements ?? []).length ? 'unstructured' : 'missing', 'government-service-tree.requirements', 'Legacy requirements cannot be assumed to be an exact document list.'),
    fees: field(hasText(legacy.fees) ? 'unstructured' : 'missing', 'government-service-tree.fees', 'Amount, currency, and fee components are not structured.'),
    conditions: field(hasText(legacy.conditions) ? 'unstructured' : 'missing', 'government-service-tree.conditions', 'Conditions require bilingual structured review.'),
    eligibility: field('missing', null, 'Eligibility is not separated from generic requirements and conditions.'),
    exceptions: field(hasText(legacy.specialCases) ? 'unstructured' : 'missing', 'government-service-tree.specialCases', 'Special cases require bilingual structured review.'),
    duration: field(hasText(legacy.duration) ? 'arabic-only-candidate' : 'missing', 'government-service-tree.duration', 'Requires official comparison and an English value.'),
    steps: field('missing', null, 'Execution steps are absent.'),
    executionLinks: field(current?.executionUrl ? 'untested-candidate' : 'missing', current ? 'service-matrix.executionUrl' : 'government-service-tree.officialUrl', current ? 'Existing URL has no retained live-test evidence in the source record.' : 'Only a service/source URL is present; exact execution destination is unresolved.'),
    officialSources: field(hasText(legacy.evidenceUrl) ? 'untested-candidate' : 'missing', 'government-service-tree.evidenceUrl', 'Source must be re-opened and captured with evidence.'),
    relatedServices: field((legacy.relatedServices ?? []).length ? 'unresolved' : 'empty-candidate', 'government-service-tree.relatedServices', 'Names/links must be converted to registry IDs.'),
    alternativeServices: field('missing', null, 'No alternative-service relation exists in the legacy model.'),
    faq: field(current?.faq?.length ? 'unverified-generic' : 'missing', current ? 'service-matrix.faq' : null, 'Generated FAQ text is not accepted as official evidence.'),
    lastUpdated: field(hasText(legacy.lastReviewed) ? 'candidate' : 'missing', 'government-service-tree.lastReviewed', 'Legacy review date is retained but does not prove live verification.'),
    verificationStatus: field('needs-information', null, 'Legacy approval flags are not imported as canonical verification.'),
    verificationEvidence: field('missing', null, 'No screenshot, HTTP log, or manual journey log is attached.')
  };

  const blockingFields = Object.entries(mapping)
    .filter(([, assessment]) => !['candidate', 'empty-candidate'].includes(assessment.state))
    .map(([name]) => name);

  return {
    sourceIndex,
    legacyId: legacy.id,
    businessDimensions: {
      authorityLabel: legacy.authority,
      authorityGroup: authorityGroup(legacy, current),
      emirateLabel: legacy.emirate,
      emirateGroup: SIMPLE_EMIRATE_IDS.has(legacy.emirate) ? `${SIMPLE_EMIRATE_IDS.get(legacy.emirate)} — ${legacy.emirate}` : `غير محسوم — ${legacy.emirate}`,
      categoryLabel: legacy.sector,
      categoryGroup: current?.category ? `غير معتمد — ${current.category}` : `غير محسوم — ${legacy.sector}`
    },
    proposedId: proposedIdentifier(legacy, current),
    proposedSlug,
    legacyStatus: legacy.status,
    presentInServiceMatrix: Boolean(current),
    publishable: false,
    blockingFields,
    mapping,
    sourcePointers: {
      primary: `content/government-service-tree.json#services[${sourceIndex}]`,
      matrix: current ? `service-matrix.json#services[id=${legacy.id}]` : null
    }
  };
});

function occurrencesBy(field) {
  const grouped = new Map();
  for (const service of tree.services) {
    const records = grouped.get(service[field]) ?? [];
    records.push(service);
    grouped.set(service[field], records);
  }
  return grouped;
}

function referenceState(label) {
  return /\s\/\s|\sأو\s|بالتكامل|استثناءات|يلزم الفصل/.test(label)
    ? 'needs-split-or-policy-decision'
    : 'needs-normalization';
}

function observedDomains(records) {
  const domains = new Set();
  for (const service of records) {
    for (const value of [service.officialUrl, service.evidenceUrl]) {
      try {
        domains.add(new URL(value).hostname);
      } catch {
        // Missing or non-absolute legacy URLs remain explicit blockers.
      }
    }
  }
  return [...domains].sort();
}

function makeReferenceCandidates(field, extra = () => ({})) {
  return [...occurrencesBy(field)]
    .map(([label, records]) => ({
      legacyLabel: label,
      occurrences: records.length,
      state: referenceState(label),
      publishable: false,
      ...extra(records)
    }))
    .sort((left, right) => right.occurrences - left.occurrences || left.legacyLabel.localeCompare(right.legacyLabel, 'ar'));
}

const candidateIds = candidates.map((candidate) => candidate.proposedId);
const candidateSlugs = candidates.map((candidate) => candidate.proposedSlug);
const duplicateIds = [...new Set(candidateIds.filter((id, index) => candidateIds.indexOf(id) !== index))];
const duplicateSlugs = [...new Set(candidateSlugs.filter((slug, index) => candidateSlugs.indexOf(slug) !== index))];
const blockingFieldCounts = {};
for (const candidate of candidates) {
  for (const name of candidate.blockingFields) blockingFieldCounts[name] = (blockingFieldCounts[name] ?? 0) + 1;
}

const output = {
  schemaVersion: '1.0.0',
  generatedFrom: {
    serviceTree: 'content/government-service-tree.json',
    serviceMatrix: 'service-matrix.json'
  },
  policy: {
    purpose: 'migration-staging-only',
    canonicalRegistryMutation: false,
    publishableByDefault: false,
    legacyApprovalImportedAsVerification: false
  },
  summary: {
    sourceRecords: tree.services.length,
    candidates: candidates.length,
    presentInServiceMatrix: candidates.filter((candidate) => candidate.presentInServiceMatrix).length,
    absentFromServiceMatrix: candidates.filter((candidate) => !candidate.presentInServiceMatrix).length,
    publishable: candidates.filter((candidate) => candidate.publishable).length,
    duplicateIds,
    duplicateSlugs,
    blockingFieldCounts
  },
  candidates
};

function observedMatrixValues(records, selector) {
  const values = new Set();
  for (const record of records) {
    const matrixRecord = matrixById.get(record.id);
    const value = matrixRecord ? selector(matrixRecord) : null;
    if (value) values.add(value);
  }
  return [...values].sort();
}

const authorityReferences = makeReferenceCandidates('authority', observedRecords => {
  const observedAuthorityIds = observedMatrixValues(observedRecords, record => record.authority?.slug);
  return {
    observedAuthorityIds,
    normalizationState: observedAuthorityIds.length === 1 ? 'single-observed-id' : observedAuthorityIds.length > 1 ? 'ambiguous-observed-ids' : 'unmapped',
    observedDomains: observedDomains(observedRecords),
    requiredDecision: 'Map to one canonical authority, or split the service when multiple authorities own different transactions.'
  };
});

const emirateReferences = makeReferenceCandidates('emirate', () => ({
  requiredDecision: 'Map to one controlled emirate ID, federal, or split the service when routing differs.'
}));

const sectorReferences = makeReferenceCandidates('sector', observedRecords => {
  const observedMainCategoryIds = observedMatrixValues(observedRecords, record => record.category);
  return {
    observedMainCategoryIds,
    taxonomyState: observedMainCategoryIds.length === 1 ? 'single-observed-main-category' : observedMainCategoryIds.length > 1 ? 'ambiguous-observed-main-categories' : 'unmapped',
    requiredDecision: 'Map to one canonical main/subcategory pair after taxonomy review.'
  };
});

const referenceOutput = {
  schemaVersion: '1.0.0',
  policy: {
    purpose: 'reference-normalization-staging-only',
    canonicalCatalogMutation: false,
    publishableByDefault: false
  },
  summary: {
    legacyAuthorityLabels: occurrencesBy('authority').size,
    legacyEmirateLabels: occurrencesBy('emirate').size,
    legacySectorLabels: occurrencesBy('sector').size,
    authorityLabelsWithOneObservedId: authorityReferences.filter((item) => item.normalizationState === 'single-observed-id').length,
    authorityLabelsWithoutObservedId: authorityReferences.filter((item) => item.normalizationState === 'unmapped').length,
    sectorsWithOneObservedMainCategory: sectorReferences.filter((item) => item.taxonomyState === 'single-observed-main-category').length,
    sectorsWithAmbiguousMainCategories: sectorReferences.filter((item) => item.taxonomyState === 'ambiguous-observed-main-categories').length,
    sectorsWithoutObservedMainCategory: sectorReferences.filter((item) => item.taxonomyState === 'unmapped').length
  },
  authorities: authorityReferences,
  emirates: emirateReferences,
  sectors: sectorReferences
};

await mkdir(new URL('./', OUTPUT), { recursive: true });
await writeFile(OUTPUT, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
await writeFile(REFERENCE_OUTPUT, `${JSON.stringify(referenceOutput, null, 2)}\n`, 'utf8');
console.log(JSON.stringify(output.summary, null, 2));
console.log(JSON.stringify(referenceOutput.summary, null, 2));
