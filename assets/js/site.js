/* FIT//OS website — shared behaviour: nav, pricing, FAQ, smooth scroll, scroll-driven animation */
(function () {
  'use strict';
  var CFG = window.FITOS_SITE || {};
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia && matchMedia('(hover:hover) and (pointer:fine)').matches;
  var hasG = !!window.gsap;
  var NAV_H = 68;
  var fmt = function (n) { return Number(n).toLocaleString('en-US'); };
  var cur = CFG.currency || '৳';
  document.documentElement.classList.remove('no-js');

  /* ---------- toast ---------- */
  window.siteToast = function (msg) {
    var t = $('.toast'); if (!t) { t = document.createElement('div'); t.className = 'toast'; document.body.appendChild(t); }
    t.textContent = msg; t.classList.add('show'); clearTimeout(t._h); t._h = setTimeout(function () { t.classList.remove('show'); }, 2200);
  };

  /* ---------- nav ---------- */
  var nav = $('.nav');
  function onScroll() { if (nav) nav.classList.toggle('scrolled', window.scrollY > 24); }
  onScroll(); window.addEventListener('scroll', onScroll, { passive: true });
  var burger = $('.burger');
  if (burger) burger.addEventListener('click', function () {
    var open = nav.classList.toggle('open'); burger.setAttribute('aria-expanded', open);
    if (window.__lenis) open ? window.__lenis.stop() : window.__lenis.start();
    else document.documentElement.style.overflow = open ? 'hidden' : '';
  });
  $$('.mobile-menu a').forEach(function (a) { a.addEventListener('click', function () {
    nav.classList.remove('open'); if (window.__lenis) window.__lenis.start(); else document.documentElement.style.overflow = '';
  }); });
  var path = location.pathname.split('/').pop() || 'index.html';
  $$('.nav-links a').forEach(function (a) { var h = a.getAttribute('href'); if (h && h.split('#')[0] === path && !h.includes('#')) a.classList.add('active'); });

  /* ---------- config-driven bits ---------- */
  $$('[data-appurl]').forEach(function (a) { a.setAttribute('href', CFG.appUrl || 'app/'); });
  var c = CFG.contact || {};
  $$('[data-contact]').forEach(function (el) {
    var k = el.getAttribute('data-contact'), v = c[k];
    if (!v) { var box = el.closest('[data-contact-box]') || el; box.style.display = 'none'; return; }
    if (k === 'email') { el.setAttribute('href', 'mailto:' + v); var b = $('b', el); if (b) b.textContent = v; else el.textContent = v; }
    if (k === 'whatsapp') { el.setAttribute('href', 'https://wa.me/' + v.replace(/\D/g, '')); var b2 = $('b', el); if (b2) b2.textContent = '+' + v.replace(/\D/g, ''); }
    if (k === 'facebook') { el.setAttribute('href', v); }
    if (k === 'phone') { el.setAttribute('href', 'tel:' + v); var b3 = $('b', el); if (b3) b3.textContent = v; }
  });
  $$('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });

  /* ---------- pricing ---------- */
  var plans = CFG.plans || [];
  var monthly = (plans.filter(function (p) { return p.months === 1; })[0] || plans[0] || { price: 0 }).price;
  function saving(p) { var full = monthly * p.months; return full > p.price ? Math.round((1 - p.price / full) * 100) : 0; }
  var grid = $('#price-grid');
  if (grid) {
    grid.innerHTML = plans.map(function (p) {
      var sv = saving(p), per = Math.round(p.price / p.months);
      return '<article class="glass pcard tilt-card' + (p.tag === 'Best value' ? ' hot' : '') + '" data-tilt>'
        + '<span class="spot"></span>' + (p.tag ? '<span class="ptag">' + p.tag + '</span>' : '')
        + '<h3>' + p.label + '</h3>'
        + '<div class="pprice"><b>' + cur + fmt(p.price) + '</b><small>/ ' + (p.months === 1 ? 'month' : p.months === 12 ? 'year' : p.months + ' months') + '</small></div>'
        + '<div class="pper">' + (p.months > 1 ? cur + per + ' / month' + (sv ? ' · save ' + sv + '%' : '') : 'Flexible, cancel anytime') + '</div>'
        + '<ul><li>Unlimited goals, habits &amp; meals</li><li>AI Agent access</li><li>Instant Pro access after you pay</li><li>All current &amp; future Pro features</li></ul>'
        + '<a class="btn ' + (p.tag === 'Best value' ? 'btn-primary' : 'btn-ghost') + ' btn-block" data-magnetic href="checkout.html?plan=' + p.id + '">Choose ' + p.label + ' <span class="arr">→</span></a>'
        + '</article>';
    }).join('');
  }
  var cmp = $('#compare-body');
  if (cmp) {
    var F = CFG.free || {};
    var rows = [
      ['Goals', F.goals || 5, 'Unlimited'], ['Habits', F.habits || 8, 'Unlimited'], ['Meal library items', F.meals || 20, 'Unlimited'],
      ['AI Agent', '✕', '✓'], ['Ingredient library (main + personal)', '✓', '✓'], ['Cloud sync, all devices', '✓', '✓'], ['Install as app, works offline', '✓', '✓']
    ];
    cmp.innerHTML = rows.map(function (r) {
      var f = r[1] === '✕' ? '<span class="no">✕</span>' : (r[1] === '✓' ? '<span class="yes">✓</span>' : r[1]);
      var p = r[2] === '✓' ? '<span class="yes">✓</span>' : '<span class="yes">' + r[2] + '</span>';
      return '<tr><td>' + r[0] + '</td><td>' + f + '</td><td class="pro-col">' + p + '</td></tr>';
    }).join('');
  }

  /* ---------- FAQ ---------- */
  $$('.qa').forEach(function (qa) {
    var btn = $('button', qa), ans = $('.ans', qa);
    btn.addEventListener('click', function () {
      var open = qa.classList.toggle('open'); btn.setAttribute('aria-expanded', open);
      if (hasG) gsap.to(ans, { height: open ? 'auto' : 0, duration: .45, ease: 'power3.out' });
      else ans.style.height = open ? 'auto' : '0';
    });
  });

  /* ---------- pointer effects (desktop only) ---------- */
  if (fine && !reduce) {
    var glow = document.createElement('div'); glow.className = 'cursor-glow'; document.body.appendChild(glow);
    var gx = 0, gy = 0, tx = 0, ty = 0;
    window.addEventListener('pointermove', function (e) { tx = e.clientX; ty = e.clientY; glow.classList.add('on'); }, { passive: true });
    (function loop() { gx += (tx - gx) * .12; gy += (ty - gy) * .12; glow.style.transform = 'translate(' + gx + 'px,' + gy + 'px)'; requestAnimationFrame(loop); })();
    document.addEventListener('pointermove', function (e) {
      var card = e.target.closest && e.target.closest('[data-tilt]');
      $$('[data-tilt]').forEach(function (el) { if (el !== card) { el.style.transform = ''; } });
      if (!card) return;
      var r = card.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      card.style.setProperty('--mx', (x * 100) + '%'); card.style.setProperty('--my', (y * 100) + '%');
      if (!card.classList.contains('pcard')) card.style.transform = 'perspective(900px) rotateX(' + ((.5 - y) * 6) + 'deg) rotateY(' + ((x - .5) * 8) + 'deg) translateY(-4px)';
    });
    document.addEventListener('pointerleave', function () { $$('[data-tilt]').forEach(function (el) { el.style.transform = ''; }); });
    $$('[data-magnetic]').forEach(function (b) {
      b.addEventListener('pointermove', function (e) { var r = b.getBoundingClientRect(); b.style.transform = 'translate(' + ((e.clientX - r.left - r.width / 2) * .22) + 'px,' + ((e.clientY - r.top - r.height / 2) * .35) + 'px)'; });
      b.addEventListener('pointerleave', function () { b.style.transform = ''; });
    });
  }

  /* ---------- animations ---------- */
  if (!hasG) { $$('.rv').forEach(function (el) { el.style.opacity = 1; el.style.transform = 'none'; }); $$('.manifesto .w').forEach(function (w) { w.style.opacity = 1; }); return; }
  gsap.registerPlugin(window.ScrollTrigger);

  /* smooth scroll */
  if (window.Lenis && !reduce) {
    var lenis = new Lenis({ lerp: .09, wheelMultiplier: 1 });
    window.__lenis = lenis;
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
  }
  $$('a[href^="#"], a[href*="index.html#"], a[href^="/#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var h = a.getAttribute('href'), id = h.slice(h.indexOf('#')); if (id.length < 2) return;
      var isLocal = h.charAt(0) === '#' || h.split('#')[0] === '' || h.split('#')[0] === path || (h.split('#')[0] === 'index.html' && path === 'index.html') || (h.split('#')[0] === '/' && (path === '' || path === 'index.html'));
      var el = $(id); if (!el || !isLocal) return;
      e.preventDefault(); nav && nav.classList.remove('open');
      if (window.__lenis) { window.__lenis.start(); window.__lenis.scrollTo(el, { offset: -NAV_H + 1, duration: 1.4 }); } else el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
    });
  });

  /* scroll progress */
  var bar = $('.scroll-progress');
  if (bar) ScrollTrigger.create({ start: 0, end: 'max', onUpdate: function (s) { bar.style.transform = 'scaleX(' + s.progress + ')'; } });

  if (reduce) { $$('.rv').forEach(function (el) { el.style.opacity = 1; el.style.transform = 'none'; }); $$('.manifesto .w').forEach(function (w) { w.style.opacity = 1; }); return; }

  /* split headings into masked words */
  function splitWords(el) {
    if (el._split) return el._split; var out = [];
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === 3) {
          var frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(function (tok) {
            if (!tok) return; if (/^\s+$/.test(tok)) { frag.appendChild(document.createTextNode(' ')); return; }
            var m = document.createElement('span'); m.className = 'word-mask'; var w = document.createElement('span'); w.className = 'word'; w.textContent = tok; m.appendChild(w); frag.appendChild(m); out.push(w);
          });
          node.replaceChild(frag, n);
        } else if (n.nodeType === 1 && n.tagName !== 'BR') walk(n);
      });
    })(el);
    el._split = out; return out;
  }
  $$('.split').forEach(function (h) {
    var words = splitWords(h);
    gsap.set(words, { yPercent: 115, rotate: 4 });
    var play = function () { gsap.to(words, { yPercent: 0, rotate: 0, duration: 1.05, ease: 'expo.out', stagger: .055 }); };
    if (h.hasAttribute('data-now')) gsap.delayedCall(.15, play);
    else ScrollTrigger.create({ trigger: h, start: 'top 88%', once: true, onEnter: play });
  });

  /* generic reveals */
  gsap.utils.toArray('.rv').forEach(function (el) {
    var d = parseFloat(el.getAttribute('data-d') || 0);
    if (el.hasAttribute('data-now')) { gsap.to(el, { opacity: 1, y: 0, duration: 1, delay: .5 + d, ease: 'power3.out' }); return; }
    gsap.to(el, { opacity: 1, y: 0, duration: 1, delay: d, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 90%', once: true } });
  });
  /* staggered groups */
  $$('[data-stagger]').forEach(function (g) {
    var kids = Array.prototype.slice.call(g.children);
    gsap.set(kids, { opacity: 0, y: 40 });
    ScrollTrigger.create({ trigger: g, start: 'top 85%', once: true, onEnter: function () { gsap.to(kids, { opacity: 1, y: 0, duration: .9, ease: 'power3.out', stagger: .12 }); } });
  });

  /* manifesto — word by word, scrubbed by scroll */
  var man = $('.manifesto p');
  if (man) {
    var ws = [];
    (function walk(node, hl) {
      Array.prototype.slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === 3) {
          var frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(function (tok) { if (!tok) return; if (/^\s+$/.test(tok)) { frag.appendChild(document.createTextNode(' ')); return; }
            var s = document.createElement('span'); s.className = 'w' + (hl ? ' hl' : ''); s.textContent = tok; frag.appendChild(s); ws.push(s); });
          node.replaceChild(frag, n);
        } else if (n.nodeType === 1) walk(n, hl || n.tagName === 'EM');
      });
    })(man, false);
    gsap.to(ws, { opacity: 1, ease: 'none', stagger: .12, scrollTrigger: { trigger: man, start: 'top 82%', end: 'bottom 48%', scrub: .6 } });
  }

  /* counters */
  $$('[data-count]').forEach(function (el) {
    var end = parseFloat(el.getAttribute('data-count')), suf = el.getAttribute('data-suffix') || '', o = { v: 0 };
    ScrollTrigger.create({ trigger: el, start: 'top 90%', once: true, onEnter: function () {
      gsap.to(o, { v: end, duration: 1.8, ease: 'power2.out', onUpdate: function () { el.textContent = Math.round(o.v) + suf; } });
    } });
  });

  /* parallax layers */
  $$('[data-parallax]').forEach(function (el) {
    var k = parseFloat(el.getAttribute('data-parallax')) || .2;
    gsap.to(el, { yPercent: k * 100, ease: 'none', scrollTrigger: { trigger: el.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } });
  });

  /* hero intro + pointer parallax on the phone */
  var heroPhone = $('.hero .phone');
  if (heroPhone) {
    gsap.from(heroPhone, { y: 80, rotateY: -28, rotateX: 10, opacity: 0, duration: 1.6, ease: 'expo.out', delay: .35 });
    gsap.from('.float-chip', { scale: .6, opacity: 0, duration: 1, ease: 'back.out(1.6)', stagger: .15, delay: 1 });
    if (fine) {
      var stage = $('.hero-stage');
      stage.addEventListener('pointermove', function (e) {
        var r = stage.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
        gsap.to(heroPhone, { rotateY: x * 22, rotateX: -y * 14, duration: .8, ease: 'power3.out' });
      });
      stage.addEventListener('pointerleave', function () { gsap.to(heroPhone, { rotateY: -8, rotateX: 4, duration: 1.2, ease: 'power3.out' }); });
    }
    gsap.set(heroPhone, { rotateY: -8, rotateX: 4 });
  }

  /* showcase — pinned phone, screens change with scroll */
  var show = $('.showcase');
  if (show) {
    var steps = $$('.show-step', show), imgs = $$('.phone .screen img', show), fill = $('.show-bar i', show), phone = $('.phone', show), n = steps.length;
    var setOn = function (i) { steps.forEach(function (s, k) { s.classList.toggle('on', k === i); }); imgs.forEach(function (im, k) { im.classList.toggle('on', k === i); }); };
    setOn(0);
    var mm = gsap.matchMedia();
    mm.add('(min-width: 1001px)', function () {
      var st = ScrollTrigger.create({ trigger: $('.show-pin', show), start: 'top top', end: '+=' + (n * 85) + '%', pin: true, scrub: true,
        onUpdate: function (s) {
          var i = Math.min(n - 1, Math.floor(s.progress * n)); setOn(i);
          if (fill) fill.style.height = (s.progress * 100) + '%';
          gsap.set(phone, { rotateY: -18 + s.progress * 36, rotateX: 6 - s.progress * 12, y: Math.sin(s.progress * Math.PI) * -14 });
        } });
      steps.forEach(function (s, i) { s.onclick = function () { var y = st.start + (st.end - st.start) * ((i + .5) / n); window.__lenis ? window.__lenis.scrollTo(y, { duration: 1.2 }) : window.scrollTo({ top: y, behavior: 'smooth' }); }; });
    });
    mm.add('(max-width: 1000px)', function () {
      var i = 0, t = setInterval(function () { i = (i + 1) % n; setOn(i); }, 3600);
      steps.forEach(function (s, k) { s.onclick = function () { i = k; setOn(k); }; });
      return function () { clearInterval(t); };
    });
  }

  /* horizontal features */
  var hz = $('.hz');
  if (hz) {
    var track = $('.hz-track', hz), prog = $('.hz-progress i', hz), pin = $('.hz-pin', hz);
    var mm2 = gsap.matchMedia();
    mm2.add('(min-width: 821px)', function () {
      var dist = function () { return Math.max(0, track.scrollWidth - window.innerWidth + 40); };
      gsap.to(track, { x: function () { return -dist(); }, ease: 'none', scrollTrigger: { trigger: pin, start: 'top top', end: function () { return '+=' + dist(); }, pin: true, scrub: .8, invalidateOnRefresh: true,
        onUpdate: function (s) { if (prog) prog.style.width = (s.progress * 100) + '%'; } } });
    });
  }

  /* steps / cards entrance */
  gsap.utils.toArray('.steps .step').forEach(function (s, i) {
    gsap.from(s, { y: 60, opacity: 0, duration: 1, delay: i * .12, ease: 'power3.out', scrollTrigger: { trigger: '.steps', start: 'top 82%', once: true } });
  });

  window.addEventListener('load', function () { ScrollTrigger.refresh(); });
})();
