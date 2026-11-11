// Builds the Diskshaper website into docs/ (GitHub Pages, served at hollowbit.dev/diskshaper).
// Pages, search guides, the browser duplicate photo finder, 404, sitemap, robots and llms.txt.
// Run: npm run site
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { T, UPDATED } from './content.mjs';
import { GUIDES } from './guides.mjs';

const here = path.dirname(new URL(import.meta.url).pathname);
const root = path.resolve(here, '..');
const out = path.join(root, 'docs');
const V = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).version;
const SITE = {
  url: 'https://hollowbit.dev/diskshaper', base: '/diskshaper/',
  github: 'https://github.com/hollowbit-dev/diskshaper', tip: 'https://ko-fi.com/hollowbit',
  studio: 'https://hollowbit.dev', fileshaper: 'https://fileshaper.app', captionshaper: 'https://captionshaper.app',
};
const FILES = { mac: `Diskshaper-${V}-mac-arm64.dmg`, macIntel: `Diskshaper-${V}-mac-x64.dmg`, win: `Diskshaper-Setup-${V}-win-x64.exe` };
const DL = `${SITE.github}/releases/latest/download/`;
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function sha(file) {
  const p = path.join(root, 'dist', file);
  return fs.existsSync(p) ? crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex') : 'build the installers to fill this in';
}

// ---------- structured data ----------
const ORG_LD = { '@context': 'https://schema.org', '@type': 'Organization', name: 'Hollowbit Studio', url: SITE.studio, logo: `${SITE.url}/img/icon-256.png`, founder: { '@type': 'Person', name: 'Elvis Zygmanta' }, sameAs: ['https://github.com/hollowbit-dev', SITE.fileshaper, SITE.captionshaper] };
const APP_LD = {
  '@context': 'https://schema.org', '@type': 'SoftwareApplication', name: 'Diskshaper', applicationCategory: 'UtilitiesApplication',
  operatingSystem: 'macOS 11 or later, Windows 10, Windows 11', softwareVersion: V, description: T.meta.desc,
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' }, downloadUrl: `${SITE.url}/download.html`,
  publisher: { '@type': 'Organization', name: 'Hollowbit Studio', url: SITE.studio }, image: `${SITE.url}/img/og.png`, screenshot: `${SITE.url}/img/app-overview.webp`,
  featureList: ['Storage scan in seconds, sorted into plain groups', 'Shader caches, Steam and Epic leftovers, unplayed games, CrossOver bottles', 'Premiere, After Effects, DaVinci Resolve and Final Cut caches and render previews', 'Old installers, duplicate photos and footage, huge forgotten files', 'Safe and Check first labels', 'Everything goes to the Trash or Recycle Bin'],
};
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
  doc: I('<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/>'),
  photos: I('<rect x="7" y="3" width="14" height="14" rx="2"/><path d="M17 17v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h1"/><path d="M7 13l3.5-3.5L14 13l2-2 5 5"/>'),
  menu: I('<path d="M4 7h16M4 12h16M4 17h16"/>'),
};
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

// The hero's live replica of the app (animated by site.js).
const DEMO_CATS = [
  ['gamers', 'Shader caches', 'Safe', 7.6e9], ['creators', 'Video editing caches', 'Safe', 37.1e9], ['gamers', 'Leftovers from uninstalled games', 'Safe', 6.1e9],
  ['everyone', 'App caches', 'Safe', 5.2e9], ['creators', 'Render previews', 'Safe', 14.5e9], ['everyone', 'Old installers', 'Safe', 3.98e9],
  ['everyone', 'Duplicate photos', 'Check first', 2.4e9], ['creators', 'Duplicate footage', 'Check first', 14.6e9], ['gamers', 'Games you stopped playing', 'Check first', 41.2e9],
];
const heroDemo = () => `<div class="demo" aria-label="Animation of Diskshaper scanning a drive and moving safe items to the Trash" role="img">
  <div class="demo-top"><span class="dots"><i></i><i></i><i></i></span><span class="demo-brand"><img src="img/icon-64.png" alt="" width="16" height="16">Diskshaper</span><span></span></div>
  <div class="demo-body">
    <div class="demo-head"><div><div class="demo-k">Found</div><div class="demo-big"><span data-found>0</span><small data-unit>GB</small></div></div>
      <div class="demo-side"><div><div class="demo-k">Safe to clean</div><div class="demo-v safe" data-safe>0 GB</div></div></div></div>
    <div class="demo-bar" data-bar>${DEMO_CATS.map(([g, , s, b], i) => `<i class="g-${g}${s === 'Safe' ? ' is-safe' : ''}" data-i="${i}" style="--w:${b}"></i>`).join('')}</div>
    <div class="demo-rows">${DEMO_CATS.map(([g, t, s, b], i) => `<div class="demo-row" data-i="${i}" data-bytes="${b}" data-safe="${s === 'Safe' ? 1 : 0}"><b class="g-${g}"></b><span>${esc(t)}</span><em class="${s === 'Safe' ? 'safe' : 'check'}">${s}</em><strong>0 GB</strong></div>`).join('')}</div>
    <div class="demo-dock"><span><b data-sel>0 GB</b> selected</span><span class="demo-btn" data-btn>Move to Trash</span></div>
    <div class="demo-done" data-done><svg viewBox="0 0 52 52"><circle cx="26" cy="26" r="24"/><path d="M15 27l7 7 15-15"/></svg><b data-freed>0 GB</b><span>moved to the Trash. Put anything back until you empty it.</span></div>
    <div class="demo-cursor" data-cursor></div>
  </div>
</div>`;

// ---------- layout ----------
const NAV = [['features', 'Features'], ['tools/', 'Duplicate photo finder'], ['guides/', 'Guides'], ['faq', 'FAQ'], ['about', 'About']];
function layout(page, title, body, o = {}) {
  const pre = o.prefix || '';
  const href = (p) => pre + (p === 'index' ? './' : p.endsWith('/') ? p : `${p}.html`);
  const url = `${SITE.url}/${o.path ?? (page === 'index' ? '' : `${page}.html`)}`;
  const desc = o.desc || T.meta.desc;
  const ld = [ORG_LD, ...(o.jsonld || [])].map((j) => `<script type="application/ld+json">${JSON.stringify(j)}</script>`).join('\n');
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<script>document.documentElement.classList.add('js')</script>
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta name="theme-color" content="#09090b">
<meta name="author" content="Hollowbit Studio">
<meta property="og:type" content="${o.article ? 'article' : 'website'}">
<meta property="og:site_name" content="Diskshaper">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${SITE.url}/img/og.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(desc)}">
<meta name="twitter:image" content="${SITE.url}/img/og.png">
<link rel="canonical" href="${url}">
${ld}
<link rel="icon" type="image/png" href="${pre}favicon.png">
<link rel="preload" href="${pre}fonts/Geist-Variable.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="${pre}style.css?v=${V}">
</head>
<body data-page="${page}">
<a class="skip" href="#main">Skip to content</a>
<header class="nav"><div class="wrap nav-in">
  <a class="logo" href="${href('index')}"><img src="${pre}img/icon-64.png" alt="" width="24" height="24">Diskshaper</a>
  <nav class="links" id="links" aria-label="Main">${NAV.map(([p, l]) => `<a href="${href(p)}"${(p === page || p === page + '/') ? ' aria-current="page"' : ''}>${esc(l)}</a>`).join('')}</nav>
  <div class="nav-end">
    <a class="btn btn-ghost btn-sm kofi" href="${SITE.tip}" target="_blank" rel="noopener">${ICON.heart}<span>Ko-fi</span></a>
    <a class="btn btn-primary btn-sm" href="${href('download')}">Download</a>
    <button class="menu-btn" aria-label="Menu" aria-expanded="false" aria-controls="links">${ICON.menu}</button>
  </div>
</div></header>
<main id="main">
${body}
</main>
<footer class="foot"><div class="wrap foot-grid">
  <div class="foot-brand"><a class="logo" href="${href('index')}"><img src="${pre}img/icon-64.png" alt="" width="22" height="22">Diskshaper</a><p>See what’s eating your storage. Clean only what’s safe.</p></div>
  <div class="foot-col"><p class="foot-h">Product</p><a href="${href('features')}">Features</a><a href="${href('download')}">Download</a><a href="${href('changelog')}">Changelog</a><a href="${href('tools/')}">Duplicate photo finder</a><a href="${href('guides/')}">Guides</a></div>
  <div class="foot-col"><p class="foot-h">Help</p><a href="${href('faq')}">FAQ</a><a href="${href('support')}">Support</a><a href="${href('privacy')}">Privacy</a></div>
  <div class="foot-col"><p class="foot-h">Hollowbit Studio</p><a href="${SITE.studio}">hollowbit.dev</a><a href="${href('about')}">About</a><a href="${SITE.fileshaper}">Fileshaper</a><a href="${SITE.captionshaper}">Captionshaper</a><a href="${SITE.github}" rel="noopener">GitHub</a></div>
</div>
<div class="wrap foot-legal"><span>Made by Hollowbit Studio</span><span>Free and open source</span></div></footer>
<script src="${pre}site.js?v=${V}" defer></script>
${o.tools ? `<script src="${pre}tools.js?v=${V}" defer></script>` : ''}
</body>
</html>
`;
}

const dlButtons = (pre = '', cls = 'cta') => `<div class="${cls}">
  <a class="btn btn-primary btn-lg" data-os="mac" href="${DL}${FILES.mac}">${ICON.apple}${esc(T.hero.mac)}</a>
  <a class="btn btn-ghost btn-lg" data-os="win" href="${DL}${FILES.win}">${ICON.win}${esc(T.hero.win)}</a>
</div>`;
const pageHero = (h1, lead = '', extra = '') => `<section class="page-hero"><div class="wrap narrow"><h1 class="reveal">${esc(h1)}</h1>${lead ? `<p class="lede reveal">${esc(lead)}</p>` : ''}${extra}</div></section>`;
const shot = (img, alt, pre = '') => `<figure class="shot reveal"><img src="${pre}img/${img}.webp" width="2560" height="1640" alt="${esc(alt)}" loading="lazy"></figure>`;

// ---------- pages ----------
const allFaq = [...T.faq, ...T.faqMore];
const PAGES = {
  index: () => `
<section class="hero"><div class="wrap">
  <p class="eyebrow reveal">${esc(T.hero.eyebrow)}</p>
  <h1 class="reveal">${esc(T.hero.h1)}</h1>
  <p class="lede reveal">${esc(T.hero.sub)}</p>
  ${dlButtons()}
  <p class="note reveal">${esc(T.hero.note)}</p>
  ${heroDemo()}
</div></section>
${T.groups.map((g, i) => `
<section class="split${i % 2 ? ' rev' : ''}" id="${g.id}"><div class="wrap split-in">
  <div class="split-text reveal"><p class="tag g-${g.id}">${GROUP_ICON[g.id]}${esc(g.h)}</p><h2>${esc(g.p.split('.')[0])}.</h2><p>${esc(g.p.split('.').slice(1).join('.').trim())}</p>
    <ul class="finds">${g.items.map(([n, d]) => `<li><b>${esc(n)}</b><span>${esc(d)}</span></li>`).join('')}</ul></div>
  ${shot(g.img, `Diskshaper showing ${g.h.toLowerCase()}`)}
</div></section>`).join('')}
<section class="safe"><div class="wrap">
  <div class="center narrow-ish"><h2 class="reveal">${esc(T.safe.h)}</h2><p class="lede reveal">${esc(T.safe.p)}</p></div>
  <div class="grid4">${T.safe.items.map(([h, p], i) => `<div class="card reveal" style="--d:${i}">${SAFE_ICONS[i]}<h3>${esc(h)}</h3><p>${esc(p)}</p></div>`).join('')}</div>
  ${shot('app-done', 'Diskshaper after cleaning: 75.6 GB moved to the Trash')}
</div></section>
<section class="extras"><div class="wrap two-col">
  <a class="panel link-panel reveal" href="tools/">${ICON.photos}<h3>Duplicate photo finder</h3><p>Pick a folder and see every duplicate and look-alike photo, right in your browser. Nothing is uploaded.</p><span class="link">Open the finder ${ICON.arrow}</span></a>
  <a class="panel link-panel reveal" href="guides/">${ICON.doc}<h3>Guides</h3><p>${GUIDES.slice(0, 4).map((g) => esc(g.h1)).join(' · ')}</p><span class="link">All guides ${ICON.arrow}</span></a>
</div></section>
<section id="faq"><div class="wrap narrow">
  <h2 class="reveal">Questions</h2>
  <div class="faq">${T.faq.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}</div>
  <p class="more"><a class="link" href="faq.html">All questions ${ICON.arrow}</a></p>
</div></section>
<section class="end"><div class="wrap center">
  <h2 class="reveal">Get your space back.</h2>
  ${dlButtons()}
  <p class="note">${esc(T.hero.note)}</p>
</div></section>`,

  features: () => `${pageHero('Everything Diskshaper finds', 'Three groups, about twenty kinds of clutter, each explained in plain words and marked Safe or Check first.', `<nav class="jump reveal">${T.groups.map((g) => `<a href="#${g.id}">${esc(g.h)}</a>`).join('')}<a href="#how">How it works</a></nav>`)}
${T.groups.map((g, i) => `
<section class="split${i % 2 ? ' rev' : ''}" id="${g.id}"><div class="wrap split-in">
  <div class="split-text reveal"><p class="tag g-${g.id}">${GROUP_ICON[g.id]}${esc(g.h)}</p><h2>${esc(g.p.split('.')[0])}.</h2>
    <ul class="finds">${g.items.map(([n, d]) => `<li><b>${esc(n)}</b><span>${esc(d)}</span></li>`).join('')}</ul></div>
  ${shot(g.id === 'gaming' ? 'app-gaming' : g.id === 'editing' ? 'app-creators' : 'app-overview', g.h)}
</div></section>`).join('')}
<section id="how"><div class="wrap narrow">
  <h2 class="reveal">How it works</h2>
  <ol class="howto">
    <li><b>Scan</b><span>Diskshaper reads your user folders, app caches and game libraries. It does not look in macOS or Windows system folders. On a typical computer this takes a few seconds.</span></li>
    <li><b>Sort</b><span>Everything it finds is put into a group, with the reason it is there and whether the app that made it will make it again.</span></li>
    <li><b>Pick</b><span>Safe items are ticked for you. Open any group to see each item, with game cover art, app icons and photo thumbnails, and change what is ticked.</span></li>
    <li><b>Move to the Trash</b><span>Nothing is deleted. You can put anything back until you empty the Trash or Recycle Bin.</span></li>
  </ol>
</div></section>
<section class="end"><div class="wrap center"><h2>Get your space back.</h2>${dlButtons()}<p class="note">${esc(T.hero.note)}</p></div></section>`,

  download: () => {
    const d = T.dl;
    return `${pageHero(d.h, `Version ${V}. Free, no account.`)}
<section class="tight"><div class="wrap narrow">
  <div class="dl-grid">
    <div class="card dl" data-os-card="mac"><div class="dl-os">${ICON.apple}<h2>Mac</h2></div><p>${esc(d.macReq)}</p>
      <a class="btn btn-primary" href="${DL}${FILES.mac}">${ICON.down}Apple Silicon (M1 and newer)</a>
      <a class="btn btn-ghost" href="${DL}${FILES.macIntel}">${ICON.down}Intel Mac</a></div>
    <div class="card dl" data-os-card="win"><div class="dl-os">${ICON.win}<h2>Windows</h2></div><p>${esc(d.winReq)}</p>
      <a class="btn btn-primary" href="${DL}${FILES.win}">${ICON.down}Download for Windows</a></div>
  </div>
  <h2 class="mt">First launch</h2>
  <div class="steps"><div><h3>Mac</h3><ol>${d.macSteps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol></div><div><h3>Windows</h3><ol>${d.winSteps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol></div></div>
  <p class="fine mt-s">${esc(d.why)}</p>
  <h2 class="mt">Check your download</h2><p class="prose">Compare the SHA-256 checksum of the file you downloaded with these.</p>
  <table class="kv sums"><tr><th scope="row">Mac (Apple Silicon)</th><td><code>${sha(FILES.mac)}</code></td></tr><tr><th scope="row">Mac (Intel)</th><td><code>${sha(FILES.macIntel)}</code></td></tr><tr><th scope="row">Windows</th><td><code>${sha(FILES.win)}</code></td></tr></table>
  <p class="mt-s"><a class="link" href="${SITE.github}/releases" rel="noopener">${ICON.gh}All releases and source code</a></p>
</div></section>`;
  },

  changelog: () => `${pageHero('Changelog', 'What changed in each version.')}
<section class="tight"><div class="wrap narrow">${T.changelog.map((e) => `
  <article class="release"><div class="rel-meta"><span class="ver">${esc(e.v)}</span><time>${esc(e.date)}</time></div>
  <div><h2>${esc(e.name)}</h2><ul>${e.items.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div></article>`).join('')}
</div></section>`,

  faq: () => `${pageHero('Questions and answers')}
<section class="tight"><div class="wrap narrow"><div class="faq">${allFaq.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}</div></div></section>`,

  about: () => {
    const a = T.about;
    return `${pageHero(a.h1, a.lead)}
<section class="tight"><div class="wrap narrow"><h2>Why Diskshaper</h2>${a.why.map((p) => `<p class="prose">${esc(p)}</p>`).join('')}</div></section>
<section class="tight"><div class="wrap narrow"><h2>House rules</h2>
  <dl class="facts">${a.rules.map(([k, v]) => `<div><dt>${ICON.check}${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl></div></section>
<section class="tight"><div class="wrap narrow two-col">
  <a class="panel link-panel" href="${SITE.fileshaper}"><h3>Fileshaper</h3><p>Compress, convert and fix any file, offline.</p></a>
  <a class="panel link-panel" href="${SITE.captionshaper}"><h3>Captionshaper</h3><p>Automatic subtitles and TikTok-style captions, offline.</p></a>
</div></section>`;
  },

  support: () => `${pageHero('Support')}
<section class="tight"><div class="wrap narrow two-col">
  <div class="panel"><h2>Something wrong?</h2><p>Found a bug, or something Diskshaper should find but doesn’t? Open an issue on GitHub. Say whether you use a Mac or a PC.</p><a class="btn btn-ghost" href="${SITE.github}/issues/new" rel="noopener">${ICON.gh}Open an issue</a></div>
  <div class="panel"><h2>Like it?</h2><p>Diskshaper is free and stays free. A tip on Ko-fi or a star on GitHub keeps it going.</p><div class="row"><a class="btn btn-primary" href="${SITE.tip}" rel="noopener">${ICON.heart}Tip on Ko-fi</a><a class="btn btn-ghost" href="${SITE.github}" rel="noopener">Star on GitHub</a></div></div>
</div></section>`,

  privacy: () => `${pageHero('Privacy', '', `<p class="fine">Updated ${new Date(UPDATED).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>`)}
<section class="tight"><div class="wrap narrow"><p class="callout">${esc(T.privacy.short)}</p>${T.privacy.sections.map(([h, b]) => `<h2>${esc(h)}</h2><p class="prose">${esc(b)}</p>`).join('')}</div></section>`,
};

const TITLES = { features: 'Features', download: 'Download', changelog: 'Changelog', faq: 'FAQ', about: 'About', support: 'Support', privacy: 'Privacy' };
const OPTS = {
  index: { jsonld: [APP_LD, FAQ_LD(T.faq)] },
  features: { desc: 'Everything Diskshaper finds: shader caches, game leftovers, unplayed games, CrossOver bottles, editing caches, render previews, duplicate footage and photos, old installers and huge files.' },
  download: { desc: `Download Diskshaper ${V} for Mac (Apple Silicon and Intel) or Windows. Free, no account, nothing uploaded.`, jsonld: [APP_LD] },
  changelog: { desc: 'What changed in each version of Diskshaper.' },
  faq: { desc: allFaq.slice(0, 3).map((x) => x[0]).join(' '), jsonld: [FAQ_LD(allFaq)] },
  about: { desc: T.about.lead },
  support: { desc: 'Get help with Diskshaper or support the project.' },
  privacy: { desc: T.privacy.short },
};

// ---------- guides + tools ----------
function guidePage(g) {
  const others = GUIDES.filter((x) => x.slug !== g.slug).slice(0, 4);
  return `<section class="page-hero guide-hero"><div class="wrap narrow">
  <nav class="crumbs" aria-label="Breadcrumb"><a href="../">Diskshaper</a><span>/</span><a href="./">Guides</a></nav>
  <h1>${esc(g.h1)}</h1>
  <div class="answer"><p>${esc(g.answer)}</p></div>
  <p class="fine">Updated ${new Date(UPDATED).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })} · Hollowbit Studio</p>
  ${g.tool ? `<div class="cta cta-left"><a class="btn btn-primary btn-lg" href="../tools/">${ICON.photos}Open the duplicate photo finder</a></div>` : dlButtons('../', 'cta cta-left')}
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
    { '@context': 'https://schema.org', '@type': 'Article', headline: g.title, description: g.desc, dateModified: UPDATED, author: { '@type': 'Organization', name: 'Hollowbit Studio' }, publisher: { '@type': 'Organization', name: 'Hollowbit Studio', url: SITE.studio }, mainEntityOfPage: url },
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
      <li><b>What is kept</b><span>For exact copies the oldest file is kept; for look-alikes the largest. Everything else is ticked, and you can change that.</span></li>
      <li><b>Moving copies</b><span>In Chrome and Edge the finder can move the ticked copies into a “Duplicates (Diskshaper)” folder inside the one you chose, so you can check them before deleting. Other browsers cannot change files, so you get a list to download instead.</span></li>
    </ol>
    <div class="panel mt"><h2>Check your whole drive</h2><p>The Diskshaper app finds duplicate photos and footage across your whole computer, plus caches, game leftovers and old installers, and moves what you pick to the Trash.</p>${dlButtons('../', 'cta cta-left')}</div>
  </div>
</div></section>`;
const notfound = () => `<section class="page-hero nf"><div class="wrap center"><h1>Nothing here.</h1><p class="lede">This page doesn’t exist. Maybe it was cleaned up.</p><div class="cta"><a class="btn btn-primary" href="${SITE.base}">Go home</a></div></div></section>`;

// ---------- write ----------
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(path.join(out, 'guides'), { recursive: true });
fs.mkdirSync(path.join(out, 'tools'), { recursive: true });
for (const [p, render] of Object.entries(PAGES)) {
  const title = p === 'index' ? T.meta.title : `${TITLES[p]} · Diskshaper`;
  fs.writeFileSync(path.join(out, `${p}.html`), layout(p, title, render(), OPTS[p]));
}
for (const g of GUIDES) fs.writeFileSync(path.join(out, 'guides', `${g.slug}.html`), layout('guides', `${g.title} · Diskshaper`, guidePage(g), { prefix: '../', path: `guides/${g.slug}.html`, desc: g.desc, jsonld: guideLd(g), article: true }));
fs.writeFileSync(path.join(out, 'guides', 'index.html'), layout('guides', 'Storage guides: free up space safely · Diskshaper', guideIndex(), { prefix: '../', path: 'guides/', desc: 'Free guides: clear shader caches, remove Steam leftovers, clear Premiere and Resolve caches, find duplicate photos, free up space on Mac and Windows.' }));
fs.writeFileSync(path.join(out, 'tools', 'index.html'), layout('tools', 'Free duplicate photo finder (in your browser, no upload) · Diskshaper', toolsPage(), { prefix: '../', path: 'tools/', tools: true,
  desc: 'Find duplicate and look-alike photos in any folder for free. Runs in your browser, nothing is uploaded. Works with JPG, PNG, HEIC and RAW.',
  jsonld: [{ '@context': 'https://schema.org', '@type': 'WebApplication', name: 'Diskshaper duplicate photo finder', url: `${SITE.url}/tools/`, applicationCategory: 'UtilitiesApplication', operatingSystem: 'Any (web browser)', offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' }, publisher: { '@type': 'Organization', name: 'Hollowbit Studio' } }] }));
// 404 is served for any missing path, so its links must be absolute.
fs.writeFileSync(path.join(out, '404.html'), layout('404', 'Not found · Diskshaper', notfound())
  .replace(/(href|src)="(?!https?:|#|\/|data:)([^"]*)"/g, (m, a, h) => `${a}="${SITE.base}${h.replace(/^\.\//, '')}"`));

const assets = path.join(here, 'assets');
for (const f of ['style.css', 'site.js', 'tools.js', 'favicon.png']) fs.copyFileSync(path.join(assets, f), path.join(out, f));
fs.cpSync(path.join(assets, 'fonts'), path.join(out, 'fonts'), { recursive: true });
fs.cpSync(path.join(assets, 'img'), path.join(out, 'img'), { recursive: true });
fs.writeFileSync(path.join(out, '.nojekyll'), '');

const urls = ['', ...Object.keys(PAGES).filter((p) => p !== 'index').map((p) => `${p}.html`), 'guides/', 'tools/', ...GUIDES.map((g) => `guides/${g.slug}.html`)];
fs.writeFileSync(path.join(out, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `<url><loc>${SITE.url}/${u}</loc><lastmod>${UPDATED}</lastmod></url>`).join('\n')}\n</urlset>\n`);
fs.writeFileSync(path.join(out, 'robots.txt'), `# Search engines and AI assistants are welcome.\nUser-agent: *\nAllow: /\n\nSitemap: ${SITE.url}/sitemap.xml\n`);
fs.writeFileSync(path.join(out, 'llms.txt'), `# Diskshaper

> Diskshaper is a free, open-source storage cleaner for macOS and Windows by Hollowbit Studio. It scans the drive in seconds, sorts what it finds into plain groups (Everyone, Gaming, Video editing), labels each group Safe or Check first, and moves only what the user picks to the Trash or Recycle Bin, so every clean can be undone.

## Key facts
- Price: free, open source, no account, no ads, no paid tier.
- Platforms: macOS 11 or newer (Apple Silicon and Intel); Windows 10 and 11 (64-bit).
- Privacy: the app makes no network requests. Scanning reads file names, sizes and dates locally.
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

## Guides
${GUIDES.map((g) => `- [${g.h1}](${SITE.url}/guides/${g.slug}.html): ${g.answer}`).join('\n')}

## FAQ
${allFaq.map(([q, a]) => `### ${q}\n${a}`).join('\n\n')}
`);
console.log(`Built ${Object.keys(PAGES).length} pages, ${GUIDES.length} guides and the duplicate photo finder into docs/`);
