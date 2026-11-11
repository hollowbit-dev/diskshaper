const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
const isMac = ds.platform === 'darwin';
if (!isMac) document.body.classList.add('win');
const TRASH = isMac ? 'Trash' : 'Recycle Bin';
const GROUPS = { everyone: 'Everyone', gamers: 'Gaming', creators: 'Video editing' };
const SAFETY = { safe: 'Safe', check: 'Check first', info: 'Info' };
const SHOW = 400;
// What picture each category shows for its items.
const VISUAL = {
  'games-unplayed': 'art', 'app-cache': 'app', 'dev-cache': 'app',
  'dup-photos': 'thumb', 'dup-footage': 'thumb', 'old-renders': 'thumb', recordings: 'thumb',
  installers: 'icon', archives: 'icon', huge: 'thumb',
};

const state = { screen: 'home', group: 'all', detail: null, result: null, disk: null };
const selected = new Set();
const gone = new Set();
const live = [];

// ---------- formatting ----------
function split(b) {
  if (b >= 1e12) return [(b / 1e12).toFixed(2), 'TB'];
  if (b >= 1e9) return [(b / 1e9).toFixed(b >= 1e11 ? 0 : b >= 1e10 ? 1 : 2), 'GB'];
  if (b >= 1e6) return [String(Math.round(b / 1e6)), 'MB'];
  if (b >= 1e3) return [String(Math.round(b / 1e3)), 'KB'];
  return [String(b), 'B'];
}
const fmt = (b) => split(b).join(' ');
function ago(ms) {
  if (!ms) return '';
  const d = (Date.now() - ms) / 864e5;
  if (d < 1) return 'today';
  if (d < 2) return 'yesterday';
  if (d < 31) return Math.floor(d) + ' days ago';
  if (d < 365) { const m = Math.max(1, Math.round(d / 30.4)); return m + (m === 1 ? ' month ago' : ' months ago'); }
  const y = Math.floor(d / 365); return y + (y === 1 ? ' year ago' : ' years ago');
}
const pretty = (p) => state.result && p.startsWith(state.result.home) ? '~' + p.slice(state.result.home.length) : p;
const sum = (items) => items.reduce((s, i) => s + i.bytes, 0);
const liveItems = (c) => c.items.filter((i) => !gone.has(i.path));
const cleanable = (c) => !c.action;
const cats = () => (state.result ? state.result.cats : live);
$('.trashword').textContent = TRASH;
$('#openTrash').textContent = `Open ${TRASH}`;
$('#scanBtn').textContent = isMac ? 'Scan this Mac' : 'Scan this PC';

// Number that counts toward its target instead of jumping.
const tweens = new WeakMap();
function countTo(numEl, unitEl, bytes, dur = 700) {
  const prev = tweens.get(numEl) || { v: 0 };
  cancelAnimationFrame(prev.raf);
  const from = prev.v, t0 = performance.now();
  const step = (t) => {
    const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 4);
    const v = from + (bytes - from) * e;
    const [n, u] = split(v);
    numEl.textContent = n; if (unitEl) unitEl.textContent = u;
    const rec = { v, raf: k < 1 ? requestAnimationFrame(step) : 0 };
    tweens.set(numEl, rec);
  };
  step(t0);
}

// ---------- colour per category ----------
function colourFor(c) {
  const sameGroup = cats().filter((x) => x.group === c.group);
  const i = Math.max(0, sameGroup.indexOf(c));
  // Same family, different shade: alternate lightness and nudge the hue.
  const steps = [[0, 0], [-0.09, 4], [0.07, -4], [-0.15, 6], [0.03, -6], [-0.2, 2]][i % 6];
  return `oklch(from var(--${c.group}) calc(l + ${steps[0]}) c calc(h + ${steps[1]}))`;
}

// ---------- meter ----------
function drawMeter() {
  const d = state.disk;
  if (!d) return;
  const used = d.total - d.free;
  const all = cats().filter((c) => liveItems(c).length);
  const found = sum(all.flatMap(liveItems));
  const segs = $('#barSegs');
  $('#barUsed').style.flexBasis = Math.max(0, (used - found) / d.total * 100) + '%';
  segs.style.flexBasis = (found / d.total * 100) + '%';

  // keep existing segments so they animate instead of popping
  const have = new Map($$('.seg-b', segs).map((s) => [s.dataset.id, s]));
  const order = [...all].sort((a, b) => Object.keys(GROUPS).indexOf(a.group) - Object.keys(GROUPS).indexOf(b.group) || sum(liveItems(b)) - sum(liveItems(a)));
  for (const c of order) {
    let s = have.get(c.id);
    if (!s) { s = el('div', 'seg-b'); s.dataset.id = c.id; s.onclick = () => openDetail(c.id); }
    s.style.background = colourFor(c);
    s.style.flex = `${sum(liveItems(c))} 1 0`;
    const sel = liveItems(c).some((i) => selected.has(i.path));
    s.style.opacity = state.screen === 'results' && cleanable(c) && !sel ? .38 : 1;
    segs.append(s);
    have.delete(c.id);
  }
  have.forEach((s) => { s.style.flex = '0 1 0'; s.style.opacity = 0; setTimeout(() => s.remove(), 900); });

  const side = $('#meterSide');
  const lg = $('#legend');
  if (state.screen === 'home') {
    $('#meterK').textContent = 'Free space';
    countTo($('#bigNum'), $('#bigUnit'), d.free, 900);
    side.innerHTML = '';
    lg.innerHTML = `<span class="used"><i></i>Used <b>${fmt(used)}</b></span><span class="free"><i></i>Free <b>${fmt(d.free)}</b></span><span>of ${fmt(d.total)}</span>`;
  } else {
    $('#meterK').textContent = state.screen === 'scanning' ? 'Found so far' : 'Found';
    countTo($('#bigNum'), $('#bigUnit'), found);
    const safe = sum(cats().filter((c) => c.safety === 'safe').flatMap(liveItems));
    side.innerHTML = '';
    for (const [k, v, cls] of [['Safe to clean', fmt(safe), 'safe'], ['Free now', fmt(d.free), '']]) {
      const w = el('div'); w.append(el('div', 'k', k), el('div', 'v ' + cls, v)); side.append(w);
    }
    lg.innerHTML = '';
    for (const g of Object.keys(GROUPS)) {
      const b = sum(cats().filter((c) => c.group === g).flatMap(liveItems));
      if (!b) continue;
      const s = el('span'); const i = el('i'); i.style.background = `var(--${g})`;
      s.append(i, document.createTextNode(GROUPS[g] + ' '), el('b', '', fmt(b)));
      lg.append(s);
    }
    // the bar now shows only what was found; the disk total lives in 'Free now'
  }
}

// hover tooltip on bar segments
const tip = $('#tip');
$('#barSegs').addEventListener('mousemove', (e) => {
  const s = e.target.closest('.seg-b');
  if (!s) return (tip.hidden = true);
  const c = cats().find((x) => x.id === s.dataset.id);
  if (!c) return;
  tip.textContent = c.title; tip.append(el('b', '', fmt(sum(liveItems(c)))));
  const r = s.getBoundingClientRect();
  tip.style.left = Math.min(Math.max(e.clientX, 120), innerWidth - 120) + 'px'; tip.style.top = r.top + 'px'; tip.hidden = false;
});
$('#barSegs').addEventListener('mouseleave', () => (tip.hidden = true));

// ---------- screens ----------
function show(screen, fn) {
  const go = () => {
    state.screen = screen;
    document.body.className = (isMac ? '' : 'win ') + 'is-' + screen;
    $('#home').hidden = screen !== 'home';
    $('#live').hidden = screen !== 'scanning';
    $('#seg').hidden = $('#rescan').hidden = screen !== 'results';
    $('#dock').hidden = screen !== 'results';
    fn?.();
    drawMeter();
  };
  if (document.startViewTransition && !matchMedia('(prefers-reduced-motion: reduce)').matches) document.startViewTransition(go);
  else go();
}

async function init() {
  state.disk = await ds.disk();
  drawMeter();
}
init();

// ---------- scan ----------
ds.onScan((p) => {
  if (p.cat) {
    live.push(p.cat);
    const row = el('div', 'live-row');
    const ic = el('div', 'ic'); ic.innerHTML = icon(p.cat.id, 16); ic.style.setProperty('--c', `var(--${p.cat.group})`);
    const t = el('div'); t.append(el('span', '', p.cat.title));
    const s = el('div', 's num');
    row.append(ic, t, s);
    $('#liveList').prepend(row);
    countTo(s, null, p.cat.bytes, 600);
    const tw = () => { const [n, u] = split(p.cat.bytes); s.textContent = n + ' ' + u; };
    setTimeout(tw, 650);
    drawMeter();
  }
  if (p.label) $('#liveLabel').textContent = p.label;
  $('#livePath').textContent = p.path || '';
});

async function runScan() {
  live.length = 0; state.result = null; selected.clear(); gone.clear();
  $('#liveList').replaceChildren(); $('#livePath').textContent = '';
  $('#detail').hidden = true; $('#overview').hidden = true;
  show('scanning');
  const t = performance.now();
  const res = await ds.scan();
  // let the last row land before switching
  await new Promise((r) => setTimeout(r, Math.max(0, 1200 - (performance.now() - t))));
  res.secs = (performance.now() - t) / 1000;
  state.result = res;
  state.disk = res.disk || state.disk;
  for (const c of res.cats) if (c.safety === 'safe') c.items.forEach((i) => selected.add(i.path));
  state.group = 'all'; state.detail = null;
  show('results', renderResults);
}
$('#scanBtn').onclick = runScan;
$('#rescan').onclick = runScan;

// ---------- results ----------
function renderResults() {
  $('#overview').hidden = !!state.detail;
  $('#detail').hidden = !state.detail;
  if (state.detail) renderDetail(); else renderOverview();
  moveSegPill();
  updateDock();
}

function renderOverview() {
  const box = $('#groups');
  box.replaceChildren();
  let n = 0;
  const groups = state.group === 'all' ? Object.keys(GROUPS) : [state.group];
  for (const g of groups) {
    const list = state.result.cats.filter((c) => c.group === g && liveItems(c).length).sort((a, b) => sum(liveItems(b)) - sum(liveItems(a)));
    const sec = el('section', 'group');
    const h = el('div', 'group-h');
    const h2 = el('h2'); const dot = el('b', 'dot ' + g); h2.append(dot, document.createTextNode(GROUPS[g]));
    h.append(h2, el('span', 'gsize', list.length ? fmt(sum(list.flatMap(liveItems))) : ''));
    sec.append(h);
    if (!list.length) {
      sec.append(el('div', 'empty', g === 'gamers' ? 'No games or game leftovers found.' : g === 'creators' ? 'No editing caches or big videos found.' : 'Nothing found here.'));
      if (state.group === 'all') continue;
    }
    const tiles = el('div', 'tiles');
    for (const c of list) { const t = tileEl(c); t.style.animationDelay = (n++ * 35) + 'ms'; tiles.append(t); }
    sec.append(tiles);
    box.append(sec);
  }
}

function tileEl(c) {
  const items = liveItems(c);
  const t = el('div', 'tile'); t.tabIndex = 0;
  t.style.setProperty('--c', `var(--${c.group})`);
  t.onclick = () => openDetail(c.id);
  t.onkeydown = (e) => { if (e.key === 'Enter') openDetail(c.id); };
  t.onmousemove = (e) => { const r = t.getBoundingClientRect(); t.style.setProperty('--mx', e.clientX - r.left + 'px'); t.style.setProperty('--my', e.clientY - r.top + 'px'); };

  const top = el('div', 'tile-top');
  const ic = el('div', 'ic'); ic.innerHTML = icon(c.id, 18);
  const tt = el('div', 'tile-t');
  tt.append(el('h3', '', c.title));
  const meta = el('div', 'tile-meta');
  meta.append(el('span', 'pill ' + c.safety, SAFETY[c.safety]), el('span', '', items.length === 1 ? '1 item' : items.length.toLocaleString() + ' items'));
  tt.append(meta);
  top.append(ic, tt);

  const bottom = el('div', 'tile-bottom');
  const [n, u] = split(sum(items));
  const size = el('div', 'tile-size', n); size.append(el('small', '', u));
  const peek = el('div', 'peek');
  const kind = VISUAL[c.id];
  if (kind) {
    const shown = items.slice(0, kind === 'art' ? 3 : 5);
    for (const i of shown) {
      const img = el('img', kind === 'art' && i.art ? 'wide' : ''); img.alt = '';
      loadPicture(img, i, kind);
      peek.append(img);
    }
    if (items.length > shown.length) peek.append(el('span', 'more', '+' + (items.length - shown.length)));
  }
  bottom.append(size, peek);
  t.append(top, bottom);

  if (cleanable(c)) {
    const cb = el('input', 'cb'); cb.type = 'checkbox';
    const k = items.filter((i) => selected.has(i.path)).length;
    cb.checked = k === items.length; cb.indeterminate = k > 0 && k < items.length;
    cb.title = 'Select all';
    cb.onclick = (e) => { e.stopPropagation(); items.forEach((i) => (cb.checked ? selected.add(i.path) : selected.delete(i.path))); cb.indeterminate = false; drawMeter(); updateDock(); };
    t.append(cb);
  }
  return t;
}

// pictures load as they scroll into view
const io = new IntersectionObserver((ents) => {
  for (const e of ents) {
    if (!e.isIntersecting) continue;
    io.unobserve(e.target);
    const { p, kind } = e.target._pic;
    ds.picture(p, kind).then((url) => { if (url) e.target.src = url; else e.target.style.visibility = 'hidden'; });
  }
}, { rootMargin: '200px' });
function loadPicture(img, i, kind) {
  const p = kind === 'art' ? (i.art || i.path) : (i.thumb || i.path);
  const k = kind === 'art' ? (i.art ? 'art' : 'icon') : kind;
  img._pic = { p, kind: k };
  io.observe(img);
}

// ---------- detail ----------
function openDetail(id) {
  state.detail = id;
  show('results', () => { renderResults(); $('.stage').scrollTop = 0; });
}
function closeDetail() {
  state.detail = null;
  show('results', renderResults);
}

function renderDetail() {
  const c = state.result.cats.find((x) => x.id === state.detail);
  const box = $('#detail');
  box.replaceChildren();
  if (!c) return closeDetail();
  const items = liveItems(c);
  box.style.setProperty('--c', `var(--${c.group})`);

  const back = el('button', 'd-back'); back.innerHTML = UI_ICONS.back; back.append(document.createTextNode(GROUPS[c.group]));
  back.onclick = closeDetail;
  const head = el('div', 'd-head');
  const ic = el('div', 'ic'); ic.innerHTML = icon(c.id, 22); ic.style.setProperty('--c', `var(--${c.group})`);
  const txt = el('div');
  const h2 = el('h2', '', c.title); h2.append(el('span', 'pill ' + c.safety, SAFETY[c.safety]));
  txt.append(h2, el('p', '', c.why));
  const sz = el('div', 'd-size');
  const big = el('div', 'big'); const [n, u] = split(sum(items)); big.textContent = n; big.append(el('small', '', u));
  sz.append(el('div', 'k', items.length.toLocaleString() + (items.length === 1 ? ' item' : ' items')), big);
  head.append(ic, txt, sz);

  const tools = el('div', 'd-tools');
  if (cleanable(c)) {
    const lab = el('label'); const all = el('input', 'cb'); all.type = 'checkbox';
    const k = items.filter((i) => selected.has(i.path)).length;
    all.checked = k === items.length; all.indeterminate = k > 0 && k < items.length;
    all.onchange = () => { items.forEach((i) => (all.checked ? selected.add(i.path) : selected.delete(i.path))); renderDetail(); drawMeter(); updateDock(); };
    lab.append(all, document.createTextNode('Select all'));
    tools.append(lab);
  } else {
    tools.append(el('span', '', c.action === 'uninstall-game' ? 'Uninstall from the launcher so it removes the game properly.' : ''));
  }
  tools.append(el('span', 'sp'), el('span', '', 'Largest first'));

  const rows = el('div', 'rows');
  const kind = VISUAL[c.id] || 'icon';
  for (const i of items.slice(0, SHOW)) rows.append(rowEl(c, i, kind));
  if (items.length > SHOW) rows.append(el('div', 'more-row', `and ${(items.length - SHOW).toLocaleString()} more (${fmt(sum(items.slice(SHOW)))}). Select all includes them.`));
  box.append(back, head, tools, rows);
}

function rowEl(c, i, kind) {
  const row = el('div', 'row'); row.dataset.path = i.path;
  if (cleanable(c)) {
    const cb = el('input', 'cb'); cb.type = 'checkbox'; cb.checked = selected.has(i.path);
    row.classList.toggle('off', !cb.checked);
    cb.onchange = () => { cb.checked ? selected.add(i.path) : selected.delete(i.path); row.classList.toggle('off', !cb.checked); syncSelectAll(c); drawMeter(); updateDock(); };
    row.append(cb);
  } else row.append(el('span'));

  const img = el('img', 'vis' + (kind === 'art' && i.art ? ' art' : '')); img.alt = '';
  loadPicture(img, i, kind);
  const mid = el('div'); mid.style.minWidth = 0;
  mid.append(el('div', 'r-n', i.name));
  mid.append(el('div', 'r-p mono', i.note || pretty(path_dir(i.path))));

  let when;
  if (c.action === 'uninstall-game') {
    when = el('button', 'link-btn', i.store === 'epic' ? 'Open Epic Games' : 'Uninstall in Steam');
    when.insertAdjacentHTML('beforeend', UI_ICONS.ext);
    when.onclick = () => (i.store === 'epic' ? ds.epicOpen() : ds.steamUninstall(i.appid));
    const w = el('div', 'r-when'); w.append(el('div', '', i.lastPlayed ? 'Played ' + ago(i.lastPlayed) : 'Never played'), when);
    when = w;
  } else when = el('div', 'r-when', i.used || i.modified ? 'Changed ' + ago(i.used || i.modified) : '');

  const s = el('div', 'r-s', fmt(i.bytes));
  const act = el('div', 'r-act');
  const r = el('button', 'icon-btn'); r.innerHTML = UI_ICONS.reveal; r.title = isMac ? 'Show in Finder' : 'Show in File Explorer';
  r.onclick = () => ds.reveal(i.path);
  act.append(r);
  row.append(img, mid, when, s, act);
  return row;
}
function path_dir(p) { const k = Math.max(p.lastIndexOf('/'), p.lastIndexOf('\\')); return k > 0 ? p.slice(0, k) : p; }
function syncSelectAll(c) {
  const all = $('#detail .d-tools .cb'); if (!all) return;
  const items = liveItems(c); const k = items.filter((i) => selected.has(i.path)).length;
  all.checked = k === items.length; all.indeterminate = k > 0 && k < items.length;
}

// ---------- tabs ----------
function moveSegPill() {
  const on = $(`#seg button[data-g="${state.group}"]`);
  $$('#seg button').forEach((b) => b.classList.toggle('on', b === on));
  const pill = $('#segPill');
  pill.style.width = on.offsetWidth + 'px';
  pill.style.transform = `translateX(${on.offsetLeft}px)`;
}
$$('#seg button').forEach((b) => (b.onclick = () => {
  state.group = b.dataset.g; state.detail = null;
  moveSegPill();
  show('results', renderResults);
}));

// ---------- dock + clean ----------
function selection() {
  const byPath = new Map(state.result.cats.filter(cleanable).flatMap((c) => c.items).map((i) => [i.path, i]));
  return [...selected].filter((p) => byPath.has(p) && !gone.has(p)).map((p) => byPath.get(p));
}
function updateDock() {
  if (!state.result) return;
  const sel = selection();
  const [n, u] = split(sum(sel));
  $('#selSize').textContent = `${n} ${u}`;
  $('#selCount').textContent = sel.length ? `selected · ${sel.length.toLocaleString()} item${sel.length === 1 ? '' : 's'}` : 'selected';
  $('#cleanBtn').disabled = !sel.length;
  $('#cleanBtn').textContent = `Move to ${TRASH}`;
}
$('#selSafe').onclick = () => {
  selected.clear();
  for (const c of state.result.cats) if (c.safety === 'safe') liveItems(c).forEach((i) => selected.add(i.path));
  renderResults(); drawMeter();
};

ds.onClean((p) => {
  $('#cleanBtn').textContent = `Moving ${p.done} of ${p.total}`;
  const row = $$('#detail .row').find((r) => r.dataset.path === p.path);
  if (row) row.classList.add('leaving');
});

$('#cleanBtn').onclick = async () => {
  const sel = selection();
  if (!sel.length) return;
  $('#cleanBtn').disabled = true; $('#selSafe').disabled = true;
  const res = await ds.clean(sel.map((i) => i.path));
  const doneSet = new Set(res.done);
  const freed = sum(sel.filter((i) => doneSet.has(i.path)));
  res.done.forEach((p) => { gone.add(p); selected.delete(p); });
  state.disk = res.disk || state.disk;
  await new Promise((r) => setTimeout(r, 350));
  if (state.detail && !liveItems(state.result.cats.find((c) => c.id === state.detail)).length) state.detail = null;
  renderResults(); drawMeter();
  $('#selSafe').disabled = false;

  const [n, u] = split(freed);
  $('#doneUnit').textContent = u;
  tweens.delete($("#doneNum"));
  countTo($("#doneNum"), $("#doneUnit"), freed, 1100);
  $('#doneTxt').textContent = res.failed.length
    ? `moved to the ${TRASH}. ${res.failed.length} item${res.failed.length === 1 ? '' : 's'} couldn't be moved because an app is using it. Close the app and try again.`
    : `moved to the ${TRASH}. Empty it to get the space back. Until then you can put anything back.`;
  $('#doneBg').hidden = false;
};
$('#doneOk').onclick = () => ($('#doneBg').hidden = true);
$('#doneBg').onclick = (e) => { if (e.target.id === 'doneBg') $('#doneBg').hidden = true; };
$('#openTrash').onclick = () => { ds.openTrash(); $('#doneBg').hidden = true; };
addEventListener('keydown', (e) => {
  if (e.key === 'Escape') { if (!$('#doneBg').hidden) $('#doneBg').hidden = true; else if (state.detail) closeDetail(); }
});
addEventListener('resize', () => state.screen === 'results' && moveSegPill());

// ---------- updates ----------
(async () => {
  const st = await ds.settings();
  const box = $('#autoUpd');
  box.checked = st.autoUpdate !== false;
  box.onchange = async () => { await ds.setSettings({ autoUpdate: box.checked }); if (box.checked) ds.checkUpdates(); };
  ds.onUpdate((u) => {
    $('#updNote')?.remove();
    const n = el('div', 'update-note'); n.id = 'updNote'; n.setAttribute('role', 'status');
    const t = el('div'); t.append(el('b', '', `Diskshaper ${u.version} is out`), el('span', '', `You have ${st.version}.`));
    const go = el('button', 'primary sm', 'Download'); go.id = 'upd-go'; go.onclick = () => { ds.openUpdate(u.url); n.remove(); };
    const later = el('button', 'ghost sm', 'Later'); later.id = 'upd-later'; later.onclick = () => { ds.setSettings({ autoUpdate: box.checked, skipVersion: u.version }); n.remove(); };
    const row = el('div', 'row'); row.append(go, later);
    n.append(t, row); document.body.append(n);
  });
})();
