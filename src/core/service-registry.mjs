import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { validateRegistry } from './registry-validator.mjs';

const REGISTRY_ROOT = new URL('../registry/', import.meta.url);

async function readJson(name) {
  return JSON.parse(await readFile(new URL(name, REGISTRY_ROOT), 'utf8'));
}

export async function loadRegistry(options = {}) {
  const data = {
    registry: await readJson('registry.json'),
    authorities: await readJson('authorities.json'),
    categories: await readJson('categories.json'),
    emirates: await readJson('emirates.json')
  };
  const validation = validateRegistry(data, options);
  if (!validation.valid) {
    const error = new Error(`Service Registry validation failed with ${validation.errors.length} error(s)`);
    error.validation = validation;
    throw error;
  }
  return { ...data, validation };
}

export const registryDirectory = fileURLToPath(REGISTRY_ROOT);
