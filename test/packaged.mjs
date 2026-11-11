// Launches the built .app and runs a scan through the real UI.
import { _electron as electron } from 'playwright';
const app = await electron.launch({ executablePath: 'dist/mac-arm64/Diskshaper.app/Contents/MacOS/Diskshaper' });
let w; for (let i = 0; i < 100 && !w; i++) { w = app.windows()[0]; if (!w) await new Promise(r => setTimeout(r, 200)); }
await w.waitForTimeout(800);
await w.click('#scanBtn');
await w.waitForSelector('#overview:not([hidden])', { timeout: 60000 });
console.log('packaged app scanned:', await w.textContent('#bigNum'), await w.textContent('#bigUnit'), '|', await w.locator('.tile').count(), 'tiles');
await app.close();
