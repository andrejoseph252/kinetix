/* Kinetix — Colloquy: talking to God plainly, as a friend talks to a friend (St Ignatius).
   A blank page with no structure to get it "right". Keep it privately, or let it go and save nothing.
   Optional passcode lock: kept entries and the draft are encrypted on the device (AES-GCM,
   key derived from the passcode with PBKDF2), so neither the app's storage nor a backup is readable without it. */
'use strict';

const CQ_PAL = ['#3b2a7a', '#d9805a', '#8a3f6e'];
const CQ_OPEN = 'Lord, here’s what’s really on my heart.';
const CQ_STARTS = ['What I really want is', 'What I’m afraid to admit is', 'I’m angry that', 'I’m ashamed that', 'I don’t understand why', 'I’m tired of', 'Please', 'Thank you for', 'Honestly, you feel far away right now.'];
const CQ_GRACE = 2 * 60 * 1000; // re-lock after the app has been in the background this long

(function initCq() {
  const f = S.faith;
  f.cq = f.cq || { lock: null, entries: [], draft: null };
  const p = { id: 'colloquy', kind: 'colloquy', name: 'Colloquy', when: 'any', days: ALL_DAYS.slice(), on: false, sub: 'Talk to God plainly, as a friend' };
  FAITH_DEFAULT_PRACTICES.push(p);
  if (!f.practices.some(x => x.id === 'colloquy')) f.practices.push(clone(p));
})();

/* ---------- storage & crypto ---------- */
const CQ = { key: null, mem: null, chain: Promise.resolve(), hiddenAt: 0, stage: 'write', armed: false, kept: false };
const cqLocked = () => !!F().cq.lock;
const cqReady = () => !cqLocked() || !!CQ.key;
const cqData = () => cqLocked() ? CQ.mem : F().cq;
const canLock = () => !!(window.crypto && crypto.subtle);
const b64 = buf => { const b = new Uint8Array(buf); let s = ''; for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000)); return btoa(s); };
const unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
async function cqKey(pass, salt) {
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(pass), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: 250000, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}
async function cqSeal(key, salt, data) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(JSON.stringify(data)));
  return { salt: b64(salt), iv: b64(iv), ct: b64(ct) };
}
// Save, in order (encryption is async; never let an older write land after a newer one)
function cqPersist() {
  CQ.chain = CQ.chain.then(async () => {
    if (!cqLocked()) { save(); return; }
    if (!CQ.key || !CQ.mem) return;
    F().cq.lock = await cqSeal(CQ.key, unb64(F().cq.lock.salt), { entries: CQ.mem.entries, draft: CQ.mem.draft });
    save();
  }).catch(() => toast('Could not save'));
  return CQ.chain;
}
let cqT = null;
function cqPersistSoon() { clearTimeout(cqT); cqT = setTimeout(cqPersist, 500); }
async function cqUnlock(pass) {
  const L = F().cq.lock;
  try {
    const key = await cqKey(pass, unb64(L.salt));
    const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(L.iv) }, key, unb64(L.ct));
    CQ.mem = JSON.parse(new TextDecoder().decode(pt)); CQ.mem.entries = CQ.mem.entries || []; CQ.key = key;
    return true;
  } catch (e) { return false; }
}
async function cqSetLock(pass) {
  const d = F().cq, salt = crypto.getRandomValues(new Uint8Array(16)), key = await cqKey(pass, salt);
  const mem = { entries: d.entries || [], draft: d.draft || null };
  const sealed = await cqSeal(key, salt, mem);
  F().cq = { lock: sealed }; CQ.key = key; CQ.mem = mem; save();
}
function cqRemoveLock() { const m = CQ.mem; F().cq = { lock: null, entries: m.entries, draft: m.draft }; CQ.key = null; CQ.mem = null; save(); }
function cqLockNow() { clearTimeout(cqT); return cqPersist().then(() => { CQ.key = null; CQ.mem = null; }); }

document.addEventListener('visibilitychange', () => {
  if (!cqLocked() || !CQ.key) return;
  if (document.visibilityState === 'hidden') { CQ.hiddenAt = now(); clearTimeout(cqT); cqPersist(); return; }
  if (now() - CQ.hiddenAt < CQ_GRACE) return;
  cqLockNow().then(() => { if (OV === 'colloquy') hideOverlay(); else if (OV === 'guide' && GD) cqRenderGuide(); else if (current === 'colloquy') rerender(); });
});

/* ---------- unlock / set passcode sheets ---------- */
function cqUnlockSheet(then) {
  CQ.then = then;
  openSheet(`<h3>Locked</h3><div class="muted small">Enter your passcode to open your colloquies.</div>
    <input type="password" id="cqPass" autocomplete="off" placeholder="Passcode" style="margin-top:14px">
    <button class="btn pri block" style="margin-top:12px" data-act="cqUnlock">Unlock</button>`);
  setTimeout(() => { const i = $('#cqPass'); if (i) i.focus(); }, 80);
}
function cqLockSheet() {
  openSheet(`<h3>Lock with a passcode</h3>
    <div class="muted small">Your kept colloquies and any unfinished draft get encrypted on this phone. Without the passcode they can’t be read, not even from a backup.</div>
    <input type="password" id="cqP1" autocomplete="new-password" placeholder="Passcode (at least 4 characters)" style="margin-top:14px">
    <input type="password" id="cqP2" autocomplete="new-password" placeholder="Same again" style="margin-top:8px">
    <div class="note rest" style="margin-top:12px">If you forget it, there’s no way to get them back.</div>
    <button class="btn pri block" style="margin-top:12px" data-act="cqSetLock">Lock</button>`);
}

/* ---------- Faith tab card ---------- */
function cqCard() {
  const d = cqReady() ? cqData() : null, n = d ? d.entries.length : null, draft = d && d.draft && d.draft.text && d.draft.text.trim();
  return `<div class="card cqcard">${glow(CQ_PAL, 'soft')}
    <div class="row" style="align-items:flex-start"><div class="grow"><div class="eyebrow">Colloquy</div><div class="title" style="font-size:28px;margin-top:4px">Say it plainly</div></div>${cqLocked() ? `<span class="cqlock" title="Locked">${CQ_LOCK}</span>` : ''}</div>
    <div class="small" style="margin-top:6px;color:rgba(241,238,230,.8)">Talk to God the way you’d talk to a friend. What you actually want, unfiltered. It’s also step 4 of your Examen.${draft ? ' <b>You have an unfinished one.</b>' : ''}</div>
    <div class="row" style="margin-top:14px"><button class="btn fbtn grow" data-act="cqWrite">${draft ? 'Continue' : 'Write'}</button><a class="btn glass" href="#/colloquy">Kept${n ? ` · ${n}` : ''}</a></div>
  </div>`;
}
const CQ_LOCK = '<svg viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="10" rx="2.5"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>';

/* ---------- the writing page ---------- */
function openColloquy() {
  if (!cqReady()) return cqUnlockSheet('write');
  const d = cqData();
  CQ.stage = 'write'; CQ.armed = false;
  closeSheet(); showOverlay('colloquy'); renderCq();
  setTimeout(() => { const t = $('#cqText'); if (t && !t.value) t.focus(); }, 120);
}
function renderCq() {
  const o = $('#overlay'), d = cqData();
  if (CQ.stage === 'done') {
    o.innerHTML = `${glow(CQ_PAL, 'fixed')}<div class="ov-in guide cqw">
      <div class="ov-top"><button class="icon-btn" data-act="cqDone" aria-label="Close">${ICON.close}</button><div class="t"><b>Colloquy</b></div></div>
      <h2 class="gtitle" style="margin-top:12vh">He heard all of it.</h2>
      <p class="lead">If you can, hand it over: <i>“Not my will, but yours be done.”</i> (Luke 22:42)</p>
      <p class="lead" style="margin-top:12px">If you can’t mean that yet, tell him that too. That’s also prayer.</p>
      <div class="muted small" style="margin-top:22px">${CQ.kept ? 'Kept privately. Come back to it in Kept and note how things turned out.' : 'Let go. It wasn’t saved anywhere.'}</div>
      <button class="btn pri block" style="margin-top:22px" data-act="cqDone">Amen</button>
    </div>`;
    o.scrollTop = 0; return;
  }
  const text = d.draft && d.draft.text || '';
  o.innerHTML = `${glow(CQ_PAL, 'fixed')}<div class="ov-in guide cqw">
    <div class="ov-top"><button class="icon-btn" data-act="cqClose" aria-label="Close">${ICON.close}</button><div class="t"><b>Colloquy</b><span>${cqLocked() ? 'Locked with your passcode' : 'Private, stays on this phone'}</span></div></div>
    <h2 class="gtitle">${esc(CQ_OPEN)}</h2>
    <details class="cq-how"><summary>How to pray this</summary>
      <p>St Ignatius called this a <b>colloquy</b>: speaking “the way one friend speaks to another,” about whatever is on your heart.</p>
      <p>He began every prayer by asking for <b>what you want</b>. Name the real desire, even if it seems small, selfish or messy. God works with what’s true, not with what you think you should want.</p>
      <p>You’re in good company. The Psalms complain, plead and argue (Ps 13, 22, 88). Hannah “poured out her soul” (1 Sam 1:15). Jesus asked for the cup to pass before he said “not my will.”</p>
      <p>So don’t edit, and don’t make it sound holy. You can hand it over at the end.</p>
    </details>
    <div class="chips cq-starts">${CQ_STARTS.map((s, i) => `<button class="chip" data-act="cqStart" data-i="${i}">${esc(s)}…</button>`).join('')}</div>
    <textarea id="cqText" class="cq-text" placeholder="No one else will read this. Say it exactly how it is.">${esc(text)}</textarea>
    <div class="player-nav">
      <button class="btn ${CQ.armed ? 'danger' : 'ghost'}" data-act="cqLetGo">${CQ.armed ? 'Tap again to let it go' : 'Let it go'}</button>
      <button class="btn pri" data-act="cqKeep">Keep it</button>
    </div>
    <div class="muted small" style="text-align:center;margin-top:10px">${CQ.armed ? 'It disappears and isn’t saved anywhere.' : '“Let it go” saves nothing. “Keep it” saves it privately.'}</div>
  </div>`;
}
function cqText() { const t = $('#cqText'); return t ? t.value : ''; }
function cqSetDraft(text) { const d = cqData(); d.draft = text.trim() ? { text } : null; }
function cqResolve(kept, text, src) {
  const d = cqData();
  if (kept) d.entries.unshift(Object.assign({ id: uid(), date: new Date().toISOString(), text }, src ? { src } : {}));
  d.draft = null; clearTimeout(cqT); cqPersist();
  setDone('colloquy', true, faithToday());
}
function cqFinish(kept) {
  cqResolve(kept, cqText());
  CQ.kept = kept; CQ.stage = 'done'; CQ.armed = false;
  if (kept) renderCq();
  else {
    const t = $('#cqText'); if (t) t.classList.add('rising');
    sfx.soft(1); setTimeout(() => { if (OV === 'colloquy') renderCq(); }, 1100);
  }
}

/* ---------- inside the Examen (step 4) ---------- */
function cqExamenHTML() {
  const head = `<p class="lead">Pick one moment from today, good or hard, and talk to God about it like a friend. What do you actually want or feel tonight? Even one sentence counts.</p>`;
  const after = `<p class="lead" style="margin-top:22px">Where you fell short today, ask for forgiveness.</p>${prayerBlock(['contrition'])}`;
  if (!cqReady()) {
    CQ.then = 'examen';
    return head + `<div class="row cq-unlock"><input type="password" id="cqPass" autocomplete="off" placeholder="Passcode to write"><button class="btn" data-act="cqUnlock">Unlock</button></div>` + after;
  }
  if (GD.cq) return head + `<div class="cq-done">${ICON.check}<span>${GD.cq === 'kept' ? 'Kept privately.' : 'Let go. Nothing was saved.'}</span></div>` + after;
  const d = cqData(), text = d.draft && d.draft.text || '';
  return head + `<div class="cqw"><div class="chips cq-starts">${CQ_STARTS.map((s, i) => `<button class="chip" data-act="cqStart" data-i="${i}">${esc(s)}…</button>`).join('')}</div></div>
    <textarea id="cqText" class="cq-text cq-ex" placeholder="No one else will read this. Say it exactly how it is.">${esc(text)}</textarea>
    <div class="row" style="margin-top:10px"><button class="btn sm ${GD.cqArmed ? 'danger' : 'ghost'}" id="cqExGone" data-act="cqExGo" data-k="0">${GD.cqArmed ? 'Tap again to let it go' : 'Let it go'}</button><span class="grow"></span><button class="btn sm glass" data-act="cqExGo" data-k="1">Keep it</button></div>
    <div class="muted small" style="margin-top:8px">Kept ones go to your private Kept list, not the Examen journal. Anything left here is kept when you finish.</div>` + after;
}
function cqRenderGuide() { const o = $('#overlay'), y = o.scrollTop; renderGuide(); o.scrollTop = y; }
function cqExamenFlush() {
  if (!GD || GD.cq || !GD.cqTouched || !cqReady()) return;
  const d = cqData(), text = d.draft && d.draft.text;
  if (text && text.trim()) cqResolve(true, text, 'examen');
}

/* ---------- Kept ---------- */
const cqWhen = iso => new Date(iso).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: new Date(iso).getFullYear() === new Date().getFullYear() ? undefined : 'numeric' });
VIEWS.colloquy = () => {
  setTop(`<a class="icon-btn" href="#/faith" data-nav="back" aria-label="Back">${ICON.back}</a><h1>Kept</h1>`);
  if (!cqReady()) {
    $('#view').innerHTML = `<div class="card cqcard" style="text-align:center;padding:30px 20px">${glow(CQ_PAL, 'soft')}<span class="cqlock big">${CQ_LOCK}</span><div class="title" style="font-size:26px;margin-top:10px">Locked</div>
      <div class="muted small" style="margin-top:6px">Your colloquies are encrypted on this phone.</div>
      <input type="password" id="cqPass" autocomplete="off" placeholder="Passcode" style="margin-top:16px">
      <button class="btn fbtn block" style="margin-top:10px" data-act="cqUnlock">Unlock</button></div>`;
    CQ.then = 'view'; return;
  }
  const d = cqData();
  const list = d.entries.map(e => `<button class="prow cqrow" data-act="cqOpen" data-id="${e.id}"><span class="grow"><b>${cqWhen(e.date)}</b><span>${new Date(e.date).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}${e.src === 'examen' ? ' · Examen' : ''}${e.after ? ' · looked back' : ''}</span></span><span class="muted small">Read</span></button>`).join('');
  $('#view').innerHTML = `
    <p class="muted small" style="margin-top:0">What you’ve said to God, only for you. Looking back later, and noting how things turned out, is often where you see what he did with it.</p>
    ${d.draft && d.draft.text ? `<button class="prow" data-act="cqWrite" style="border-radius:14px;margin-bottom:10px"><span class="grow"><b>Unfinished</b><span>Pick up where you left off</span></span></button>` : ''}
    ${list ? `<div class="plist">${list}</div>` : `<div class="empty">Nothing kept yet.</div>`}
    <button class="btn fbtn block" style="margin-top:14px" data-act="cqWrite">Write a new one</button>
    <div class="h2">Privacy</div>
    <div class="card stack">
      ${cqLocked() ? `<div class="small">Locked with a passcode. Entries are encrypted on this phone and in backups. It locks itself when the app has been in the background for a couple of minutes.</div>
        <div class="row"><button class="btn grow" data-act="cqLockNow">${CQ_LOCK} Lock now</button><button class="btn ghost grow" data-act="cqUnlockOff">Remove lock</button></div>`
      : `<div class="small">Stored only on this phone, not encrypted. Exported backups include them as plain text.</div>
        ${canLock() ? `<button class="btn block" data-act="cqLockSet">${CQ_LOCK} Lock with a passcode</button>` : '<div class="muted small">Locking needs the app to be opened over https.</div>'}`}
    </div>`;
};
function cqEntrySheet(id) {
  const e = cqData().entries.find(x => x.id === id); if (!e) return;
  CQ.openId = id; CQ.delArmed = false;
  openSheet(`<div class="eyebrow">${cqWhen(e.date)} · ${new Date(e.date).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</div>
    <div class="cq-read">${esc(e.text).replace(/\n/g, '<br>')}</div>
    <div class="field"><div class="lab">Looking back</div><div class="hint">How did it turn out? What do you see now?</div>
      <textarea id="cqAfter" placeholder="Later, I noticed…">${esc(e.after || '')}</textarea></div>
    <button class="btn ghost danger block" style="margin-top:16px" id="cqDelBtn" data-act="cqDel">${ICON.trash} Delete</button>`);
  onSheetClose = () => rerender();
}

Object.assign(ACT, {
  cqWrite: () => openColloquy(),
  cqExGo: el => {
    const t = $('#cqText'), text = t ? t.value : '';
    if (!text.trim()) { toast('Nothing written yet'); return; }
    if (el.dataset.k === '1') { cqResolve(true, text, 'examen'); GD.cq = 'kept'; buzz(20); cqRenderGuide(); return; }
    if (!GD.cqArmed) { GD.cqArmed = true; cqRenderGuide(); return; }
    t.classList.add('rising'); sfx.soft(1);
    setTimeout(() => { if (!GD) return; cqResolve(false, text); GD.cq = 'gone'; GD.cqArmed = false; cqRenderGuide(); }, 1100);
  },
  cqStart: el => {
    const t = $('#cqText'); if (!t) return;
    const s = CQ_STARTS[+el.dataset.i], v = t.value, at = t.selectionStart != null && document.activeElement === t ? t.selectionStart : v.length;
    const before = v.slice(0, at), lead = before && !/\n\s*$/.test(before) ? (/\n$/.test(before) ? '' : '\n\n') : '';
    const ins = lead + s + (/[.?!]$/.test(s) ? ' ' : ' ');
    t.value = before + ins + v.slice(at); t.focus(); const p = at + ins.length; t.setSelectionRange(p, p);
    cqSetDraft(t.value); cqPersistSoon();
  },
  cqKeep: () => { if (!cqText().trim()) { toast('Nothing written yet'); return; } cqFinish(true); },
  cqLetGo: () => {
    if (!cqText().trim()) { ACT.cqClose(); return; }
    if (!CQ.armed) { CQ.armed = true; cqSetDraft(cqText()); renderCq(); return; }
    cqFinish(false);
  },
  cqClose: () => { cqSetDraft(cqText()); clearTimeout(cqT); cqPersist(); hideOverlay(); if (cqData().draft) toast('Saved as unfinished'); },
  cqDone: () => { CQ.stage = 'write'; hideOverlay(); toast('Amen'); },
  cqUnlock: async () => {
    const i = $('#cqPass'), p = i && i.value; if (!p) return;
    const btn = $('[data-act=cqUnlock]'); if (btn) { btn.disabled = true; btn.textContent = 'Unlocking…'; }
    const ok = await cqUnlock(p);
    if (!ok) { toast('Wrong passcode'); if (btn) { btn.disabled = false; btn.textContent = 'Unlock'; } i.value = ''; i.focus(); return; }
    closeSheet();
    if (CQ.then === 'write') openColloquy(); else if (CQ.then === 'examen' && GD) cqRenderGuide(); else rerender();
  },
  cqLockSet: () => cqLockSheet(),
  cqSetLock: async () => {
    const a = ($('#cqP1') || {}).value || '', b = ($('#cqP2') || {}).value || '';
    if (a.length < 4) { toast('At least 4 characters'); return; }
    if (a !== b) { toast('Those don’t match'); return; }
    await cqSetLock(a); closeSheet(); rerender(); toast('Locked');
  },
  cqLockNow: () => cqLockNow().then(() => { rerender(); toast('Locked'); }),
  cqUnlockOff: () => confirmSheet('Remove the lock?', 'Your colloquies will be stored without encryption on this phone, and exported backups will include them as plain text.', 'Remove lock', () => { cqRemoveLock(); rerender(); toast('Lock removed'); }, true),
  cqOpen: el => cqEntrySheet(el.dataset.id),
  cqDel: () => {
    if (!CQ.delArmed) { CQ.delArmed = true; const b = $('#cqDelBtn'); if (b) b.innerHTML = `${ICON.trash} Tap again to delete for good`; return; }
    const d = cqData(); d.entries = d.entries.filter(x => x.id !== CQ.openId); cqPersist(); dismissSheet(); rerender(); toast('Deleted');
  },
});
document.addEventListener('input', e => {
  const t = e.target;
  if (t.id === 'cqText') {
    if (CQ.armed) { CQ.armed = false; renderCqNav(); }
    if (OV === 'guide' && GD) { GD.cqTouched = true; if (GD.cqArmed) { GD.cqArmed = false; const b = $('#cqExGone'); if (b) { b.className = 'btn sm ghost'; b.textContent = 'Let it go'; } } }
    cqSetDraft(t.value); cqPersistSoon();
  }
  else if (t.id === 'cqAfter') { const x = cqReady() && cqData().entries.find(y => y.id === CQ.openId); if (x) { x.after = t.value; cqPersistSoon(); } }
});
function renderCqNav() { const b = $('[data-act=cqLetGo]'); if (b) { b.className = 'btn ghost'; b.textContent = 'Let it go'; } }
document.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.id === 'cqPass') ACT.cqUnlock(); });
