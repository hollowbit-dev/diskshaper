(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const DS = window.DS || { lang: 'en', langs: ['en'] };
  const store = { get(k) { try { return localStorage.getItem(k); } catch { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch { /* private mode */ } } };

  // First visit: open the visitor's own language once. A manual choice always wins afterwards.
  if (!store.get('ds-lang') && DS.lang === 'en' && !DS.english) {
    const pref = (navigator.languages || [navigator.language || 'en']).map((l) => l.toLowerCase().slice(0, 2)).find((l) => DS.langs.includes(l));
    store.set('ds-lang', pref || 'en');
    if (pref && pref !== 'en') { location.replace(`${pref}/${location.pathname.split('/').pop()}${location.hash}`); return; }
  }
  $$('[data-set-lang]').forEach((a) => a.addEventListener('click', () => store.set('ds-lang', a.dataset.setLang)));
  document.addEventListener('click', (e) => { const open = $('details.lang[open]'); if (open && !open.contains(e.target)) open.removeAttribute('open'); });

  // nav: border once scrolled, menu on small screens
  const nav = $('.nav');
  // The nav's storage meter empties as you scroll down the page, right segment first.
  const meter = $$('.nav-meter i');
  const onScroll = () => {
    const h = document.documentElement.scrollHeight - innerHeight;
    const p = h > 0 ? Math.min(1, scrollY / h) : 0;
    meter.forEach((m, i) => { const start = (meter.length - 1 - i) / meter.length; m.style.setProperty('--k', Math.max(0, Math.min(1, 1 - (p - start) * meter.length)).toFixed(3)); });
  };
  addEventListener('scroll', onScroll, { passive: true }); onScroll();
  const menu = $('.menu-btn'), links = $('#links');
  menu?.addEventListener('click', () => { const o = links.classList.toggle('open'); menu.setAttribute('aria-expanded', o); });

  // put the visitor's own system first
  const ua = navigator.userAgent;
  const os = /Mac/i.test(ua) && !/iPhone|iPad/i.test(ua) ? 'mac' : /Win/i.test(ua) ? 'win' : null;
  if (os) {
    for (const cta of $$('.cta')) {
      const mine = $(`[data-os="${os}"]`, cta), other = $(`[data-os="${os === 'mac' ? 'win' : 'mac'}"]`, cta);
      if (mine && other) { mine.className = mine.className.replace('btn-ghost', 'btn-primary'); other.className = other.className.replace('btn-primary', 'btn-ghost'); cta.prepend(mine); }
    }
    $(`[data-os-card="${os}"]`)?.classList.add('mine');
  }

  // reveal on scroll
  const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px' });
  $$('.reveal, .demo-stage').forEach((el) => io.observe(el));

  // Spotlight that follows the pointer on link panels.
  $$('.link-panel').forEach((c) => c.addEventListener('pointermove', (e) => { const r = c.getBoundingClientRect(); c.style.setProperty('--mx', `${e.clientX - r.left}px`); c.style.setProperty('--my', `${e.clientY - r.top}px`); }));

  // Trash demo: files drop into the Trash, then one is put back.
  const td = $('.tdemo');
  if (td && !reduce) {
    const files = $$('.td-file', td), bin = $('.td-bin', td), back = $('.td-back', td), count = $('[data-td-count]', td);
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    let seen = false;
    new IntersectionObserver((es) => { seen = es[0].isIntersecting; }, { threshold: 0.3 }).observe(td);
    (async () => {
      for (;;) {
        files.forEach((f) => { f.style.transform = ''; f.style.opacity = ''; }); bin.classList.remove('full'); back.classList.remove('on');
        await wait(900); while (!seen) await wait(300);
        const b = bin.getBoundingClientRect();
        for (let i = 0; i < files.length; i++) {
          const r = files[i].getBoundingClientRect();
          files[i].style.transform = `translate(${b.left + b.width / 2 - r.left - r.width / 2}px, ${b.top + b.height / 2 - r.top - r.height / 2}px) scale(.3)`;
          files[i].style.opacity = '0';
          await wait(520);
          count.textContent = i + 1; bin.classList.add('full', 'bump'); await wait(160); bin.classList.remove('bump');
        }
        await wait(700); back.classList.add('on'); await wait(900);
        back.classList.add('press'); await wait(150); back.classList.remove('press');
        files[0].style.transform = ''; files[0].style.opacity = ''; count.textContent = files.length - 1;
        await wait(2600);
      }
    })();
  }

  // ---------- hero demo ----------
  const demo = $('.demo');
  if (!demo) return;
  const rows = $$('.demo-row', demo), segs = $$('.demo-bar i', demo);
  const found = $('[data-found]', demo), unit = $('[data-unit]', demo), safeEl = $('[data-safe]', demo);
  const dock = $('.demo-dock', demo), sel = $('[data-sel]', demo), btn = $('[data-btn]', demo);
  const done = $('[data-done]', demo), freed = $('[data-freed]', demo), cursor = $('[data-cursor]', demo);
  const bytes = rows.map((r) => Number(r.dataset.bytes)), isSafe = rows.map((r) => r.dataset.safe === '1');
  const split = (b) => (b < 1e8 ? ['0', 'GB'] : b >= 1e9 ? [(b / 1e9).toFixed(b >= 1e11 ? 0 : 1), 'GB'] : [String(Math.round(b / 1e6)), 'MB']);
  const fmt = (b) => split(b).join(' ');
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const tweens = new Map();
  function count(el, to, ms = 700, unitEl) {
    const from = tweens.get(el) || 0, t0 = performance.now();
    return new Promise((res) => {
      const step = (t) => {
        const k = Math.min(1, (t - t0) / ms), v = from + (to - from) * (1 - Math.pow(1 - k, 4));
        if (unitEl) { const [n, u] = split(v); el.textContent = n; unitEl.textContent = u; } else el.textContent = fmt(v);
        tweens.set(el, v);
        k < 1 ? requestAnimationFrame(step) : res();
      };
      requestAnimationFrame(step);
    });
  }
  const set = (el, v, unitEl) => { tweens.set(el, v); if (unitEl) { const [n, u] = split(v); el.textContent = n; unitEl.textContent = u; } else el.textContent = fmt(v); };
  const total = bytes.reduce((a, b) => a + b, 0), safeTotal = bytes.reduce((a, b, i) => a + (isSafe[i] ? b : 0), 0);

  function reset() {
    rows.forEach((r) => { r.classList.remove('on', 'gone'); $('strong', r).textContent = '0 GB'; tweens.delete($('strong', r)); });
    segs.forEach((s) => s.classList.remove('on', 'gone'));
    [dock, done, cursor].forEach((x) => x.classList.remove('on'));
    set(found, 0, unit); set(safeEl, 0); set(sel, 0); set(freed, 0);
    cursor.style.transition = 'none'; cursor.style.transform = 'translate(40px, 60px)';
  }
  function finalState() {
    rows.forEach((r, i) => { r.classList.add('on'); $('strong', r).textContent = fmt(bytes[i]); });
    segs.forEach((s) => s.classList.add('on'));
    set(found, total, unit); set(safeEl, safeTotal); set(sel, safeTotal); dock.classList.add('on');
  }

  let visible = false, running = false;
  async function waitVisible() { while (!visible) await sleep(250); }
  async function loop() {
    if (running) return; running = true;
    for (;;) {
      reset();
      await sleep(500); await waitVisible();
      // scan: each group lands, the bar grows, the total counts up
      let sum = 0, safeSum = 0;
      for (let i = 0; i < rows.length; i++) {
        rows[i].classList.add('on'); segs[i].classList.add('on');
        count($('strong', rows[i]), bytes[i], 600);
        sum += bytes[i]; if (isSafe[i]) safeSum += bytes[i];
        count(found, sum, 500, unit); count(safeEl, safeSum, 500);
        await sleep(330);
      }
      await sleep(500);
      dock.classList.add('on'); count(sel, safeTotal, 600);
      await sleep(900);
      // the cursor goes to the button and presses it
      const body = $('.demo-body', demo).getBoundingClientRect(), b = btn.getBoundingClientRect();
      cursor.style.transition = 'none'; cursor.style.transform = `translate(${b.left - body.left + b.width * 0.55 + 60}px, ${b.top - body.top - 70}px)`;
      cursor.offsetWidth; cursor.classList.add('on'); cursor.style.transition = '';
      await sleep(80);
      cursor.style.transform = `translate(${b.left - body.left + b.width * 0.55}px, ${b.top - body.top + b.height * 0.45}px)`;
      await sleep(1100);
      btn.classList.add('press'); await sleep(160); btn.classList.remove('press');
      // safe items leave the bar one by one
      let left = total;
      for (let i = 0; i < rows.length; i++) {
        if (!isSafe[i]) continue;
        rows[i].classList.add('gone'); segs[i].classList.add('gone');
        left -= bytes[i]; count(found, left, 400, unit);
        await sleep(110);
      }
      count(sel, 0, 500); count(safeEl, 0, 500); cursor.classList.remove('on');
      await sleep(450);
      done.classList.add('on'); count(freed, safeTotal, 1000);
      await sleep(3200);
      done.classList.remove('on');
      await sleep(600);
    }
  }
  new IntersectionObserver((es) => { visible = es[0].isIntersecting; if (visible && !reduce) loop(); }, { threshold: 0.25 }).observe(demo);
  if (reduce) finalState();
})();
