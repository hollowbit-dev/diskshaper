// Website screenshots, taken in demo mode (made-up files), at 2x, saved as WebP in site/assets/img.
import { _electron as electron } from 'playwright';
import { execFileSync } from 'child_process';
const app = await electron.launch({ args: ['--force-device-scale-factor=2', '.'], env: { ...process.env, DISKSHAPER_DEMO: '1' } });
let w; for (let i = 0; i < 100 && !w; i++) { w = app.windows()[0]; if (!w) await new Promise(r => setTimeout(r, 200)); }
await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setContentSize(1280, 820));
await w.waitForTimeout(1500);
const shot = async (name) => {
  await w.screenshot({ path: `test/out/${name}.png` });
  execFileSync('cwebp', ['-q', '86', '-quiet', `test/out/${name}.png`, '-o', `site/assets/img/${name}.webp`]);
  console.log('saved', name);
};
await shot('app-home');
await w.click('#scanBtn');
await w.waitForTimeout(1000);
await shot('app-scanning');
await w.waitForSelector('#overview:not([hidden])');
await w.waitForTimeout(1800);
await shot('app-overview');
await w.click('#seg button[data-g="gamers"]'); await w.waitForTimeout(1200);
await shot('app-gaming');
await w.click('.tile:has-text("not played")'); await w.waitForTimeout(1400);
await shot('app-games');
await w.click('#seg button[data-g="creators"]'); await w.waitForTimeout(900);
await shot('app-creators');
await w.click('.tile:has-text("Video editing caches")'); await w.waitForTimeout(1400);
await shot('app-creator-cache');
await w.click('#seg button[data-g="everyone"]'); await w.waitForTimeout(900);
await w.click('.tile:has-text("Duplicate photos")'); await w.waitForTimeout(1400);
await shot('app-photos');
await w.click('#seg button[data-g="all"]'); await w.waitForTimeout(900);
await w.click('#cleanBtn');
await w.waitForSelector('#doneBg:not([hidden])'); await w.waitForTimeout(1600);
await shot('app-done');
await app.close();
