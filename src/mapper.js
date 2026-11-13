// Space map: sizes every folder under a starting point so the window can draw a treemap.
// It only reads. It never follows symlinks or junctions, never crosses onto another drive,
// and counts hard-linked files once. Each folder keeps its biggest children; the rest are summed
// into one "smaller items" block, so even a whole drive stays small enough to send to the window.
const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const os = require('os');

const KEEP = 36;          // children kept per folder
const LEAF_BELOW = 2e6;   // folders smaller than this are drawn as one block (their insides dropped)

function limiter(n) {
  let active = 0;
  const queue = [];
  const next = () => {
    if (active >= n || !queue.length) return;
    active++;
    const { fn, resolve } = queue.shift();
    fn().then(resolve, () => resolve(null)).finally(() => { active--; next(); });
  };
  return (fn) => new Promise((resolve) => { queue.push({ fn, resolve }); next(); });
}

// Where "Whole drive" starts. On a Mac the data volume holds everything that isn't macOS itself.
function driveRoot() {
  if (process.platform === 'darwin') return fs.existsSync('/System/Volumes/Data') ? '/System/Volumes/Data' : '/';
  return path.parse(os.homedir()).root;
}

async function map(root, onProgress = () => {}, cancel = { cancelled: false }) {
  const lim = limiter(64);
  const seen = new Set();
  const rootSt = await fsp.lstat(root);
  let files = 0, bytes = 0, last = 0, current = root;
  const tick = () => { const t = Date.now(); if (t - last > 120) { last = t; onProgress({ files, bytes, path: current }); } };

  async function walk(dir, name, st) {
    if (cancel.cancelled) return null;
    current = dir;
    const ents = (await lim(() => fsp.readdir(dir, { withFileTypes: true }))) || [];
    const kids = await Promise.all(ents.map(async (e) => {
      if (e.isSymbolicLink()) return null;
      const fp = path.join(dir, e.name);
      const s = await lim(() => fsp.lstat(fp));
      if (!s || s.isSymbolicLink()) return null;
      if (s.isDirectory()) {
        if (s.dev !== rootSt.dev) return null; // another drive mounted inside this one
        return walk(fp, e.name, s);
      }
      if (s.nlink > 1) { const k = s.dev + ':' + s.ino; if (seen.has(k)) return null; seen.add(k); }
      const b = s.blocks ? s.blocks * 512 : s.size;
      files++; bytes += b; tick();
      return { name: e.name, path: fp, bytes: b, files: 1 };
    }));
    const list = kids.filter((k) => k && k.bytes > 0).sort((a, b) => b.bytes - a.bytes);
    const node = { name, path: dir, dir: true, bytes: list.reduce((s, k) => s + k.bytes, 0), files: list.reduce((s, k) => s + k.files, 0) };
    if (node.bytes < LEAF_BELOW) return node; // too small to open up; drawn as one block
    const keep = list.slice(0, KEEP), rest = list.slice(KEEP);
    if (rest.length) keep.push({ name: `${rest.length.toLocaleString('en-US')} smaller items`, other: true, bytes: rest.reduce((s, k) => s + k.bytes, 0), files: rest.reduce((s, k) => s + k.files, 0) });
    node.kids = keep;
    return node;
  }

  const tree = await walk(root, root === os.homedir() ? 'Your files' : root, rootSt);
  onProgress({ files, bytes, path: '' });
  return cancel.cancelled ? null : tree;
}

// Every path in a finished map (for "Show in Finder" checks).
function pathsOf(node, out = new Set()) {
  if (!node) return out;
  if (node.path) out.add(node.path);
  for (const k of node.kids || []) pathsOf(k, out);
  return out;
}

module.exports = { map, pathsOf, driveRoot };

if (require.main === module) {
  const t = Date.now();
  map(process.argv[2] || os.homedir(), (p) => process.stderr.write(`\r${p.files} files ${(p.bytes / 1e9).toFixed(1)} GB`.padEnd(40))).then((tree) => {
    process.stderr.write('\n');
    for (const k of (tree.kids || []).slice(0, 12)) console.log(`${(k.bytes / 1e9).toFixed(2).padStart(8)} GB  ${k.name}${k.dir ? '/' : ''}`);
    console.log(`total ${(tree.bytes / 1e9).toFixed(1)} GB, ${tree.files} files, ${pathsOf(tree).size} nodes, ${JSON.stringify(tree).length / 1e6 | 0} MB json, ${((Date.now() - t) / 1000).toFixed(1)} s`);
  });
}
