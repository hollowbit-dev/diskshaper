// Runs the browser duplicate photo finder on a test folder (read-only path, no file changes).
import { chromium } from 'playwright';
const dir = process.argv[2];
const b = await chromium.launch({ channel: 'chrome' });
const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
await p.addInitScript(() => { delete window.showDirectoryPicker; });
await p.goto('http://localhost:8765/diskshaper/tools/');
await p.setInputFiles('[data-input]', dir);
await p.waitForSelector('[data-results]:not([hidden])', { timeout: 30000 });
await p.waitForTimeout(500);
console.log(await p.evaluate(() => [...document.querySelectorAll('.f-group')].map((g) => g.querySelector('h3').textContent + ': ' + [...g.querySelectorAll('.f-item')].map((i) => i.querySelector('.badge').textContent + ' ' + i.querySelector('b').textContent).join(' | '))));
console.log('head:', await p.textContent('.f-head .sum'));
await p.screenshot({ path: 'shots/finder.png' });
console.log('errors:', errs);
await b.close();
