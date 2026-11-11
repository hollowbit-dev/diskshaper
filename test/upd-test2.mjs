// Launches an app with a fake "newer release", waits for the notice, checks Download goes to the browser.
import { _electron as electron } from 'playwright';
import fs from 'fs';
const [dir, envName, shot] = process.argv.slice(2);
const ud = fs.mkdtempSync('/private/tmp/claude-501/-Users-elviszygmanta/ce350094-74d5-4e5b-bf3e-9f087123de4c/scratchpad/ud-');
const app = await electron.launch({ args: ['.'], cwd: dir, env: { ...process.env, HOLLOWBIT_TEST_UPDATES: `http://localhost:8765/${process.env.FAKE || 'fake-release.json'}`, [envName]: ud } });
let w; for (let i = 0; i < 100 && !w; i++) { w = app.windows()[0]; if (!w) await new Promise((r) => setTimeout(r, 200)); }
await app.evaluate(({ shell }) => { globalThis.__opened = []; shell.openExternal = async (u) => { globalThis.__opened.push(u); }; });
await w.waitForSelector('.update-note', { timeout: 15000 });
await w.waitForTimeout(500);
await w.screenshot({ path: shot });
console.log('notice:', (await w.textContent('.update-note')).replace(/\s+/g, ' ').trim());
await w.click('#upd-go'); await w.waitForTimeout(400);
console.log('opened:', await app.evaluate(() => globalThis.__opened), '| notice gone:', !(await w.$('.update-note')));
await app.close();
