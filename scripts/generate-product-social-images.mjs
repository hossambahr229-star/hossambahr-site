import { mkdir, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { chromium } from 'playwright';
import { HB_IDENTITY } from '../src/design/brand-system.mjs';
import { productSocialCards, productSocialAsset } from '../src/design/product-social-cards.mjs';

const root = resolve(import.meta.dirname, '..');
const dataUri = async (path, mime) => 'data:' + mime + ';base64,' + (await readFile(join(root, path))).toString('base64');
const [font, logo] = await Promise.all([
  dataUri('assets/fonts/cairo-800.ttf', 'font/ttf'),
  dataUri('icon.svg', 'image/svg+xml'),
]);
const color = HB_IDENTITY.colors;
const browser = await chromium.launch({ executablePath: process.env.HB_BROWSER_PATH || '/usr/bin/google-chrome' });
await mkdir(join(root, 'assets/social/product'), { recursive: true });
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  for (const card of productSocialCards) {
    const dark = card.motif === '02';
    const background = dark ? color.evergreen : color.pearl;
    const ink = dark ? color.pearl : color.ink;
    const accent = dark ? color.goldSoft : color.green;
    const artwork = {
      '01': '<path d="M35 232V109h55v123m15 0V72h69v160m15 0V130h54v102M22 232h236"/>',
      '02': '<path d="M45 76h190v132H121l-46 39v-39H45z"/><circle cx="92" cy="142" r="7"/><circle cx="140" cy="142" r="7"/><circle cx="188" cy="142" r="7"/>',
      '03': '<rect x="45" y="63" width="190" height="174" rx="16"/><path d="M74 108h133m-133 43h133m-133 43h133m-107-86v85"/>',
    }[card.motif];
    const dir = card.locale === 'ar' ? 'rtl' : 'ltr';
    const html = '<!doctype html><html lang="'+card.locale+'" dir="'+dir+'"><meta charset="utf-8"><style>'
      + '@font-face{font-family:Cairo;src:url('+font+')}*{box-sizing:border-box}body{margin:0;padding:48px 65px;width:1200px;height:630px;'
      + 'font-family:Cairo,sans-serif;color:'+ink+';background:'+background+'}header{display:flex;align-items:center;gap:16px;font-size:26px;direction:ltr}'
      + 'header img{width:62px;height:62px}main{display:grid;grid-template-columns:1.7fr 1fr;gap:42px;align-items:center;height:407px}'
      + 'small{color:'+accent+';font-size:22px}h1{font-size:58px;line-height:1.43;margin:7px 0 12px}p{font-size:25px;margin:0}'
      + 'aside{display:grid;place-items:center;width:100%;aspect-ratio:1;border-radius:28px;background:'+color.evergreen+'}'
      + 'svg{width:85%;height:85%}footer{border-top:1px solid '+accent+';padding-top:16px;font-size:20px;direction:ltr}</style>'
      + '<header><img src="'+logo+'" alt="">HOSSAM BAHR OS</header><main><section><small>'+card.label+'</small><h1>'+card.title+'</h1><p>'+card.detail+'</p></section>'
      + '<aside><svg viewBox="0 0 280 280" fill="none" stroke="'+color.goldSoft+'" stroke-width="6" stroke-linecap="round">'+artwork+'</svg></aside>'
      + '</main><footer>HOSSAMBAHR.COM</footer></html>';
    await page.setContent(html);
    await page.evaluate(() => document.fonts.ready);
    if (await page.evaluate(() => [...document.querySelectorAll('h1,p,footer')].some(node => node.scrollWidth > node.clientWidth + 1 || node.getBoundingClientRect().bottom > 630))) {
      throw Error('Product social copy exceeds image bounds: ' + card.id);
    }
    await page.screenshot({ path: join(root, productSocialAsset(card.id)), type: 'jpeg', quality: 87 });
  }
} finally {
  await browser.close();
}
