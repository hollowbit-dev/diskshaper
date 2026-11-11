// Clicks "by Hollowbit Studio" in an app and checks it goes to the browser (shell.openExternal), not an app window.
import { _electron as electron } from 'playwright';
const [dir, shot] = process.argv.slice(2);
const app = await electron.launch({ args: ['.'], cwd: dir, env: { ...process.env, DISKSHAPER_DEMO: '1' } });
let w; for (let i = 0; i < 100 && !w; i++) { w = app.windows()[0]; if (!w) await new Promise((r) => setTimeout(r, 200)); }
await w.waitForTimeout(2000);
await app.evaluate(({ shell }) => { globalThis.__opened = []; shell.openExternal = async (u) => { globalThis.__opened.push(u); }; });
await w.screenshot({ path: shot });
await w.click('.studio-link');
await w.waitForTimeout(800);
const opened = await app.evaluate(() => globalThis.__opened);
console.log(dir.split('/').pop(), '| windows:', app.windows().length, '| opened in browser:', opened);
await app.close();
