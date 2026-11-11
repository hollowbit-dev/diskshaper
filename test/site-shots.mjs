// Renders the website pages at desktop and phone width (needs: python3 -m http.server serving docs at /diskshaper/).
import { chromium } from 'playwright';
const BASE = process.env.BASE || 'http://localhost:8765/diskshaper/';
const b = await chromium.launch({ channel: 'chrome' });
const errs = [];
for (const [w, h, tag] of [[1440, 900, 'd'], [390, 844, 'm']]) {
  const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  await p.goto(BASE); await p.waitForTimeout(900);
  await p.screenshot({ path: `shots/site-${tag}-hero.png` });
  if (tag === 'd') {
    await p.evaluate(() => document.querySelector('.demo').scrollIntoView({ block: 'center' }));
    for (const t of [2200, 4400, 7600, 9000]) { await p.waitForTimeout(t === 2200 ? 2200 : t - [2200, 4400, 7600, 9000][[2200, 4400, 7600, 9000].indexOf(t) - 1]); await p.screenshot({ path: `shots/site-d-demo-${t}.png` }); }
  }
  for (const page of ['', 'features.html', 'download.html', 'tools/', 'guides/clear-shader-cache.html', 'faq.html']) {
    await p.goto(BASE + page); await p.waitForTimeout(500);
    const H = await p.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y < H; y += 400) { await p.mouse.wheel(0, 400); await p.waitForTimeout(70); }
    await p.evaluate(() => scrollTo(0, 0));
    await p.waitForTimeout(900);
    await p.screenshot({ path: `shots/site-${tag}-${(page || 'index').replace(/[/.]/g, '_')}.png`, fullPage: true });
  }
  await p.close();
}
await b.close();
console.log('errors:', errs);
