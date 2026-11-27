#!/usr/bin/env node
/* =====================================================================
   FIT//OS Marketing-Agent runner  (GitHub Actions → every 3 hours)
   Reads  admin/agents  from Firestore, and for every ACTIVE agent writes the
   entries a person with that personality would have made by "now"
   (breakfast ~7am, lunch ~1pm, water all day, workout in the evening …).
   It only ever writes inside the agent's own  users/{uid}/…  documents.
   Needs the secret  FIREBASE_SERVICE_ACCOUNT  (the service-account JSON).
   ===================================================================== */
'use strict';
const E = require('./agent-engine.js');

const COLLECTIONS = E.COLLECTIONS;

async function readUser(db, uid) {
  const root = await db.doc('users/' + uid).get();
  const mig = root.exists ? (root.data() || {}).migration : null;
  if (!mig || !mig.verified) throw new Error('This account has not opened the latest app yet (no verified data store).');
  const prof = await db.doc('users/' + uid + '/profile/main').get();
  if (!prof.exists) throw new Error('Profile data not found.');
  const docs = { 'profile/main': prof.data() };
  const snaps = await Promise.all(COLLECTIONS.map((c) => db.collection('users/' + uid + '/' + c).get()));
  snaps.forEach((s, i) => s.forEach((d) => { docs[COLLECTIONS[i] + '/' + d.id] = d.data(); }));
  return docs;
}

async function writeUser(db, uid, docId, ops, state, nowIso) {
  for (let i = 0; i < ops.length; i += 400) {
    const b = db.batch();
    ops.slice(i, i + 400).forEach((o) => {
      const k = o.path.indexOf('/');
      b.set(db.doc('users/' + uid + '/' + o.path.slice(0, k) + '/' + o.path.slice(k + 1)), Object.assign({}, o.data, { _updatedAt: nowIso }));
    });
    await b.commit();
  }
  // marker the app polls: open devices of this account reload on next focus
  await db.doc('users/' + uid).set({ uid: uid, lastSyncedAt: nowIso, lastWriter: 'agent' }, { merge: true });
  // small summary the Admin → Users list reads
  await db.doc('fitos_users/' + docId).set({ summary: E.summarize(state), lastSaved: nowIso }, { merge: true });
}

async function runOne(db, id, a, nowMs, log) {
  let uid = a.uid;
  if (!uid) { const u = await db.doc('fitos_users/' + id).get(); uid = u.exists ? (u.data() || {}).authUid : null; }
  if (!uid) throw new Error('No sign-in id for this user yet (they must sign in once).');
  const docs = await readUser(db, uid);
  const state = E.join(docs);
  let ast = {}; try { ast = JSON.parse(a.astJson || '{}'); } catch (e) { ast = {}; }
  const first = ast.since == null;
  const res = E.run(state, a.persona, ast, nowMs, { backfillDays: first ? ((a.persona && a.persona.backfillDays) || 0) : 0 });
  const ops = E.diff(docs, state);
  const nowIso = new Date(nowMs).toISOString();
  if (ops.length && !process.env.DRY_RUN) await writeUser(db, uid, id, ops, state, nowIso);
  const lines = (a.log || []).concat(res.log.map((l) => ({ d: l.date, t: l.t, x: l.text }))).slice(-40);
  if (!process.env.DRY_RUN) {
    await db.doc('admin/agents').set({ agents: { [id]: { uid: uid, astJson: JSON.stringify(ast), lastRun: nowIso, lastApplied: res.applied, total: ast.total || 0, log: lines, err: '' } } }, { merge: true });
  }
  log('  ✓ ' + (a.name || id) + ': ' + res.applied + ' new entries, ' + ops.length + ' documents written');
  return res.applied;
}

async function main(db, opts) {
  opts = opts || {};
  const log = opts.log || console.log, nowMs = opts.now || (process.env.AGENT_NOW ? Date.parse(process.env.AGENT_NOW) : Date.now());
  const snap = await db.doc('admin/agents').get(), d = snap.exists ? (snap.data() || {}) : {};
  const agents = d.agents || {}, ids = Object.keys(agents).filter((k) => agents[k].enabled !== false);
  log('FIT//OS agents — ' + new Date(nowMs).toISOString() + ' — ' + ids.length + ' active agent(s)' + (d.paused ? ' (PAUSED)' : ''));
  let applied = 0, errors = [];
  if (!d.paused) {
    for (const id of ids) {
      try { applied += await runOne(db, id, agents[id], nowMs, log); }
      catch (e) {
        const msg = String(e && e.message || e).slice(0, 200); errors.push(id + ': ' + msg); log('  ✗ ' + id + ': ' + msg);
        try { await db.doc('admin/agents').set({ agents: { [id]: { err: msg } } }, { merge: true }); } catch (x) { /* ignore */ }
      }
    }
  }
  await db.doc('admin/agents').set({ runner: { at: new Date().toISOString(), agents: ids.length, applied: applied, error: errors.join(' | ').slice(0, 300), paused: !!d.paused } }, { merge: true });
  log('done — ' + applied + ' entries');
  return { applied, errors, agents: ids.length };
}

module.exports = { main, runOne, readUser, writeUser };

if (require.main === module) {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) { console.error('Missing secret FIREBASE_SERVICE_ACCOUNT (repo → Settings → Secrets → Actions).'); process.exit(1); }
  let sa; try { sa = JSON.parse(raw); } catch (e) { console.error('FIREBASE_SERVICE_ACCOUNT is not valid JSON — paste the whole key file.'); process.exit(1); }
  const admin = require('firebase-admin');
  admin.initializeApp({ credential: admin.credential.cert(sa) });
  main(admin.firestore()).then((r) => process.exit(r.errors.length && !r.applied && r.agents === r.errors.length ? 1 : 0)).catch((e) => { console.error(e); process.exit(1); });
}
