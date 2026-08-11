import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../..');
const registry = JSON.parse(await readFile(resolve(root, 'src/registry/published-services.json'), 'utf8'));
const home = await readFile(resolve(root, 'index.html'), 'utf8');
const verified = registry.services.filter((service) => service.verificationStatus === 'VERIFIED');
const authorityCount = new Set(verified.map((service) => service.authority.id)).size;

// index.html is a Next.js static export. Rewriting its server-rendered markup
// independently from the embedded React flight payload causes hydration errors.
// zero-defect-routing.js applies registry counts, exposes Activity Search, and
// isolates homepage government CTAs only after React has hydrated the page.
console.log(JSON.stringify({
  verifiedServices: verified.length,
  authorities: authorityCount,
  homepageRuntimeEnhancement: true,
  staticHomepageBytes: Buffer.byteLength(home, 'utf8')
}, null, 2));
