import { readdir, readFile } from 'node:fs/promises';
import { loadRegistry } from '../core/service-registry.mjs';
import { evaluateRegistryBusinessAcceptance } from '../business/business-acceptance.mjs';
import { validateProgressiveReview } from './progressive-review-validator.mjs';

async function readJson(url) {
  return JSON.parse(await readFile(url, 'utf8'));
}

const root = new URL('./', import.meta.url);
const dossierRoot = new URL('./dossiers/', root);
const dossierFiles = (await readdir(dossierRoot)).filter((name) => name.endsWith('.json')).sort();
const data = await loadRegistry();
const result = validateProgressiveReview({
  state: await readJson(new URL('progressive-review-state.json', root)),
  inventory: await readJson(new URL('service-review-inventory.json', root)),
  dossiers: await Promise.all(dossierFiles.map((name) => readJson(new URL(name, dossierRoot)))),
  registry: data.registry,
  businessEvaluation: evaluateRegistryBusinessAcceptance(data)
});

console.log(JSON.stringify(result, null, 2));
if (!result.valid) process.exitCode = 1;
