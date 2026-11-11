// Tests the finder's "move copies" path on a directory handle (Chrome's private storage), so no real files change.
import { chromium } from 'playwright';
import fs from 'fs';
const dir = process.argv[2];
const files = { 'a.png': 'a.png', 'shot.jpg': 'shot.jpg', 'other.jpg': 'other.jpg', 'sub/shot 2.jpg': 'sub/shot 2.jpg', 'sub/shot-small.jpg': 'sub/shot-small.jpg' };
const b = await chromium.launch({ channel: 'chrome' });
const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
await p.goto('http://localhost:8765/diskshaper/tools/');
const payload = Object.fromEntries(Object.entries(files).map(([k, v]) => [k, fs.readFileSync(`${dir}/${v}`).toString('base64')]));
await p.evaluate(async (payload) => {
  const root = await navigator.storage.getDirectory();
  for await (const [n] of root.entries()) await root.removeEntry(n, { recursive: true });
  const box = await root.getDirectoryHandle('photos', { create: true });
  for (const [k, b64] of Object.entries(payload)) {
    const parts = k.split('/'); let d = box;
    for (const part of parts.slice(0, -1)) d = await d.getDirectoryHandle(part, { create: true });
    const fh = await d.getFileHandle(parts.at(-1), { create: true });
    const w = await fh.createWritable(); await w.write(Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))); await w.close();
  }
  // private storage needs no permission prompt
  box.requestPermission = async () => 'granted';
  await window.__dsFinder.runHandle(box);
}, payload);
await p.waitForSelector('.f-head button.btn-primary');
await p.click('.f-head button.btn-primary');
await p.waitForSelector('.f-msg');
console.log('message:', await p.textContent('.f-msg'));
const tree = await p.evaluate(async () => {
  const out = [];
  const walk = async (d, pre) => { for await (const [n, h] of d.entries()) h.kind === 'directory' ? await walk(h, pre + n + '/') : out.push(pre + n); };
  await walk(await (await navigator.storage.getDirectory()).getDirectoryHandle('photos'), '');
  return out.sort();
});
console.log('files now:', tree);
await p.screenshot({ path: 'shots/finder-moved.png' });
console.log('errors:', errs);
await b.close();
