import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { buildSearchIndex, search } from '../core/search-index.mjs';

const dossierPath = process.argv[2];
if (!dossierPath) throw new Error('Usage: node src/review/test-dossier-discovery.mjs <dossier.json>');

async function json(path) {
  return JSON.parse(await readFile(resolve(path), 'utf8'));
}

const [dossier, authorities, emirates, businessDimensions, inventory] = await Promise.all([
  json(dossierPath),
  json('src/registry/authorities.json'),
  json('src/registry/emirates.json'),
  json('src/registry/business-dimensions.json'),
  json('src/review/service-review-inventory.json')
]);

const data = dossier.reviewedData;
const relatedCandidates = inventory.candidates
  .filter((candidate) => (data.relatedServiceIds ?? []).includes(candidate.candidateId))
  .map((candidate) => ({
    id: candidate.candidateId,
    slug: candidate.candidateSlug,
    name: {
      ar: candidate.businessDimensions.categoryLabel || candidate.candidateId,
      en: candidate.candidateId
    },
    verification: { status: 'draft' }
  }));

const service = {
  id: dossier.targetServiceId,
  slug: dossier.candidateId,
  name: data.name,
  description: data.description,
  audiences: data.audiences,
  requestType: data.requestType,
  authorityId: data.authorityId,
  emirateId: data.emirateId,
  category: data.category,
  customerTypeIds: data.customerTypeIds,
  activityIds: data.activityIds,
  licenseTypeIds: data.licenseTypeIds,
  classificationNumbers: data.classificationNumbers,
  keywords: data.keywords,
  relatedServiceIds: data.relatedServiceIds,
  alternativeServiceIds: data.alternativeServiceIds,
  verification: { status: 'verified' }
};

const index = buildSearchIndex([service, ...relatedCandidates], { authorities, emirates, businessDimensions });
const cases = [
  ['name-ar', data.name.ar],
  ['name-en', data.name.en],
  ['keyword-ar', data.keywords.ar[0]],
  ['keyword-en', data.keywords.en[0]],
  ['authority', data.authorityId],
  ['emirate', data.emirateId],
  ['activity', data.activityIds[0]],
  ['license-type', data.licenseTypeIds[0]],
  ['classification-number', data.classificationNumbers[0]],
  ['related-service', data.relatedServiceIds[0]]
].map(([method, query]) => {
  const matches = search(index, query);
  return {
    method,
    query,
    matchedTarget: matches.some((match) => match.id === service.id),
    resultIds: matches.map((match) => match.id)
  };
});

const result = {
  testedAt: new Date().toISOString(),
  serviceId: service.id,
  expectedRoute: `/services/${service.slug}/`,
  indexRecords: index.length,
  passed: cases.every((item) => item.matchedTarget),
  cases
};

const outputDirectory = resolve('reports/review');
await mkdir(outputDirectory, { recursive: true });
const outputPath = resolve(outputDirectory, `${service.id}-discovery.json`);
await writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ ...result, outputPath }, null, 2));
if (!result.passed) process.exitCode = 1;
