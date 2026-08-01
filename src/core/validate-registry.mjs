import { loadRegistry } from './service-registry.mjs';

const publish = process.argv.includes('--publish');

try {
  const { validation } = await loadRegistry({ publish });
  console.log(JSON.stringify(validation, null, 2));
} catch (error) {
  console.error(JSON.stringify(error.validation ?? { valid: false, error: error.message }, null, 2));
  process.exitCode = 1;
}
