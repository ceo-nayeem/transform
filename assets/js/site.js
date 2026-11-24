/* FIT//OS website — shared behaviour (lean, no animation libraries):
   theme toggle (dark/light, shared with the app) · nav · pricing · FAQ · showcase tabs · button carousels · reveal · counters */
(function () {
  'use strict';
  var CFG = window.FITOS_SITE || {};
  var root = document.documentElement;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fmt = function (n) { return Number(n).toLocaleString('en-US'); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var cur = CFG.currency || '৳';
  root.classList.remove('no-js'); root.classList.add('js');

  /* ---------- toast ---------- */
  window.siteToast = function (msg) {
    var t = $('.toast'); if (!t) { t = document.createElement('div'); t.className = 'toast'; document.body.appendChild(t); }
    t.textContent = msg; t.classList.add('show'); clearTimeout(t._h); t._h = setTimeout(function () { t.classList.remove('show'); }, 2400);
  };

  /* ---------- creator coupon links: any page, e.g. index.html?coupon=RAFI10 → remembered 30 days, applied at checkout ---------- */
  try {
    var cq = new URLSearchParams(location.search).get('coupon'), cc = String(cq || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 20);
    if (cc.length >= 3 && !/[?&]cmspreview=1/.test(location.search)) {
      try { localStorage.setItem('fitos_coupon', JSON.stringify({ code: cc, ts: Date.now() })); } catch (e) { /* storage blocked */ }
      if (!/checkout\.html$/.test(location.pathname)) setTimeout(function () { window.siteToast('🏷️ Coupon ' + cc + ' saved — it will be applied at checkout.'); }, 900);
    }
  } catch (e) { /* ignore */ }

  /* ---------- theme (only dark + light; same localStorage key as the app) ---------- */
  function curTheme() { return root.getAttribute('data-theme') === 'light' ? 'light' : 'dark'; }
  function paintTheme(t) {
    root.setAttribute('data-theme', t);
    var m = $('meta[name="theme-color"]'); if (m) m.setAttribute('content', t === 'light' ? '#eceeef' : '#0a0d0c');
    $$('.theme-btn').forEach(function (b) { b.setAttribute('aria-label', t === 'light' ? 'Switch to dark mode' : 'Switch to light mode'); b.setAttribute('title', t === 'light' ? 'Dark mode' : 'Light mode'); });
    var lbl = $('.mm-theme span'); if (lbl) lbl.textContent = t === 'light' ? 'Light mode' : 'Dark mode';
  }
  function setTheme(t) { paintTheme(t); try { localStorage.setItem('fitos_theme', t); } catch (e) { /* storage blocked */ } }
  paintTheme(curTheme());
  $$('.theme-btn').forEach(function (b) { b.addEventListener('click', function () { setTheme(curTheme() === 'light' ? 'dark' : 'light'); }); });
  window.addEventListener('storage', function (e) { if (e.key === 'fitos_theme') paintTheme(e.newValue === 'light' || e.newValue === 'alpha' ? 'light' : 'dark'); });

  /* ---------- Login button: the app restores a saved session on its own, so signed-in people go straight in ---------- */
  try { if (localStorage.getItem('fitos_session')) $$('.btn-login').forEach(function (b) { b.setAttribute('data-signed', ''); b.setAttribute('title', 'You are signed in — opens the app directly'); }); } catch (e) { /* storage blocked */ }

  /* ---------- nav ---------- */
  var nav = $('.nav'), burger = $('.burger');
  function onScroll() { if (nav) nav.classList.toggle('scrolled', window.scrollY > 16); }
  onScroll(); window.addEventListener('scroll', onScroll, { passive: true });
  function menu(open) { if (!nav) return; nav.classList.toggle('open', open); if (burger) burger.setAttribute('aria-expanded', open ? 'true' : 'false'); }
  if (burger) burger.addEventListener('click', function () { menu(!nav.classList.contains('open')); });
  $$('.mobile-menu a').forEach(function (a) { a.addEventListener('click', function () { menu(false); }); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') menu(false); });
  document.addEventListener('click', function (e) { if (nav && nav.classList.contains('open') && !e.target.closest('.nav') && !e.target.closest('.mobile-menu .mm-card')) menu(false); });
  window.addEventListener('resize', function () { if (window.innerWidth > 900) menu(false); });
  var path = location.pathname.split('/').pop() || 'index.html';
  $$('.nav-links a').forEach(function (a) { var h = a.getAttribute('href'); if (h && h.split('#')[0] === path && h.indexOf('#') < 0) a.classList.add('active'); });

  /* ---------- config-driven bits (re-runnable: the Website Studio can change the config live) ---------- */
  function renderConfig() {
    CFG = window.FITOS_SITE || CFG; cur = CFG.currency || '৳';
    $$('[data-appurl]').forEach(function (a) { a.setAttribute('href', CFG.appUrl || 'app/'); });
    var c = CFG.contact || {};
    $$('[data-contact]').forEach(function (el) {
      var k = el.getAttribute('data-contact'), v = c[k], box = el.closest('[data-contact-box]') || el;
      if (!v) { box.style.display = 'none'; return; }
      box.style.display = '';
      if (k === 'email') { el.setAttribute('href', 'mailto:' + v); var b = $('b', el); if (b) b.textContent = v; else el.textContent = v; }
      if (k === 'whatsapp') { el.setAttribute('href', 'https://wa.me/' + v.replace(/\D/g, '')); var b2 = $('b', el); if (b2) b2.textContent = '+' + v.replace(/\D/g, ''); }
      if (k === 'facebook') { el.setAttribute('href', v); }
      if (k === 'phone') { el.setAttribute('href', 'tel:' + v); var b3 = $('b', el); if (b3) b3.textContent = v; }
    });
    $$('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });

    var plans = CFG.plans || [];
    var monthly = (plans.filter(function (p) { return p.months === 1; })[0] || plans[0] || { price: 0 }).price;
    var saving = function (p) { var full = monthly * p.months; return full > p.price ? Math.round((1 - p.price / full) * 100) : 0; };
    var grid = $('#price-grid');
    if (grid) {
      grid.innerHTML = plans.map(function (p) {
        var sv = saving(p), per = Math.round(p.price / p.months), hot = p.tag === 'Best value';
        return '<article class="pcard' + (hot ? ' hot' : '') + '">' + (p.tag ? '<span class="ptag">' + esc(p.tag) + '</span>' : '')
          + '<h3>' + esc(p.label) + '</h3>'
          + '<div class="pprice"><b>' + esc(cur) + fmt(p.price) + '</b><small>/ ' + (p.months === 1 ? 'month' : p.months === 12 ? 'year' : p.months + ' months') + '</small></div>'
          + '<div class="pper">' + (p.months > 1 ? esc(cur) + per + ' / month' + (sv ? ' · save ' + sv + '%' : '') : 'Flexible, cancel anytime') + '</div>'
          + '<ul><li>Unlimited goals, habits &amp; meals</li><li>AI Agent access</li><li>Instant Pro access after you pay</li><li>All current &amp; future Pro features</li></ul>'
          + '<a class="btn ' + (hot ? 'btn-primary' : 'btn-ghost') + ' btn-block" href="checkout.html?plan=' + encodeURIComponent(p.id) + '">Choose ' + esc(p.label) + ' <span class="arr">→</span></a></article>';
      }).join('');
    }
    var cmp = $('#compare-body');
    if (cmp) {
      var F = CFG.free || {};
      var rows = [['Goals', F.goals || 5, 'Unlimited'], ['Habits', F.habits || 8, 'Unlimited'], ['Meal library items', F.meals || 20, 'Unlimited'],
        ['AI Agent', '✕', '✓'], ['Ingredient library (main + personal)', '✓', '✓'], ['Cloud sync, all devices', '✓', '✓'], ['Install as app, works offline', '✓', '✓']];
      cmp.innerHTML = rows.map(function (r) {
        var f = r[1] === '✕' ? '<span class="no">✕</span>' : (r[1] === '✓' ? '<span class="yes">✓</span>' : esc(r[1]));
        var p = '<span class="yes">' + esc(r[2]) + '</span>';
        return '<tr><td>' + esc(r[0]) + '</td><td>' + f + '</td><td class="pro-col">' + p + '</td></tr>';
      }).join('');
    }
  }
  renderConfig(); window.__fitosRender = renderConfig;

  /* ---------- FAQ ---------- */
  $$('.qa').forEach(function (qa) {
    var btn = $('button', qa); if (!btn) return;
    btn.addEventListener('click', function () { var open = qa.classList.toggle('open'); btn.setAttribute('aria-expanded', open ? 'true' : 'false'); });
  });

  /* ---------- showcase: tabs ↔ phone screens ---------- */
  var show = $('.showcase');
  if (show) {
    var steps = $$('.show-step', show), imgs = $$('.phone-in img', show), cur0 = 0, timer = null, stopped = false, visible = true;
    var setOn = function (i) {
      cur0 = i;
      steps.forEach(function (s, k) { s.classList.toggle('on', k === i); s.setAttribute('aria-selected', k === i ? 'true' : 'false'); });
      imgs.forEach(function (im) { im.classList.toggle('on', +im.getAttribute('data-i') === i); });
    };
    var play = function () { clearInterval(timer); if (reduce || stopped) return; timer = setInterval(function () { if (visible && !document.hidden) setOn((cur0 + 1) % steps.length); }, 4800); };
    steps.forEach(function (s, k) {
      var go = function () { stopped = true; clearInterval(timer); setOn(k); };
      s.addEventListener('click', go);
      s.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
    });
    setOn(0); play();
    if ('IntersectionObserver' in window) new IntersectionObserver(function (en) { visible = en[0].isIntersecting; }, { threshold: .15 }).observe(show);
  }

  /* ---------- carousels: prev / next buttons (+ dots, swipe, arrow keys) — never a horizontal scrollbar ---------- */
  function initCarousel(rootEl) {
    var view = $('.car-view', rootEl), track = $('.car-track', rootEl), slides = $$('.car-slide', track), prev = $('[data-car-prev]', rootEl), next = $('[data-car-next]', rootEl), dotsBox = $('.car-dots', rootEl);
    if (!view || !track || !slides.length) return;
    var i = 0, pv = 1, max = 0, dots = [];
    function offset(n) { return slides[n].offsetLeft - slides[0].offsetLeft; }
    function paint() {
      if (prev) prev.disabled = i <= 0; if (next) next.disabled = i >= max;
      dots.forEach(function (d, k) { d.classList.toggle('on', k === i); d.setAttribute('aria-current', k === i ? 'true' : 'false'); });
      slides.forEach(function (s, k) { var vis = k >= i && k < i + pv; s.setAttribute('aria-hidden', vis ? 'false' : 'true'); });
    }
    function go(n, instant) {
      i = Math.max(0, Math.min(max, n));
      if (instant) track.classList.add('drag');
      track.style.transform = 'translate3d(' + (-offset(i)) + 'px,0,0)';
      if (instant) { void track.offsetWidth; track.classList.remove('drag'); }
      paint();
    }
    function layout() {
      pv = parseInt(getComputedStyle(rootEl).getPropertyValue('--pv'), 10) || 1; max = Math.max(0, slides.length - pv);
      if (dotsBox) {
        dotsBox.innerHTML = ''; dots = [];
        for (var k = 0; k <= max; k++) (function (k) { var d = document.createElement('button'); d.type = 'button'; d.setAttribute('aria-label', 'Go to slide ' + (k + 1)); d.addEventListener('click', function () { go(k); }); dotsBox.appendChild(d); dots.push(d); })(k);
        dotsBox.style.display = max ? '' : 'none';
      }
      if (prev && next) { var hide = max === 0; prev.style.visibility = next.style.visibility = hide ? 'hidden' : ''; }
      go(Math.min(i, max), true);
    }
    if (prev) prev.addEventListener('click', function () { go(i - 1); });
    if (next) next.addEventListener('click', function () { go(i + 1); });
    rootEl.addEventListener('keydown', function (e) { if (e.key === 'ArrowLeft') go(i - 1); else if (e.key === 'ArrowRight') go(i + 1); });
    /* touch / mouse swipe */
    var sx = 0, sy = 0, dx = 0, drag = false, lock = null, pid = null;
    view.addEventListener('pointerdown', function (e) { if (e.pointerType === 'mouse' && e.button !== 0) return; sx = e.clientX; sy = e.clientY; dx = 0; drag = true; lock = null; pid = e.pointerId; });
    view.addEventListener('pointermove', function (e) {
      if (!drag || e.pointerId !== pid) return;
      dx = e.clientX - sx; var dy = e.clientY - sy;
      if (lock === null && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) lock = Math.abs(dx) > Math.abs(dy);
      if (lock) { track.classList.add('drag'); var edge = (i === 0 && dx > 0) || (i === max && dx < 0) ? .3 : 1; track.style.transform = 'translate3d(' + (-offset(i) + dx * edge) + 'px,0,0)'; }
    });
    var end = function (e) {
      if (!drag || (e && e.pointerId !== pid)) return; drag = false; track.classList.remove('drag');
      if (lock && Math.abs(dx) > 48) go(dx < 0 ? i + 1 : i - 1); else go(i);
    };
    view.addEventListener('pointerup', end); view.addEventListener('pointercancel', end); view.addEventListener('pointerleave', end);
    view.addEventListener('dragstart', function (e) { e.preventDefault(); });
    var rt; window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(layout, 120); });
    window.addEventListener('load', layout);
    layout();
  }
  $$('[data-carousel]').forEach(initCarousel);

  /* ---------- reveal on scroll + counters ---------- */
  var preview = root.classList.contains('cms-preview') || /[?&]cmspreview=1/.test(location.search);
  var rv = $$('.rv');
  if (!('IntersectionObserver' in window) || reduce || preview) { rv.forEach(function (el) { el.classList.add('in'); }); }
  else {
    var io = new IntersectionObserver(function (en) { en.forEach(function (x) { if (x.isIntersecting) { x.target.classList.add('in'); io.unobserve(x.target); } }); }, { threshold: .08, rootMargin: '0px 0px -6% 0px' });
    rv.forEach(function (el) { var d = parseFloat(el.getAttribute('data-d') || 0); if (d) el.style.setProperty('--d', d + 's'); io.observe(el); });
  }
  function count(el) {
    var end = parseFloat(el.getAttribute('data-count')), suf = el.getAttribute('data-suffix') || '';
    if (isNaN(end)) return;
    if (reduce) { el.textContent = Math.round(end) + suf; return; }
    var t0 = null, dur = 1400;
    (function step(t) { if (t0 === null) t0 = t; var p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3); el.textContent = Math.round(end * e) + suf; if (p < 1) requestAnimationFrame(step); })(performance.now());
  }
  var cnt = $$('[data-count]');
  if (!('IntersectionObserver' in window) || preview) cnt.forEach(function (el) { el.textContent = (el.getAttribute('data-count') || 0) + (el.getAttribute('data-suffix') || ''); });
  else { var io2 = new IntersectionObserver(function (en) { en.forEach(function (x) { if (x.isIntersecting) { count(x.target); io2.unobserve(x.target); } }); }, { threshold: .4 }); cnt.forEach(function (el) { io2.observe(el); }); }
})();
