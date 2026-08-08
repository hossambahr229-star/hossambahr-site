import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import test from 'node:test';
import { buildDashboardData, BUSINESS_AREAS } from '../../src/dashboard/dashboard-data.mjs';

const readJson = async (url) => JSON.parse(await readFile(url, 'utf8'));
const inventory = await readJson(new URL('../../src/review/service-review-inventory.json', import.meta.url));
const registry = await readJson(new URL('../../src/registry/registry.json', import.meta.url));
const templates = await readJson(new URL('../../src/templates/authorities.json', import.meta.url));
const dossierRoot = new URL('../../src/review/dossiers/', import.meta.url);
const dossierNames = (await readdir(dossierRoot)).filter((name) => name.endsWith('.json'));
const dossiers = await Promise.all(dossierNames.map((name) => readJson(new URL(name, dossierRoot))));

test('framework provides all required authority templates without creating routes', () => {
  const required = ['det', 'mohre', 'icp', 'gdrfa-dubai', 'fta', 'mofa', 'moe', 'rta', 'municipalities', 'rera', 'sera', 'dha', 'doh', 'customs', 'police', 'notary', 'ejari', 'other-authorities'];
  assert.deepEqual(templates.templates.map((item) => item.authorityId), required);
  assert.equal(templates.policy.bulkMigrationAllowed, false);
  assert.equal(templates.templates.every((item) => item.createsRoutes === false), true);
});

test('project dashboard accounts for all 172 services exactly once', () => {
  const dashboard = buildDashboardData({ inventory, dossiers, registry, authorityTemplates: templates });
  assert.equal(dashboard.project.reduce((sum, row) => sum + row.totalServices, 0), 172);
  const det = dashboard.project.find((row) => row.authorityId === 'det');
  assert.deepEqual({ total: det.totalServices, review: det.underReview, approved: det.approved, ready: det.readyToPublish }, { total: 15, review: 1, approved: 1, ready: 0 });
  assert.equal(dashboard.decision, 'REJECT');
});

test('business dashboard exposes every mandated business area', () => {
  const dashboard = buildDashboardData({ inventory, dossiers, registry, authorityTemplates: templates });
  assert.deepEqual(dashboard.businessAcceptance.businessAreas.map((item) => item.areaId), BUSINESS_AREAS.map((item) => item.id));
  assert.equal(dashboard.businessAcceptance.businessAreas.every((item) => item.completionPercent === 0), true);
});
