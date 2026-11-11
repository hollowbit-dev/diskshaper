import { _electron as electron } from 'playwright';
import os from 'os';
const app = await electron.launch({ args: ['.'] });
const w = await app.firstWindow();
const r = await w.evaluate((h) => ds.clean(['/etc/hosts', h + '/Documents']), os.homedir());
console.log(JSON.stringify(r.failed));
await app.close();
