/* Kinetix — editing sessions: item & block sheets, picker, swap. */
'use strict';
/* =========================================================
   Editor: item sheet, block sheet, exercise picker, swap
   ========================================================= */
let ED = null; // { ref, bid, iid }
function edCtx() { const sess = getSess(ED.ref), b = findB(sess, ED.bid), it = b && ED.iid ? b.items.find(x => x.id === ED.iid) : null; return { sess, b, it, w: weekOf(ED.ref) }; }
function edDone() { save(); onSheetClose = refresh; }
const stepper = (act, k, val, label, d = 1, f = v => v) => `<div class="fld"><div class="eyebrow">${label}</div><div class="stepper"><button data-act="${act}" data-k="${k}" data-d="${-d}">−</button><output class="num">${f(val)}</output><button data-act="${act}" data-k="${k}" data-d="${d}">+</button></div></div>`;

function openItem(ref, bid, iid) { ED = { ref, bid, iid }; onSheetClose = refresh; renderItemSheet(); }
function renderItemSheet() {
  const { b, it, w } = edCtx(); if (!it) { closeSheet(); return; }
  const ex = BY[it.ex], r = rx(it, w), F = b.fmt, idx = b.items.indexOf(it);
  const showSets = F === 'sets', clock = CLOCK.includes(F);
  const amtLbl = r.unit === 'sec' ? 'Seconds' : r.unit === 'm' ? 'Metres' : 'Reps';
  const stepN = r.unit === 'reps' ? 1 : 5;
  openSheet(`
    <div class="row" style="align-items:center">${ph(ex, 'thumb')}<div class="grow"><div class="eyebrow">${esc(b.title)}${b.key ? ' · ' + esc(b.key) + (idx + 1) : ''}</div><h3 style="font-size:19px">${esc(ex.name)}</h3></div></div>
    <div class="row" style="margin-top:10px"><button class="btn sm ghost grow" data-act="ex" data-id="${ex.id}">${ICON.info} How to</button><a class="btn sm ghost grow" href="${ytUrl(ex.name)}" target="_blank" rel="noopener">${ICON.yt} Demos</a><button class="btn sm grow" data-act="iswap">${ICON.swap} Swap</button></div>
    ${clock && F === 'intervals' && it.n == null ? `<div class="muted small" style="margin-top:14px">Timed by the interval clock (${b.work}s on). Set reps or time below to give yourself a target.</div>` : ''}
    <div class="fld-grid" style="margin-top:14px">
      ${showSets ? stepper('ied', 'sets', r.sets, 'Sets') : ''}
      ${stepper('ied', 'n', r.n, amtLbl, stepN)}
      ${r.unit === 'reps' ? stepper('ied', 'hold', r.hold || 0, 'Pause / hold (s)') : ''}
    </div>
    <div class="row" style="margin-top:12px;gap:8px">
      <div class="seg grow">${[['reps', 'Reps'], ['sec', 'Time'], ['m', 'Distance']].map(([v, l]) => `<button class="${r.unit === v ? 'on' : ''}" data-act="iunit" data-v="${v}">${l}</button>`).join('')}</div>
      <button class="chip ${r.side ? 'on' : ''}" data-act="iside" style="height:46px">Per side</button>
    </div>
    <div class="field" style="margin-top:14px"><div class="lab">Tempo <span class="muted small" style="font-weight:500">optional</span></div><input type="text" value="${esc(it.tempo || '')}" placeholder="e.g. 3-1-1, slow, explosive" data-ie="tempo"></div>
    <div class="field" style="margin-top:12px"><div class="lab">Note / cue for this workout</div><textarea data-ie="note" placeholder="e.g. Hands off the floor during the switch">${esc(it.note || '')}</textarea></div>
    ${it.role && hasOverride(it) && ED.ref[0] === 'p' ? `<button class="btn sm ghost block" style="margin-top:10px" data-act="ireset">Reset to the plan's weekly progression</button>` : ''}
    ${it.role && ED.ref[0] === 'p' ? `<div class="muted small" style="margin-top:8px">Changes on a plan day apply to every week of the block.</div>` : ''}
    <div class="row" style="margin-top:16px">
      <button class="btn ghost" data-act="imove" data-d="-1" ${idx === 0 ? 'disabled style="opacity:.35"' : ''} aria-label="Move up">${ICON.up}</button>
      <button class="btn ghost" data-act="imove" data-d="1" ${idx === b.items.length - 1 ? 'disabled style="opacity:.35"' : ''} aria-label="Move down">${ICON.down}</button>
      <button class="btn ghost danger" data-act="idel" aria-label="Remove">${ICON.trash} Remove</button>
      <button class="btn pri grow" data-act="closeSheet">Done</button>
    </div>`, true);
}
function itemSet(k, v) {
  const { b, it, w } = edCtx();
  const r = rx(it, w);
  if (k === 'unit' && r.unit !== v) { it.unit = v; it.n = v === 'sec' ? 30 : v === 'm' ? 20 : 8; if (v !== 'reps') delete it.hold; }
  else if (k === 'side') it.side = !r.side;
  else it[k] = v;
  if (k === 'sets' && S.active && ED.ref === S.active.ref) trimLogs(it, it.sets);
  save(); renderItemSheet();
}

function openBlock(ref, bid) { ED = { ref, bid }; onSheetClose = refresh; renderBlockSheet(); }
function renderBlockSheet() {
  const { sess, b, w } = edCtx(); if (!b) { closeSheet(); return; }
  const F = b.fmt, bi = sess.blocks.indexOf(b), { rest, short } = blockRest(b, w);
  const sec = v => v < 60 ? v + 's' : fmt(v);
  let opts = '';
  if (F === 'sets') opts = stepper('bed', 'rest', rest, 'Rest after round', 15, sec) + (b.items.length > 1 ? stepper('bed', 'restItem', short, 'Between moves', 15, sec) : '');
  if (F === 'circuit') opts = stepper('bed', 'rounds', b.rounds || 1, 'Rounds') + stepper('bed', 'rest', rest, 'Rest after round', 15, sec) + stepper('bed', 'restItem', short, 'Between moves', 5, sec);
  if (F === 'flow') opts = stepper('bed', 'rounds', b.rounds || 1, 'Rounds');
  if (F === 'emom') opts = stepper('bed', 'rounds', b.rounds, 'Minutes');
  if (F === 'intervals') opts = stepper('bed', 'work', b.work, 'Work', 5, sec) + stepper('bed', 'off', b.off, 'Rest', 5, sec) + stepper('bed', 'rounds', b.rounds, 'Rounds');
  if (F === 'amrap') opts = stepper('bed', 'mins', b.mins, 'Minutes');
  if (F === 'note') opts = stepper('bed', 'mins', b.mins || 0, 'Minutes', 5);
  openSheet(`<div class="eyebrow">Block ${bi + 1} of ${sess.blocks.length}</div>
    <div class="field" style="margin-top:8px"><div class="lab">Title</div><input type="text" value="${esc(b.title)}" data-be="title"></div>
    <div class="field" style="margin-top:12px"><div class="lab">Format</div>
      <div class="chips">${Object.entries(FMT).map(([k, [l]]) => `<button class="chip ${F === k ? 'on' : ''}" data-act="bfmt" data-v="${k}">${l}</button>`).join('')}</div>
      <div class="muted small" style="margin-top:8px">${FMT[F][1]}</div></div>
    <div class="fld-grid" style="margin-top:12px">${opts}</div>
    ${F === 'note' ? `<div class="field" style="margin-top:12px"><div class="lab">Text</div><textarea data-be="text">${esc(b.text || '')}</textarea></div>`
      : `<div class="field" style="margin-top:12px"><div class="lab">Block note <span class="muted small" style="font-weight:500">optional</span></div><input type="text" value="${esc(b.note || '')}" placeholder="e.g. Slow and controlled — own every position" data-be="note"></div>`}
    <div class="field" style="margin-top:12px"><div class="lab">Label <span class="muted small" style="font-weight:500">e.g. A, B — optional</span></div><input type="text" value="${esc(b.key || '')}" maxlength="3" data-be="key" style="width:90px"></div>
    <div class="row" style="margin-top:16px;flex-wrap:wrap">
      <button class="btn ghost" data-act="bmove" data-d="-1" ${bi === 0 ? 'disabled style="opacity:.35"' : ''} aria-label="Move up">${ICON.up}</button>
      <button class="btn ghost" data-act="bmove" data-d="1" ${bi === sess.blocks.length - 1 ? 'disabled style="opacity:.35"' : ''} aria-label="Move down">${ICON.down}</button>
      <button class="btn ghost danger" data-act="bdel" aria-label="Delete block">${ICON.trash}</button>
      ${b.gen && sess.q ? `<button class="btn ghost" data-act="breroll">${ICON.shuffle}</button>` : ''}
      <button class="btn pri grow" data-act="closeSheet">Done</button>
    </div>`, true);
}
const FMT_DEFAULTS = {
  sets: b => { if (b.rest == null) { b.rest = 90; b.restItem = b.items.length > 1 ? 30 : 0; } b.items.forEach(it => { if (!it.role && (!it.sets || it.sets < 2)) it.sets = 3; }); },
  circuit: b => { b.rounds = b.rounds || 3; if (b.rest == null) b.rest = 60; if (b.restItem == null) b.restItem = 0; },
  flow: b => { b.rounds = b.rounds || 1; },
  emom: b => { if (!b.rounds || b.rounds < 4) b.rounds = 10; },
  intervals: b => { b.work = b.work || 30; b.off = b.off != null ? b.off : 30; if (!b.rounds || b.rounds < 4) b.rounds = 8; },
  amrap: b => { b.mins = b.mins || 10; },
  note: b => { b.mins = b.mins || 10; },
};

let PK = null; // picker state
function openPicker(ref, bid) { PK = { ref, bid, q: '', f: 'all', mine: true, added: 0 }; onSheetClose = refresh; renderPicker(); }
function renderPicker() {
  const { b } = (ED = { ref: PK.ref, bid: PK.bid }, edCtx());
  openSheet(`<div class="eyebrow">Add to ${esc(b.title)}</div><h3>Add exercise</h3>
    <input type="search" id="pickq" placeholder="Search exercises, muscles…" value="${esc(PK.q)}" autocomplete="off" style="margin-top:8px">
    <div class="chips scroll" style="margin-top:10px">${LIB_FILTERS.map(([k, l]) => `<button class="chip ${PK.f === k ? 'on' : ''}" data-act="pkf" data-k="${k}">${l}</button>`).join('')}</div>
    <div class="row" style="margin-top:8px"><button class="chip ${PK.mine ? 'on' : ''}" data-act="pkmine">My equipment only</button><span class="grow"></span><button class="btn sm pri" data-act="closeSheet">Done</button></div>
    <div id="pickList" style="margin-top:10px"></div>`, true);
  renderPickList();
}
function renderPickList() {
  const q = PK.q.trim().toLowerCase(), f = (LIB_FILTERS.find(x => x[0] === PK.f) || LIB_FILTERS[0])[2], ctx = ctxFor(S.settings);
  const list = EX.filter(e => f(e) && (!PK.mine || avail(e, ctx)) && (!q || (e.name + ' ' + e.tags.map(t => TAG_LABEL[t] || t).join(' ') + ' ' + e.muscles.join(' ')).toLowerCase().includes(q))).slice(0, 80);
  $('#pickList').innerHTML = (q ? `<button class="btn sm ghost block" style="margin-bottom:10px" data-act="pcustom">${ICON.plus} Add “${esc(PK.q.trim())}” as my own exercise</button>` : '') +
    (list.map(e => `<div class="exrow"><button data-act="ex" data-id="${e.id}">${ph(e, 'thumb')}</button><div class="grow" data-act="padd" data-id="${e.id}"><div class="nm">${esc(e.name)}</div><div class="ds">${e.eq.map(x => EQ_LABEL[x]).join(' / ')}</div></div><button class="btn sm" data-act="padd" data-id="${e.id}">Add</button></div>`).join('') || '<div class="empty">No matches</div>');
}
function addItem(id) {
  ED = { ref: PK.ref, bid: PK.bid };
  const { b } = edCtx(); if (!b) return;
  const it = Object.assign({ id: uid(), ex: id }, baseRx(id));
  if (b.fmt === 'sets') it.sets = 3;
  b.items.push(it); save();
  toast('Added ' + BY[id].name);
}

function openSwap(ref, bid, iid) {
  ED = { ref, bid, iid };
  const { sess, b, it } = edCtx(), cur = BY[it.ex];
  const ids = new Set(sess.blocks.flatMap(x => x.items.map(y => y.ex)));
  const ctx = ctxFor(Object.assign({}, S.settings, sess.q && sess.q.eq ? { eq: sess.q.eq } : {}), null, new Set());
  let slot = it.slot && it.slot.p ? it.slot : { p: cur.tags.filter(t => PATTERN_TAGS.includes(t) && !['prep', 'mobility'].includes(t)).slice(0, 2) };
  if (!slot.p.length) slot = { p: cur.tags.filter(t => PATTERN_TAGS.includes(t)).slice(0, 2) };
  const role = it.role || (b.fmt === 'flow' ? 'prep' : 'acc');
  const list = slot.p.length ? candidates(Object.assign({}, slot, { not: undefined, eq: undefined }), role, ctx, ids).slice(0, 16) : [];
  openSheet(`<div class="eyebrow">Swap</div><h3>${esc(cur.name)}</h3><div class="muted small">Similar exercises that match your equipment — or pick anything from the library.</div>
    <button class="btn sm ghost block" style="margin-top:10px" data-act="swapAny">Search the whole library</button>
    <div style="margin-top:12px">${list.map(id => { const e = BY[id]; return `<div class="exrow"><button data-act="ex" data-id="${id}">${ph(e, 'thumb')}</button><div class="grow" data-act="doSwap" data-id="${id}"><div class="nm">${esc(e.name)}</div><div class="ds">${tierDots(e.tier)} ${TIER[e.tier]} · ${e.eq.map(x => EQ_LABEL[x]).join(' / ')}</div></div><button class="btn sm" data-act="doSwap" data-id="${id}">Use</button></div>`; }).join('') || '<div class="empty">No close alternatives — try the whole library.</div>'}</div>`);
}
function doSwap(id) {
  const { it, w } = edCtx(); if (!it) return;
  const before = rx(it, w), d = parseDose(BY[id].dose);
  it.ex = id;
  delete it.note; delete it.tempo; delete it.hold;
  if (it.n != null && before.unit !== d.unit) { it.unit = d.unit; it.n = d.n; it.side = d.side; }
  else if (it.n != null) it.side = d.side;
  if (S.active && ED.ref === S.active.ref) delete S.active.logs[it.id];
  save();
}
function newCustomEx(name) {
  const e = { id: 'c-' + uid(), name, tags: ['custom'], eq: ['bw'], req: [], tier: 1, dose: '10', cues: [], steps: [], muscles: [], img: [], custom: true };
  S.custom.push(e); EX.push(e); BY[e.id] = e; save();
  return e.id;
}
function saveAsTemplate(ref) {
  const sess = getSess(ref), w = weekOf(ref), c = clone(sess);
  c.id = uid();
  c.blocks.forEach(b => b.items.forEach(it => { if (it.role && w) { const r = rx(it, w); RX_KEYS.forEach(k => { if (r[k] != null && r[k] !== '') it[k] = r[k]; }); } }));
  if (ref[0] === 'p') c.name = sess.name;
  S.saved.unshift(c); save();
  return c;
}

document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]');
  if (!el) return;
  const fn = ACT[el.dataset.act];
  if (!fn) return;
  if (el.tagName === 'A' && !['cancelSetup', 'endEdit'].includes(el.dataset.act)) e.preventDefault();
  fn(el, e);
});
document.addEventListener('input', e => {
  const t = e.target;
  if (t.id === 'libq') { S.ui.q = t.value; renderLibGrid(); return; }
  if (t.dataset.in && S.active) {
    const L = S.active.logs[t.dataset.key]; if (!L) return;
    L[+t.dataset.s][t.dataset.in] = t.value.trim(); save();
  }
  if (t.id === 'wNotes' && S.active) { S.active.notes = t.value; save(); }
  if (t.id === 'pickq' && PK) { PK.q = t.value; renderPickList(); return; }
  if (t.dataset.se) { const sess = getSess(t.dataset.r); if (sess) { sess[t.dataset.se] = t.value; save(); } return; }
  if (t.dataset.ie && ED) { const { it } = edCtx(); if (it) { if (t.value.trim()) it[t.dataset.ie] = t.value; else delete it[t.dataset.ie]; save(); } return; }
  if (t.dataset.be && ED) { const { b } = edCtx(); if (b) { b[t.dataset.be] = t.value; save(); } return; }
});
document.addEventListener('change', async e => {
  if (e.target.id !== 'importFile') return;
  const f = e.target.files[0]; if (!f) return;
  try {
    const data = JSON.parse(await f.text());
    if (!data.settings || !Array.isArray(data.history)) throw new Error('bad');
    confirmSheet('Import backup?', `Replace everything on this device with the backup (${data.history.length} sessions)?`, 'Import', () => { localStorage.setItem(KEY, JSON.stringify(data)); location.hash = '#/today'; location.reload(); });
  } catch (err) { toast('That file isn\'t a Kinetix backup'); }
});
window.addEventListener('hashchange', () => { if (!location.hash.startsWith('#/setup')) draft = null; closeSheet(); route(); });

// iOS: keep set inputs visible above the keyboard
document.addEventListener('focusin', e => { if (e.target.matches('.set input')) setTimeout(() => e.target.scrollIntoView({ block: 'center', behavior: 'smooth' }), 250); });

