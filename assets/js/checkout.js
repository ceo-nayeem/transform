/* FIT//OS checkout — plan + details → bKash/Nagad TrxID → provisional Pro.
   Writes ONLY: paymentRequests/{method_TRXID}  and  entitlements/{uid}  (see firestore.rules). */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, doc, getDoc, writeBatch, serverTimestamp, Timestamp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const CFG = window.FITOS_SITE;
const $ = (s) => document.querySelector(s);
const cur = CFG.currency || '৳';
const fmt = (n) => Number(n).toLocaleString('en-US');
const app = initializeApp(CFG.firebase);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: 'select_account' });

const state = { plan: null, method: 'bkash', user: null, ent: null, step: 1, timer: null };
const q = new URLSearchParams(location.search);
state.plan = (CFG.plans.find(p => p.id === q.get('plan')) || CFG.plans.find(p => p.tag === 'Popular') || CFG.plans[0]).id;
const planObj = () => CFG.plans.find(p => p.id === state.plan);
const durText = (p) => p.months === 1 ? '1 month' : p.months === 12 ? '1 year' : p.months + ' months';

/* ---------------- stepper / steps ---------------- */
function showStep(n) {
  state.step = n;
  document.querySelectorAll('.co-step').forEach(s => s.classList.toggle('show', s.id === 's' + n));
  document.querySelectorAll('.st').forEach(s => { const k = +s.dataset.st; s.classList.toggle('on', k === n); s.classList.toggle('done', k < n); s.querySelector('i').textContent = k < n ? '✓' : k; });
  document.querySelectorAll('.st-line').forEach(l => l.classList.toggle('on', +l.dataset.line < n));
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ---------------- plan picker + summary ---------------- */
function renderPlans() {
  const box = $('#plan-pick'); const monthly = (CFG.plans.find(p => p.months === 1) || CFG.plans[0]).price;
  box.innerHTML = CFG.plans.map(p => {
    const sv = monthly * p.months > p.price ? Math.round((1 - p.price / (monthly * p.months)) * 100) : 0;
    return `<button type="button" class="pp${p.id === state.plan ? ' on' : ''}" role="radio" aria-checked="${p.id === state.plan}" data-plan="${p.id}">
      ${p.tag ? `<em>${p.tag}</em>` : ''}<span>${p.label}</span><b>${cur}${fmt(p.price)}</b><span>${durText(p)}${sv ? ' · save ' + sv + '%' : ''}</span></button>`;
  }).join('');
  box.querySelectorAll('.pp').forEach(b => b.addEventListener('click', () => { state.plan = b.dataset.plan; renderPlans(); renderSummary(); renderPay(); }));
}
function renderSummary() {
  const p = planObj();
  $('#sum-plan').textContent = 'Pro · ' + p.label; $('#sum-dur').textContent = durText(p);
  $('#sum-total').textContent = cur + fmt(p.price);
  $('#sum-email').textContent = state.user ? state.user.email : 'Not signed in';
  const e = state.ent, now = Date.now();
  $('#sum-note').textContent = (e && e.status === 'verified' && e.proUntil && e.proUntil.toMillis() > now)
    ? 'You are already Pro until ' + new Date(e.proUntil.toMillis()).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) + '. This purchase will extend it.' : '';
}

/* ---------------- auth ---------------- */
function renderAuth() {
  const box = $('#auth-box'), who = $('#auth-who'), btn = $('#btn-google'), u = state.user;
  box.classList.toggle('ok', !!u);
  if (u) {
    who.innerHTML = ''; const b = document.createElement('b'), s = document.createElement('small');
    b.textContent = u.displayName || 'Signed in'; s.textContent = u.email; who.append(b, s);
    box.querySelector('img')?.remove();
    if (u.photoURL) { const im = document.createElement('img'); im.src = u.photoURL; im.alt = ''; im.referrerPolicy = 'no-referrer'; box.prepend(im); }
    btn.querySelector('span').textContent = 'Switch account';
    $('#f-email').value = u.email;
    if (!$('#f-name').value && u.displayName) $('#f-name').value = u.displayName;
  } else {
    who.innerHTML = '<b>Sign in with Google</b><small>We use your Google account as your verified email — Pro is linked to it.</small>';
    box.querySelector('img')?.remove(); btn.querySelector('span').textContent = 'Continue with Google'; $('#f-email').value = '';
  }
  $('#to-pay').disabled = !u; renderSummary();
}
async function loadEnt() {
  state.ent = null;
  try { if (state.user) { const s = await getDoc(doc(db, 'entitlements', state.user.uid)); state.ent = s.exists() ? s.data() : null; } } catch (e) { /* non-fatal */ }
  renderSummary();
}
onAuthStateChanged(auth, (u) => { state.user = u; renderAuth(); loadEnt(); });
$('#btn-google').addEventListener('click', async () => {
  try { if (state.user) await signOut(auth); await signInWithPopup(auth, provider); }
  catch (e) { if (e && e.code !== 'auth/popup-closed-by-user' && e.code !== 'auth/cancelled-popup-request') toast('Sign-in failed. Please try again.'); }
});

/* ---------------- step 1 validation ---------------- */
const normPhone = (v) => { let s = String(v || '').replace(/[\s\-()]/g, ''); if (s.startsWith('+88')) s = s.slice(3); else if (s.startsWith('88') && s.length === 13) s = s.slice(2); return s; };
const PHONE_RE = /^01[3-9]\d{8}$/;
function validateStep1() {
  let ok = true; const name = $('#f-name').value.trim(), phone = normPhone($('#f-phone').value);
  $('#e-name').textContent = ''; $('#e-phone').textContent = '';
  $('#f-name').classList.remove('bad'); $('#f-phone').classList.remove('bad');
  if (name.length < 2) { $('#e-name').textContent = 'Please enter your full name.'; $('#f-name').classList.add('bad'); ok = false; }
  if (!PHONE_RE.test(phone)) { $('#e-phone').textContent = 'Enter a valid Bangladeshi mobile number (01XXXXXXXXX).'; $('#f-phone').classList.add('bad'); ok = false; }
  if (!state.user) { toast('Please sign in with Google first.'); ok = false; }
  return ok;
}
$('#to-pay').addEventListener('click', () => { if (validateStep1()) { renderPay(); showStep(2); } });
$('#back1').addEventListener('click', () => showStep(1));

/* ---------------- step 2 ---------------- */
const HOW = {
  bkash: (n, a) => [`Open the <b>bKash</b> app and choose <b>Send Money</b>.`, `Enter <b>${n}</b> and the amount <b>${cur}${fmt(a)}</b> (exactly).`, `Confirm with your PIN. Copy the <b>TrxID</b> from the success screen or SMS.`, `Paste it below and press Submit.`],
  nagad: (n, a) => [`Open the <b>Nagad</b> app and choose <b>Send Money</b>.`, `Enter <b>${n}</b> and the amount <b>${cur}${fmt(a)}</b> (exactly).`, `Confirm with your PIN. Copy the <b>Transaction ID</b> from the success screen or SMS.`, `Paste it below and press Submit.`]
};
function renderPay() {
  const p = planObj(), m = CFG.payment[state.method], configured = !/X/i.test(m.number);
  $('#pay-tabs').innerHTML = Object.keys(CFG.payment).map(k => { const c = CFG.payment[k];
    return `<button type="button" class="ptab${k === state.method ? ' on' : ''}" role="tab" aria-selected="${k === state.method}" data-m="${k}" style="--pc:${c.color}"><i style="background:${c.color}"></i>${c.name}</button>`; }).join('');
  document.querySelectorAll('.ptab').forEach(b => b.addEventListener('click', () => { state.method = b.dataset.m; renderPay(); }));
  $('#pay-box').innerHTML = `
    <div class="pay-line"><span>${m.name} · ${m.kind} to</span><span class="pay-num" id="pay-num">${m.number}</span><button type="button" class="copy" id="copy-num">Copy</button></div>
    <div class="pay-line"><span>Amount to send</span><span class="pay-num" style="color:var(--g)">${cur}${fmt(p.price)}</span><button type="button" class="copy" id="copy-amt">Copy</button></div>
    ${configured ? '' : '<div class="warn" style="margin:0"><span>🚧</span><span>Payment number is not configured yet. Set it in <b>assets/js/config.js</b>.</span></div>'}`;
  $('#how-pay').innerHTML = HOW[state.method](m.number, p.price).map(t => `<li><span>${t}</span></li>`).join('');
  $('#copy-num').onclick = () => copy(m.number, 'Number copied'); $('#copy-amt').onclick = () => copy(String(p.price), 'Amount copied');
  $('#submit-pay').disabled = !configured;
}
function copy(t, msg) { (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(() => toast(msg)).catch(() => toast('Copy: ' + t)); }
const TRX_RE = /^[A-Z0-9]{8,14}$/;
$('#f-trx').addEventListener('input', (e) => { e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); $('#e-trx').textContent = ''; e.target.classList.remove('bad'); $('#e-submit').textContent = ''; });

async function submitPayment() {
  const trx = $('#f-trx').value.trim().toUpperCase(), p = planObj(), name = $('#f-name').value.trim(), phone = normPhone($('#f-phone').value);
  $('#e-trx').textContent = ''; $('#e-submit').textContent = '';
  if (!state.user) { showStep(1); return toast('Please sign in first.'); }
  if (!TRX_RE.test(trx)) { $('#e-trx').textContent = 'Enter the Transaction ID exactly (8–14 letters/numbers).'; $('#f-trx').classList.add('bad'); return; }
  const btn = $('#submit-pay'); btn.disabled = true; $('#submit-lbl').innerHTML = '<span class="spin"></span> Submitting…';
  try {
    const u = state.user, reqId = state.method + '_' + trx, now = Date.now();
    const batch = writeBatch(db);
    batch.set(doc(db, 'paymentRequests', reqId), { uid: u.uid, email: String(u.email).toLowerCase(), name, phone, plan: p.id, amount: p.price, method: state.method, trxId: trx, status: 'pending', createdAt: serverTimestamp() });
    // Provisional Pro — only if the user has no active Pro already (the rules also enforce this).
    const e = state.ent, active = e && (e.status === 'pending' || e.status === 'verified') && e.proUntil && e.proUntil.toMillis() > now;
    const hours = Math.min(CFG.pendingHours || 96, 119);
    const until = Timestamp.fromMillis(now + hours * 3600 * 1000);
    if (!active) batch.set(doc(db, 'entitlements', u.uid), { uid: u.uid, email: String(u.email).toLowerCase(), plan: p.id, status: 'pending', requestId: reqId, amount: p.price, startedAt: serverTimestamp(), proUntil: until, updatedAt: serverTimestamp(), source: 'checkout' });
    await batch.commit();
    showSuccess({ trx, p, until: active ? (e.proUntil) : until, active, method: state.method });
  } catch (err) {
    console.error(err);
    $('#e-submit').textContent = (err && err.code === 'permission-denied')
      ? 'We could not submit this. This Transaction ID may already be used, or your sign-in expired — please check the ID and try again.'
      : 'Something went wrong. Check your connection and try again.';
    btn.disabled = false; $('#submit-lbl').textContent = 'Submit payment';
  }
}
$('#submit-pay').addEventListener('click', submitPayment);
$('#f-trx').addEventListener('keydown', (e) => { if (e.key === 'Enter') submitPayment(); });

/* ---------------- step 3 ---------------- */
function showSuccess(r) {
  const d = (t) => new Date(t.toMillis ? t.toMillis() : t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  const card = $('#succ-card'); card.innerHTML = '';
  [['Plan', 'Pro · ' + r.p.label], ['Amount', cur + fmt(r.p.price)], ['Method', CFG.payment[r.method].name], ['Transaction ID', r.trx], ['Pro access until', d(r.until) + (r.active ? '' : ' (while we verify)')]].forEach(([k, v]) => {
    const row = document.createElement('div'); row.className = 'sum-row'; row.style.borderBottom = '0'; row.style.paddingBottom = '0';
    const a = document.createElement('span'), b = document.createElement('b'); a.textContent = k; b.textContent = v; row.append(a, b); card.append(row);
  });
  showStep(3); startRedirect();
}
function startRedirect() {
  let n = 5; const fg = $('#redir-fg'), lbl = $('#redir-n');
  const tick = () => { lbl.textContent = n; fg.style.strokeDashoffset = String(88 * (1 - n / 5)); if (n <= 0) { location.href = CFG.appUrl || 'app/'; return; } n--; state.timer = setTimeout(tick, 1000); };
  tick();
}
$('#stay').addEventListener('click', () => { clearTimeout(state.timer); $('#redir').style.display = 'none'; $('#stay').style.display = 'none'; });

function toast(m) { window.siteToast ? window.siteToast(m) : alert(m); }

renderPlans(); renderSummary(); renderPay();
