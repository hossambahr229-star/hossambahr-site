import { readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { jpegDimensions } from './service-social-catalog.mjs';
import { productSocialCards, productSocialAsset } from '../design/product-social-cards.mjs';

const root = resolve(import.meta.dirname, '../..');
for (const card of productSocialCards) {
  const asset = productSocialAsset(card.id);
  const dimensions = jpegDimensions(await readFile(join(root, asset)));
  if (dimensions.width !== 1200 || dimensions.height !== 630) throw Error('Invalid product social image: ' + asset);
  const path = join(root, card.route.slice(1), 'index.html');
  const url = 'https://hossambahr.com/' + asset;
  let html = await readFile(path, 'utf8');
  html = html.replace(/<meta\b(?=[^>]*\b(?:property|name)=["'](?:og:image(?::(?:width|height|type|alt|secure_url))?|twitter:image(?::alt)?|twitter:card)["'])[^>]*>/gi, '');
  const tags = [
    ['property','og:image',url], ['property','og:image:width','1200'], ['property','og:image:height','630'],
    ['property','og:image:type','image/jpeg'], ['property','og:image:alt',card.title],
    ['name','twitter:card','summary_large_image'], ['name','twitter:image',url], ['name','twitter:image:alt',card.title],
  ].map(([kind,key,value]) => '<meta ' + kind + '="' + key + '" content="' + value + '">').join('');
  if (!html.includes('</head>')) throw Error('Missing product page head: ' + card.route);
  await writeFile(path, html.replace('</head>', tags + '</head>'));
}
