// Launches the app, scans, checks the screens, and cleans one throwaway file to prove it lands in the Trash.
import { _electron as electron } from 'playwright';
import fs from 'fs'; import os from 'os'; import path from 'path';
const dl = path.join(os.homedir(), 'Downloads');
const probe = path.join(dl, 'diskshaper-probe-setup.dmg');
fs.writeFileSync(probe, Buffer.alloc(3e6, 1));
const old = new Date(Date.now() - 30 * 864e5); fs.utimesSync(probe, old, old);

const app = await electron.launch({ args: ['.'] });
const w = await app.firstWindow();
await w.setViewportSize({ width: 1120, height: 760 });
await w.waitForTimeout(700);
await w.screenshot({ path: 'shots/1-start.png' });
await w.click('#scanBtn');
await w.waitForTimeout(400);
await w.screenshot({ path: 'shots/2-scanning.png' });
await w.waitForSelector('#results:not([hidden])', { timeout: 120000 });
await w.waitForTimeout(800);
await w.screenshot({ path: 'shots/3-results.png' });
await w.click('#nav button[data-g="gamers"]');
await w.waitForTimeout(300);
await w.click('.cat-h >> nth=0');
await w.waitForTimeout(300);
await w.screenshot({ path: 'shots/4-gamers.png' });

// select only the probe file
await w.click('#nav button[data-g="everyone"]');
const ok = await w.evaluate((probe) => {
  const c = result.cats.find((c) => c.id === 'installers');
  if (!c || !c.items.some((i) => i.path === probe)) return false;
  selected.clear(); selected.add(probe); render(); return true;
}, probe);
console.log('probe listed under old installers:', ok);
await w.click('.cat-h >> text=Old installers');
await w.waitForTimeout(300);
await w.screenshot({ path: 'shots/5-everyone.png' });
await w.click('#cleanBtn');
await w.waitForSelector('#toast:not([hidden])');
await w.waitForTimeout(400);
await w.screenshot({ path: 'shots/6-cleaned.png' });
console.log('toast:', await w.textContent('#toast'));
console.log('probe still in Downloads:', fs.existsSync(probe));
try { console.log('probe in Trash:', fs.readdirSync(path.join(os.homedir(), '.Trash')).filter((n) => n.startsWith('diskshaper-probe'))); }
catch { console.log('probe in Trash: cannot read ~/.Trash without Full Disk Access; check it in Finder'); }
// refuse anything not from the scan
const refused = await w.evaluate(() => ds.clean(['/etc/hosts']));
console.log('outside-scan path refused:', refused.failed[0]?.error);
await app.close();
