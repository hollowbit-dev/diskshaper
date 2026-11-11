import { _electron as electron } from 'playwright';
const app = await electron.launch({ args: ['.'] });
let w; for (let i = 0; i < 100 && !w; i++) { w = app.windows()[0]; if (!w) await new Promise(r => setTimeout(r, 200)); }
await w.setViewportSize({ width: 1180, height: 780 });
await w.waitForTimeout(1200);
await w.click('#scanBtn');
for (const t of [250, 600, 1100]) { await w.waitForTimeout(t === 250 ? 250 : t - 250); await w.screenshot({ path: `shots/scan-${t}.png` }); }
await w.waitForSelector('#overview:not([hidden])', { timeout: 60000 });
await w.waitForTimeout(1500);
await w.screenshot({ path: 'shots/3-overview.png' });
await app.close();
