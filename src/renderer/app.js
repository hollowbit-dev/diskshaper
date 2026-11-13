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

const state = { screen: 'home', group: 'all', detail: null, result: null, disk: null, freed: null };
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
    $('#mapTop').hidden = screen !== 'results';
    $('#dock').hidden = screen !== 'results';
    $('#map').hidden = screen !== 'map';
    if (screen === 'results') { $('#overview').hidden = !!state.detail; $('#detail').hidden = !state.detail; } else if (screen === 'map' || screen === 'home') { $('#overview').hidden = $('#detail').hidden = true; }
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
// test hooks (Playwright): open the map, read its state
window.__ds = { openMap: (w) => openMap(w), map: () => mapState };
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
  const tot = $('#doneTotal');
  tot.hidden = !res.freed?.total || res.freed.cleans < 1;
  if (!tot.hidden) {
    tot.replaceChildren(document.createTextNode(`That's ${fmt(res.freed.total)} cleared by Diskshaper so far.`));
    const sb = el('button', '', 'Share it'); sb.onclick = () => share(res.freed.total); tot.append(sb);
    showFreed(res.freed);
  }
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

// ---------- toast ----------
let toastTimer;
function toast(text, action) {
  const t = $('#toast'); t.replaceChildren(el('span', '', text));
  if (action) { const b = el('button', 'ghost sm', action.label); b.onclick = () => { t.hidden = true; action.run(); }; t.append(b); }
  t.hidden = false; t.style.animation = 'none'; void t.offsetWidth; t.style.animation = '';
  clearTimeout(toastTimer); toastTimer = setTimeout(() => (t.hidden = true), 5200);
}

// ---------- freed total + share picture ----------
async function showFreed(f) {
  f = f || await ds.freed();
  const box = $('#freed');
  box.hidden = !f.total;
  if (!f.total) return;
  countTo($('#freedNum'), $('#freedUnit'), f.total, 1200);
  $('#freedSub').textContent = `across ${f.cleans} clean${f.cleans === 1 ? '' : 's'} on this ${isMac ? 'Mac' : 'PC'}`;
  state.freed = f;
}
showFreed();
// A 1200×630 picture people can paste into Discord, X or a forum post.
function sharePicture(bytes) {
  const W = 1200, H = 630, c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  g.fillStyle = '#09090b'; g.fillRect(0, 0, W, H);
  const glow = g.createRadialGradient(W * .5, H * .38, 20, W * .5, H * .38, 560);
  glow.addColorStop(0, 'rgba(91,157,255,.22)'); glow.addColorStop(1, 'rgba(91,157,255,0)'); g.fillStyle = glow; g.fillRect(0, 0, W, H);
  const font = (w, px) => `${w} ${px}px -apple-system, "SF Pro Display", "Segoe UI Variable Display", "Segoe UI", system-ui, sans-serif`;
  // logo + name
  const lg = g.createLinearGradient(64, 56, 100, 92); lg.addColorStop(0, '#8ab9ff'); lg.addColorStop(1, '#3a6fe0');
  g.fillStyle = lg; g.beginPath(); g.roundRect(64, 56, 40, 40, 11); g.fill();
  g.fillStyle = 'rgba(9,9,11,.85)'; g.beginPath(); g.roundRect(72, 80, 24, 8, 4); g.fill();
  g.fillStyle = '#fff'; g.beginPath(); g.roundRect(72, 80, 13, 8, 4); g.fill();
  g.fillStyle = '#f4f4f5'; g.font = font(650, 28); g.textBaseline = 'middle'; g.fillText('Diskshaper', 120, 77);
  // the number
  const [n, u] = split(bytes);
  g.textAlign = 'center'; g.textBaseline = 'alphabetic';
  g.font = font(750, 170); const nw = g.measureText(n).width; g.font = font(600, 64); const uw = g.measureText(u).width;
  const x0 = W / 2 - (nw + 22 + uw) / 2;
  g.textAlign = 'left'; g.fillStyle = '#ffffff'; g.font = font(750, 170); g.fillText(n, x0, 330);
  g.fillStyle = '#a1a1aa'; g.font = font(600, 64); g.fillText(u, x0 + nw + 22, 330);
  g.textAlign = 'center'; g.fillStyle = '#d4d4d8'; g.font = font(500, 38); g.fillText(`cleared from my ${isMac ? 'Mac' : 'PC'} with Diskshaper`, W / 2, 400);
  // the tri-colour storage bar
  const bx = 240, by = 452, bw = 720, bh = 16, parts = [['#5b9dff', .42], ['#a78bfa', .33], ['#f472b6', .25]];
  g.fillStyle = 'rgba(255,255,255,.08)'; g.beginPath(); g.roundRect(bx, by, bw, bh, 8); g.fill();
  g.save(); g.beginPath(); g.roundRect(bx, by, bw * .78, bh, 8); g.clip(); let x = bx;
  for (const [col, k] of parts) { g.fillStyle = col; g.fillRect(x, by, bw * .78 * k + 1, bh); x += bw * .78 * k; }
  g.restore();
  g.fillStyle = '#71717a'; g.font = font(500, 26); g.fillText('Free for Mac and Windows  ·  hollowbit.dev/diskshaper', W / 2, 560);
  return c.toDataURL('image/png');
}
async function share(bytes) {
  const url = sharePicture(bytes);
  await ds.shareImage(url, false);
  toast('Picture copied. Paste it into Discord, X or anywhere.', { label: 'Save as file', run: () => ds.shareImage(url, true) });
}
$('#freedShare').onclick = () => state.freed && share(state.freed.total);

// ---------- space map ----------
const MAP_COLORS = ['#5b9dff', '#a78bfa', '#f472b6', '#2dd4bf', '#fbbf24', '#4ade80', '#fb7185', '#38bdf8', '#c084fc', '#f59e0b'];
const mapState = { where: 'home', cache: {}, stack: [], home: '', back: 'home', busy: false };
const isOther = (n) => n.other || !n.path;
const prettyMap = (p) => (mapState.home && p.startsWith(mapState.home) ? '~' + p.slice(mapState.home.length) : p);
$('.fm').textContent = isMac ? 'Finder' : 'File Explorer';
$('#mapBack').innerHTML = UI_ICONS.back; $('#mapBack').append(document.createTextNode('Back'));

// Squarified treemap (Bruls, Huizing, van Wijk): rows of boxes kept as close to square as possible.
function squarify(items, x, y, w, h) {
  const total = items.reduce((s, i) => s + i.v, 0);
  if (!total || w <= 0 || h <= 0) return [];
  const scale = (w * h) / total, out = [];
  let rest = items.map((i) => ({ ...i, a: i.v * scale }));
  const worst = (row, side) => { const s = row.reduce((t, r) => t + r.a, 0); let hi = 0, lo = Infinity; for (const r of row) { hi = Math.max(hi, r.a); lo = Math.min(lo, r.a); } return Math.max((side * side * hi) / (s * s), (s * s) / (side * side * lo)); };
  while (rest.length) {
    const side = Math.min(w, h);
    const row = [rest[0]]; let i = 1;
    while (i < rest.length && worst([...row, rest[i]], side) <= worst(row, side)) row.push(rest[i++]);
    const s = row.reduce((t, r) => t + r.a, 0);
    if (w >= h) { const cw = s / h; let yy = y; for (const r of row) { const rh = r.a / cw; out.push({ ...r, x, y: yy, w: cw, h: rh }); yy += rh; } x += cw; w -= cw; }
    else { const rh = s / w; let xx = x; for (const r of row) { const cw2 = r.a / rh; out.push({ ...r, x: xx, y, w: cw2, h: rh }); xx += cw2; } y += rh; h -= rh; }
    rest = rest.slice(i);
  }
  return out;
}

async function openMap(where = mapState.where, fresh = false) {
  if (state.screen !== 'map') mapState.back = state.screen === 'results' ? 'results' : 'home';
  mapState.where = where;
  $$('#mapScope button').forEach((b) => b.classList.toggle('on', b.dataset.w === where));
  // draw only once the map screen is on show, so the boxes can be measured
  if (mapState.cache[where] && !fresh) { mapState.stack = [mapState.cache[where].tree]; mapState.home = mapState.cache[where].home; $('#mapBusy').hidden = true; return show('map', () => renderMap()); }
  show('map');
  $('#tm').querySelectorAll('.cell, .zoomer').forEach((n) => n.remove());
  $('#mapList').replaceChildren(); $('#crumbs').replaceChildren(); $('#mapName').textContent = where === 'drive' ? 'Whole drive' : 'Your files'; $('#mapSize').textContent = ''; $('#mapFiles').textContent = '';
  $('#mapBusy').hidden = false; $('#mapCount').textContent = 'Measuring…'; $('#mapPath').textContent = '';
  mapState.busy = true;
  const r = await ds.map(where);
  mapState.busy = false;
  if (!r || state.screen !== 'map' || mapState.where !== where) return; // stopped, or the person moved on
  $('#mapBusy').hidden = true;
  mapState.cache[where] = r; mapState.home = r.home; mapState.stack = [r.tree];
  renderMap();
}
ds.onMap((p) => { if (mapState.busy) { $('#mapCount').textContent = `${p.files.toLocaleString()} files · ${fmt(p.bytes)}`; $('#mapPath').textContent = p.path ? prettyMap(p.path) : 'Drawing the map…'; } });

function renderMap(from) {
  const node = mapState.stack.at(-1);
  const box = $('#tm');
  box.querySelectorAll('.cell').forEach((n) => n.remove());
  // breadcrumbs
  const crumbs = $('#crumbs'); crumbs.replaceChildren();
  mapState.stack.forEach((n, i) => {
    if (i) crumbs.append(el('span', '', '›'));
    const b = el('button', '', i ? n.name : (mapState.where === 'drive' ? (isMac ? 'Macintosh HD' : n.name) : 'Your files'));
    b.onclick = () => { if (i < mapState.stack.length - 1) { mapState.stack.length = i + 1; renderMap(); } };
    crumbs.append(b);
  });
  $('#mapName').textContent = mapState.stack.length > 1 ? node.name : (mapState.where === 'drive' ? 'Whole drive' : 'Your files');
  $('#mapSize').textContent = fmt(node.bytes);
  $('#mapFiles').textContent = `${node.files.toLocaleString()} file${node.files === 1 ? '' : 's'}`;

  const W = box.clientWidth, H = box.clientHeight, GAP = 2;
  const kids = (node.kids || []).filter((k) => k.bytes > 0);
  const rects = squarify(kids.map((k, i) => ({ k, v: k.bytes, col: MAP_COLORS[i % MAP_COLORS.length] })), 0, 0, W, H);
  const frag = document.createDocumentFragment();
  rects.forEach((r, i) => {
    const k = r.k, w = r.w - GAP, h = r.h - GAP;
    if (w < 2 || h < 2) return;
    const c = el('div', 'cell' + (isOther(k) ? ' other' : k.kids ? ' dir' : '') + (w > 220 && h > 120 ? ' roomy' : ''));
    Object.assign(c.style, { left: r.x + GAP / 2 + 'px', top: r.y + GAP / 2 + 'px', width: w + 'px', height: h + 'px', animationDelay: Math.min(i * 18, 300) + 'ms' });
    c.style.setProperty('--c', r.col);
    let top = 0;
    if (w > 64 && h > 30) { const lb = el('div', 'lb', k.name); lb.append(el('small', '', fmt(k.bytes))); c.append(lb); top = h > 70 ? 44 : 0; }
    // a peek inside each folder: its own children, unlabelled
    if (k.kids && w > 46 && h - top > 30) {
      const inner = squarify(k.kids.filter((x) => x.bytes > 0).slice(0, 28).map((x) => ({ k: x, v: x.bytes })), 5, top + 3, w - 10, h - top - 8);
      inner.forEach((s, j) => { if (s.w < 5 || s.h < 5) return; const d = el('div', 'sub' + (isOther(s.k) ? ' other' : j % 2 ? ' alt' : '')); if (s.w > 96 && s.h > 38) { const t = el('span', '', s.k.name); t.append(el('small', '', fmt(s.k.bytes))); d.append(t); } Object.assign(d.style, { left: s.x + 1 + 'px', top: s.y + 1 + 'px', width: s.w - 2 + 'px', height: s.h - 2 + 'px' }); c.append(d); });
    }
    c.onmousemove = (e) => { tip.textContent = isOther(k) ? k.name : prettyMap(k.path); tip.append(el('b', '', fmt(k.bytes))); tip.style.left = Math.min(Math.max(e.clientX, 160), innerWidth - 160) + 'px'; tip.style.top = e.clientY - 6 + 'px'; tip.hidden = false; };
    c.onmouseleave = () => (tip.hidden = true);
    c.oncontextmenu = (e) => { e.preventDefault(); if (!isOther(k)) ds.reveal(k.path); };
    c.onclick = () => { if (k.kids) zoomInto(k, c, r.col); else if (!isOther(k)) ds.reveal(k.path); };
    frag.append(c);
  });
  box.append(frag);

  // the same children as a list, biggest first
  const list = $('#mapList'); list.replaceChildren();
  const max = kids[0]?.bytes || 1;
  kids.slice(0, 14).forEach((k, i) => {
    const row = el('div', 'ml-row' + (k.kids ? ' dir' : '')); row.style.setProperty('--c', MAP_COLORS[i % MAP_COLORS.length]);
    const bar = el('div', 'b'); const fill = el('span'); fill.style.width = (k.bytes / max) * 100 + '%'; fill.style.animationDelay = i * 30 + 'ms'; bar.append(fill);
    const rv = el('button', 'icon-btn'); rv.innerHTML = UI_ICONS.reveal; rv.title = isMac ? 'Show in Finder' : 'Show in File Explorer';
    if (isOther(k)) rv.style.visibility = 'hidden';
    rv.onclick = (e) => { e.stopPropagation(); ds.reveal(k.path); };
    row.append(el('i'), el('span', 'n', k.name + (k.kids ? '/' : '')), bar, el('span', 's', fmt(k.bytes)), rv);
    if (k.kids) row.onclick = () => { mapState.stack.push(k); renderMap(); $('.stage').scrollTo({ top: 0, behavior: 'smooth' }); };
    list.append(row);
  });
}

// Zoom: a block of the folder's colour grows from the clicked box to fill the map, then its insides fade in.
function zoomInto(k, cell, col) {
  tip.hidden = true;
  const box = $('#tm'), W = box.clientWidth, H = box.clientHeight;
  const x = cell.offsetLeft, y = cell.offsetTop, w = cell.offsetWidth, h = cell.offsetHeight;
  const z = el('div', 'zoomer'); z.style.cssText = `width:${W}px;height:${H}px;background:${col};opacity:.55;transform:translate(${x}px,${y}px) scale(${w / W},${h / H})`;
  box.append(z);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const a = z.animate([{ transform: `translate(${x}px,${y}px) scale(${w / W},${h / H})`, opacity: .55 }, { transform: 'none', opacity: .35 }], { duration: reduce ? 1 : 340, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'forwards' });
  a.onfinish = () => {
    mapState.stack.push(k); renderMap();
    z.animate([{ opacity: .35 }, { opacity: 0 }], { duration: 260, fill: 'forwards' }).onfinish = () => z.remove();
  };
}

$('#mapBtn').onclick = () => openMap('home');
$('#mapTop').onclick = () => openMap(mapState.where);
$$('#mapScope button').forEach((b) => (b.onclick = () => { if (b.dataset.w !== mapState.where || !mapState.cache[b.dataset.w]) openMap(b.dataset.w); }));
function leaveMap() { if (mapState.busy) ds.mapCancel(); mapState.busy = false; tip.hidden = true; show(mapState.back, mapState.back === 'results' ? renderResults : undefined); }
$('#mapBack').onclick = leaveMap;
$('#mapStop').onclick = leaveMap;
addEventListener('keydown', (e) => { if (e.key === 'Escape' && state.screen === 'map') { if (mapState.stack.length > 1) { mapState.stack.pop(); renderMap(); } else leaveMap(); } });
let rz; addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => state.screen === 'map' && mapState.stack.length && renderMap(), 120); });
