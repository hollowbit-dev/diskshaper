// Hero of every language, plus a broken-link check across all built pages.
import { chromium } from 'playwright';
import fs from 'fs'; import path from 'path';
const BASE = 'http://localhost:8765/diskshaper/';
const b = await chromium.launch({ channel: 'chrome' });
const errs = [];
for (const l of ['es', 'fr', 'de', 'ru', 'zh']) {
  const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
  p.on('pageerror', (e) => errs.push(l + ': ' + e.message));
  await p.goto(BASE + l + '/'); await p.waitForTimeout(1800);
  await p.screenshot({ path: `shots/lang-${l}.png` });
  await p.close();
}
// every href/src in every built html must resolve
const files = []; const walk = (d) => fs.readdirSync(d).forEach((f) => { const q = path.join(d, f); fs.statSync(q).isDirectory() ? walk(q) : f.endsWith('.html') && files.push(q); });
walk('docs');
const bad = new Set();
for (const f of files) {
  if (f.endsWith('404.html')) continue;
  const html = fs.readFileSync(f, 'utf8');
  for (const m of html.matchAll(/(?:href|src)="([^"#]+)/g)) {
    const u = m[1]; if (/^(https?:|mailto:|data:)/.test(u)) continue;
    let t = path.resolve(path.dirname(f), u.split('?')[0]); if (u.endsWith('/') || fs.existsSync(t) && fs.statSync(t).isDirectory()) t = path.join(t, 'index.html');
    if (!fs.existsSync(t)) bad.add(`${f} -> ${u}`);
  }
}
console.log('pages checked', files.length, '| broken links', [...bad].slice(0, 10), '| errors', errs);
await b.close();
