// Diskshaper scanner: finds what is taking space and sorts it into plain categories.
// It only reads. Nothing here deletes anything.
const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const os = require('os');
const crypto = require('crypto');

const HOME = os.homedir();
const IS_MAC = process.platform === 'darwin';
const IS_WIN = process.platform === 'win32';
const DAY = 86400000;
const seenInodes = new Set();
const now = Date.now();

const env = (k, fb) => process.env[k] || fb;
const LOCAL = env('LOCALAPPDATA', path.join(HOME, 'AppData', 'Local'));
const ROAMING = env('APPDATA', path.join(HOME, 'AppData', 'Roaming'));
const PF86 = env('ProgramFiles(x86)', 'C:\\Program Files (x86)');
const PF = env('ProgramFiles', 'C:\\Program Files');

const VIDEO = new Set(['.mp4', '.mov', '.mkv', '.avi', '.m4v', '.mxf', '.braw', '.r3d', '.webm', '.prores', '.mts']);
const IMAGE = new Set(['.jpg', '.jpeg', '.png', '.heic', '.heif', '.webp', '.tif', '.tiff', '.gif', '.dng', '.cr2', '.cr3', '.nef', '.arw', '.raf']);
const INSTALLER = new Set(['.dmg', '.pkg', '.exe', '.msi', '.iso', '.appimage']);
const ARCHIVE = new Set(['.zip', '.rar', '.7z']);
const DEV_CACHE = /^(ms-playwright|electron|electron-builder|pip|Homebrew|Yarn|go-build|node-gyp|pnpm|CocoaPods|org\.swift\.swiftpm|JetBrains|puppeteer|typescript|deno|bun)$/i;
// Folders editing apps create next to your project files.
const PROJECT_JUNK = [
  { re: /^Adobe Premiere Pro (Video|Audio) Previews$/i, kind: 'previews', note: 'Premiere render previews' },
  { re: /^Adobe Premiere Pro Auto-Save$/i, kind: 'autosave', note: 'Premiere auto-saves' },
  { re: /^Adobe After Effects Auto-Save$/i, kind: 'autosave', note: 'After Effects auto-saves' },
  { re: /^(CacheClip|ProxyMedia|\.gallery)$/i, kind: 'previews', note: 'DaVinci Resolve cache' },
  { re: /^Render Files$/i, kind: 'previews', note: 'Final Cut render files' },
];
const SKIP_DIRS = new Set(['node_modules', '.git', 'Library', 'AppData', '.Trash', '$Recycle.Bin', '.cache', '.npm', '.cargo', '.rustup', '.venv', 'venv', '__pycache__', 'Applications']);

// ---------- helpers ----------
async function exists(p) { try { await fsp.access(p); return true; } catch { return false; } }
async function lstat(p) { try { return await fsp.lstat(p); } catch { return null; } }
async function readdir(p) { try { return await fsp.readdir(p, { withFileTypes: true }); } catch { return []; } }

// Size of a file or folder. Never follows symlinks. Also returns the newest modified time.
async function sizeOf(p, budget = { n: 0 }) {
  const st = await lstat(p);
  if (!st || st.isSymbolicLink()) return { bytes: 0, files: 0, newest: 0 };
  if (!st.isDirectory()) return { bytes: st.blocks ? st.blocks * 512 : st.size, files: 1, newest: st.mtimeMs };
  let bytes = 0, files = 0, newest = st.mtimeMs;
  const stack = [p];
  while (stack.length) {
    const dir = stack.pop();
    const ents = await readdir(dir);
    await Promise.all(ents.map(async (e) => {
      const fp = path.join(dir, e.name);
      if (e.isSymbolicLink()) return;
      if (e.isDirectory()) { stack.push(fp); return; }
      const s = await lstat(fp);
      if (!s) return;
      // Hard-linked files share their space: count each one once.
      if (s.nlink > 1) { const k = s.dev + ':' + s.ino; if (seenInodes.has(k)) return; seenInodes.add(k); }
      bytes += s.blocks ? s.blocks * 512 : s.size; files++;
      if (s.mtimeMs > newest) newest = s.mtimeMs;
      budget.n++;
    }));
  }
  return { bytes, files, newest };
}

function item(p, size, extra = {}) {
  return { path: p, name: path.basename(p), bytes: size.bytes, files: size.files, modified: size.newest || 0, ...extra };
}

async function sizedItems(paths, extra) {
  const out = [];
  for (const p of paths) {
    if (!(await exists(p))) continue;
    const s = await sizeOf(p);
    if (s.bytes > 0) out.push(item(p, s, extra));
  }
  return out;
}

// Children of a folder, each one an item (so the user can pick per app or per version).
async function childItems(dir, filter = () => true) {
  const out = [];
  for (const e of await readdir(dir)) {
    if (!filter(e.name)) continue;
    const fp = path.join(dir, e.name);
    const s = await sizeOf(fp);
    if (s.bytes > 0) out.push(item(fp, s));
  }
  return out;
}

// ---------- Steam ----------
const BOTTLES = path.join(HOME, 'Library/Application Support/CrossOver/Bottles');
function steamRoots() {
  if (IS_MAC) {
    // Native Steam, plus Windows Steam running inside CrossOver bottles.
    const roots = [path.join(HOME, 'Library/Application Support/Steam')];
    try { for (const b of fs.readdirSync(BOTTLES)) roots.push(path.join(BOTTLES, b, 'drive_c/Program Files (x86)/Steam')); } catch {}
    return roots;
  }
  if (IS_WIN) return [path.join(PF86, 'Steam'), path.join(PF, 'Steam')];
  return [path.join(HOME, '.steam/steam'), path.join(HOME, '.local/share/Steam')];
}

async function steamLibraries() {
  const libs = new Set();
  for (const root of steamRoots()) {
    const apps = path.join(root, 'steamapps');
    if (!(await exists(apps))) continue;
    libs.add(apps);
    try {
      const vdf = await fsp.readFile(path.join(apps, 'libraryfolders.vdf'), 'utf8');
      for (const m of vdf.matchAll(/"path"\s+"([^"]+)"/g)) {
        const lib = path.join(m[1].replace(/\\\\/g, '\\'), 'steamapps');
        if (await exists(lib)) libs.add(lib);
      }
    } catch {}
  }
  return [...libs];
}

// Steam keeps cover art for every game it has shown you. Newer clients use a folder per app id.
async function steamArt(lib, appid) {
  const cache = path.join(path.dirname(lib), 'appcache', 'librarycache');
  for (const f of [path.join(cache, appid, 'header.jpg'), path.join(cache, appid, 'library_600x900.jpg'), path.join(cache, `${appid}_header.jpg`), path.join(cache, `${appid}_library_600x900.jpg`)]) {
    if (await exists(f)) return f;
  }
  return null;
}

async function scanSteam() {
  const libs = await steamLibraries();
  const shader = [], leftovers = [], downloads = [], installed = [];
  for (const lib of libs) {
    // Which game folders does Steam still know about?
    const known = new Map();
    for (const e of await readdir(lib)) {
      if (!/^appmanifest_\d+\.acf$/.test(e.name)) continue;
      try {
        const acf = await fsp.readFile(path.join(lib, e.name), 'utf8');
        const dir = acf.match(/"installdir"\s+"([^"]+)"/)?.[1];
        const name = acf.match(/"name"\s+"([^"]+)"/)?.[1];
        const played = Number(acf.match(/"LastPlayed"\s+"(\d+)"/)?.[1] || 0) * 1000;
        const appid = e.name.match(/\d+/)[0];
        if (dir) known.set(dir.toLowerCase(), { name, played, appid });
      } catch {}
    }
    const common = path.join(lib, 'common');
    for (const e of await readdir(common)) {
      if (!e.isDirectory() || e.name === 'Steam Controller Configs' || e.name.startsWith('Steamworks')) continue;
      const fp = path.join(common, e.name);
      const s = await sizeOf(fp);
      const k = known.get(e.name.toLowerCase());
      if (k) installed.push(item(fp, s, { name: k.name || e.name, lastPlayed: k.played, appid: k.appid, art: await steamArt(lib, k.appid) }));
      else if (s.bytes > 0) leftovers.push(item(fp, s, { note: 'Steam no longer lists this game as installed' }));
    }
    shader.push(...await childItems(path.join(lib, 'shadercache')));
    downloads.push(...await sizedItems([path.join(lib, 'downloading'), path.join(lib, 'temp')]));
  }
  return { shader, leftovers, downloads, installed };
}

// ---------- Epic Games ----------
async function scanEpic() {
  const dir = IS_MAC
    ? path.join(HOME, 'Library/Application Support/Epic/EpicGamesLauncher/Data/Manifests')
    : path.join(env('ProgramData', 'C:\\ProgramData'), 'Epic', 'EpicGamesLauncher', 'Data', 'Manifests');
  const installed = [], leftovers = [], knownDirs = new Set(), parents = new Set();
  for (const e of await readdir(dir)) {
    if (!e.name.endsWith('.item')) continue;
    try {
      const m = JSON.parse(await fsp.readFile(path.join(dir, e.name), 'utf8'));
      if (!m.InstallLocation || !(await exists(m.InstallLocation))) continue;
      knownDirs.add(path.resolve(m.InstallLocation).toLowerCase());
      parents.add(path.dirname(m.InstallLocation));
      const s = await sizeOf(m.InstallLocation);
      installed.push(item(m.InstallLocation, s, { name: m.DisplayName || path.basename(m.InstallLocation), lastPlayed: s.newest, store: 'epic' }));
    } catch {}
  }
  // Folders in Epic's games folder that no manifest points at any more.
  if (IS_WIN) parents.add(path.join(PF, 'Epic Games'));
  for (const parent of parents) {
    for (const e of await readdir(parent)) {
      const fp = path.join(parent, e.name);
      if (!e.isDirectory() || knownDirs.has(path.resolve(fp).toLowerCase()) || /^(Launcher|DirectXRedist|UE_\d)/i.test(e.name)) continue;
      const s = await sizeOf(fp);
      if (s.bytes > 1e6) leftovers.push(item(fp, s, { note: 'The Epic Games Launcher no longer lists this game' }));
    }
  }
  return { installed, leftovers };
}

// ---------- Heroic (Epic, GOG, Amazon on Mac and Linux, also Windows) ----------
async function scanHeroic() {
  const base = IS_MAC ? path.join(HOME, 'Library/Application Support/heroic') : IS_WIN ? path.join(ROAMING, 'heroic') : path.join(HOME, '.config/heroic');
  const out = [];
  const files = [path.join(base, 'legendaryConfig/legendary/installed.json'), path.join(base, 'gog_store/installed.json'), path.join(base, 'nile_config/nile/installed.json')];
  for (const f of files) {
    try {
      const j = JSON.parse(await fsp.readFile(f, 'utf8'));
      const list = Array.isArray(j) ? j : Array.isArray(j.installed) ? j.installed : Object.values(j);
      for (const g of list) {
        const dir = g.install_path || g.path;
        if (!dir || !(await exists(dir))) continue;
        const sz = await sizeOf(dir);
        out.push(item(dir, sz, { name: g.title || g.appName || path.basename(dir), lastPlayed: sz.newest, store: 'heroic' }));
      }
    } catch {}
  }
  return out;
}

// ---------- CrossOver bottles (Mac) ----------
const BASE_PROGRAMS = new Set(['common files', 'internet explorer', 'windows media player', 'windows nt', 'windows defender', 'windows mail', 'windows photo viewer', 'windows sidebar', 'windowspowershell', 'microsoft.net', 'uninstall information', 'windows portable devices', 'microsoft', 'reference assemblies', 'msbuild', 'dotnet', 'openal', 'directx', 'microsoft visual studio', 'windows kits', 'msxml 4.0', 'msxml 6.0']);
async function scanBottles() {
  if (!IS_MAC) return [];
  const out = [];
  for (const e of await readdir(BOTTLES)) {
    if (!e.isDirectory()) continue;
    const fp = path.join(BOTTLES, e.name);
    const sz = await sizeOf(fp);
    const programs = [];
    for (const pf of ['Program Files', 'Program Files (x86)']) {
      for (const x of await readdir(path.join(fp, 'drive_c', pf))) if (x.isDirectory() && !BASE_PROGRAMS.has(x.name.toLowerCase())) programs.push(x.name);
    }
    // Games installed through Steam inside the bottle say more than "Steam".
    for (const lib of ['Program Files (x86)/Steam/steamapps/common', 'Program Files/Steam/steamapps/common']) {
      for (const x of await readdir(path.join(fp, 'drive_c', lib))) if (x.isDirectory() && !/^(Steam Controller Configs|Steamworks Shared)$/.test(x.name)) programs.unshift(x.name);
    }
    const empty = programs.length === 0;
    const shown = programs.filter((x) => !/^(Steam|OpenAL)$/i.test(x));
    const list = shown.length ? shown : programs;
    out.push(item(fp, sz, { name: e.name, empty, note: empty ? 'No game inside, only Windows and runtimes' : 'Has ' + list.slice(0, 3).join(', ') + (list.length > 3 ? ` and ${list.length - 3} more` : '') }));
  }
  return out;
}

// ---------- GPU + launcher caches ----------
async function gpuShaderCaches() {
  if (IS_WIN) return sizedItems([
    path.join(LOCAL, 'NVIDIA', 'DXCache'), path.join(LOCAL, 'NVIDIA', 'GLCache'),
    path.join(LOCAL, 'AMD', 'DxCache'), path.join(LOCAL, 'AMD', 'DxcCache'), path.join(LOCAL, 'AMD', 'GLCache'),
    path.join(LOCAL, 'D3DSCache'), path.join(LOCAL, 'Intel', 'ShaderCache'),
  ]);
  return [];
}

async function launcherCaches() {
  const p = IS_MAC ? [
    path.join(HOME, 'Library/Application Support/Epic/EpicGamesLauncher/Saved/webcache'),
    path.join(HOME, 'Library/Application Support/Epic/EpicGamesLauncher/Saved/Logs'),
    path.join(HOME, 'Library/Application Support/Steam/appcache/httpcache'),
    path.join(HOME, 'Library/Application Support/Steam/logs'),
    path.join(HOME, 'Library/Caches/com.valvesoftware.steam'),
  ] : [
    path.join(LOCAL, 'EpicGamesLauncher', 'Saved', 'webcache'),
    path.join(LOCAL, 'EpicGamesLauncher', 'Saved', 'webcache_4147'),
    path.join(LOCAL, 'EpicGamesLauncher', 'Saved', 'Logs'),
    path.join(PF86, 'Steam', 'appcache', 'httpcache'),
    path.join(PF86, 'Steam', 'logs'),
    path.join(LOCAL, 'Steam', 'htmlcache'),
  ];
  return sizedItems(p);
}

// ---------- creators ----------
async function creatorCaches() {
  const adobeCache = IS_MAC ? [
    path.join(HOME, 'Library/Application Support/Adobe/Common/Media Cache Files'),
    path.join(HOME, 'Library/Application Support/Adobe/Common/Media Cache'),
    path.join(HOME, 'Library/Application Support/Adobe/Common/Peak Files'),
    path.join(HOME, 'Library/Caches/Adobe/After Effects'),
    path.join(HOME, 'Library/Caches/Adobe/Premiere Pro'),
  ] : [
    path.join(ROAMING, 'Adobe', 'Common', 'Media Cache Files'),
    path.join(ROAMING, 'Adobe', 'Common', 'Media Cache'),
    path.join(ROAMING, 'Adobe', 'Common', 'Peak Files'),
    path.join(LOCAL, 'Temp', 'Adobe', 'After Effects Disk Cache'),
    path.join(LOCAL, 'Adobe', 'After Effects'),
  ];
  const resolve = IS_MAC ? [
    path.join(HOME, 'Movies/CacheClip'), path.join(HOME, 'Movies/ProxyMedia'),
    path.join(HOME, 'Library/Application Support/Blackmagic Design/DaVinci Resolve/logs'),
  ] : [
    path.join(ROAMING, 'Blackmagic Design', 'DaVinci Resolve', 'Support', 'logs'),
    path.join(HOME, 'Videos', 'CacheClip'), path.join(HOME, 'Videos', 'ProxyMedia'),
  ];
  const other = IS_MAC ? [
    path.join(HOME, 'Library/Caches/com.apple.FinalCut'),
    path.join(HOME, 'Library/Caches/com.blackmagic-design.DaVinciResolve'),
    path.join(HOME, 'Library/Application Support/CapCut/User Data/Cache'),
    path.join(HOME, 'Movies/CapCut/User Data/Cache'),
    path.join(HOME, 'Library/Caches/com.lemon.lvoverseas'),
  ] : [
    path.join(LOCAL, 'CapCut', 'User Data', 'Cache'),
  ];
  return [
    ...await sizedItems(adobeCache, { app: 'Adobe' }),
    ...await sizedItems(resolve, { app: 'DaVinci Resolve' }),
    ...await sizedItems(other),
  ];
}

// ---------- everyone: app caches + temp ----------
async function appCaches() {
  if (IS_MAC) {
    // Per-app folders in ~/Library/Caches. Apps rebuild these on their own.
    const skip = /^(com\.apple\.(?!Safari)|CloudKit|FamilyCircle|com\.valvesoftware|Adobe$|com\.apple\.FinalCut)/;
    return (await childItems(path.join(HOME, 'Library/Caches'), (n) => !skip.test(n)))
      .filter((i) => i.bytes > 5e6);
  }
  if (IS_WIN) return sizedItems([path.join(LOCAL, 'Temp')]);
  return sizedItems([path.join(HOME, '.cache')]);
}

async function trashSize() {
  if (IS_MAC) return sizedItems([path.join(HOME, '.Trash')]);
  return [];
}

// ---------- one walk over the user's own folders ----------
async function walkUserFiles(onProgress) {
  const roots = IS_WIN
    ? ['Desktop', 'Downloads', 'Documents', 'Videos', 'Pictures', 'Music', 'OneDrive'].map((d) => path.join(HOME, d))
    : ['Desktop', 'Downloads', 'Documents', 'Movies', 'Pictures', 'Music'].map((d) => path.join(HOME, d));
  const files = [], projectJunk = [];
  let seen = 0;
  for (const root of roots) {
    if (!(await exists(root))) continue;
    const stack = [root];
    while (stack.length) {
      const dir = stack.pop();
      const ents = await readdir(dir);
      await Promise.all(ents.map(async (e) => {
        const fp = path.join(dir, e.name);
        if (e.isSymbolicLink()) return;
        if (e.isDirectory()) {
          // App bundles and photo libraries are packages; leave them whole.
          if (SKIP_DIRS.has(e.name) || /\.(app|photoslibrary|fcpbundle|photolibrary|logicx|band)$/i.test(e.name)) return;
          if (e.name.startsWith('.')) return;
          const junk = PROJECT_JUNK.find((j) => j.re.test(e.name));
          if (junk) { const sz = await sizeOf(fp); if (sz.bytes > 0) projectJunk.push(item(fp, sz, { kind: junk.kind, note: junk.note + ' · ' + prettyPath(dir) })); return; }
          stack.push(fp); return;
        }
        const s = await lstat(fp);
        if (!s) return;
        seen++;
        if (seen % 2000 === 0) onProgress?.(dir);
        const ext = path.extname(e.name).toLowerCase();
        const bytes = s.blocks ? s.blocks * 512 : s.size;
        // Last-opened dates are unreliable (our own duplicate check reads files), so use modified.
        const used = s.mtimeMs;
        const kind = VIDEO.has(ext) ? 'video' : IMAGE.has(ext) ? 'image' : INSTALLER.has(ext) ? 'installer' : ARCHIVE.has(ext) ? 'archive' : 'other';
        if (kind === 'other' && bytes < 200e6) return;
        if (kind === 'image' && bytes < 20e3) return;
        files.push({ path: fp, name: e.name, ext, kind, bytes, files: 1, modified: s.mtimeMs, used, inDownloads: fp.startsWith(path.join(HOME, 'Downloads')) });
      }));
    }
  }
  return { files, seen, projectJunk };
}

// Exact duplicates: same size first, then a hash of the start, end and full length.
async function quickHash(p, size) {
  const h = crypto.createHash('sha1');
  const fh = await fsp.open(p, 'r');
  try {
    const n = 256 * 1024;
    const buf = Buffer.alloc(Math.min(n, size));
    await fh.read(buf, 0, buf.length, 0); h.update(buf);
    if (size > n * 2) { await fh.read(buf, 0, buf.length, size - buf.length); h.update(buf); }
    h.update(String(size));
  } finally { await fh.close(); }
  return h.digest('hex');
}

async function fullHash(p) {
  return new Promise((res, rej) => {
    const h = crypto.createHash('sha1');
    fs.createReadStream(p).on('data', (d) => h.update(d)).on('end', () => res(h.digest('hex'))).on('error', rej);
  });
}

async function findDuplicates(files, { full }) {
  const bySize = new Map();
  for (const f of files) { const k = f.bytes; if (!bySize.has(k)) bySize.set(k, []); bySize.get(k).push(f); }
  const groups = [];
  for (const same of bySize.values()) {
    if (same.length < 2) continue;
    const byHash = new Map();
    for (const f of same) {
      try {
        const k = full && f.bytes < 60e6 ? await fullHash(f.path) : await quickHash(f.path, f.bytes);
        if (!byHash.has(k)) byHash.set(k, []); byHash.get(k).push(f);
      } catch {}
    }
    for (const g of byHash.values()) if (g.length > 1) groups.push(g);
  }
  // Keep the oldest copy (most likely the original), offer the rest.
  const extras = [];
  for (const g of groups) {
    g.sort((a, b) => a.modified - b.modified || a.path.length - b.path.length);
    const keep = g[0];
    for (const f of g.slice(1)) extras.push({ ...f, note: `Same as ${prettyPath(keep.path)}`, keep: keep.path });
  }
  return extras;
}

// A .exe inside an unzipped folder is usually the program itself, not its installer.
function isInstaller(f) {
  if (['.dmg', '.pkg', '.msi', '.iso'].includes(f.ext)) return true;
  if (/setup|install|installer|_x64|-x64|win64|-win/i.test(f.name)) return true;
  return path.dirname(f.path) === path.join(HOME, 'Downloads');
}

function prettyPath(p) { return p.startsWith(HOME) ? '~' + p.slice(HOME.length) : p; }

// ---------- the full scan ----------
// safety: 'safe' = rebuilt or re-downloaded automatically, pre-selected
//         'check' = probably junk, but only you know; never pre-selected
async function scan(onProgress = () => {}) {
  seenInodes.clear();
  const step = (label) => onProgress({ label });
  const cats = [];
  const add = (c) => {
    c.items.sort((a, b) => b.bytes - a.bytes);
    c.bytes = c.items.reduce((s, i) => s + i.bytes, 0);
    if (!c.items.length) return;
    cats.push(c);
    onProgress({ cat: c });
  };

  step('Checking Steam');
  const steam = await scanSteam();
  add({ id: 'steam-leftovers', group: 'gamers', safety: 'safe', title: 'Leftovers from uninstalled games',
    why: 'Folders Steam left behind after you uninstalled a game. Steam no longer lists them, so nothing uses them. Saves synced with Steam Cloud are not stored here.',
    items: steam.leftovers });
  add({ id: 'shader', group: 'gamers', safety: 'safe', title: 'Shader caches',
    why: 'Pre-built graphics data. Games and your GPU driver rebuild it the next time you play. The first few minutes may stutter a little.',
    items: [...steam.shader, ...await gpuShaderCaches()] });
  add({ id: 'steam-downloads', group: 'gamers', safety: 'safe', title: 'Unfinished downloads and updates',
    why: 'Half-downloaded game files. Steam downloads them again if you restart the download.',
    items: steam.downloads });
  step('Checking game launchers');
  add({ id: 'launcher', group: 'gamers', safety: 'safe', title: 'Launcher caches and logs',
    why: 'Store pages, images and log files saved by Steam and the Epic Games Launcher. They come back on their own.',
    items: await launcherCaches() });
  step('Checking Epic Games and Heroic');
  const epic = await scanEpic();
  const heroic = await scanHeroic();
  step('Checking CrossOver bottles');
  const bottles = await scanBottles();
  add({ id: 'bottles-empty', group: 'gamers', safety: 'safe', title: 'Empty CrossOver bottles',
    why: 'Windows setups in CrossOver with no game left inside, only Windows itself and runtimes like .NET. Usually the game was deleted but its bottle stayed.',
    items: bottles.filter((b) => b.empty) });
  add({ id: 'bottles', group: 'gamers', safety: 'check', title: 'CrossOver bottles',
    why: 'Each bottle is a small Windows install holding the games inside it. Removing a bottle removes those games and any saves stored in it.',
    items: bottles.filter((b) => !b.empty && b.bytes > 100e6) });
  add({ id: 'epic-leftovers', group: 'gamers', safety: 'check', title: 'Epic Games leftovers',
    why: 'Folders in your Epic Games folder that the launcher no longer lists. Check none of them is a game you moved on purpose.',
    items: epic.leftovers });
  add({ id: 'games-unplayed', group: 'gamers', safety: 'check', title: 'Games you have not played in 3 months',
    why: 'Installed games you have not opened lately. Uninstall them from their launcher so it can tidy up properly; you can reinstall any time and your cloud saves stay.',
    items: [...steam.installed.map((g) => ({ ...g, store: g.path.includes('/CrossOver/') ? 'crossover' : 'steam' })), ...epic.installed, ...heroic]
      .filter((g) => g.bytes > 50e6 && (!g.lastPlayed || now - g.lastPlayed > 90 * DAY)),
    action: 'uninstall-game' });

  step('Checking editing app caches');
  add({ id: 'creator-cache', group: 'creators', safety: 'safe', title: 'Video editing caches',
    why: 'Media cache, audio waveforms, render cache and proxies made by Premiere, After Effects, DaVinci Resolve, Final Cut and CapCut. The apps rebuild them when you open a project.',
    items: await creatorCaches() });

  step('Looking through your folders');
  const { files, seen, projectJunk } = await walkUserFiles((dir) => onProgress({ label: 'Looking through your folders', path: prettyPath(dir) }));

  add({ id: 'project-previews', group: 'creators', safety: 'safe', title: 'Render previews in project folders',
    why: 'Preview renders Premiere, Resolve and Final Cut save next to your projects. They are made again when you render the timeline.',
    items: projectJunk.filter((j) => j.kind === 'previews') });
  add({ id: 'project-autosave', group: 'creators', safety: 'check', title: 'Old auto-saves',
    why: 'Backup copies of your projects saved every few minutes. Keep the newest ones for projects you are still working on.',
    items: projectJunk.filter((j) => j.kind === 'autosave' && now - j.modified > 30 * DAY) });

  const videos = files.filter((f) => f.kind === 'video');
  const isRec = (f) => /^(Screen Recording|Screen Shot|Bildschirmaufnahme|Enregistrement|Grabación|Captura)|^\d{4}-\d{2}-\d{2}[ _]\d{2}-\d{2}-\d{2}/i.test(f.name);
  const recs = videos.filter((v) => isRec(v) && v.bytes > 20e6 && now - v.used > 30 * DAY);
  add({ id: 'recordings', group: 'everyone', safety: 'check', title: 'Old screen recordings',
    why: 'Screen recordings and OBS clips older than a month. Most were made to share once.',
    items: recs });
  const recSet = new Set(recs.map((r) => r.path));
  step('Comparing videos');
  const dupVideos = await findDuplicates(videos.filter((v) => v.bytes > 20e6), { full: false });
  add({ id: 'dup-footage', group: 'creators', safety: 'check', title: 'Duplicate footage',
    why: 'Videos that are exact copies of another video on this computer. The oldest copy is kept and the others are listed.',
    items: dupVideos });
  const dupSet = new Set(dupVideos.map((d) => d.path));
  add({ id: 'old-renders', group: 'creators', safety: 'check', title: 'Big videos untouched for 6 months',
    why: 'Large video files, often old exports and renders. Check you have a copy you want before you remove one.',
    items: videos.filter((v) => !dupSet.has(v.path) && !recSet.has(v.path) && v.bytes > 300e6 && now - v.used > 180 * DAY) });

  add({ id: 'installers', group: 'everyone', safety: 'safe', title: 'Old installers in Downloads',
    why: 'Setup files (.dmg, .pkg, .exe, .msi) you already used. You can download them again from the maker if you ever need them.',
    items: files.filter((f) => f.inDownloads && f.kind === 'installer' && now - f.modified > 7 * DAY && isInstaller(f)) });
  add({ id: 'archives', group: 'everyone', safety: 'check', title: 'Old zip files in Downloads',
    why: 'Zip, rar and 7z files older than a month. Usually you already unpacked them.',
    items: files.filter((f) => f.inDownloads && f.kind === 'archive' && f.bytes > 5e6 && now - f.modified > 30 * DAY) });

  step('Comparing photos');
  add({ id: 'dup-photos', group: 'everyone', safety: 'check', title: 'Duplicate photos',
    why: 'Exact copies of the same photo in different places. The oldest copy is kept.',
    items: await findDuplicates(files.filter((f) => f.kind === 'image'), { full: true }) });

  add({ id: 'huge', group: 'everyone', safety: 'check', title: 'Huge files you forgot about',
    why: 'Files over 1 GB that have not changed in 3 months.',
    items: files.filter((f) => f.bytes > 1e9 && f.kind !== 'video' && now - f.used > 90 * DAY && !(f.inDownloads && f.kind === 'installer')) });

  step('Checking app caches');
  const caches = await appCaches();
  const isDev = (i) => DEV_CACHE.test(i.name);
  add({ id: 'app-cache', group: 'everyone', safety: 'safe', title: 'App caches',
    why: 'Temporary files apps keep to load faster. Apps rebuild them as needed. Close an app before cleaning its cache.',
    items: caches.filter((i) => !isDev(i)) });
  add({ id: 'dev-cache', group: 'everyone', safety: 'check', title: 'Developer tool downloads',
    why: 'Browsers, SDKs and packages that coding tools downloaded. Safe to remove, but each tool downloads them again the next time it runs.',
    items: caches.filter(isDev) });
  add({ id: 'trash', group: 'everyone', safety: 'info', title: 'Already in the Trash',
    why: 'Files in the Trash still use space until you empty it.',
    items: await trashSize(), action: 'empty-trash' });

  const disk = await diskInfo();
  return { cats, disk, filesSeen: seen, platform: process.platform, home: HOME, at: Date.now() };
}

async function diskInfo() {
  try {
    const s = await fsp.statfs(HOME);
    return { total: s.blocks * s.bsize, free: s.bavail * s.bsize };
  } catch { return null; }
}

module.exports = { scan, prettyPath, diskInfo };

if (require.main === module) {
  const t = Date.now();
  scan((p) => process.stderr.write(`\r${p.label} ${p.path || ''}`.slice(0, 120).padEnd(120))).then((r) => {
    process.stderr.write('\n');
    for (const c of r.cats) {
      console.log(`${(c.bytes / 1e9).toFixed(2).padStart(7)} GB  [${c.group}/${c.safety}] ${c.title} (${c.items.length})`);
      for (const i of c.items.slice(0, 4)) console.log(`            ${(i.bytes / 1e6).toFixed(0).padStart(6)} MB  ${prettyPath(i.path)}`);
    }
    console.log(`files seen ${r.filesSeen}, ${((Date.now() - t) / 1000).toFixed(1)} s`);
  });
}
