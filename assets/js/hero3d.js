/* FIT//OS hero — real-time 3D scene (Three.js): DNA-style double helix, orbit rings, wire core, particle field.
   Reacts to the pointer and to scrolling. Falls back silently (CSS background stays) if WebGL is unavailable. */
(function () {
  'use strict';
  var canvas = document.getElementById('hero-canvas');
  if (!canvas || !window.THREE) return;
  var THREE = window.THREE;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true, powerPreference: 'high-performance' }); }
  catch (e) { return; }
  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  renderer.setPixelRatio(dpr);
  renderer.setClearColor(0x000000, 0);

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
  camera.position.set(0, 0, 11);

  var GREEN = new THREE.Color(0x00ff88), VIOLET = new THREE.Color(0xaa77ff), CYAN = new THREE.Color(0x38bdf8);
  var rig = new THREE.Group(); scene.add(rig);           // follows the hero stage position
  var spin = new THREE.Group(); rig.add(spin);           // pointer / scroll rotation

  /* --- double helix --- */
  var N = 54, H = 8.2, R = 2.15, TURNS = 2.6;
  var sphereGeo = new THREE.SphereGeometry(0.06, 14, 14);
  var matA = new THREE.MeshBasicMaterial({ color: GREEN }), matB = new THREE.MeshBasicMaterial({ color: VIOLET });
  var strandA = new THREE.InstancedMesh(sphereGeo, matA, N), strandB = new THREE.InstancedMesh(sphereGeo, matB, N);
  var helix = new THREE.Group(); helix.add(strandA, strandB); spin.add(helix);
  var rungPos = new Float32Array(Math.floor(N / 2) * 6);
  var rungGeo = new THREE.BufferGeometry(); rungGeo.setAttribute('position', new THREE.BufferAttribute(rungPos, 3));
  var rungs = new THREE.LineSegments(rungGeo, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.16 }));
  helix.add(rungs);
  var dummy = new THREE.Object3D();
  function updateHelix(t) {
    var ri = 0;
    for (var i = 0; i < N; i++) {
      var u = i / (N - 1), y = (u - 0.5) * H, a = u * Math.PI * 2 * TURNS + t;
      var s = 0.7 + 0.3 * Math.sin(u * Math.PI);                 // taper toward the ends
      var xa = Math.cos(a) * R * s, za = Math.sin(a) * R * s, xb = Math.cos(a + Math.PI) * R * s, zb = Math.sin(a + Math.PI) * R * s;
      var sc = 0.55 + 0.6 * ((za + R) / (2 * R));                // depth-based size
      dummy.position.set(xa, y, za); dummy.scale.setScalar(sc); dummy.updateMatrix(); strandA.setMatrixAt(i, dummy.matrix);
      var sc2 = 0.55 + 0.6 * ((zb + R) / (2 * R));
      dummy.position.set(xb, y, zb); dummy.scale.setScalar(sc2); dummy.updateMatrix(); strandB.setMatrixAt(i, dummy.matrix);
      if (i % 2 === 0 && ri < rungPos.length) { rungPos[ri++] = xa; rungPos[ri++] = y; rungPos[ri++] = za; rungPos[ri++] = xb; rungPos[ri++] = y; rungPos[ri++] = zb; }
    }
    strandA.instanceMatrix.needsUpdate = true; strandB.instanceMatrix.needsUpdate = true; rungGeo.attributes.position.needsUpdate = true;
  }

  /* --- rings --- */
  var rings = [];
  [[3.5, GREEN, 0.5], [4.3, VIOLET, 0.42], [5.1, CYAN, 0.3]].forEach(function (d, i) {
    var m = new THREE.Mesh(new THREE.TorusGeometry(d[0], 0.012, 8, 220), new THREE.MeshBasicMaterial({ color: d[1], transparent: true, opacity: d[2], blending: THREE.AdditiveBlending, depthWrite: false }));
    m.rotation.set(1.1 + i * 0.5, i * 0.7, 0); spin.add(m); rings.push(m);
  });

  /* --- wire core --- */
  var core = new THREE.Mesh(new THREE.IcosahedronGeometry(2.7, 1), new THREE.MeshBasicMaterial({ color: GREEN, wireframe: true, transparent: true, opacity: 0.09 }));
  spin.add(core);

  /* --- particles --- */
  var P = window.innerWidth < 700 ? 900 : 2200, pp = new Float32Array(P * 3), pc = new Float32Array(P * 3), tmp = new THREE.Color();
  for (var i = 0; i < P; i++) {
    var r = 4 + Math.random() * 16, th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1);
    pp[i * 3] = r * Math.sin(ph) * Math.cos(th); pp[i * 3 + 1] = r * Math.sin(ph) * Math.sin(th); pp[i * 3 + 2] = r * Math.cos(ph) - 2;
    tmp.copy(GREEN).lerp(Math.random() > 0.5 ? VIOLET : CYAN, Math.random() * 0.9); pc[i * 3] = tmp.r; pc[i * 3 + 1] = tmp.g; pc[i * 3 + 2] = tmp.b;
  }
  var pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pp, 3)); pg.setAttribute('color', new THREE.BufferAttribute(pc, 3));
  var points = new THREE.Points(pg, new THREE.PointsMaterial({ size: 0.036, vertexColors: true, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true }));
  scene.add(points);

  /* --- layout: put the rig behind the phone in the hero stage --- */
  var stageEl = document.querySelector('.hero-stage'), W = 1, Hh = 1;
  function layout() {
    var r = canvas.getBoundingClientRect(); W = Math.max(1, r.width); Hh = Math.max(1, r.height);
    renderer.setSize(W, Hh, false); camera.aspect = W / Hh;
    camera.updateProjectionMatrix();
    var halfH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z, halfW = halfH * camera.aspect;
    var sr = stageEl ? stageEl.getBoundingClientRect() : { left: 0, top: 0, width: W, height: Hh };
    var cx = sr.left - r.left + sr.width / 2, cy = sr.top - r.top + sr.height / 2;
    rig.position.x = (cx / W * 2 - 1) * halfW; rig.position.y = -(cy / Hh * 2 - 1) * halfH;
    var fit = Math.min(sr.height / Hh * 1.9, 1.15);                // keep the helix inside the stage on small screens
    rig.scale.setScalar(Math.max(0.5, Math.min(1.05, fit * (Hh / 700 > 1 ? 1 : 1.05))));
  }
  layout(); window.addEventListener('resize', layout);
  if (window.ResizeObserver) new ResizeObserver(layout).observe(canvas);

  /* --- interaction --- */
  var mx = 0, my = 0, sx = 0, sy = 0, scrollV = 0, lastY = window.scrollY, visible = true;
  window.addEventListener('pointermove', function (e) { mx = (e.clientX / window.innerWidth) * 2 - 1; my = (e.clientY / window.innerHeight) * 2 - 1; }, { passive: true });
  if ('IntersectionObserver' in window) new IntersectionObserver(function (en) { visible = en[0].isIntersecting; }, { threshold: 0 }).observe(canvas.parentElement);

  var clock = new THREE.Clock(), t0 = 0;
  function frame() {
    requestAnimationFrame(frame);
    if (!visible || document.hidden) return;
    var dt = Math.min(clock.getDelta(), 0.05), y = window.scrollY, v = y - lastY; lastY = y;
    scrollV += (Math.min(Math.abs(v), 60) / 60 - scrollV) * 0.08;
    t0 += dt * (0.55 + scrollV * 2.2);
    updateHelix(t0);
    sx += (mx * 0.45 - sx) * 0.05; sy += (my * 0.25 - sy) * 0.05;
    spin.rotation.y = sx + y * 0.0009; spin.rotation.x = sy * 0.6 + 0.12;
    core.rotation.y += dt * 0.12; core.rotation.x += dt * 0.05;
    rings[0].rotation.z += dt * 0.25; rings[1].rotation.z -= dt * 0.18; rings[2].rotation.x += dt * 0.12;
    points.rotation.y += dt * 0.02 + scrollV * 0.01; points.rotation.x = y * 0.00012;
    rig.position.z = -y * 0.0011;
    renderer.render(scene, camera);
  }
  if (reduce) { updateHelix(1.2); renderer.render(scene, camera); window.addEventListener('resize', function () { renderer.render(scene, camera); }); }
  else frame();
})();
