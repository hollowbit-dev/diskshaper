// Studio site: every language's home, nav fit, errors, and every internal link resolves.
import { chromium } from 'playwright';
import fs from 'fs'; import path from 'path';
const ROOT = process.env.HOME + '/Desktop/Hollowbit';
const b = await chromium.launch({ channel: 'chrome' });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
await p.addInitScript(() => { try { localStorage.setItem('hb-lang', 'en'); } catch {} });
for (const l of ['', 'es/', 'fr/', 'de/', 'ru/', 'zh/']) {
  for (const w of [1440, 1180]) {
    await p.setViewportSize({ width: w, height: 900 });
    await p.goto('http://localhost:8765/hb/' + l); await p.waitForTimeout(500);
    const r = await p.evaluate(() => { const n = document.querySelector('.nav-links'); const r = n.getBoundingClientRect(); const e = document.querySelector('.nav-end').getBoundingClientRect(); return { overflow: n.scrollWidth > n.clientWidth + 1, overlap: getComputedStyle(n).display !== 'none' && r.right > e.left }; });
    if (r.overflow || r.overlap) console.log('NAV PROBLEM', l || 'en', w, r);
  }
  await p.setViewportSize({ width: 1440, height: 900 });
  await p.goto('http://localhost:8765/hb/' + l); await p.waitForTimeout(1600);
  await p.screenshot({ path: `shots/hb-${(l || 'en/').slice(0, 2)}.png` });
}
const files = []; const walk = (d) => fs.readdirSync(d).forEach((f) => { const q = path.join(d, f); if (['node_modules', '.git', 'site', 'scripts', '.shots'].includes(f)) return; fs.statSync(q).isDirectory() ? walk(q) : f.endsWith('.html') && files.push(q); });
walk(ROOT);
const bad = new Set();
for (const f of files) {
  if (f.endsWith('404.html')) continue;
  for (const m of fs.readFileSync(f, 'utf8').matchAll(/(?:href|src)="([^"#]+)/g)) {
    const u = m[1]; if (/^(https?:|mailto:|data:)/.test(u)) continue;
    let t = path.resolve(path.dirname(f), u); if (u.endsWith('/') || (fs.existsSync(t) && fs.statSync(t).isDirectory())) t = path.join(t, 'index.html');
    if (!fs.existsSync(t) && !/\/diskshaper\//.test(t)) bad.add(`${path.relative(ROOT, f)} -> ${u}`);
  }
}
console.log('pages', files.length, '| broken', [...bad].slice(0, 8), '| errors', errs);
await b.close();
