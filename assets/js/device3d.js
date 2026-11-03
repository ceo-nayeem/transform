/* FIT//OS — real-3D device mockups: builds the extruded phone body, buttons, back panel and drives glass reflections */
(function () {
  'use strict';
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia && matchMedia('(hover:hover) and (pointer:fine)').matches;
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html) e.innerHTML = html; return e; }

  function upgradePhone(p) {
    if (p.__ph3d) return; p.__ph3d = 1;
    var f = document.createDocumentFragment(), i, n;
    for (i = 1; i <= 22; i++) { n = el('i', 'ph-s'); n.style.setProperty('--i', i); f.appendChild(n); }
    var back = el('div', 'ph-bk', '<div class="cam"><i></i><i></i><i></i><b></b></div><div class="lg">FIT//OS</div>'); f.appendChild(back);
    // [side, top%, height%] — action, volume up, volume down, power
    [['l', 12.6, 3.2], ['l', 18.4, 6.4], ['l', 26.6, 6.4], ['r', 22.4, 10.5]].forEach(function (b) {
      [.28, .5, .72].forEach(function (z) { var x = el('i', 'ph-b ' + b[0]); x.style.top = b[1] + '%'; x.style.height = b[2] + '%'; x.style.setProperty('--z', z); f.appendChild(x); });
    });
    f.appendChild(el('i', 'ph-sh'));
    p.appendChild(f);
    if (!p.querySelector('.glare')) p.appendChild(el('div', 'glare'));
  }
  function matrix(e) {
    var t = getComputedStyle(e).transform; if (!t || t === 'none') return null;
    var m = t.match(/matrix3d\(([^)]+)\)/), v;
    if (m) { v = m[1].split(',').map(parseFloat); return { yaw: Math.atan2(v[8], v[0]) * 57.3, pitch: Math.atan2(-v[9], v[5]) * 57.3 }; }
    m = t.match(/matrix\(([^)]+)\)/); if (m) return { yaw: 0, pitch: 0 };
    return null;
  }

  function init() {
    var phones = [].slice.call(document.querySelectorAll('.phone')); phones.forEach(upgradePhone);
    var rigs = [].slice.call(document.querySelectorAll('.lap-rig'));
    var targets = phones.map(function (p) { return { box: p, src: p }; }).concat(rigs.map(function (r) { return { box: r, src: r }; }));

    // laptop: follow the pointer a little
    var dev = document.querySelector('.devices');
    if (dev && rigs[0] && fine && !reduce) {
      dev.addEventListener('pointermove', function (e) {
        var r = dev.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
        rigs[0].style.setProperty('--ry', (-13 + x * 28) + 'deg'); rigs[0].style.setProperty('--rx', (-15 - y * 10) + 'deg');
      });
      dev.addEventListener('pointerleave', function () { rigs[0].style.removeProperty('--ry'); rigs[0].style.removeProperty('--rx'); });
    }
    if (reduce) return;

    // glass reflection follows the device orientation
    var vis = new Set();
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (es) { es.forEach(function (e) { e.isIntersecting ? vis.add(e.target) : vis.delete(e.target); }); }, { rootMargin: '80px' });
      targets.forEach(function (t) { io.observe(t.box); });
    } else targets.forEach(function (t) { vis.add(t.box); });
    (function tick() {
      targets.forEach(function (t) {
        if (!vis.has(t.box)) return;
        var m = matrix(t.src); if (!m) return;
        var gx = Math.max(-30, Math.min(130, 45 + m.yaw * 2.6));
        t.box.style.setProperty('--gx', gx.toFixed(1) + '%');
        t.box.style.setProperty('--ga', (108 + m.pitch * 1.4).toFixed(1) + 'deg');
      });
      requestAnimationFrame(tick);
    })();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
