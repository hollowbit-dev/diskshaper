import { _electron as electron } from 'playwright';
import os from 'os';
import fs from 'fs'; import path from 'path';
const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'ds-test-')); // keeps test cleans out of the real freed total
const app = await electron.launch({ args: ['.'], env: { ...process.env, DISKSHAPER_USERDATA: userData } });
const w = await app.firstWindow();
const r = await w.evaluate((h) => ds.clean(['/etc/hosts', h + '/Documents']), os.homedir());
console.log(JSON.stringify(r.failed));
await app.close();
