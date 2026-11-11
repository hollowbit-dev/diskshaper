// Builds the Diskshaper website into docs/ (GitHub Pages, served at hollowbit.dev/diskshaper).
// 8 pages x 6 languages, plus English guides, the browser duplicate photo finder, 404, sitemap, robots and llms.txt.
// Run: npm run site
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { GUIDES } from './guides.mjs';

const here = path.dirname(new URL(import.meta.url).pathname);
const root = path.resolve(here, '..');
const out = path.join(root, 'docs');
const V = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).version;
const UPDATED = '2026-11-11';
const SITE = {
  url: 'https://hollowbit.dev/diskshaper', base: '/diskshaper/',
  github: 'https://github.com/hollowbit-dev/diskshaper', tip: 'https://ko-fi.com/hollowbit',
  studio: 'https://hollowbit.dev/', fileshaper: 'https://fileshaper.app', captionshaper: 'https://captionshaper.app',
};
const FILES = { mac: `Diskshaper-${V}-mac-arm64.dmg`, macIntel: `Diskshaper-${V}-mac-x64.dmg`, win: `Diskshaper-Setup-${V}-win-x64.exe` };
const DL = `${SITE.github}/releases/latest/download/`;
const CODES = ['en', 'es', 'fr', 'de', 'ru', 'zh'];
const LANGS = await Promise.all(CODES.map(async (c) => (await import(`./locales/${c}.mjs`)).default));
const EN = LANGS[0];
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fill = (s, o) => String(s).replace(/\{(\w+)\}/g, (_, k) => o[k] ?? '');

function sha(file) {
  const p = path.join(root, 'dist', file);
  return fs.existsSync(p) ? crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex') : 'build the installers to fill this in';
}
const SUMS = { mac: sha(FILES.mac), macIntel: sha(FILES.macIntel), win: sha(FILES.win) };

// ---------- structured data ----------
const ORG_LD = { '@context': 'https://schema.org', '@type': 'Organization', name: 'Hollowbit Studio', url: SITE.studio, logo: `${SITE.url}/img/icon-256.png`, founder: { '@type': 'Person', name: 'Elvis Zygmanta' }, sameAs: ['https://github.com/hollowbit-dev', SITE.fileshaper, SITE.captionshaper] };
const APP_LD = (t) => ({
  '@context': 'https://schema.org', '@type': 'SoftwareApplication', name: 'Diskshaper', applicationCategory: 'UtilitiesApplication', inLanguage: t.html,
  operatingSystem: 'macOS 11 or later, Windows 10, Windows 11', softwareVersion: V, description: t.meta.desc,
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' }, downloadUrl: `${SITE.url}/download.html`,
  author: { '@type': 'Organization', name: 'Hollowbit Studio', url: SITE.studio }, publisher: { '@type': 'Organization', name: 'Hollowbit Studio', url: SITE.studio },
  image: `${SITE.url}/img/og.png`, screenshot: `${SITE.url}/img/app-overview.webp`,
});
const FAQ_LD = (items) => ({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: items.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) });

// ---------- icons ----------
const I = (d) => `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;
const ICON = {
  apple: '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" stroke="none" d="M16.4 12.6c0-2.4 2-3.6 2.1-3.7-1.2-1.7-3-1.9-3.6-2-1.5-.2-3 .9-3.8.9s-2-.9-3.3-.9C6.1 7 4.5 8 3.6 9.6c-1.8 3.2-.5 7.9 1.3 10.4.9 1.3 1.9 2.7 3.2 2.6 1.3 0 1.8-.8 3.3-.8s2 .8 3.3.8c1.4 0 2.3-1.3 3.1-2.5 1-1.4 1.4-2.8 1.4-2.9 0 0-2.8-1.1-2.8-4.6zM14 5.2c.7-.9 1.2-2 1-3.2-1 .1-2.3.7-3 1.6-.7.8-1.2 2-1.1 3.1 1.2.1 2.3-.6 3.1-1.5z"/></svg>',
  win: '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" stroke="none" d="M3 5.6 10.4 4.6v7H3zM11.6 4.4 21 3v8.6h-9.4zM3 12.6h7.4v7L3 18.6zM11.6 12.6H21V21l-9.4-1.4z"/></svg>',
  gh: I('<path d="M9 19c-4.3 1.4-4.3-2.5-6-3m12 5v-3.5c0-1 .1-1.4-.5-2 2.8-.3 5.5-1.4 5.5-6a4.6 4.6 0 0 0-1.3-3.2 4.2 4.2 0 0 0-.1-3.2s-1.1-.3-3.5 1.3a12.3 12.3 0 0 0-6.2 0C6.5 2.8 5.4 3.1 5.4 3.1a4.2 4.2 0 0 0-.1 3.2A4.6 4.6 0 0 0 4 9.5c0 4.6 2.7 5.7 5.5 6-.6.6-.6 1.2-.5 2V21"/>'),
  heart: I('<path d="M12 20s-7-4.3-8.8-8.7C1.9 8 4 4.8 7.2 4.8c1.9 0 3.4 1 4.8 2.8 1.4-1.8 2.9-2.8 4.8-2.8 3.2 0 5.3 3.2 4 6.5C19 15.7 12 20 12 20z"/>'),
  check: I('<path d="m5 12.5 4.5 4.5L19 7.5"/>'),
  down: I('<path d="M12 4v12M6.5 10.5 12 16l5.5-5.5"/><path d="M4 20h16"/>'),
  arrow: I('<path d="M5 12h14M13 6l6 6-6 6"/>'),
  out: I('<path d="M8 16 16 8m0 0H9.5M16 8v6.5"/>'),
  doc: I('<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/>'),
  photos: I('<rect x="7" y="3" width="14" height="14" rx="2"/><path d="M17 17v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h1"/><path d="M7 13l3.5-3.5L14 13l2-2 5 5"/>'),
  menu: I('<path d="M4 7h16M4 12h16M4 17h16"/>'),
  globe: I('<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.4 2.4 3.5 5.3 3.5 8.5s-1.1 6.1-3.5 8.5c-2.4-2.4-3.5-5.3-3.5-8.5s1.1-6.1 3.5-8.5z"/>'),
  trash: I('<path d="M4 7h16M9.5 7V4.5h5V7M6 7l1 13h10l1-13"/>'),
  file: I('<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/>'),
  undo: I('<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>'),
};
// Hollowbit's mark: a rounded square with an off-centre hole.
const HB = '<svg class="hb" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" fill-rule="evenodd" d="M6 2h12a4 4 0 0 1 4 4v12a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V6a4 4 0 0 1 4-4Zm9 13.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"/></svg>';
const GROUP_ICON = {
  gaming: I('<path d="M7 8h10a4 4 0 0 1 4 4.4l-.4 3.3a2.6 2.6 0 0 1-4.6 1.3L14.5 15h-5L8 17a2.6 2.6 0 0 1-4.6-1.3L3 12.4A4 4 0 0 1 7 8z"/><path d="M8 11v3M6.5 12.5h3"/>'),
  editing: I('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 5v14M17 5v14M3 9.5h4M3 14.5h4M17 9.5h4M17 14.5h4"/>'),
  everyone: I('<path d="M3 7.5a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2V17a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>'),
};
const SAFE_ICONS = [
  I('<path d="M4 7h10M4 12h7M4 17h9"/><rect x="15" y="10" width="6" height="4" rx="2"/>'),
  I('<path d="M4 7h16M9.5 7V4.5h5V7M6 7l1 13h10l1-13"/><path d="M9.5 13.5l2.5-2.5 2.5 2.5M12 11v5.5"/>'),
  I('<path d="M12 3l7.5 3v5.5c0 4.5-3.2 8-7.5 9.5-4.3-1.5-7.5-5-7.5-9.5V6z"/><path d="m9 12 2 2 4-4"/>'),
  I('<circle cx="12" cy="12" r="3"/><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/>'),
];

// Things a scan turns up. Real folder and file names, so they read the same in every language.
const FINDS = [
  ['gamers', 'steamapps/shadercache', '3.1 GB'], ['creators', 'Media Cache Files', '18.3 GB'], ['everyone', 'Xcode_26.1.xip', '3.4 GB'],
  ['gamers', 'common/Starfall Tactics', '4.6 GB'], ['creators', 'CacheClip', '11.7 GB'], ['everyone', 'IMG_4211 2.HEIC', '4 MB'],
  ['gamers', 'NVIDIA/DXCache', '1.9 GB'], ['creators', 'Video Previews', '9.4 GB'], ['everyone', 'Library/Caches/Google', '2.4 GB'],
  ['gamers', 'Bottles/twdg', '330 MB'], ['creators', 'promo_v2.mov', '11.9 GB'], ['everyone', 'old-macbook-backup.zip', '38.2 GB'],
  ['gamers', 'EpicGamesLauncher/webcache', '410 MB'], ['creators', 'Peak Files', '900 MB'], ['everyone', 'Screen Recording 2026-03-14.mov', '2.1 GB'],
];
const ticker = () => {
  const row = (list) => list.map(([g, n, s]) => `<span class="chip"><i class="g-${g}"></i>${esc(n)}<b>${s}</b></span>`).join('');
  const a = row(FINDS), b = row([...FINDS].reverse());
  return `<div class="ticker" aria-hidden="true"><div class="tk-track">${a}${a}</div><div class="tk-track rev">${b}${b}</div></div>`;
};

// ---------- hero demo: a working replica of the app (animated by site.js) ----------
const DEMO_CATS = [['gamers', 1, 7.6e9], ['creators', 1, 37.1e9], ['gamers', 1, 6.1e9], ['everyone', 1, 5.2e9], ['creators', 1, 14.5e9], ['everyone', 1, 3.98e9], ['everyone', 0, 2.4e9], ['creators', 0, 14.6e9], ['gamers', 0, 41.2e9]];
const heroDemo = (t, base) => {
  const d = t.ui.demo;
  return `<div class="demo-stage"><div class="demo" aria-label="${esc(d.aria)}" role="img">
  <div class="demo-top"><span class="dots"><i></i><i></i><i></i></span><span class="demo-brand"><img src="${base}img/icon-64.png" alt="" width="16" height="16">Diskshaper</span><span></span></div>
  <div class="demo-body">
    <div class="demo-head"><div><div class="demo-k">${esc(d.found)}</div><div class="demo-big"><span data-found>0</span><small data-unit>GB</small></div></div>
      <div class="demo-side"><div><div class="demo-k">${esc(d.safeToClean)}</div><div class="demo-v safe" data-safe>0 GB</div></div></div></div>
    <div class="demo-bar" data-bar>${DEMO_CATS.map(([g, s, b], i) => `<i class="g-${g}${s ? ' is-safe' : ''}" data-i="${i}" style="--w:${b}"></i>`).join('')}</div>
    <div class="demo-rows">${DEMO_CATS.map(([g, s, b], i) => `<div class="demo-row" data-i="${i}" data-bytes="${b}" data-safe="${s}"><b class="g-${g}"></b><span>${esc(d.cats[i])}</span><em class="${s ? 'safe' : 'check'}">${esc(s ? d.safe : d.check)}</em><strong>0 GB</strong></div>`).join('')}</div>
    <div class="demo-dock"><span><b data-sel>0 GB</b> ${esc(d.selected)}</span><span class="demo-btn" data-btn>${esc(d.move)}</span></div>
    <div class="demo-done" data-done><svg viewBox="0 0 52 52"><circle cx="26" cy="26" r="24"/><path d="M15 27l7 7 15-15"/></svg><b data-freed>0 GB</b><span>${esc(d.moved)}</span></div>
    <div class="demo-cursor" data-cursor></div>
  </div>
</div><div class="demo-floor" aria-hidden="true"></div></div>`;
};

// The Trash demo in the "safe" band: files drop into the Trash, then one comes back.
const trashDemo = (t) => {
  const s = t.ui.trash;
  return `<div class="tdemo" aria-hidden="true">
  <div class="td-files">${s.files.map((f, i) => `<div class="td-file" style="--i:${i}">${ICON.file}<span>${esc(f)}</span></div>`).join('')}</div>
  <div class="td-bin">${ICON.trash}<span>${esc(s.bin)}</span><em data-td-count>0</em></div>
  <div class="td-back">${ICON.undo}${esc(s.back)}</div>
</div>`;
};

// ---------- layout ----------
// L: language of the page. o.path: a fixed English-only path (guides, tools). o.prefix: '../' for pages one folder down.
function layout(L, page, title, body, o = {}) {
  const t = L, u = t.ui;
  const en = o.path != null;
  const langRoot = en ? (o.prefix || '') : (L.lang === 'en' ? '' : '../');   // from this page to the site root
  const href = (p) => (en ? langRoot : '') + (p === 'index' ? './' : `${p}.html`);
  const shared = (p) => langRoot + p;
  const pagePath = (code) => `${code === 'en' ? '' : `${code}/`}${page === 'index' ? '' : `${page}.html`}`;
  const abs = (code) => `${SITE.url}/${en ? o.path : pagePath(code)}`;
  const langHref = (code) => (en ? `${langRoot}${code === 'en' ? '' : `${code}/`}` : `${L.lang === 'en' ? '' : '../'}${pagePath(code)}`) || './';
  const desc = o.desc || t.meta.desc;
  const alternates = en ? `<link rel="alternate" hreflang="en" href="${abs('en')}">`
    : `${LANGS.map((l) => `<link rel="alternate" hreflang="${l.html}" href="${abs(l.lang)}">`).join('\n')}\n<link rel="alternate" hreflang="x-default" href="${abs('en')}">`;
  const ld = [ORG_LD, ...(o.jsonld || [])].map((j) => `<script type="application/ld+json">${JSON.stringify(j)}</script>`).join('\n');
  const NAV = [['features', u.nav.features, href('features')], ['tools', u.nav.finder, shared('tools/')], ['guides', u.nav.guides, shared('guides/')], ['faq', u.nav.faq, href('faq')], ['about', u.nav.about, href('about')]];
  const cur = en ? 'en' : L.lang;
  return `<!doctype html>
<html lang="${en ? 'en' : L.html}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<script>document.documentElement.classList.add('js')</script>
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta name="theme-color" content="#08090c">
<meta name="author" content="Hollowbit Studio">
<meta property="og:type" content="${o.article ? 'article' : 'website'}">
<meta property="og:site_name" content="Diskshaper by Hollowbit Studio">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${abs(cur)}">
<meta property="og:image" content="${SITE.url}/img/og.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:locale" content="${(en ? 'en' : L.html).replace('-', '_')}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(desc)}">
<meta name="twitter:image" content="${SITE.url}/img/og.png">
<link rel="canonical" href="${abs(cur)}">
${alternates}
${ld}
<link rel="icon" type="image/png" href="${shared('favicon.png')}">
<link rel="preload" href="${shared('fonts/Geist-Variable.woff2')}" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="${shared('style.css')}?v=${V}">
</head>
<body data-page="${page}">
<a class="skip" href="#main">${esc(u.nav.skip)}</a>
<header class="nav"><div class="nav-in">
  <div class="brand-wrap"><a class="logo" href="${href('index')}"><img src="${shared('img/icon-64.png')}" alt="" width="26" height="26">Diskshaper</a><a class="by" href="${SITE.studio}" title="Hollowbit Studio">${HB}<span>${esc(u.studio.by)}</span></a></div>
  <nav class="links" id="links" aria-label="Main">${NAV.map(([k, l, h]) => `<a href="${h}"${k === page ? ' aria-current="page"' : ''}>${esc(l)}</a>`).join('')}</nav>
  <div class="nav-end">
    <details class="lang"><summary aria-label="${esc(u.nav.language)}">${ICON.globe}<span>${cur.toUpperCase()}</span></summary>
      <div class="lang-menu">${LANGS.map((l) => `<a href="${langHref(l.lang)}" hreflang="${l.html}" lang="${l.html}" data-set-lang="${l.lang}"${l.lang === cur ? ' aria-current="true"' : ''}>${l.name}</a>`).join('')}</div></details>
    <a class="btn btn-primary btn-sm" href="${href('download')}">${esc(u.nav.download)}</a>
    <button class="menu-btn" aria-label="${esc(u.nav.menu)}" aria-expanded="false" aria-controls="links">${ICON.menu}</button>
  </div>
  <div class="nav-meter" aria-hidden="true"><i class="g-everyone"></i><i class="g-gamers"></i><i class="g-creators"></i></div>
</div></header>
<main id="main">
${body}
</main>
<footer class="foot">
<div class="wrap"><a class="studio-card" href="${SITE.studio}">
  <span class="studio-mark">${HB}</span>
  <span class="studio-txt"><b>${esc(u.studio.footH)}</b><span>${esc(u.studio.footP)}</span></span>
  <span class="studio-go">${esc(u.studio.visit)} ${ICON.arrow}</span>
</a></div>
<div class="wrap foot-grid">
  <div class="foot-brand"><a class="logo" href="${href('index')}"><img src="${shared('img/icon-64.png')}" alt="" width="22" height="22">Diskshaper</a><p>${esc(u.footer.tagline)}</p></div>
  <div class="foot-col"><p class="foot-h">${esc(u.footer.product)}</p><a href="${href('features')}">${esc(u.nav.features)}</a><a href="${href('download')}">${esc(u.nav.download)}</a><a href="${href('changelog')}">${esc(u.footer.changelog)}</a><a href="${shared('tools/')}">${esc(u.nav.finder)}</a><a href="${shared('guides/')}">${esc(u.nav.guides)}</a></div>
  <div class="foot-col"><p class="foot-h">${esc(u.footer.help)}</p><a href="${href('faq')}">${esc(u.nav.faq)}</a><a href="${href('support')}">${esc(u.footer.support)}</a><a href="${href('privacy')}">${esc(u.footer.privacy)}</a></div>
  <div class="foot-col"><p class="foot-h">Hollowbit Studio</p><a href="${SITE.studio}">hollowbit.dev</a><a href="${href('about')}">${esc(u.nav.about)}</a><a href="${SITE.fileshaper}">Fileshaper</a><a href="${SITE.captionshaper}">Captionshaper</a><a href="${SITE.github}" rel="noopener">GitHub</a></div>
</div>
<div class="wrap foot-legal"><span>© 2026 <a href="${SITE.studio}">Hollowbit Studio</a></span><span>${esc(u.footer.oss)}</span></div>
<div class="foot-word" aria-hidden="true">Diskshaper</div></footer>
<script>window.DS=${JSON.stringify({ lang: cur, langs: CODES, english: en })};</script>
<script src="${shared('site.js')}?v=${V}" defer></script>
${o.tools ? `<script src="${shared('tools.js')}?v=${V}" defer></script>` : ''}
</body>
</html>
`;
}

const dlButtons = (t, cls = 'cta') => `<div class="${cls}">
  <a class="btn btn-primary btn-lg" data-os="mac" href="${DL}${FILES.mac}">${ICON.apple}${esc(t.hero.mac)}</a>
  <a class="btn btn-ghost btn-lg" data-os="win" href="${DL}${FILES.win}">${ICON.win}${esc(t.hero.win)}</a>
</div>`;
const pageHero = (h1, lead = '', extra = '') => `<section class="page-hero"><div class="wrap narrow"><h1 class="reveal">${esc(h1)}</h1>${lead ? `<p class="lede reveal">${esc(lead)}</p>` : ''}${extra}</div></section>`;
const shot = (img, alt, base = '') => `<figure class="shot reveal"><img src="${base}img/${img}.webp" width="2560" height="1640" alt="${esc(alt)}" loading="lazy"></figure>`;
// Headline with one word underlined by a storage bar.
const heroTitle = (t) => {
  const h = esc(t.hero.h1), w = esc(t.hero.hl || '');
  const i = w ? h.indexOf(w) : -1;
  return i < 0 ? h : `${h.slice(0, i)}<span class="hl">${w}<span class="hl-bar" aria-hidden="true"><i class="g-everyone"></i><i class="g-gamers"></i><i class="g-creators"></i></span></span>${h.slice(i + w.length)}`;
};
const groupSec = (t, g, i, img, base, withP = true) => `
<section class="band band-${g.id}" id="${g.id}"><div class="wrap split-in${i % 2 ? ' rev' : ''}">
  <div class="split-text reveal"><p class="tag">${GROUP_ICON[g.id]}${esc(g.h)}</p><h2>${esc(g.title)}</h2>${withP && g.p ? `<p>${esc(g.p)}</p>` : ''}
    <ul class="finds">${g.items.map(([n, d]) => `<li><b>${esc(n)}</b><span>${esc(d)}</span></li>`).join('')}</ul></div>
  ${shot(img, fill(t.ui.home.shotAlt, { x: g.h }), base)}
</div></section>`;
const endCta = (t) => `<section class="end"><div class="wrap center">
  <div class="end-bar reveal" aria-hidden="true"><i class="g-everyone" style="--w:22"></i><i class="g-gamers" style="--w:30"></i><i class="g-creators" style="--w:18"></i><i class="end-free"></i></div>
  <h2 class="reveal">${esc(t.ui.home.endH)}</h2>
  ${dlButtons(t)}
  <p class="note">${esc(t.hero.note)}</p>
</div></section>`;

// ---------- pages ----------
const allFaq = (t) => [...t.faq, ...t.faqMore];
const PAGES = {
  index: (t, base) => {
    const h = t.ui.home;
    return `
<section class="hero"><div class="wrap">
  <a class="eyebrow reveal" href="${SITE.studio}">${HB}<span>${esc(t.ui.studio.badge)}</span><span class="sep"></span><span class="muted">${esc(t.hero.eyebrow)}</span></a>
  <h1 class="reveal">${heroTitle(t)}</h1>
  <p class="lede reveal">${esc(t.hero.sub)}</p>
  ${dlButtons(t)}
  <p class="note reveal">${esc(t.hero.note)}</p>
  ${heroDemo(t, base)}
</div></section>
${ticker()}
${t.groups.map((g, i) => groupSec(t, g, i, g.img, base)).join('')}
<section class="safe-band"><div class="wrap safe-in">
  <div class="safe-copy"><h2 class="reveal">${esc(t.safe.h)}</h2><p class="lede reveal">${esc(t.safe.p)}</p>${trashDemo(t)}</div>
  <div class="grid2">${t.safe.items.map(([hh, p], i) => `<div class="card reveal" style="--d:${i}">${SAFE_ICONS[i]}<h3>${esc(hh)}</h3><p>${esc(p)}</p></div>`).join('')}</div>
</div></section>
<section class="extras"><div class="wrap two-col">
  <a class="panel link-panel reveal" href="${base}tools/">${ICON.photos}<h3>${esc(h.finderH)}${t.lang === 'en' ? '' : ` <small class="muted">(${esc(h.englishNote)})</small>`}</h3><p>${esc(h.finderP)}</p><span class="link">${esc(h.finderLink)} ${ICON.arrow}</span></a>
  <a class="panel link-panel reveal" href="${base}guides/">${ICON.doc}<h3>${esc(h.guidesH)}${t.lang === 'en' ? '' : ` <small class="muted">(${esc(h.englishNote)})</small>`}</h3><p>${GUIDES.slice(0, 4).map((g) => esc(g.h1)).join(' · ')}</p><span class="link">${esc(h.guidesLink)} ${ICON.arrow}</span></a>
</div></section>
<section id="faq"><div class="wrap narrow">
  <h2 class="reveal">${esc(h.faqH)}</h2>
  <div class="faq">${t.faq.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}</div>
  <p class="more"><a class="link" href="faq.html">${esc(h.faqAll)} ${ICON.arrow}</a></p>
</div></section>
${endCta(t)}`;
  },

  features: (t, base) => {
    const f = t.ui.features;
    return `${pageHero(f.h1, f.lead, `<nav class="jump reveal">${t.groups.map((g) => `<a href="#${g.id}" class="j-${g.id}">${esc(g.h)}</a>`).join('')}<a href="#how">${esc(f.how)}</a></nav>`)}
${t.groups.map((g, i) => groupSec(t, g, i, g.id === 'gaming' ? 'app-gaming' : g.id === 'editing' ? 'app-creators' : 'app-overview', base, false)).join('')}
<section id="how"><div class="wrap narrow">
  <h2 class="reveal">${esc(f.how)}</h2>
  <ol class="howto">${f.steps.map(([n, d]) => `<li><b>${esc(n)}</b><span>${esc(d)}</span></li>`).join('')}</ol>
</div></section>
${endCta(t)}`;
  },

  download: (t) => {
    const d = t.dl, u = t.ui.download;
    return `${pageHero(d.h, fill(u.version, { v: V }))}
<section class="tight"><div class="wrap narrow">
  <div class="dl-grid">
    <div class="card dl" data-os-card="mac"><div class="dl-os">${ICON.apple}<h2>${esc(u.mac)}</h2></div><p>${esc(d.macReq)}</p>
      <a class="btn btn-primary" href="${DL}${FILES.mac}">${ICON.down}${esc(u.appleSilicon)}</a>
      <a class="btn btn-ghost" href="${DL}${FILES.macIntel}">${ICON.down}${esc(u.intel)}</a></div>
    <div class="card dl" data-os-card="win"><div class="dl-os">${ICON.win}<h2>${esc(u.win)}</h2></div><p>${esc(d.winReq)}</p>
      <a class="btn btn-primary" href="${DL}${FILES.win}">${ICON.down}${esc(u.winBtn)}</a></div>
  </div>
  <h2 class="mt">${esc(u.first)}</h2>
  <div class="steps"><div><h3>${esc(u.mac)}</h3><ol>${d.macSteps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol></div><div><h3>${esc(u.win)}</h3><ol>${d.winSteps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol></div></div>
  <p class="fine mt-s">${esc(d.why)}</p>
  <h2 class="mt">${esc(u.checkH)}</h2><p class="prose">${esc(u.checkP)}</p>
  <table class="kv sums"><tr><th scope="row">${esc(u.sumMac)}</th><td><code>${SUMS.mac}</code></td></tr><tr><th scope="row">${esc(u.sumIntel)}</th><td><code>${SUMS.macIntel}</code></td></tr><tr><th scope="row">${esc(u.sumWin)}</th><td><code>${SUMS.win}</code></td></tr></table>
  <p class="mt-s"><a class="link" href="${SITE.github}/releases" rel="noopener">${ICON.gh}${esc(u.all)}</a></p>
</div></section>`;
  },

  changelog: (t) => `${pageHero(t.ui.changelogPage.h1, t.ui.changelogPage.lead)}
<section class="tight"><div class="wrap narrow">${t.changelog.map((e) => `
  <article class="release"><div class="rel-meta"><span class="ver">${esc(e.v)}</span><time>${esc(e.date)}</time></div>
  <div><h2>${esc(e.name)}</h2><ul>${e.items.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div></article>`).join('')}
</div></section>`,

  faq: (t) => `${pageHero(t.ui.faqPage.h1)}
<section class="tight"><div class="wrap narrow"><div class="faq">${allFaq(t).map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}</div></div></section>`,

  about: (t) => {
    const a = t.about, u = t.ui.aboutPage;
    return `${pageHero(a.h1, a.lead, `<div class="cta cta-left reveal"><a class="btn btn-ghost" href="${SITE.studio}">${HB}hollowbit.dev ${ICON.out}</a></div>`)}
<section class="tight"><div class="wrap narrow"><h2>${esc(u.whyH)}</h2>${a.why.map((p) => `<p class="prose">${esc(p)}</p>`).join('')}</div></section>
<section class="tight"><div class="wrap narrow"><h2>${esc(u.rulesH)}</h2>
  <dl class="facts">${a.rules.map(([k, v]) => `<div><dt>${ICON.check}${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl></div></section>
<section class="tight"><div class="wrap narrow two-col">
  <a class="panel link-panel sib sib-fs" href="${SITE.fileshaper}"><h3>Fileshaper</h3><p>${esc(u.fs)}</p></a>
  <a class="panel link-panel sib sib-cs" href="${SITE.captionshaper}"><h3>Captionshaper</h3><p>${esc(u.cs)}</p></a>
</div></section>`;
  },

  support: (t) => {
    const s = t.ui.supportPage;
    return `${pageHero(s.h1)}
<section class="tight"><div class="wrap narrow two-col">
  <div class="panel"><h2>${esc(s.helpH)}</h2><p>${esc(s.helpP)}</p><a class="btn btn-ghost" href="${SITE.github}/issues/new" rel="noopener">${ICON.gh}${esc(s.helpBtn)}</a></div>
  <div class="panel"><h2>${esc(s.likeH)}</h2><p>${esc(s.likeP)}</p><div class="row"><a class="btn btn-primary" href="${SITE.tip}" rel="noopener">${ICON.heart}${esc(s.tip)}</a><a class="btn btn-ghost" href="${SITE.github}" rel="noopener">${esc(s.star)}</a></div></div>
</div></section>`;
  },

  privacy: (t) => `${pageHero(t.ui.privacyPage.h1, '', `<p class="fine">${esc(fill(t.ui.privacyPage.updated, { d: t.date }))}</p>`)}
<section class="tight"><div class="wrap narrow"><p class="callout">${esc(t.privacy.short)}</p>${t.privacy.sections.map(([h, b]) => `<h2>${esc(h)}</h2><p class="prose">${esc(b)}</p>`).join('')}</div></section>`,
};

const TITLE = (t, p) => (p === 'index' ? t.meta.title : `${{ features: t.ui.features.title, download: t.ui.download.title, changelog: t.ui.changelogPage.title, faq: t.ui.faqPage.title, about: t.ui.aboutPage.title, support: t.ui.supportPage.title, privacy: t.ui.privacyPage.title }[p]} · Diskshaper`);
const OPTS = (t, p) => ({
  index: { jsonld: [APP_LD(t), FAQ_LD(t.faq)] },
  features: { desc: t.ui.features.desc },
  download: { desc: fill(t.ui.download.desc, { v: V }), jsonld: [APP_LD(t)] },
  changelog: { desc: t.ui.changelogPage.lead },
  faq: { desc: allFaq(t).slice(0, 3).map((x) => x[0]).join(' '), jsonld: [FAQ_LD(allFaq(t))] },
  about: { desc: t.about.lead },
  support: { desc: t.ui.supportPage.desc },
  privacy: { desc: t.privacy.short },
}[p]);

// ---------- guides + tools (English) ----------
function guidePage(g) {
  const others = GUIDES.filter((x) => x.slug !== g.slug).slice(0, 4);
  return `<section class="page-hero guide-hero"><div class="wrap narrow">
  <nav class="crumbs" aria-label="Breadcrumb"><a href="../">Diskshaper</a><span>/</span><a href="./">Guides</a></nav>
  <h1>${esc(g.h1)}</h1>
  <div class="answer"><p>${esc(g.answer)}</p></div>
  <p class="fine">Updated ${new Date(UPDATED).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })} · <a href="${SITE.studio}">Hollowbit Studio</a></p>
  ${g.tool ? `<div class="cta cta-left"><a class="btn btn-primary btn-lg" href="../tools/">${ICON.photos}Open the duplicate photo finder</a></div>` : dlButtons(EN, 'cta cta-left')}
</div></section>
<section class="tight"><div class="wrap narrow">
  <h2>Step by step</h2>
  <ol class="howto">${g.steps.map(([n, d], i) => `<li id="step-${i + 1}"><b>${esc(n)}</b><span>${esc(d)}</span></li>`).join('')}</ol>
  ${shot(g.shot, 'Diskshaper', '../')}
  ${g.sections.map(([h, b]) => `<h2>${esc(h)}</h2><p class="prose">${esc(b)}</p>`).join('')}
  <h2>Questions</h2>
  <div class="faq">${g.faq.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}</div>
  <h2>More guides</h2>
  <ul class="guide-list">${others.map((x) => `<li><a href="${x.slug}.html"><b>${esc(x.h1)}</b><span>${esc(x.desc)}</span></a></li>`).join('')}</ul>
</div></section>`;
}
const guideIndex = () => `${pageHero('Guides', 'Plain answers to everyday storage questions: what is taking space, what is safe to delete, and how to get it back.')}
<section class="tight"><div class="wrap narrow"><ul class="guide-list">${GUIDES.map((x) => `<li><a href="${x.slug}.html"><b>${esc(x.h1)}</b><span>${esc(x.desc)}</span></a></li>`).join('')}</ul></div></section>`;
const guideLd = (g) => {
  const url = `${SITE.url}/guides/${g.slug}.html`;
  return [
    { '@context': 'https://schema.org', '@type': 'HowTo', name: g.h1, description: g.answer, totalTime: 'PT2M', tool: [{ '@type': 'HowToTool', name: g.tool ? 'Diskshaper duplicate photo finder (free, in the browser)' : 'Diskshaper (free app for Mac and Windows)' }], step: g.steps.map(([n, d], i) => ({ '@type': 'HowToStep', position: i + 1, name: n, text: d, url: `${url}#step-${i + 1}` })) },
    FAQ_LD(g.faq),
    { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Diskshaper', item: `${SITE.url}/` }, { '@type': 'ListItem', position: 2, name: 'Guides', item: `${SITE.url}/guides/` }, { '@type': 'ListItem', position: 3, name: g.h1, item: url }] },
    { '@context': 'https://schema.org', '@type': 'Article', headline: g.title, description: g.desc, dateModified: UPDATED, author: { '@type': 'Organization', name: 'Hollowbit Studio', url: SITE.studio }, publisher: { '@type': 'Organization', name: 'Hollowbit Studio', url: SITE.studio }, mainEntityOfPage: url },
  ];
};
const toolsPage = () => `${pageHero('Free duplicate photo finder', 'Pick a folder and see every exact duplicate and look-alike photo, side by side. It runs in your browser: your photos never leave your device.')}
<section class="tight"><div class="wrap">
  <div class="finder" id="finder" data-tool="dupes">
    <div class="drop" data-drop>
      ${ICON.photos}
      <h2>Choose a folder of photos</h2>
      <p>JPG, PNG, HEIC, WEBP, GIF and RAW files, including every folder inside it.</p>
      <div class="cta"><button class="btn btn-primary btn-lg" data-pick>Choose folder</button></div>
      <p class="fine" data-hint>Or drop a folder here.</p>
      <input type="file" webkitdirectory multiple hidden data-input>
    </div>
    <div class="f-progress" data-progress hidden><div class="f-bar"><i data-pbar></i></div><p data-ptext>Reading photos</p></div>
    <div class="f-results" data-results hidden></div>
  </div>
  <div class="narrow mt">
    <h2>How it works</h2>
    <ol class="howto">
      <li><b>Exact duplicates</b><span>Files with the same size are compared by a SHA-256 fingerprint of their contents. Matches are the same photo, byte for byte.</span></li>
      <li><b>Look-alikes</b><span>Each photo is shrunk to a tiny greyscale picture and turned into a 64-bit fingerprint. Photos whose fingerprints nearly match are the same picture saved again, resized or re-compressed.</span></li>
      <li><b>What is kept</b><span>Each photo appears in one group, and exactly one file per group is kept: the oldest of exact copies, otherwise the biggest. Everything else is ticked, and you can change that.</span></li>
      <li><b>Moving copies</b><span>In Chrome and Edge the finder can move the ticked copies into a “Duplicates (Diskshaper)” folder inside the one you chose, so you can check them before deleting. Other browsers cannot change files, so you get a list to download instead.</span></li>
    </ol>
    <div class="panel mt"><h2>Check your whole drive</h2><p>The Diskshaper app finds duplicate photos and footage across your whole computer, plus caches, game leftovers and old installers, and moves what you pick to the Trash.</p>${dlButtons(EN, 'cta cta-left')}</div>
  </div>
</div></section>`;
const notfound = (t) => `<section class="page-hero nf"><div class="wrap center"><h1>${esc(t.ui.nf.h1)}</h1><p class="lede">${esc(t.ui.nf.p)}</p><div class="cta"><a class="btn btn-primary" href="${SITE.base}">${esc(t.ui.nf.home)}</a></div></div></section>`;

// ---------- write ----------
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(path.join(out, 'guides'), { recursive: true });
fs.mkdirSync(path.join(out, 'tools'), { recursive: true });
for (const L of LANGS) {
  const dir = L.lang === 'en' ? out : path.join(out, L.lang);
  fs.mkdirSync(dir, { recursive: true });
  const base = L.lang === 'en' ? '' : '../';
  for (const [p, render] of Object.entries(PAGES)) fs.writeFileSync(path.join(dir, `${p}.html`), layout(L, p, TITLE(L, p), render(L, base), OPTS(L, p)));
}
for (const g of GUIDES) fs.writeFileSync(path.join(out, 'guides', `${g.slug}.html`), layout(EN, 'guides', `${g.title} · Diskshaper`, guidePage(g), { prefix: '../', path: `guides/${g.slug}.html`, desc: g.desc, jsonld: guideLd(g), article: true }));
fs.writeFileSync(path.join(out, 'guides', 'index.html'), layout(EN, 'guides', 'Storage guides: free up space safely · Diskshaper', guideIndex(), { prefix: '../', path: 'guides/', desc: 'Free guides: clear shader caches, remove Steam leftovers, clear Premiere and Resolve caches, find duplicate photos, free up space on Mac and Windows.' }));
fs.writeFileSync(path.join(out, 'tools', 'index.html'), layout(EN, 'tools', 'Free duplicate photo finder (in your browser, no upload) · Diskshaper', toolsPage(), { prefix: '../', path: 'tools/', tools: true,
  desc: 'Find duplicate and look-alike photos in any folder for free. Runs in your browser, nothing is uploaded. Works with JPG, PNG, HEIC and RAW.',
  jsonld: [{ '@context': 'https://schema.org', '@type': 'WebApplication', name: 'Diskshaper duplicate photo finder', url: `${SITE.url}/tools/`, applicationCategory: 'UtilitiesApplication', operatingSystem: 'Any (web browser)', offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' }, publisher: { '@type': 'Organization', name: 'Hollowbit Studio', url: SITE.studio } }] }));
// 404 is served for any missing path, so its links must be absolute.
fs.writeFileSync(path.join(out, '404.html'), layout(EN, '404', `${EN.ui.nf.title} · Diskshaper`, notfound(EN))
  .replace(/(href|src)="(?!https?:|#|\/|data:)([^"]*)"/g, (m, a, h) => `${a}="${SITE.base}${h.replace(/^\.\//, '')}"`));

const assets = path.join(here, 'assets');
for (const f of ['site.js', 'tools.js', 'favicon.png']) fs.copyFileSync(path.join(assets, f), path.join(out, f));
fs.writeFileSync(path.join(out, 'style.css'), ['base.css', 'finder.css', 'tail.css'].map((f) => fs.readFileSync(path.join(assets, f), 'utf8')).join('\n'));
fs.cpSync(path.join(assets, 'fonts'), path.join(out, 'fonts'), { recursive: true });
fs.cpSync(path.join(assets, 'img'), path.join(out, 'img'), { recursive: true });
fs.writeFileSync(path.join(out, '.nojekyll'), '');

const urlOf = (code, p) => `${SITE.url}/${code === 'en' ? '' : `${code}/`}${p === 'index' ? '' : `${p}.html`}`;
const sm = [];
for (const p of Object.keys(PAGES)) for (const L of LANGS) sm.push(`<url><loc>${urlOf(L.lang, p)}</loc><lastmod>${UPDATED}</lastmod>${LANGS.map((a) => `<xhtml:link rel="alternate" hreflang="${a.html}" href="${urlOf(a.lang, p)}"/>`).join('')}</url>`);
for (const u of ['guides/', 'tools/', ...GUIDES.map((g) => `guides/${g.slug}.html`)]) sm.push(`<url><loc>${SITE.url}/${u}</loc><lastmod>${UPDATED}</lastmod></url>`);
fs.writeFileSync(path.join(out, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${sm.join('\n')}\n</urlset>\n`);
fs.writeFileSync(path.join(out, 'robots.txt'), `# Search engines and AI assistants are welcome.\nUser-agent: *\nAllow: /\n\nSitemap: ${SITE.url}/sitemap.xml\n`);
fs.writeFileSync(path.join(out, 'llms.txt'), `# Diskshaper

> Diskshaper is a free, open-source storage cleaner for macOS and Windows made by Hollowbit Studio (https://hollowbit.dev, also makers of Fileshaper and Captionshaper). It scans the drive in seconds, sorts what it finds into plain groups (Everyone, Gaming, Video editing), labels each group Safe or Check first, and moves only what the user picks to the Trash or Recycle Bin, so every clean can be undone.

## Key facts
- Maker: Hollowbit Studio (Elvis Zygmanta), https://hollowbit.dev
- Price: free, open source, no account, no ads, no paid tier.
- Platforms: macOS 11 or newer (Apple Silicon and Intel); Windows 10 and 11 (64-bit).
- Website languages: English, Spanish, French, German, Russian, Chinese.
- Privacy: nothing about the user or their files is sent anywhere. The only network request is a once-a-day check of GitHub for a newer version number, which can be turned off. Scanning reads file names, sizes and dates locally.
- Safety: never deletes outright (always Trash or Recycle Bin); never looks in macOS or Windows system folders; only Safe items are pre-selected.
- Gaming: shader caches (Steam, NVIDIA, AMD, Intel, DirectX), Steam and Epic leftovers after uninstall, unfinished downloads, launcher caches, games not played in 3 months (Steam, Epic, Heroic) with uninstall links, empty and full CrossOver bottles on Mac.
- Video editing: Premiere Pro media cache and peak files, After Effects disk cache, DaVinci Resolve CacheClip and proxies, Final Cut and CapCut caches, render previews and auto-saves next to projects, duplicate footage, old exports.
- Everyone: app caches (with app icons), developer tool downloads, old installers and zips in Downloads, duplicate photos, files over 1 GB unchanged for 3 months, old screen recordings.

## Links
- [Download](${SITE.url}/download.html)
- [Features](${SITE.url}/features.html)
- [FAQ](${SITE.url}/faq.html)
- [Free duplicate photo finder (browser, no upload)](${SITE.url}/tools/)
- [Privacy](${SITE.url}/privacy.html)
- [Source code](${SITE.github})
- [Hollowbit Studio](${SITE.studio})

## Guides
${GUIDES.map((g) => `- [${g.h1}](${SITE.url}/guides/${g.slug}.html): ${g.answer}`).join('\n')}

## FAQ
${allFaq(EN).map(([q, a]) => `### ${q}\n${a}`).join('\n\n')}
`);
console.log(`Built ${LANGS.length} languages x ${Object.keys(PAGES).length} pages, ${GUIDES.length} guides and the duplicate photo finder into docs/`);
