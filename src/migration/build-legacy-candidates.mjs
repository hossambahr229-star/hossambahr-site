import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const ROOT = new URL('../../', import.meta.url);
const OUTPUT = new URL('./legacy-candidates.json', import.meta.url);

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

function hasText(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function field(state, source, note) {
  return { state, source, note };
}

const tree = await json('content/government-service-tree.json');
const matrix = await json('service-matrix.json');
const matrixById = new Map(matrix.services.map((service) => [service.id, service]));

const candidates = tree.services.map((legacy, sourceIndex) => {
  const current = matrixById.get(legacy.id) ?? null;
  const proposedSlug = proposedIdentifier(legacy, current);
  const mapping = {
    id: field('candidate', 'government-service-tree.id', 'Stable only after collision and meaning review.'),
    slug: field(current ? 'candidate' : 'needs-information', current ? 'service-matrix.slug' : 'government-service-tree.id', current ? 'Existing generated slug; route semantics still require review.' : 'Derived for migration tracking only; not publishable.'),
    nameAr: field(hasText(legacy.platformTitle) ? 'candidate' : 'missing', 'government-service-tree.platformTitle', 'Arabic title requires official-source comparison.'),
    nameEn: field(hasText(legacy.serviceName) ? 'candidate' : 'missing', 'government-service-tree.serviceName', 'English title requires official-source comparison.'),
    emirateId: field('needs-normalization', 'government-service-tree.emirate', 'Legacy free text must reference the controlled emirate catalog.'),
    authorityId: field(current?.authority?.slug ? 'candidate' : 'needs-normalization', current ? 'service-matrix.authority.slug' : 'government-service-tree.authority', 'Authority and official domains must be verified.'),
    mainCategory: field(current?.category ? 'candidate' : 'needs-normalization', current ? 'service-matrix.category' : 'government-service-tree.sector', 'Must reference the controlled main-category catalog.'),
    subCategory: field('missing', null, 'No canonical subcategory exists in the legacy data.'),
    keywords: field('missing', null, 'Arabic and English search keywords are absent.'),
    documents: field((legacy.requirements ?? []).length ? 'unstructured' : 'missing', 'government-service-tree.requirements', 'Legacy requirements cannot be assumed to be an exact document list.'),
    fees: field(hasText(legacy.fees) ? 'unstructured' : 'missing', 'government-service-tree.fees', 'Amount, currency, and fee components are not structured.'),
    conditions: field(hasText(legacy.conditions) ? 'unstructured' : 'missing', 'government-service-tree.conditions', 'Conditions require bilingual structured review.'),
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

await mkdir(new URL('./', OUTPUT), { recursive: true });
await writeFile(OUTPUT, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
console.log(JSON.stringify(output.summary, null, 2));
