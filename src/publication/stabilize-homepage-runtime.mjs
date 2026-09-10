import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../..');
const homepagePath = resolve(root, 'index.html');
let html = await readFile(homepagePath, 'utf8');

function extractBalancedDivInner(source, marker) {
  const start = source.indexOf(marker);
  if (start < 0) return null;
  const openEnd = source.indexOf('>', start);
  if (openEnd < 0) throw new Error('Malformed canonical homepage container.');
  const token = /<\/?div\b[^>]*>/gi;
  token.lastIndex = start;
  let depth = 0;
  let match;
  while ((match = token.exec(source))) {
    if (!match[0].startsWith('</')) depth += 1;
    else depth -= 1;
    if (depth === 0) return source.slice(openEnd + 1, match.index);
  }
  throw new Error('Unbalanced canonical homepage container.');
}

const bodyMatch = html.match(/<body\b([^>]*)>[\s\S]*?<\/body>/i);
if (!bodyMatch) throw new Error('Homepage has no valid body.');
const bodyAttributes = bodyMatch[1]
  .replace(/\sdata-home-render=(?:"[^"]*"|'[^']*')/gi, '')
  .trim();
const streamed = extractBalancedDivInner(html, '<div hidden id="S:0">');

if (streamed) {
  const jsonLd = [...html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi)]
    .map((match) => match[0])
    .filter((script, index, scripts) => scripts.indexOf(script) === index && !streamed.includes(script))
    .join('');
  const canonicalBody = `${streamed}${jsonLd}`;
  html = html.replace(/<body\b[^>]*>[\s\S]*?<\/body>/i, `<body${bodyAttributes ? ` ${bodyAttributes}` : ''} data-home-render="static-stable">${canonicalBody}</body>`);
}

if (!html.includes('href="/intent-first.css"')) {
  html = html.replace('</head>', '<link rel="stylesheet" href="/intent-first.css" data-hb-home-runtime="stable"/></head>');
}

const forbidden = [
  ['loading shell', /class=["'][^"']*loading-shell/],
  ['React suspense boundary', /id=["'](?:B|S):0["']/],
  ['React stream replacement', /\$R[CV]\s*=|function\s+\$R[CV]/],
  ['Next flight payload', /self\.__next_f/],
];
for (const [label, pattern] of forbidden) {
  if (pattern.test(html)) throw new Error(`Homepage still contains ${label}.`);
}
if (!/data-home-render=["']static-stable["']/.test(html)) throw new Error('Stable homepage marker is missing.');
if ((html.match(/class=["'][^"']*platform-hero/g) || []).length !== 1) throw new Error('Homepage must contain exactly one platform hero.');

await writeFile(homepagePath, html, 'utf8');
console.log(JSON.stringify({ homepage: '/', render: 'STATIC_SINGLE_SOURCE', suspenseBoundaries: 0, flightPayloads: 0 }, null, 2));
