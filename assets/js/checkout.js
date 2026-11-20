/* FIT//OS checkout — plan + details (+ optional coupon) → bKash/Nagad TrxID → provisional Pro.
   Writes ONLY: paymentRequests/{method_TRXID}, entitlements/{uid} and (when a coupon is used) couponClaims/{CODE_uid}  (see firestore.rules).
   Coupons: read couponPub/{CODE} (public mirror, no owner e-mail). A use is only COUNTED by the owner after the payment is verified in the Admin Backend. */
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

const state = { plan: null, method: 'bkash', user: null, ent: null, step: 1, timer: null, cp: { pub: null, busy: false, wanted: '' } };
const q = new URLSearchParams(location.search);
state.plan = (CFG.plans.find(p => p.id === q.get('plan')) || CFG.plans.find(p => p.tag === 'Popular') || CFG.plans[0]).id;
const planObj = () => CFG.plans.find(p => p.id === state.plan);
const durText = (p) => p.months === 1 ? '1 month' : p.months === 12 ? '1 year' : p.months + ' months';

/* ---------------- coupon helpers ---------------- */
const LSK = 'fitos_coupon';
const normCode = (v) => String(v || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 20);
const lsGet = () => { try { const j = JSON.parse(localStorage.getItem(LSK) || 'null'); if (j && j.code && Date.now() - (j.ts || 0) < 30 * 864e5) return normCode(j.code); } catch (e) { /* storage blocked */ } return ''; };
const lsSet = (c) => { try { c ? localStorage.setItem(LSK, JSON.stringify({ code: c, ts: Date.now() })) : localStorage.removeItem(LSK); } catch (e) { /* storage blocked */ } };
const myKey = () => 'google_' + String(state.user.email).toLowerCase().replace(/[^a-z0-9_\-]/g, '_');
const couponEnabled = () => { const el = $('#coupon'); return !!el && !el.hasAttribute('data-cms-hidden'); };
const cpPlanOk = (pub, planId) => !pub || !pub.plans || !pub.plans.length || pub.plans.indexOf(planId) >= 0;
/* discount for one price — rounded DOWN so it can never exceed what the coupon allows (the Firestore rules re-check this) */
function cpCalc(pub, price) {
  let d = pub.type === 'fixed' ? Number(pub.value) : Math.floor(price * Number(pub.value) / 100);
  if (pub.type !== 'fixed' && Number(pub.maxDiscount) > 0) d = Math.min(d, Number(pub.maxDiscount));
  d = Math.min(Math.floor(d), price - 1);
  return d > 0 ? d : 0;
}
/* what the customer pays for the CURRENT plan (with the applied coupon, if it is valid for this plan) */
function pricing(planId) {
  const p = CFG.plans.find(x => x.id === (planId || state.plan)), list = p.price, c = state.cp.pub;
  if (c && couponEnabled() && cpPlanOk(c, p.id)) { const d = cpCalc(c, list); if (d > 0) return { list, discount: d, final: list - d, code: c.code }; }
  return { list, discount: 0, final: list, code: '' };
}
const planNames = (ids) => ids.map(i => (CFG.plans.find(p => p.id === i) || { label: i }).label).join(', ');

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
    const pr = pricing(p.id);
    return `<button type="button" class="pp${p.id === state.plan ? ' on' : ''}" role="radio" aria-checked="${p.id === state.plan}" data-plan="${p.id}">
      ${p.tag ? `<em>${p.tag}</em>` : ''}<span>${p.label}</span><b>${cur}${fmt(pr.final)}${pr.discount ? ` <s>${cur}${fmt(p.price)}</s>` : ''}</b><span>${durText(p)}${sv ? ' · save ' + sv + '%' : ''}</span></button>`;
  }).join('');
  box.querySelectorAll('.pp').forEach(b => b.addEventListener('click', () => { state.plan = b.dataset.plan; refresh(); }));
}
function renderSummary() {
  const p = planObj();
  $('#sum-plan').textContent = 'Pro · ' + p.label; $('#sum-dur').textContent = durText(p);
  const pr = pricing();
  $('#sum-total').textContent = cur + fmt(pr.final);
  $('#sum-list-row').classList.toggle('cp-off', !pr.discount); $('#sum-disc-row').classList.toggle('cp-off', !pr.discount);
  $('#sum-list').textContent = cur + fmt(pr.list); $('#sum-disc').textContent = '−' + cur + fmt(pr.discount); $('#sum-code').textContent = pr.code;
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
  const p = planObj(), pr = pricing(), m = CFG.payment[state.method], configured = !/X/i.test(m.number);
  $('#pay-tabs').innerHTML = Object.keys(CFG.payment).map(k => { const c = CFG.payment[k];
    return `<button type="button" class="ptab${k === state.method ? ' on' : ''}" role="tab" aria-selected="${k === state.method}" data-m="${k}" style="--pc:${c.color}"><i style="background:${c.color}"></i>${c.name}</button>`; }).join('');
  document.querySelectorAll('.ptab').forEach(b => b.addEventListener('click', () => { state.method = b.dataset.m; renderPay(); }));
  $('#pay-box').innerHTML = `
    <div class="pay-line"><span>${m.name} · ${m.kind} to</span><span class="pay-num" id="pay-num">${m.number}</span><button type="button" class="copy" id="copy-num">Copy</button></div>
    <div class="pay-line"><span>Amount to send</span><span class="pay-num" style="color:var(--g)">${cur}${fmt(pr.final)}</span><button type="button" class="copy" id="copy-amt">Copy</button></div>
    ${pr.discount ? `<div class="pay-line"><span>Coupon <b>${pr.code}</b> applied</span><span><span class="cp-was">${cur}${fmt(pr.list)}</span> → <b style="color:var(--g)">${cur}${fmt(pr.final)}</b> · you save ${cur}${fmt(pr.discount)}</span></div>` : ''}
    ${configured ? '' : '<div class="warn" style="margin:0"><span>🚧</span><span>Payment number is not configured yet. Set it in <b>assets/js/config.js</b>.</span></div>'}`;
  $('#how-pay').innerHTML = HOW[state.method](m.number, pr.final).map(t => `<li><span>${t}</span></li>`).join('');
  $('#copy-num').onclick = () => copy(m.number, 'Number copied'); $('#copy-amt').onclick = () => copy(String(pr.final), 'Amount copied');
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
    // Re-check the coupon right before submitting (it may have been paused / used up / changed while the customer was paying).
    let pr = pricing();
    if (pr.code) {
      const shown = pr.final, chk = await cpCheck(pr.code);
      state.cp.pub = chk.ok ? chk.pub : null; pr = pricing();
      if (!chk.ok || pr.final !== shown) {
        refresh();
        $('#e-submit').textContent = (chk.ok ? 'The coupon discount was updated.' : 'Coupon ' + chk.code + ' is no longer valid (' + chk.msg.replace(/\.$/, '').toLowerCase() + ').')
          + ' The amount to send is now ' + cur + fmt(pr.final) + ' — please check it' + (pr.final > shown ? ', and contact us if you have already paid the lower amount' : '') + ', then press Submit again.';
        btn.disabled = false; $('#submit-lbl').textContent = 'Submit payment'; return;
      }
    }
    const u = state.user, reqId = state.method + '_' + trx, now = Date.now();
    const batch = writeBatch(db);
    const pay = { uid: u.uid, email: String(u.email).toLowerCase(), name, phone, plan: p.id, amount: pr.final, method: state.method, trxId: trx, status: 'pending', createdAt: serverTimestamp() };
    if (pr.code) { pay.coupon = pr.code; pay.listPrice = pr.list; pay.discount = pr.discount; }
    batch.set(doc(db, 'paymentRequests', reqId), pay);
    // One use per customer: the claim is created together with the payment request. It is counted as a real "use" only when the owner VERIFIES the payment.
    if (pr.code) batch.set(doc(db, 'couponClaims', pr.code + '_' + u.uid), { code: pr.code, uid: u.uid, reqId, createdAt: serverTimestamp() });
    // Provisional Pro — only if the user has no active Pro already (the rules also enforce this).
    const e = state.ent, active = e && (e.status === 'pending' || e.status === 'verified') && e.proUntil && e.proUntil.toMillis() > now;
    const hours = Math.min(CFG.pendingHours || 96, 119);
    const until = Timestamp.fromMillis(now + hours * 3600 * 1000);
    if (!active) batch.set(doc(db, 'entitlements', u.uid), { uid: u.uid, email: String(u.email).toLowerCase(), plan: p.id, status: 'pending', requestId: reqId, amount: pr.final, startedAt: serverTimestamp(), proUntil: until, updatedAt: serverTimestamp(), source: 'checkout' });
    await batch.commit();
    if (pr.code) { lsSet(''); state.cp.pub = null; state.cp.wanted = ''; }
    showSuccess({ trx, p, pr, until: active ? (e.proUntil) : until, active, method: state.method });
  } catch (err) {
    console.error(err);
    $('#e-submit').textContent = (err && err.code === 'permission-denied')
      ? 'We could not submit this. This Transaction ID may already be used' + (state.cp.pub ? ', the coupon may no longer be valid' : '') + ', or your sign-in expired — please check and try again.'
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
  [['Plan', 'Pro · ' + r.p.label], ['Amount', cur + fmt(r.pr.final)], ...(r.pr.discount ? [['Coupon', r.pr.code + ' (−' + cur + fmt(r.pr.discount) + ')']] : []), ['Method', CFG.payment[r.method].name], ['Transaction ID', r.trx], ['Pro access until', d(r.until) + (r.active ? '' : ' (while we verify)')]].forEach(([k, v]) => {
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


/* ---------------- coupon: check / apply / remove ---------------- */
const cpMsg = (t, kind) => { const el = $('#cp-msg'); el.textContent = t || ''; el.className = 'cp-msg' + (kind ? ' ' + kind : ''); };
/* Validate a code for THIS signed-in account. Plan eligibility is handled separately (it can change when the plan changes). */
async function cpCheck(code) {
  const no = (msg) => ({ ok: false, code, msg });
  let snap;
  try { snap = await getDoc(doc(db, 'couponPub', code)); }
  catch (e) { console.error(e); return no('We could not check this coupon right now. Please try again.'); }
  if (!snap.exists()) return no('This coupon code is not valid.');
  const pub = snap.data(); pub.code = code;
  if (pub.active !== true) return no('This coupon is not active right now.');
  if (pub.expiresAt && pub.expiresAt < Date.now()) return no('This coupon has expired.');
  if (pub.maxUses && pub.used >= pub.maxUses) return no('This coupon has reached its usage limit.');
  if (pub.ownerKey && pub.ownerKey === myKey()) return no('You cannot use your own coupon code.');
  try { if ((await getDoc(doc(db, 'couponClaims', code + '_' + state.user.uid))).exists()) return no('You have already used this coupon.'); }
  catch (e) { console.error(e); return no('We could not check this coupon right now. Please try again.'); }
  return { ok: true, pub };
}
async function cpApply(raw, auto) {
  const code = normCode(raw), inp = $('#cp-input');
  if (state.cp.busy) return;
  if (!code) return cpMsg('Enter a coupon code.', 'err');
  if (code.length < 3) return cpMsg('A coupon code has 3–20 letters or numbers.', 'err');
  inp.value = code; state.cp.wanted = code; lsSet(code);
  if (!state.user) { openCoupon(true); return cpMsg('Code ' + code + ' saved. Sign in with Google below and it will be applied automatically.', 'warn'); }
  state.cp.busy = true; $('#cp-apply').disabled = true; cpMsg('Checking ' + code + '…', 'busy');
  const r = await cpCheck(code);
  state.cp.busy = false; $('#cp-apply').disabled = false;
  if (!r.ok) {
    state.cp.pub = null; state.cp.wanted = ''; lsSet('');
    if (auto) openCoupon(true);
    cpMsg(r.msg, 'err'); refresh(); return;
  }
  state.cp.pub = r.pub; state.cp.wanted = '';
  refresh();
  if (!cpPlanOk(r.pub, state.plan)) cpMsg('Coupon ' + code + ' is valid for the ' + planNames(r.pub.plans) + ' plan' + (r.pub.plans.length > 1 ? 's' : '') + ' only — pick one of those to use it.', 'warn');
}
function cpRemove() { state.cp.pub = null; state.cp.wanted = ''; lsSet(''); $('#cp-input').value = ''; cpMsg(''); refresh(); }
function openCoupon(on) { $('#cp-body').classList.toggle('cp-off', !on); $('#cp-toggle').setAttribute('aria-expanded', String(!!on)); if (on) { try { $('#cp-input').focus({ preventScroll: true }); } catch (e) { /* ignore */ } } }
function renderCoupon() {
  const c = state.cp.pub, pr = pricing(), applied = !!c, ok = applied && pr.discount > 0;
  $('#cp-applied').classList.toggle('cp-off', !applied);
  $('#cp-toggle').classList.toggle('cp-off', applied); if (applied) $('#cp-body').classList.add('cp-off');
  if (applied) {
    $('#cp-ap-code').textContent = c.code;
    $('#cp-ap-sub').textContent = ok ? 'Applied — you save ' + cur + fmt(pr.discount) + ' on this plan'
      : 'Not valid for the ' + planObj().label + ' plan — pick ' + planNames(c.plans || []);
    $('#cp-applied').style.borderColor = ok ? '' : 'var(--y)';
  } else { $('#cp-applied').style.borderColor = ''; }
  if (ok) cpMsg('', '');
}
$('#cp-toggle').addEventListener('click', () => openCoupon($('#cp-body').classList.contains('cp-off')));
$('#cp-apply').addEventListener('click', () => cpApply($('#cp-input').value, false));
$('#cp-input').addEventListener('input', (e) => { e.target.value = normCode(e.target.value); cpMsg(''); });
$('#cp-input').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); cpApply($('#cp-input').value, false); } });
$('#cp-remove').addEventListener('click', cpRemove);

function refresh() { renderPlans(); renderCoupon(); renderSummary(); renderPay(); }

/* a code can arrive from a creator's link (checkout.html?coupon=CODE — or any page of the site, saved by site.js) */
{
  const fromUrl = normCode(q.get('coupon') || q.get('code') || ''), saved = fromUrl || lsGet();
  if (saved && couponEnabled()) { state.cp.wanted = saved; $('#cp-input').value = saved; if (fromUrl) lsSet(saved); openCoupon(true); cpMsg('Code ' + saved + ' is ready — it is applied automatically once you are signed in with Google.', 'warn'); }
}
refresh();

/* auth listener is registered LAST so every helper it touches is already defined */
let lastUid = null;
onAuthStateChanged(auth, (u) => {
  state.user = u; renderAuth(); loadEnt();
  if ((u ? u.uid : null) !== lastUid) {                         // account changed → coupon checks (own coupon / already used) are per account
    lastUid = u ? u.uid : null;
    if (state.cp.pub) { state.cp.wanted = state.cp.pub.code; state.cp.pub = null; }
    refresh();
    if (u && state.cp.wanted && couponEnabled()) cpApply(state.cp.wanted, true);
  }
});
