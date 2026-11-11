// Diskshaper duplicate photo finder. Runs entirely in the browser; nothing is uploaded.
(() => {
  const root = document.querySelector('[data-tool="dupes"]');
  if (!root) return;
  const $ = (s) => root.querySelector(s);
  const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
  const IMG = /\.(jpe?g|png|gif|webp|heic|heif|avif|bmp|tiff?|dng|cr2|cr3|nef|arw|raf|orf|rw2)$/i;
  const SHOWABLE = /\.(jpe?g|png|gif|webp|avif|bmp)$/i;
  const DUP_DIR = 'Duplicates (Diskshaper)';
  const fmt = (b) => (b <= 0 ? '0 KB' : b >= 1e9 ? (b / 1e9).toFixed(2) + ' GB' : b >= 1e6 ? (b / 1e6).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1e3)) + ' KB');

  let rootDir = null; // a directory handle when the browser lets us change files
  let groups = [];
  const ticked = new Set();
  const urls = [];

  // ---------- choosing a folder ----------
  const canWrite = 'showDirectoryPicker' in window;
  if (!canWrite) $('[data-hint]').textContent = 'Or drop a folder here. Your browser can find duplicates; Chrome or Edge can also move them for you.';
  $('[data-pick]').onclick = async () => {
    if (canWrite) {
      try { rootDir = await window.showDirectoryPicker({ id: 'diskshaper-dupes', mode: 'read' }); } catch { return; }
      run(() => walkHandle(rootDir, ''));
    } else $('[data-input]').click();
  };
  $('[data-input]').onchange = (e) => {
    rootDir = null;
    const list = [...e.target.files].filter((f) => IMG.test(f.name)).map((f) => ({ file: f, name: f.name, path: f.webkitRelativePath || f.name, size: f.size, time: f.lastModified }));
    run(async () => list);
  };
  const drop = $('[data-drop]');
  drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('over'); });
  drop.addEventListener('dragleave', () => drop.classList.remove('over'));
  drop.addEventListener('drop', async (e) => {
    e.preventDefault(); drop.classList.remove('over');
    const item = [...e.dataTransfer.items].find((i) => i.kind === 'file');
    if (!item) return;
    if (item.getAsFileSystemHandle) {
      const h = await item.getAsFileSystemHandle();
      if (h?.kind === 'directory') { rootDir = h; return run(() => walkHandle(h, '')); }
    }
    const entry = item.webkitGetAsEntry?.();
    if (entry?.isDirectory) { rootDir = null; run(() => walkEntry(entry, '')); }
  });

  async function walkHandle(dir, prefix, out = []) {
    for await (const [name, h] of dir.entries()) {
      if (name.startsWith('.') || name === DUP_DIR) continue;
      if (h.kind === 'directory') await walkHandle(h, prefix + name + '/', out);
      else if (IMG.test(name)) {
        const file = await h.getFile();
        out.push({ file, name, path: prefix + name, size: file.size, time: file.lastModified, handle: h, dir });
        if (out.length % 200 === 0) progress(0, `Found ${out.length.toLocaleString()} photos`);
      }
    }
    return out;
  }
  function walkEntry(entry, prefix, out = []) {
    return new Promise((resolve) => {
      const reader = entry.createReader();
      const batch = () => reader.readEntries(async (ents) => {
        if (!ents.length) return resolve(out);
        for (const e of ents) {
          if (e.name.startsWith('.')) continue;
          if (e.isDirectory) await walkEntry(e, prefix + e.name + '/', out);
          else if (IMG.test(e.name)) {
            const file = await new Promise((r) => e.file(r, () => r(null)));
            if (file) out.push({ file, name: e.name, path: prefix + e.name, size: file.size, time: file.lastModified });
          }
        }
        batch();
      }, () => resolve(out));
      batch();
    });
  }

  // ---------- finding duplicates ----------
  function progress(frac, text) {
    $('[data-pbar]').style.width = Math.round(frac * 100) + '%';
    $('[data-ptext]').textContent = text;
  }
  async function sha(file) {
    const buf = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  // 64-bit difference hash from a 9x8 greyscale thumbnail.
  const cv = document.createElement('canvas'); cv.width = 9; cv.height = 8;
  const cx = cv.getContext('2d', { willReadFrequently: true });
  cx.imageSmoothingEnabled = true; cx.imageSmoothingQuality = 'high';
  async function dhash(file) {
    // Step down to 64px with good filtering first; going straight to 9x8 aliases badly.
    const bmp = await createImageBitmap(file, { resizeWidth: 64, resizeHeight: 64, resizeQuality: 'high' });
    cx.drawImage(bmp, 0, 0, 9, 8); bmp.close?.();
    const d = cx.getImageData(0, 0, 9, 8).data;
    const g = (x, y) => { const i = (y * 9 + x) * 4; return d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114; };
    let hi = 0, lo = 0;
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
      const bit = g(x, y) > g(x + 1, y) ? 1 : 0, n = y * 8 + x;
      if (n < 32) hi = (hi << 1) | bit; else lo = (lo << 1) | bit;
    }
    return [hi >>> 0, lo >>> 0];
  }
  const pop = (v) => { v -= (v >>> 1) & 0x55555555; v = (v & 0x33333333) + ((v >>> 2) & 0x33333333); return (((v + (v >>> 4)) & 0xf0f0f0f) * 0x1010101) >>> 24; };
  const dist = (a, b) => pop(a[0] ^ b[0]) + pop(a[1] ^ b[1]);

  async function pool(items, n, fn) {
    let i = 0;
    await Promise.all(Array.from({ length: n }, async () => { while (i < items.length) { const k = i++; await fn(items[k], k); } }));
  }

  async function run(collect) {
    cleanup();
    $('[data-drop]').hidden = true; $('[data-results]').hidden = true; $('[data-progress]').hidden = false;
    progress(0, 'Reading folder');
    const files = await collect();
    if (!files.length) return showEmpty('No photos in that folder.');

    // exact duplicates: same size, then same fingerprint
    const bySize = new Map();
    for (const f of files) (bySize.get(f.size) || bySize.set(f.size, []).get(f.size)).push(f);
    const candidates = [...bySize.values()].filter((g) => g.length > 1).flat();
    let done = 0;
    await pool(candidates, 4, async (f) => {
      try { f.sha = await sha(f.file); } catch {}
      progress(++done / Math.max(1, candidates.length) * 0.4, `Comparing ${done.toLocaleString()} of ${candidates.length.toLocaleString()} same-size photos`);
    });
    const byHash = new Map();
    for (const f of candidates) if (f.sha) (byHash.get(f.sha) || byHash.set(f.sha, []).get(f.sha)).push(f);
    const exact = [...byHash.values()].filter((g) => g.length > 1);

    // Every photo belongs to exactly one unit: a set of exact copies, or itself.
    const units = [], unitOf = new Map();
    for (const g of exact) { const u = { files: g }; units.push(u); g.forEach((f) => unitOf.set(f, u)); }
    for (const f of files) if (!unitOf.has(f)) { const u = { files: [f] }; units.push(u); unitOf.set(f, u); }

    // look-alikes: compare one picture fingerprint per unit
    const RAW = /\.(dng|cr2|cr3|nef|arw|raf|orf|rw2)$/i;
    const reps = units.filter((u) => u.files[0].size < 60e6 && !RAW.test(u.files[0].name));
    done = 0;
    await pool(reps, 4, async (u) => {
      try { u.dh = await dhash(u.files[0].file); } catch {}
      progress(0.4 + ++done / Math.max(1, reps.length) * 0.55, `Looking at ${done.toLocaleString()} of ${reps.length.toLocaleString()} photos`);
    });
    const hashed = reps.filter((u) => u.dh);
    const parent = hashed.map((_, i) => i);
    const find = (i) => (parent[i] === i ? i : (parent[i] = find(parent[i])));
    for (let i = 0; i < hashed.length; i++) for (let j = i + 1; j < hashed.length; j++) {
      if (dist(hashed[i].dh, hashed[j].dh) <= 5) parent[find(i)] = find(j);
    }
    const merged = new Map();
    hashed.forEach((u, i) => { const r = find(i); (merged.get(r) || merged.set(r, []).get(r)).push(u); });
    const inMerged = new Set(hashed);
    const clusters = [...merged.values(), ...units.filter((u) => !inMerged.has(u)).map((u) => [u])];

    // One group per cluster, with exactly one photo kept.
    groups = clusters.map((us) => {
      const all = us.flatMap((u) => u.files);
      if (all.length < 2) return null;
      const kind = us.length === 1 ? 'exact' : us.some((u) => u.files.length > 1) ? 'mixed' : 'alike';
      // exact copies: keep the oldest; otherwise keep the biggest (most detail), then the oldest
      all.sort(kind === 'exact' ? (a, b) => a.time - b.time || a.path.length - b.path.length : (a, b) => b.size - a.size || a.time - b.time);
      return { kind, files: all };
    }).filter(Boolean).sort((a, b) => ['exact', 'mixed', 'alike'].indexOf(a.kind) - ['exact', 'mixed', 'alike'].indexOf(b.kind));
    ticked.clear();
    for (const g of groups) g.files.slice(1).forEach((f) => ticked.add(f));
    // Never tick the kept photo of any group.
    for (const g of groups) ticked.delete(g.files[0]);
    progress(1, 'Done');
    render(files.length);
  }

  // ---------- results ----------
  function showEmpty(msg) {
    $('[data-progress]').hidden = true;
    const r = $('[data-results]'); r.hidden = false; r.replaceChildren();
    const box = el('div', 'f-empty'); box.append(el('p', '', msg));
    const again = el('button', 'btn btn-ghost', 'Choose another folder'); again.onclick = restart; box.append(again);
    r.append(box);
  }
  function render(total, message) {
    $('[data-progress]').hidden = true;
    const r = $('[data-results]'); r.hidden = false; r.replaceChildren();
    if (!groups.length) return showEmpty(`Checked ${total.toLocaleString()} photos. No duplicates found.`);

    const head = el('div', 'f-head');
    const sum = el('div', 'sum');
    const sel = [...ticked].filter((f) => !f.moved);
    const b = el('b', '', sel.length.toLocaleString()); sum.append(b, document.createTextNode(` copies ticked · ${fmt(sel.reduce((s, f) => s + f.size, 0))} · from ${total.toLocaleString()} photos`));
    head.append(sum, el('span', 'sp'));
    if (rootDir && groups.every((g) => g.files.every((f) => f.handle))) {
      const mv = el('button', 'btn btn-primary btn-sm', `Move to "${DUP_DIR}"`); mv.disabled = !sel.length; mv.onclick = moveTicked; head.append(mv);
    }
    const csv = el('button', 'btn btn-ghost btn-sm', 'Download list'); csv.onclick = downloadList; head.append(csv);
    const again = el('button', 'btn btn-ghost btn-sm', 'Start over'); again.onclick = restart; head.append(again);
    r.append(head);
    if (message) r.append(el('div', 'f-msg', message));

    for (const g of groups) {
      const sec = el('div', 'f-group');
      const h = el('h3'); h.append(el('span', 'f-pill' + (g.kind !== 'exact' ? ' like' : ''), { exact: 'Exact copies', mixed: 'Copies and look-alikes', alike: 'Look-alikes' }[g.kind]), document.createTextNode(`${g.files.length} files`));
      const grid = el('div', 'f-items');
      g.files.forEach((f, i) => {
        const card = el('label', 'f-item' + (i === 0 ? ' keep' : '') + (f.moved ? ' off' : ''));
        const th = el('div', 'th');
        if (SHOWABLE.test(f.name) || (/\.(heic|heif|avif|tiff?)$/i.test(f.name))) {
          const img = el('img'); img.loading = 'lazy'; img.alt = ''; const u = URL.createObjectURL(f.file); urls.push(u); img.src = u;
          img.style.cssText = 'width:100%;height:100%;object-fit:cover'; img.onerror = () => { img.remove(); th.textContent = f.name.split('.').pop().toUpperCase(); };
          th.append(img);
        } else th.textContent = f.name.split('.').pop().toUpperCase();
        const meta = el('div', 'meta'); meta.append(el('b', '', f.name), el('span', '', `${fmt(f.size)} · ${f.path.includes('/') ? f.path.slice(0, f.path.lastIndexOf('/')) : 'top folder'}`));
        card.title = f.path;
        card.append(th, meta, el('span', 'badge', i === 0 ? 'Keep' : f.moved ? 'Moved' : f.sha && f.sha === g.files[0].sha ? 'Copy' : 'Look-alike'));
        if (i > 0 && !f.moved) {
          const cb = el('input'); cb.type = 'checkbox'; cb.checked = ticked.has(f);
          card.classList.toggle('off', !cb.checked);
          cb.onchange = () => { cb.checked ? ticked.add(f) : ticked.delete(f); render(total); };
          card.append(cb);
        }
        grid.append(card);
      });
      sec.append(h, grid); r.append(sec);
    }
    r._total = total;
  }

  async function moveTicked() {
    const list = [...ticked].filter((f) => !f.moved);
    if (!list.length) return;
    if ((await rootDir.requestPermission({ mode: 'readwrite' })) !== 'granted') return;
    const dest = await rootDir.getDirectoryHandle(DUP_DIR, { create: true });
    let moved = 0, failed = 0;
    for (const f of list) {
      try {
        // Name it after where it came from, so two "IMG_1.jpg" from different folders don't collide.
        const name = f.path.replace(/\//g, ' – ');
        if (typeof f.handle.move === 'function') {
          await f.handle.move(dest, name);
        } else {
          const out = await dest.getFileHandle(name, { create: true });
          const w = await out.createWritable(); await w.write(f.file); await w.close();
          if ((await out.getFile()).size !== f.size) throw new Error('copy incomplete');
          await f.dir.removeEntry(f.name);
        }
        f.moved = true; ticked.delete(f); moved++;
      } catch { failed++; }
    }
    render($('[data-results]')._total, `Moved ${moved} ${moved === 1 ? 'copy' : 'copies'} into "${DUP_DIR}" inside the folder you chose. Look through it, then delete it when you are sure.${failed ? ` ${failed} could not be moved.` : ''}`);
  }

  function downloadList() {
    const rows = [['group', 'kind', 'keep', 'path', 'size_bytes']];
    groups.forEach((g, gi) => g.files.forEach((f, i) => rows.push([gi + 1, g.kind, i === 0 ? 'keep' : ticked.has(f) ? 'remove' : 'keep', f.path, f.size])));
    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const a = el('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = 'duplicate-photos.csv'; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  // Test hook: run on a directory handle (used by test/finder-move.mjs with the browser's private storage).
  window.__dsFinder = { runHandle: (h) => { rootDir = h; return run(() => walkHandle(h, '')); } };
  function cleanup() { urls.splice(0).forEach((u) => URL.revokeObjectURL(u)); }
  function restart() {
    cleanup(); groups = []; ticked.clear(); rootDir = null;
    $('[data-results]').hidden = true; $('[data-progress]').hidden = true; $('[data-drop]').hidden = false;
    $('[data-input]').value = '';
  }
})();
