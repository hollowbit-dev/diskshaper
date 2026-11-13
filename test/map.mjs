// Demo-mode test of the 1.1 features: space map (open, zoom, breadcrumbs, back), the freed total and the
// share picture, and the new gaming categories. Demo mode never touches real files.
import { _electron as electron } from 'playwright';
import fs from 'fs'; import os from 'os'; import path from 'path';
const OUT = process.env.SHOTS || 'shots';
const data = fs.mkdtempSync(path.join(os.tmpdir(), 'ds-map-'));
const app = await electron.launch({ args: ['.'], env: { ...process.env, DISKSHAPER_DEMO: '1', DISKSHAPER_USERDATA: data } });
let w; for (let i = 0; i < 100 && !w; i++) { w = app.windows()[0]; if (!w) await new Promise((r) => setTimeout(r, 200)); }
const errs = []; w.on('pageerror', (e) => errs.push(e.message)); w.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
await w.setViewportSize({ width: 1180, height: 780 }); await w.waitForTimeout(1200);
const fail = (m) => { console.error('FAIL:', m); process.exitCode = 1; };
if (!(await w.$('#freed[hidden]'))) fail('freed card should be hidden before any clean');
// map from home
await w.click('#mapBtn'); await w.waitForSelector('#mapBusy:not([hidden])'); await w.waitForTimeout(300);
await w.screenshot({ path: `${OUT}/map-1-measuring.png` });
await w.waitForSelector('#tm .cell', { timeout: 20000 }); await w.waitForTimeout(900);
const cells = await w.$$eval('#tm .cell', (c) => c.length);
console.log('cells', cells, '| title', await w.textContent('#mapName'), '| size', await w.textContent('#mapSize'));
if (cells < 6) fail('too few cells');
await w.screenshot({ path: `${OUT}/map-2-home.png` });
// cells must not overlap or leave the map
const bad = await w.evaluate(() => { const b = document.querySelector('#tm').getBoundingClientRect(); return [...document.querySelectorAll('#tm .cell')].filter((c) => { const r = c.getBoundingClientRect(); return r.left < b.left - 1 || r.top < b.top - 1 || r.right > b.right + 1 || r.bottom > b.bottom + 1; }).length; });
if (bad) fail(`${bad} cells outside the map`);
// zoom into the biggest folder
await w.click('#tm .cell.dir >> nth=0'); await w.waitForTimeout(250);
await w.screenshot({ path: `${OUT}/map-3-zooming.png` });
await w.waitForTimeout(900);
console.log('zoomed into', await w.textContent('#mapName'), '| crumbs', await w.$$eval('#crumbs button', (b) => b.map((x) => x.textContent)));
await w.screenshot({ path: `${OUT}/map-4-zoomed.png` });
await w.click('#crumbs button >> nth=0'); await w.waitForTimeout(600);
if ((await w.textContent('#mapName')) !== 'Your files') fail('breadcrumb did not go back up');
await w.keyboard.press('Escape'); await w.waitForTimeout(700);
if (!(await w.$('#home:not([hidden])'))) fail('Escape did not return home');
// scan, check the new categories, clean the safe things, check the total
await w.click('#scanBtn'); await w.waitForSelector('#overview:not([hidden])', { timeout: 60000 }); await w.waitForTimeout(1500);
const titles = await w.$$eval('.tile h3', (h) => h.map((x) => x.textContent));
console.log('has drivers tile:', titles.includes('Graphics driver installers'));
if (!titles.includes('Graphics driver installers')) fail('drivers category missing');
await w.click('#mapTop'); await w.waitForSelector('#tm .cell'); await w.waitForTimeout(500);
await w.click('#mapBack'); await w.waitForTimeout(800);
if (!(await w.$('#overview:not([hidden])'))) fail('back from map did not return to results');
await w.click('#cleanBtn'); await w.waitForSelector('#doneBg:not([hidden])', { timeout: 30000 }); await w.waitForTimeout(1400);
console.log('done total:', await w.textContent('#doneTotal'));
await w.screenshot({ path: `${OUT}/freed-1-sheet.png` });
await w.click('#doneTotal button'); await w.waitForTimeout(600);
console.log('toast:', await w.textContent('#toast'));
const img = await app.evaluate(({ clipboard }) => { const i = clipboard.readImage(); return i.isEmpty() ? null : i.getSize(); });
console.log('clipboard image', img);
if (!img || img.width !== 1200) fail('share picture not on the clipboard');
const png = await app.evaluate(({ clipboard }) => clipboard.readImage().toPNG().toString('base64'));
fs.writeFileSync(`${OUT}/freed-share.png`, Buffer.from(png, 'base64'));
await w.click('#doneOk'); await w.click('#rescan'); await w.waitForSelector('#overview:not([hidden])', { timeout: 60000 });
const st = JSON.parse(fs.readFileSync(path.join(data, 'settings.json'), 'utf8'));
console.log('saved total', (st.freedTotal / 1e9).toFixed(1), 'GB, cleans', st.cleans);
if (!(st.freedTotal > 0 && st.cleans === 1)) fail('total not saved');
console.log('errors', errs); if (errs.length) process.exitCode = 1;
await app.close(); fs.rmSync(data, { recursive: true, force: true });
