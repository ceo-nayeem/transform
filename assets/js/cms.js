/* =====================================================================
   FIT//OS — Website Studio runtime.
   The owner edits the website from  Admin Backend → Website Studio.
   Published changes live in Firestore  site/content  (one public-read document).
   This script applies them on every page BEFORE the animation code runs:
     text · links · images · stat numbers · section visibility · theme · banner · SEO · prices · payment numbers · contact · custom CSS
   Safety: text is sanitised (em/b/strong/i/u/br/small/sub/sup/span.grad only), URLs are scheme-checked,
   and only the owner can write the document (Firestore Security Rules). If anything fails the site simply shows its built-in content.
   ===================================================================== */
(function () {
  'use strict';
  var root = document.documentElement;
  var CFG = window.FITOS_SITE || (window.FITOS_SITE = {});
  var BASE = JSON.parse(JSON.stringify(CFG));
  var PAGE = root.getAttribute('data-cms-page') || 'home';
  var LS = 'fitos_cms_v1';
  var preview = /[?&]cmspreview=1/.test(location.search) && window.parent && window.parent !== window;
  var FONTS = {
    'Inter': 'Inter', 'Plus Jakarta Sans': 'Plus+Jakarta+Sans:wght@600;700;800', 'Space Grotesk': 'Space+Grotesk:wght@500;600;700',
    'Poppins': 'Poppins:wght@500;600;700', 'DM Sans': 'DM+Sans:wght@500;600;700', 'Outfit': 'Outfit:wght@500;600;700',
    'Sora': 'Sora:wght@500;600;700', 'Manrope': 'Manrope:wght@500;600;700;800', 'Playfair Display': 'Playfair+Display:wght@600;700;800'
  };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ---------- helpers ---------- */
  function clsOk(c) { return c === 'grad' || c === 'arr' || c === 'hl'; }
  var DROP = { SCRIPT: 1, STYLE: 1, IFRAME: 1, OBJECT: 1, EMBED: 1, NOSCRIPT: 1, TEMPLATE: 1, TEXTAREA: 1, SELECT: 1, SVG: 1, MATH: 1, LINK: 1, META: 1 };
  var TAGS = { EM: 1, STRONG: 1, B: 1, I: 1, U: 1, BR: 1, SMALL: 1, SUB: 1, SUP: 1, SPAN: 1 };
  function sanitize(html) {
    var t = document.createElement('template'); t.innerHTML = String(html == null ? '' : html);
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === 3) return;
        if (n.nodeType !== 1) { node.removeChild(n); return; }
        walk(n);
        if (DROP[n.tagName]) { node.removeChild(n); return; }
        if (!TAGS[n.tagName]) { while (n.firstChild) node.insertBefore(n.firstChild, n); node.removeChild(n); return; }
        var keep = n.tagName === 'SPAN' ? (n.getAttribute('class') || '').split(/\s+/).filter(clsOk).join(' ') : '';
        Array.prototype.slice.call(n.attributes).forEach(function (a) { n.removeAttribute(a.name); });
        if (keep) n.setAttribute('class', keep);
      });
    })(t.content);
    return t.innerHTML;
  }
  function safeUrl(u) {
    u = String(u || '').trim(); if (!u) return null;
    if (/^(https?:|mailto:|tel:|#|\/|\.\/|\.\.\/)/i.test(u) || /^[a-z0-9_\-][a-z0-9_\-\/\.]*(#.*)?(\?.*)?$/i.test(u)) return u;
    return null;
  }
  function safeImg(u) {
    u = String(u || '').trim(); if (!u) return null;
    if (/^data:image\/(png|jpe?g|webp|gif);base64,/i.test(u)) return u;
    return safeUrl(u) && !/^(mailto:|tel:|#)/i.test(u) ? u : null;
  }
  function hex(v, d) { v = String(v || '').trim(); return /^#[0-9a-f]{6}$/i.test(v) ? v : d; }
  function rgb(h) { return [parseInt(h.substr(1, 2), 16), parseInt(h.substr(3, 2), 16), parseInt(h.substr(5, 2), 16)]; }
  function mix(h, o, k) { var a = rgb(h), b = rgb(o); return '#' + [0, 1, 2].map(function (i) { var x = Math.round(a[i] * (1 - k) + b[i] * k); return ('0' + x.toString(16)).slice(-2); }).join(''); }
  function num(v, lo, hi, d) { v = parseFloat(v); return isNaN(v) ? d : Math.max(lo, Math.min(hi, v)); }

  /* ---------- capture the built-in defaults once ---------- */
  var DEF = { text: {}, href: {}, img: {}, count: {} }, THEME_DEF = {}, captured = false;
  function capture() {
    if (captured) return; captured = true;
    try { var cs0 = getComputedStyle(root); ['g', 'p', 'c', 'bg', 'r'].forEach(function (k) { THEME_DEF[k] = cs0.getPropertyValue('--' + k).trim(); }); } catch (e) {}
    $$('[data-cms]').forEach(function (el) {
      var k = el.getAttribute('data-cms');
      if (el.hasAttribute('data-cms-keep')) {
        var tn = Array.prototype.filter.call(el.childNodes, function (n) { return n.nodeType === 3 && n.nodeValue.trim(); });
        el.__tn = tn[tn.length - 1] || null; el.__def = el.__tn ? el.__tn.nodeValue : '';
        if (!(k in DEF.text)) DEF.text[k] = el.__def.trim();
      } else { el.__def = el.innerHTML; if (!(k in DEF.text)) DEF.text[k] = el.innerHTML.trim(); }
    });
    $$('[data-cms-href]').forEach(function (el) { var k = el.getAttribute('data-cms-href'); el.__defHref = el.getAttribute('href'); DEF.href[k] = el.__defHref || ''; });
    $$('[data-cms-img]').forEach(function (el) { var k = el.getAttribute('data-cms-img'); el.__defSrc = el.getAttribute('src'); el.__defAlt = el.getAttribute('alt') || ''; DEF.img[k] = el.__defSrc || ''; });
    $$('[data-cms-count]').forEach(function (el) { var k = el.getAttribute('data-cms-count'); el.__defN = el.getAttribute('data-count'); el.__defS = el.getAttribute('data-suffix') || ''; DEF.count[k] = { n: el.__defN, s: el.__defS }; });
  }

  /* ---------- apply ---------- */
  var themeEl, cssEl, fontEl, banEl;
  function styleEl(id) { var s = document.getElementById(id); if (!s) { s = document.createElement('style'); s.id = id; document.head.appendChild(s); } return s; }
  function applyText(C) {
    var T = (C && C.text) || {};
    $$('[data-cms]').forEach(function (el) {
      var k = el.getAttribute('data-cms'), has = Object.prototype.hasOwnProperty.call(T, k) && typeof T[k] === 'string';
      if (el.hasAttribute('data-cms-keep')) { if (el.__tn) el.__tn.nodeValue = has ? ' ' + T[k].replace(/<[^>]*>/g, '') : el.__def; return; }
      var want = has ? sanitize(T[k]) : el.__def;
      if (el.innerHTML !== want) el.innerHTML = want;
    });
    var H = (C && C.href) || {};
    $$('[data-cms-href]').forEach(function (el) {
      var k = el.getAttribute('data-cms-href'), u = H[k] ? safeUrl(H[k]) : null;
      if (u) el.setAttribute('href', u); else if (el.__defHref != null) el.setAttribute('href', el.__defHref);
    });
    var I = (C && C.img) || {};
    $$('[data-cms-img]').forEach(function (el) {
      var k = el.getAttribute('data-cms-img'), u = I[k] ? safeImg(I[k]) : null;
      if (u) { el.removeAttribute('srcset'); if (el.getAttribute('src') !== u) el.setAttribute('src', u); } else if (el.__defSrc != null && el.getAttribute('src') !== el.__defSrc) el.setAttribute('src', el.__defSrc);
    });
    var N = (C && C.count) || {};
    $$('[data-cms-count]').forEach(function (el) {
      var k = el.getAttribute('data-cms-count'), v = N[k];
      var n = v && v.n !== '' && v.n != null && !isNaN(parseFloat(v.n)) ? String(parseFloat(v.n)) : el.__defN, s = v && typeof v.s === 'string' ? v.s : el.__defS;
      el.setAttribute('data-count', n); el.setAttribute('data-suffix', s);
      if (captured && (preview || el.__live)) el.textContent = n + s;
    });
    var Hd = (C && C.hide) || {};
    $$('[data-cms-sec]').forEach(function (el) { el.toggleAttribute('data-cms-hidden', !!Hd[el.getAttribute('data-cms-sec')]); });
  }
  function applyTheme(C) {
    var th = (C && C.theme) || {}, css = '', fonts = '';
    var g = hex(th.g, ''), p = hex(th.p, ''), c = hex(th.c, ''), bg = hex(th.bg, '');
    var v = [];
    if (g) { v.push('--g:' + g, '--g2:' + mix(g, '#000000', .2), '--g-rgb:' + rgb(g).join(',')); }
    if (p) { v.push('--p:' + p, '--p-rgb:' + rgb(p).join(',')); }
    if (c) { v.push('--c:' + c, '--c-rgb:' + rgb(c).join(',')); }
    var vb = []; if (bg) { vb.push('--bg:' + bg, '--bg2:' + mix(bg, '#ffffff', .035), '--panel:' + mix(bg, '#ffffff', .06)); }   /* background colours only restyle the DARK theme; light mode keeps its own clean surfaces */
    if (th.r !== undefined && th.r !== '') { var r = num(th.r, 4, 36, 18); v.push('--r:' + r + 'px', '--r-lg:' + Math.round(r * 1.45) + 'px'); }
    var fh = FONTS[th.fh] ? th.fh : '', fb = FONTS[th.fb] ? th.fb : '';
    if (fh) v.push("--f-head:'" + fh + "','Inter',system-ui,sans-serif");
    if (fb) v.push("--f-body:'" + fb + "',system-ui,-apple-system,'Segoe UI',Roboto,Arial,sans-serif");
    if (v.length) css += ':root:root{' + v.join(';') + '}';
    if (vb.length) css += ':root[data-theme="dark"]{' + vb.join(';') + '}';
    var need = []; if (fh && fh !== 'Inter' && fh !== 'Plus Jakarta Sans') need.push(fh); if (fb && fb !== 'Inter' && fb !== 'Plus Jakarta Sans') need.push(fb);
    if (need.length) fonts = 'https://fonts.googleapis.com/css2?' + need.filter(function (x, i) { return need.indexOf(x) === i; }).map(function (f) { return 'family=' + FONTS[f]; }).join('&') + '&display=swap';
    if (css || themeEl) { themeEl = styleEl('cms-theme'); if (themeEl.textContent !== css) themeEl.textContent = css; }
    if (fonts) { if (!fontEl) { fontEl = document.createElement('link'); fontEl.rel = 'stylesheet'; document.head.appendChild(fontEl); } if (fontEl.href !== fonts) fontEl.href = fonts; } else if (fontEl) { fontEl.remove(); fontEl = null; }
    var meta = document.querySelector('meta[name="theme-color"]'); if (meta) meta.setAttribute('content', root.getAttribute('data-theme') === 'light' ? '#eceeef' : (bg || '#0a0d0c'));
    var cs = (C && typeof C.css === 'string') ? C.css.replace(/<\/?style[^>]*>/gi, '') : '';
    if (cs || cssEl) { cssEl = styleEl('cms-css'); if (cssEl.textContent !== cs) cssEl.textContent = cs; }
  }
  function setMeta(sel, attr, val) { var m = document.querySelector(sel); if (m && val != null) m.setAttribute(attr, val); }
  var seoDef;
  function applySeo(C) {
    if (!seoDef) seoDef = { title: document.title, desc: (document.querySelector('meta[name="description"]') || {}).content || '', og: (document.querySelector('meta[property="og:image"]') || {}).content || '' };
    var s = ((C && C.seo) || {})[PAGE] || {};
    var t = (s.title || '').trim() || seoDef.title, d = (s.desc || '').trim() || seoDef.desc, o = safeImg(s.og) || seoDef.og;
    document.title = t;
    setMeta('meta[name="description"]', 'content', d); setMeta('meta[property="og:title"]', 'content', t); setMeta('meta[property="og:description"]', 'content', d);
    setMeta('meta[property="og:image"]', 'content', o);
  }
  function applyBanner(C) {
    var b = (C && C.banner) || {}, key = 'cmsb:' + (b.text || '');
    var dismissed = false; try { dismissed = !preview && b.dismiss !== false && sessionStorage.getItem(key) === '1'; } catch (e) {}
    if (!b.on || !(b.text || '').trim() || dismissed) { if (banEl) { banEl.remove(); banEl = null; } root.style.setProperty('--bn-off', '0px'); return; }
    if (!banEl) { banEl = document.createElement('div'); banEl.className = 'cms-banner'; banEl.setAttribute('role', 'region'); banEl.setAttribute('aria-label', 'Announcement'); document.body.insertBefore(banEl, document.body.firstChild); }
    banEl.className = 'cms-banner tone-' + (/^(violet|warn|dark)$/.test(b.tone) ? b.tone : 'accent');
    var u = safeUrl(b.link);
    banEl.innerHTML = '<span>' + sanitize(b.text) + '</span>' + (u && (b.label || '').trim() ? '<a href="' + u.replace(/"/g, '&quot;') + '">' + sanitize(b.label) + ' →</a>' : '') + (b.dismiss !== false ? '<button class="bx" type="button" aria-label="Dismiss">×</button>' : '');
    var x = banEl.querySelector('.bx'); if (x) x.onclick = function () { try { sessionStorage.setItem(key, '1'); } catch (e) {} applyBanner(C); };
    syncBanner();
  }
  function syncBanner() { if (!banEl) { root.style.setProperty('--bn-off', '0px'); return; } root.style.setProperty('--bn-off', Math.max(0, banEl.offsetHeight - (window.scrollY || 0)) + 'px'); }
  window.addEventListener('scroll', syncBanner, { passive: true }); window.addEventListener('resize', syncBanner);
  function applyConfig(C) {
    var S = (C && C.site) || {}, B = JSON.parse(JSON.stringify(BASE));
    var out = B;
    if (Array.isArray(S.plans)) out.plans = (B.plans || []).map(function (p) {
      var o = S.plans.filter(function (x) { return x && x.id === p.id; })[0]; if (!o) return p;
      var q = Object.assign({}, p);
      if (o.label) q.label = String(o.label).slice(0, 40); if (o.price !== '' && o.price != null && !isNaN(parseFloat(o.price))) q.price = Math.max(1, Math.round(parseFloat(o.price)));
      if (typeof o.tag === 'string') q.tag = o.tag.slice(0, 24); q.off = !!o.off; return q;
    }).filter(function (p) { return !p.off; });
    ['bkash', 'nagad'].forEach(function (m) {
      var o = S.payment && S.payment[m]; if (!o) return; out.payment = out.payment || {}; out.payment[m] = Object.assign({}, B.payment && B.payment[m]);
      if (typeof o.number === 'string' && /^[0-9+\-\s]{6,20}$/.test(o.number.trim())) out.payment[m].number = o.number.trim();
      if (typeof o.kind === 'string' && o.kind.trim()) out.payment[m].kind = o.kind.trim().slice(0, 30);
    });
    if (S.contact) { out.contact = Object.assign({}, B.contact); ['email', 'whatsapp', 'facebook', 'phone'].forEach(function (k) { if (typeof S.contact[k] === 'string') out.contact[k] = S.contact[k].trim().slice(0, 200); }); }
    if (S.free) { out.free = Object.assign({}, B.free); ['goals', 'habits', 'meals'].forEach(function (k) { var n = parseInt(S.free[k], 10); if (!isNaN(n) && n >= 0) out.free[k] = n; }); }
    if (S.pendingHours !== '' && S.pendingHours != null && !isNaN(parseInt(S.pendingHours, 10))) out.pendingHours = Math.max(1, Math.min(120, parseInt(S.pendingHours, 10)));
    if (typeof S.currency === 'string' && S.currency.trim()) out.currency = S.currency.trim().slice(0, 4);
    Object.keys(CFG).forEach(function (k) { delete CFG[k]; }); Object.assign(CFG, out);
  }
  function applyAll(C) {
    capture();
    try { applyConfig(C); } catch (e) { console.warn('cms config', e); }
    try { applyTheme(C); applyText(C); applySeo(C); applyBanner(C); } catch (e) { console.warn('cms apply', e); }
    if (preview && window.__fitosRender) { try { window.__fitosRender(); } catch (e) {} }
  }
  window.__cmsApply = applyAll;

  /* ---------- load: cache → instant; network → revalidate ---------- */
  function readCache() { try { return JSON.parse(localStorage.getItem(LS) || 'null'); } catch (e) { return null; } }
  function writeCache(o) { try { localStorage.setItem(LS, JSON.stringify(o)); } catch (e) {} }

  if (preview) {
    root.classList.add('cms-preview');
    capture();
    var schema = function () {
      capture();
      var secs = $$('[data-cms-sec]').map(function (el) {
        var l = el.querySelector('.eyebrow,h2,h1'); return { key: el.getAttribute('data-cms-sec'), id: el.id || '', label: (l ? l.textContent : (el.id || el.className || el.tagName)).trim().slice(0, 60) };
      });
      var fields = [], seen = {};
      $$('[data-cms],[data-cms-img],[data-cms-count]').forEach(function (el) {
        var kind, k;
        if (el.hasAttribute('data-cms-img')) { kind = 'img'; k = el.getAttribute('data-cms-img'); }
        else if (el.hasAttribute('data-cms-count')) { kind = 'count'; k = el.getAttribute('data-cms-count'); }
        else { kind = 'text'; k = el.getAttribute('data-cms'); }
        if (seen[kind + k]) return; seen[kind + k] = 1;
        var z = el.closest('[data-cms-sec]'), f = { kind: kind, key: k, tag: el.tagName.toLowerCase(), sec: z ? z.getAttribute('data-cms-sec') : (/^g\./.test(k) ? 'global' : 'page') };
        if (kind === 'text') { f.def = DEF.text[k]; f.href = el.hasAttribute('data-cms-href') ? (DEF.href[k] || '') : null; f.keep = el.hasAttribute('data-cms-keep'); f.rich = /<[a-z]/i.test(f.def || ''); }
        if (kind === 'img') { f.def = DEF.img[k]; f.alt = el.__defAlt; }
        if (kind === 'count') f.def = DEF.count[k];
        fields.push(f);
      });
      parent.postMessage({ type: 'cms-schema', page: PAGE, path: location.pathname.split('/').pop() || 'index.html', fields: fields, secs: secs, themeDef: THEME_DEF, base: { plans: BASE.plans || [], payment: BASE.payment || {}, contact: BASE.contact || {}, free: BASE.free || {}, pendingHours: BASE.pendingHours, currency: BASE.currency }, seo: { title: seoDef ? seoDef.title : document.title } }, location.origin);
    };
    window.addEventListener('message', function (e) {
      if (e.origin !== location.origin || !e.data) return;
      if (e.data.type === 'cms-draft') { applyAll(e.data.content || {}); }
      if (e.data.type === 'cms-scroll') {
        var el = document.querySelector('[data-cms="' + e.data.key + '"],[data-cms-img="' + e.data.key + '"],[data-cms-count="' + e.data.key + '"],[data-cms-sec="' + e.data.key + '"]');
        if (el) { var r = el.getBoundingClientRect(); window.scrollTo({ top: Math.max(0, r.top + (window.scrollY || 0) - 140), behavior: 'smooth' }); el.classList.add('cms-flash'); setTimeout(function () { el.classList.remove('cms-flash'); }, 1600); }
      }
    });
    document.addEventListener('click', function (e) {
      var el = e.target.closest && e.target.closest('[data-cms],[data-cms-img],[data-cms-count]'); if (!el) return;
      var k = el.getAttribute('data-cms') || el.getAttribute('data-cms-img') || el.getAttribute('data-cms-count');
      e.preventDefault(); e.stopPropagation(); parent.postMessage({ type: 'cms-pick', key: k }, location.origin);
    }, true);
    window.addEventListener('load', function () { setTimeout(schema, 350); });
    document.addEventListener('DOMContentLoaded', function () { parent.postMessage({ type: 'cms-loading' }, location.origin); });
    return;
  }

  var cache = readCache(), fresh = cache && cache.c && cache.t && (Date.now() - cache.t < 6e5);
  if (cache && cache.c) { document.addEventListener('DOMContentLoaded', function () {}); applyAll(cache.c); }
  var fb = CFG.firebase || BASE.firebase || {};
  if (!fb.projectId || !window.fetch) return;
  var hold = !cache; if (hold) { root.classList.add('cms-wait'); setTimeout(function () { root.classList.remove('cms-wait'); }, 1500); }
  if (cache && fresh && !cache.none) { /* revalidate lazily below */ }
  var url = 'https://firestore.googleapis.com/v1/projects/' + fb.projectId + '/databases/(default)/documents/site/content?key=' + encodeURIComponent(fb.apiKey);
  fetch(url, { cache: 'no-store' }).then(function (r) {
    if (r.status === 404) return { none: true };
    if (!r.ok) throw new Error('http ' + r.status);
    return r.json();
  }).then(function (d) {
    var c = null;
    if (d && d.fields && d.fields.json && d.fields.json.stringValue) c = JSON.parse(d.fields.json.stringValue);
    var rev = c ? (c.rev || 0) : 0, had = cache && cache.c ? (cache.c.rev || 0) : 0, had0 = !!(cache && cache.c);
    writeCache({ c: c, t: Date.now(), none: !c });
    if (rev !== had || (!!c) !== had0) {
      var g = 'fitos_cms_rl'; var done = ''; try { done = sessionStorage.getItem(g); } catch (e) {}
      if (done !== String(rev)) { try { sessionStorage.setItem(g, String(rev)); } catch (e) {} location.reload(); return; }
    }
    root.classList.remove('cms-wait');
  }).catch(function () { root.classList.remove('cms-wait'); });
})();
