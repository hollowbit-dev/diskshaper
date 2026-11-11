const { app, BrowserWindow, ipcMain, shell, nativeTheme, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { execFile } = require('child_process');
const real = require('./scanner');
const demo = require('./demo');
// Demo mode shows made-up results for screenshots. It never touches real files.
const DEMO = process.env.DISKSHAPER_DEMO === '1';
const scan = DEMO ? demo.scan : real.scan;
const diskInfo = DEMO ? async () => ({ total: 494.38e9, free: 21.4e9 }) : real.diskInfo;

const IS_MAC = process.platform === 'darwin';
let win;
// Only paths the last scan returned can be cleaned. The window can't ask to trash anything else.
let allowed = new Set();
// Pictures (thumbnails, icons, cover art) may only be read for paths the scan returned.
let visible = new Set();

function create() {
  nativeTheme.themeSource = 'dark';
  win = new BrowserWindow({
    width: 1180, height: 780, minWidth: 940, minHeight: 620,
    backgroundColor: '#09090b',
    titleBarStyle: IS_MAC ? 'hiddenInset' : 'hidden',
    titleBarOverlay: IS_MAC ? undefined : { color: '#09090b', symbolColor: '#a1a1aa', height: 36 },
    trafficLightPosition: { x: 18, y: 18 },
    vibrancy: IS_MAC ? 'sidebar' : undefined,
    backgroundMaterial: !IS_MAC ? 'mica' : undefined,
    show: false,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, sandbox: true },
  });
  win.once('ready-to-show', () => win.show());
  // Web links (like hollowbit.dev) open in the browser, never inside the app.
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https:\/\//.test(url)) shell.openExternal(url); return { action: 'deny' }; });
  win.webContents.on('will-navigate', (e, url) => { if (!url.startsWith('file:')) { e.preventDefault(); if (/^https:\/\//.test(url)) shell.openExternal(url); } });
  win.loadFile(path.join(__dirname, 'renderer/index.html'));
}

ipcMain.handle('disk', () => diskInfo());

ipcMain.handle('scan', async (e) => {
  let last = 0;
  const res = await scan((p) => {
    const t = Date.now();
    // Categories always go through; path ticks are throttled.
    if (p.cat || t - last > 50) { last = t; e.sender.send('scan-progress', p); }
  });
  allowed = new Set(res.cats.filter((c) => !c.action).flatMap((c) => c.items.map((i) => i.path)));
  visible = new Set(res.cats.flatMap((c) => c.items.flatMap((i) => [i.path, i.art, i.keep, i.thumb].filter(Boolean))));
  return res;
});

ipcMain.handle('clean', async (e, paths) => {
  const done = [], failed = [];
  if (DEMO) {
    for (const p of paths) { done.push(p); e.sender.send('clean-progress', { done: done.length, total: paths.length, path: p }); await new Promise((r) => setTimeout(r, 25)); }
    return { done, failed, disk: await diskInfo() };
  }
  for (const p of paths) {
    if (!allowed.has(p)) { failed.push({ path: p, error: 'Not part of the last scan' }); continue; }
    try {
      if (fs.existsSync(p)) await shell.trashItem(p);
      allowed.delete(p);
      done.push(p);
      e.sender.send('clean-progress', { done: done.length, total: paths.length, path: p });
    } catch (err) { failed.push({ path: p, error: String(err.message || err) }); }
  }
  return { done, failed, disk: await diskInfo() };
});

// ---------- pictures ----------
const picCache = new Map();
const MEDIA = /\.(jpe?g|png|heic|heif|webp|gif|tiff?|dng|cr2|cr3|nef|arw|raf|mp4|mov|m4v|mkv|avi|webm|mxf)$/i;

function findApp(name) {
  // Cache folders are usually named after the app's bundle id (com.spotify.client) or the app itself.
  return new Promise((resolve) => {
    if (!IS_MAC) return resolve(null);
    if (/^[a-z0-9-]+(\.[A-Za-z0-9-]+){2,}$/i.test(name)) {
      execFile('mdfind', [`kMDItemCFBundleIdentifier == '${name.replace(/'/g, '')}'`], { timeout: 3000 }, (err, out) => {
        resolve(!err && out.split('\n').find((l) => l.endsWith('.app')) || null);
      });
      return;
    }
    const guesses = [`/Applications/${name}.app`, `/Applications/${name} Chrome.app`, `/System/Applications/${name}.app`];
    resolve(guesses.find((g) => fs.existsSync(g)) || null);
  });
}

// getFileIcon's 'large' size isn't supported on macOS and crashes Electron there.
const ICON_SIZE = IS_MAC ? 'normal' : 'large';
async function thumb(p) {
  if (process.platform === 'linux') return null;
  const img = await nativeImage.createThumbnailFromPath(p, { width: 160, height: 160 });
  return img.isEmpty() ? null : img.toDataURL();
}

async function picture(p, kind) {
  const key = kind + '|' + p;
  if (picCache.has(key)) return picCache.get(key);
  if (p.startsWith('demo:')) return demo.picture(p);
  let url = null;
  try {
    if (kind === 'art') {
      url = 'data:image/jpeg;base64,' + fs.readFileSync(p).toString('base64');
    } else if (kind === 'thumb' && MEDIA.test(p)) {
      url = await thumb(p);
    } else if (kind === 'app') {
      const a = await findApp(path.basename(p));
      if (a) url = IS_MAC ? await thumb(a) : (await app.getFileIcon(a, { size: ICON_SIZE })).toDataURL();
    }
    if (!url) url = (await app.getFileIcon(p, { size: ICON_SIZE })).toDataURL();
  } catch {}
  picCache.set(key, url);
  return url;
}

// A few at a time, so a long list doesn't flood the system icon services.
let running = 0;
const waiting = [];
function queued(fn) {
  return new Promise((resolve) => {
    const go = async () => { running++; try { resolve(await fn()); } catch { resolve(null); } finally { running--; waiting.shift()?.(); } };
    running < 4 ? go() : waiting.push(go);
  });
}

ipcMain.handle('picture', (e, p, kind) => (visible.has(p) ? queued(() => picture(p, kind)) : null));
ipcMain.handle('reveal', (e, p) => visible.has(p) && shell.showItemInFolder(p));
ipcMain.handle('open-trash', () => {
  if (IS_MAC) return shell.openPath(path.join(os.homedir(), '.Trash'));
  return shell.openExternal('shell:RecycleBinFolder');
});
ipcMain.handle('steam-uninstall', (e, appid) => /^\d+$/.test(appid) && shell.openExternal(`steam://uninstall/${appid}`));
ipcMain.handle('epic-open', () => shell.openExternal('com.epicgames.launcher://store/library'));

app.whenReady().then(create);
app.on('window-all-closed', () => app.quit());
