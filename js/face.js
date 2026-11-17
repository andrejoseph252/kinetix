/* Kinetix — Face: exposure practice with fear ladders and SUDS ratings.
   Ladders: as many as you like, each a list of steps rated by expected SUDS (0–100), shown
   hardest at the top. Sessions: pick a step, choose a check-in interval, rate SUDS as you go
   (chime + picker at each interval), then record what actually happened.
   Optional passcode lock: everything here is encrypted on the device (same scheme as Kept). */
'use strict';

const SUDS_DEFAULT = [
  'Completely calm, no tension at all',
  'Relaxed, barely any unease',
  'A little uneasy, easy to ignore',
  'Mild anxiety. Noticeable, but you can focus',
  'Moderate. Some body signs (heart, breath), still manageable',
  'Clearly anxious. Thinking about it most of the time',
  'Strong. Hard to concentrate, wanting to leave',
  'Very strong. Body feels intense, urge to escape is loud',
  'Severe. Hard to think straight, close to escaping',
  'Extreme. Barely holding on',
  'The worst fear you can imagine',
];
const FX_READY_PEAK = 30; // suggest moving up once the last two peaks were at or below this
const FX_GRACE = 2 * 60 * 1000;

function fxNorm(d) {
  d = d || {};
  d.ladders = d.ladders || []; d.sessions = d.sessions || []; d.active = d.active || null;
  d.anchors = d.anchors && d.anchors.length === 11 ? d.anchors : SUDS_DEFAULT.slice();
  d.opts = Object.assign({ interval: 2, target: 20 }, d.opts || {});
  return d;
}
S.face = S.face || { lock: null, data: null };
if (!S.face.lock) S.face.data = fxNorm(S.face.data);

/* ---------- storage & lock ---------- */
const FXV = { key: null, mem: null, chain: Promise.resolve(), hiddenAt: 0 };
const fxLocked = () => !!S.face.lock;
const fxReady = () => !fxLocked() || !!FXV.key;
const FD = () => fxLocked() ? FXV.mem : S.face.data;
function fxPersist() {
  FXV.chain = FXV.chain.then(async () => {
    if (!fxLocked()) { save(); return; }
    if (!FXV.key || !FXV.mem) return;
    S.face.lock = await cqSeal(FXV.key, unb64(S.face.lock.salt), FXV.mem);
    save();
  }).catch(() => toast('Could not save'));
  return FXV.chain;
}
let fxT = null;
function fxPersistSoon() { clearTimeout(fxT); fxT = setTimeout(fxPersist, 500); }
async function fxUnlock(pass) {
  const L = S.face.lock;
  try {
    const key = await cqKey(pass, unb64(L.salt));
    const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(L.iv) }, key, unb64(L.ct));
    FXV.mem = fxNorm(JSON.parse(new TextDecoder().decode(pt))); FXV.key = key;
    return true;
  } catch (e) { return false; }
}
async function fxSetLock(pass) {
  const salt = crypto.getRandomValues(new Uint8Array(16)), key = await cqKey(pass, salt), mem = S.face.data;
  S.face = { lock: await cqSeal(key, salt, mem) }; FXV.key = key; FXV.mem = mem; save();
}
function fxRemoveLock() { S.face = { lock: null, data: FXV.mem }; FXV.key = null; FXV.mem = null; save(); }
function fxLockNow() { clearTimeout(fxT); return fxPersist().then(() => { FXV.key = null; FXV.mem = null; }); }
document.addEventListener('visibilitychange', () => {
  if (!fxLocked() || !FXV.key) return;
  if (document.visibilityState === 'hidden') { FXV.hiddenAt = now(); clearTimeout(fxT); fxPersist(); return; }
  if (now() - FXV.hiddenAt < FX_GRACE || (FXV.mem && FXV.mem.active)) return; // never lock mid-session
  fxLockNow().then(() => { if (OV === 'face') hideOverlay(); else if (['face', 'ladder', 'suds'].includes(current)) rerender(); });
});

/* ---------- helpers ---------- */
const sudsColor = s => `hsl(${Math.round(140 - s * 1.4)} 72% 60%)`;
const sudsDesc = s => (FD() ? FD().anchors : SUDS_DEFAULT)[clamp(Math.round(s / 10), 0, 10)];
function sudsPicker(v, id = 'sudsIn') {
  v = clamp(Math.round(v / 5) * 5, 0, 100);
  return `<div class="suds" id="${id}Box" style="--sc:${sudsColor(v)}">
    <div class="suds-top"><b class="suds-n" id="${id}N">${v}</b><span class="suds-d grow" id="${id}D">${esc(sudsDesc(v))}</span>
      <div class="suds-adj"><button type="button" data-act="sudsAdj" data-id="${id}" data-d="-5" aria-label="5 lower">−</button><button type="button" data-act="sudsAdj" data-id="${id}" data-d="5" aria-label="5 higher">+</button></div></div>
    <input type="range" class="suds-r" id="${id}" min="0" max="100" step="5" value="${v}" aria-label="SUDS rating">
    <div class="suds-scale"><span>0 calm</span><span>50</span><span>100 worst</span></div></div>`;
}
const sudsVal = (id = 'sudsIn') => { const i = $('#' + id); return i ? +i.value : 0; };
const sudsBadge = s => `<span class="sbadge" style="--sc:${sudsColor(s)}">${s}</span>`;
const fxL = id => FD().ladders.find(l => l.id === id);
const fxS = (L, sid) => L && L.steps.find(s => s.id === sid);
const stepsAsc = L => L.steps.slice().sort((a, b) => a.suds - b.suds || a.created - b.created);
const stepSessions = sid => FD().sessions.filter(x => x.sid === sid);
const nextStep = L => stepsAsc(L).find(s => s.status !== 'done');
const readyUp = s => { const ss = stepSessions(s.id).slice(-2); return s.status !== 'done' && ss.length >= 2 && ss.every(x => x.peak <= FX_READY_PEAK); };
const STATUS = { todo: 'To do', doing: 'Working on it', done: 'Done' };
const KIND = { vivo: ['Real life', 'Doing it for real'], imag: ['Imagined', 'Reading or picturing a script of it'], body: ['Body sensations', 'Bringing on the feelings on purpose (spinning, running in place, breathing through a straw)'] };
const NOTE_PH = { vivo: 'Details: where, how long, what exactly you’ll do', imag: 'Write the scene in first person, present tense, with the worst part included. You’ll read it during the session.', body: 'e.g. Spin in a chair for 30 seconds, then sit and notice the dizziness. Repeat.' };
const allDone = L => L.steps.length > 0 && L.steps.every(s => s.status === 'done');
const halfDown = rs => { if (rs.length < 2) return false; const pk = Math.max(...rs.map(r => r.s)), i = rs.findIndex(r => r.s === pk), last = rs[rs.length - 1]; return pk >= 30 && i < rs.length - 1 && last.s <= pk / 2; };
const fxWhen = iso => new Date(iso).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
const minsTxt = s => `${Math.max(1, Math.round(s / 60))} min`;
function spark(vals, w = 60, h = 22) {
  const v = vals.slice(-8); if (v.length < 2) return '';
  const pts = v.map((x, i) => `${(i / (v.length - 1) * (w - 4) + 2).toFixed(1)},${(h - 2 - x / 100 * (h - 4)).toFixed(1)}`).join(' ');
  return `<svg class="spark" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" aria-hidden="true"><polyline points="${pts}"/></svg>`;
}
function fxChartBox(rs, secs) {
  const T = Math.max(120, secs);
  return `<div class="fxchart-wrap"><div class="fxplot"><div class="fxy"><span>100</span><span>50</span><span>0</span></div>${fxChart(rs, secs)}</div>
    <div class="fxx"><span>0</span><span>${Math.round(T / 60)} min</span></div></div>`;
}
let fxGid = 0;
function fxChart(rs, secs) {
  const W = 320, H = 130, T = Math.max(120, secs), x = t => (t / T * W).toFixed(1), y = v => (H - v / 100 * H).toFixed(1), g = 'fxg' + (++fxGid);
  const grid = [25, 50, 75].map(v => `<line x1="0" x2="${W}" y1="${y(v)}" y2="${y(v)}"/>`).join('');
  const pts = rs.map(r => `${x(r.t)},${y(r.s)}`).join(' '), last = rs[rs.length - 1];
  const area = rs.length > 1 ? `<polygon class="area" points="${x(rs[0].t)},${H} ${pts} ${x(last.t)},${H}" fill="url(#${g})"/>` : '';
  return `<svg class="fxchart" viewBox="-6 -6 ${W + 12} ${H + 12}" preserveAspectRatio="none" aria-label="SUDS over time">
    <defs><linearGradient id="${g}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff5c8a" stop-opacity=".45"/><stop offset="1" stop-color="#ff8a4c" stop-opacity="0"/></linearGradient>
      <linearGradient id="${g}l" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="hsl(0 80% 62%)"/><stop offset=".5" stop-color="hsl(45 85% 60%)"/><stop offset="1" stop-color="hsl(140 72% 58%)"/></linearGradient></defs>
    <g class="grid">${grid}</g>${area}${rs.length > 1 ? `<polyline points="${pts}" stroke="url(#${g}l)"/>` : ''}
    ${rs.map(r => `<circle cx="${x(r.t)}" cy="${y(r.s)}" r="${r === last ? 5.5 : 3}" style="fill:${sudsColor(r.s)}" ${r === last ? 'class="lastpt"' : ''}/>`).join('')}</svg>`;
}

/* ---------- Face tab ---------- */
const FX_ICON = '<svg viewBox="0 0 24 24"><path d="M8 3v18M16 3v18M8 7.5h8M8 12h8M8 16.5h8"/></svg>';
function fxLockedView() {
  return `<div class="fxlocked">${glow(FACE_PAL, 'soft')}<span class="cqlock big">${CQ_LOCK}</span><div class="fxhead" style="font-size:32px;margin-top:10px">Locked</div>
    <div class="small" style="margin-top:6px;color:rgba(255,240,234,.75)">Your ladders and sessions are encrypted on this phone.</div>
    <input type="password" id="fxPass" autocomplete="off" placeholder="Passcode" style="margin-top:16px">
    <button class="btn fxbtn block" style="margin-top:10px" data-act="fxUnlock">Unlock</button></div>`;
}
function weekDots(sessions) {
  const mon = mondayOf(new Date()), days = Array.from({ length: 7 }, (_, i) => addDays(mon, i));
  const on = new Set(sessions.map(s => new Date(s.date).toDateString()));
  return `<div class="mdots fx">${days.map(d => `<i class="${on.has(d.toDateString()) ? 'on' : ''}"></i>`).join('')}</div>`;
}
const FACE_PAL = ['#ff7a45', '#ff3d7f', '#5b35e0'];
function fxFocus() {
  const d = FD(), lastByL = id => { const x = d.sessions.filter(y => y.lid === id).slice(-1)[0]; return x ? new Date(x.date).getTime() : 0; };
  const L = d.ladders.filter(nextStep).sort((a, b) => lastByL(b) - lastByL(a))[0];
  return L ? { L, nx: nextStep(L) } : null;
}
function miniLadder(L) {
  const st = stepsAsc(L).reverse().slice(0, 9), nx = nextStep(L);
  return `<div class="mlad" aria-hidden="true">${st.length ? st.map(s => `<i class="${s.status === 'done' ? 'd' : nx && nx.id === s.id ? 'n' : ''}" style="--sc:${sudsColor(s.suds)}"></i>`).join('') : '<i></i><i></i><i></i><i></i>'}</div>`;
}
function weekPills(sessions) {
  const mon = mondayOf(new Date()), on = new Set(sessions.map(s => new Date(s.date).toDateString())), today = new Date().toDateString();
  return `<div class="wpills">${Array.from({ length: 7 }, (_, i) => { const d = addDays(mon, i), k = d.toDateString(); return `<span class="${on.has(k) ? 'on' : ''} ${k === today ? 'today' : ''}">${'MTWTFSS'[i]}</span>`; }).join('')}</div>`;
}
VIEWS.face = () => {
  setTop(`<h1>Face</h1><a class="icon-btn" href="#/suds" aria-label="SUDS scale">${ICON.info}</a>`);
  if (!fxReady()) { $('#view').innerHTML = fxLockedView(); return; }
  const d = FD(), mon = mondayOf(new Date()), wk = d.sessions.filter(x => new Date(x.date) >= mon);
  const days = new Set(wk.map(x => new Date(x.date).toDateString())).size, A = d.active, F = fxFocus();
  let hero;
  if (!d.ladders.length) {
    hero = `<div class="fxhero">${glow(FACE_PAL)}<div class="fxhero-in">
      <div class="fxkicker">Face your fears</div><div class="fxhead">One rung at a time.</div>
      <ol class="fxhow"><li><b>Build a ladder.</b> Situations that scare you, from mild to hardest.</li><li><b>Rate each one.</b> How anxious it would make you, 0–100.</li><li><b>Climb from the bottom.</b> Stay with each step and repeat it until it feels manageable.</li></ol>
      <button class="btn fxglass block" data-act="fxNewL">${ICON.plus} Build your first ladder</button></div></div>`;
  } else {
    const focus = A ? (() => { const L = fxL(A.lid), st = fxS(L, A.sid); return `<div class="fxup"><div class="grow"><div class="fxkicker">In progress · <span class="num">${fmtLong((now() - A.start) / 1000)}</span></div><div class="fxup-t">${esc(st ? st.text : 'Exposure')}</div></div></div>
        <button class="btn fxglass block" data-act="fxResume">${PLAY} Resume session</button>`; })()
      : F ? `<div class="fxup">${sudsBadge(F.nx.suds)}<div class="grow"><div class="fxkicker">Up next · ${esc(F.L.name)}</div><div class="fxup-t">${esc(F.nx.text)}</div></div></div>
        <button class="btn fxglass block" data-act="fxGo" data-l="${F.L.id}" data-s="${F.nx.id}">${PLAY} Practice now</button>`
      : `<div class="fxup"><div class="grow"><div class="fxkicker">Every ladder climbed</div><div class="fxup-t">Add a harder step to keep going.</div></div></div>`;
    hero = `<div class="fxhero">${glow(FACE_PAL)}<div class="fxhero-in">
      <div class="row" style="align-items:flex-end"><div class="grow"><div class="fxkicker">This week</div><div class="fxbig"><b>${wk.length}</b> session${wk.length === 1 ? '' : 's'}</div></div>${weekPills(wk)}</div>
      <div class="fxrule"></div>${focus}</div></div>`;
  }
  const card = L => {
    const done = L.steps.filter(s => s.status === 'done').length, nx = nextStep(L), last = d.sessions.filter(x => x.lid === L.id).slice(-1)[0];
    return `<div class="lcard ${allDone(L) ? 'climbed' : ''}" data-act="fxOpenL" data-l="${L.id}">
      ${miniLadder(L)}
      <div class="grow">
        <div class="lcard-t">${esc(L.name)}</div>
        <div class="lcard-m">${done}/${L.steps.length} climbed · ${last ? `last ${fxWhen(last.date)}` : 'not started'}</div>
        <div class="lcard-n">${nx ? `${sudsBadge(nx.suds)}<span>${esc(nx.text)}</span>` : L.steps.length ? '<span>Every step done</span>' : '<span>Add your first step</span>'}</div>
      </div>
      ${nx ? `<button class="playdot" data-act="fxGo" data-l="${L.id}" data-s="${nx.id}" aria-label="Practice ${esc(nx.text)}">${PLAY}</button>` : ''}
    </div>`;
  };
  $('#view').innerHTML = `${hero}
    ${d.ladders.length ? `<div class="fxsec"><span>Your ladders</span><button class="btn sm ghost" data-act="fxNewL">${ICON.plus} New</button></div>
      <div class="lgrid">${d.ladders.slice().sort((a, b) => allDone(a) - allDone(b)).map(card).join('')}</div>` : ''}
    <div class="fxtiles">
      <a class="fxtile" href="#/suds"><span class="fxtile-i suds-mini"><i></i></span><b>SUDS scale</b><span>What each level feels like</span></a>
      <button class="fxtile" data-act="fxPrivacy"><span class="fxtile-i">${CQ_LOCK}</span><b>${fxLocked() ? 'Locked' : 'Privacy'}</b><span>${fxLocked() ? 'Encrypted with a passcode' : 'Not locked'}</span></button>
    </div>`;
};

/* ---------- a ladder ---------- */
VIEWS.ladder = id => {
  if (!fxReady()) { go('#/face', { replace: true }); return; }
  const L = fxL(id); if (!L) { go('#/face', { replace: true }); return; }
  setTop(`<a class="icon-btn" href="#/face" data-nav="back" aria-label="Back">${ICON.back}</a><div class="grow"></div><button class="icon-btn" data-act="fxEditL" data-l="${L.id}" aria-label="Edit ladder">${ICON.edit}</button>`);
  const d = FD(), steps = stepsAsc(L).reverse(), nx = nextStep(L), done = L.steps.filter(s => s.status === 'done').length, n = L.steps.length;
  const ls = d.sessions.filter(x => x.lid === L.id);
  const rung = s => {
    const ss = stepSessions(s.id), ready = readyUp(s), last = ss[ss.length - 1], isN = nx && nx.id === s.id;
    return `<div class="rung st-${s.status} ${isN ? 'next' : ''}" style="--sc:${sudsColor(s.suds)}" data-act="fxStep" data-l="${L.id}" data-s="${s.id}">
      <span class="node">${s.status === 'done' ? ICON.check : s.suds}</span>
      <div class="rbody">
        <div class="grow">
          ${isN ? '<span class="uptag">Up next</span>' : ''}
          <b>${esc(s.text)}</b>
          <div class="rmeta">${s.kind && s.kind !== 'vivo' ? `<i class="kindtag">${KIND[s.kind][0]}</i>` : ''}${s.status === 'done' ? `<span>Climbed · SUDS ${s.suds}</span>` : ready ? '<em class="ready">Ready to move up?</em>' : `<span>${s.status === 'doing' ? 'Working on it' : `Expected ${s.suds}`}</span>`}${ss.length ? `<span class="rtrend">${spark(ss.map(x => x.peak), 40, 16)}${plural(ss.length, 'session')} · peak ${last.peak}</span>` : ''}</div>
        </div>
        ${s.status === 'done' ? '' : isN ? `<button class="playdot" data-act="fxGo" data-l="${L.id}" data-s="${s.id}" aria-label="Practice">${PLAY}</button>` : `<button class="playdot sm" data-act="fxGo" data-l="${L.id}" data-s="${s.id}" aria-label="Practice">${PLAY}</button>`}
      </div>
    </div>`;
  };
  const recent = ls.slice(-8).reverse();
  $('#view').innerHTML = `
    <div class="fxhero lhero">${glow(FACE_PAL)}<div class="fxhero-in">
      <div class="fxkicker">Fear ladder</div><div class="fxhead">${esc(L.name)}</div>
      <div class="lprog"><div class="lprog-bar"><i style="width:${n ? done / n * 100 : 0}%"></i></div><span><b>${done}</b>/${n} climbed · ${plural(ls.length, 'session')}</span></div>
    </div></div>
    ${L.fear || L.safety ? `<div class="ftiles">${L.fear ? `<div class="ftile"><span class="fxkicker">Testing</span><p>${esc(L.fear)}</p></div>` : ''}${L.safety ? `<div class="ftile"><span class="fxkicker">Dropping</span><p>${esc(L.safety)}</p></div>` : ''}</div>`
      : `<button class="addrung" style="margin-top:12px" data-act="fxEditL" data-l="${L.id}"><b>Add what you fear and your safety behaviors</b><span>Each session tests the first and practises dropping the second.</span></button>`}
    <div class="fxsec"><span>The climb</span><span class="muted small">Hardest at the top</span></div>
    ${steps.length ? `<div class="climb">${steps.map(rung).join('')}</div>` : ''}
    <button class="addrung" data-act="fxAddStep" data-l="${L.id}"><b>${ICON.plus} Add a step</b><span>${steps.length ? 'Anywhere on the ladder. It sorts itself by SUDS.' : 'Start with the easiest thing that still makes you a bit anxious.'}</span></button>
    ${recent.length ? `<div class="fxsec"><span>Recent sessions</span></div><div class="sesslist">${recent.map(x => { const st = fxS(L, x.sid); return `<button class="sessrow" data-act="fxSess" data-id="${x.id}">
        <span class="sbadge" style="--sc:${sudsColor(x.peak)}">${x.peak}</span>
        <span class="grow"><b>${esc(st ? st.text : 'Deleted step')}</b><span>${fxWhen(x.date)} · ${minsTxt(x.dur)} · ${x.ratings[0].s} → ${x.peak} → ${x.end}${x.retro ? ' · logged after' : ''}</span></span>
        ${spark(x.ratings.map(r => r.s), 46, 20)}</button>`; }).join('')}</div>` : ''}`;
};

/* ---------- sheets: ladder, step, past session ---------- */
let FXE = null;
function fxLadderSheet(id) {
  const L = id ? fxL(id) : null; FXE = { lid: id, del: false };
  openSheet(`<h3>${L ? 'Edit ladder' : 'New ladder'}</h3>
    <div class="field"><div class="lab">What are you working on?</div><input type="text" id="fxName" maxlength="60" value="${esc(L ? L.name : '')}" placeholder="e.g. Driving on highways, speaking up at work"></div>
    <div class="field"><div class="lab">What are you afraid will happen?</div><div class="hint">Be specific. This is the prediction your practice tests.</div><textarea id="fxFear" placeholder="e.g. I’ll panic, lose control and have to pull over">${esc(L ? L.fear || '' : '')}</textarea></div>
    <div class="field"><div class="lab">Safety behaviors to drop</div><div class="hint">Things you do to feel safer that keep the fear going (checking, avoiding eye contact, carrying water…).</div><textarea id="fxSafety" placeholder="e.g. Staying in the slow lane, gripping the wheel, music loud">${esc(L ? L.safety || '' : '')}</textarea></div>
    <div class="row" style="margin-top:18px">${L ? `<button class="btn ghost danger" id="fxDelL" data-act="fxDelL">${ICON.trash}</button>` : ''}<button class="btn pri grow" data-act="fxSaveL">${L ? 'Save' : 'Create ladder'}</button></div>`);
  if (!L) setTimeout(() => { const i = $('#fxName'); if (i) i.focus(); }, 80);
}
function fxStepSheet(lid, sid, kind) {
  const L = fxL(lid), s = sid ? fxS(L, sid) : null; FXE = { lid, sid, status: s ? s.status : 'todo', kind: s ? s.kind || 'vivo' : kind || 'vivo', del: false };
  const ss = s ? stepSessions(s.id).slice().reverse() : [];
  openSheet(`<h3>${s ? 'Step' : 'Add a step'}</h3>
    <div class="field"><div class="lab">The situation</div><input type="text" id="fxStepText" maxlength="90" value="${esc(s ? s.text : '')}" placeholder="e.g. Drive one exit on the highway at a quiet time"></div>
    <div class="field"><div class="lab">Type</div><div class="seg">${Object.entries(KIND).map(([k, [l]]) => `<button class="${FXE.kind === k ? 'on' : ''}" data-act="fxKind" data-k="${k}">${l}</button>`).join('')}</div>
      <div class="hint" id="fxKindHint" style="margin:8px 0 0">${KIND[FXE.kind][1]}</div></div>
    <div class="field"><div class="lab">How anxious would it make you?</div>${sudsPicker(s ? s.suds : 40, 'stepSuds')}</div>
    <div class="field"><div class="lab" id="fxNotesLab">${FXE.kind === 'imag' ? 'Script' : 'Notes'} <span class="muted small" style="font-weight:500">(optional, shown during the session)</span></div><textarea id="fxNotes" placeholder="${esc(NOTE_PH[FXE.kind])}">${esc(s ? s.notes || '' : '')}</textarea></div>
    ${s ? `<div class="field"><div class="lab">Status</div><div class="seg">${Object.entries(STATUS).map(([k, l]) => `<button class="${FXE.status === k ? 'on' : ''}" data-act="fxStatus" data-k="${k}">${l}</button>`).join('')}</div>
      ${readyUp(s) ? `<div class="note" style="margin-top:10px">Your peak has been ${FX_READY_PEAK} or under for the last two sessions. If it feels manageable, mark it done and move up.</div>` : ''}</div>` : ''}
    <div class="row" style="margin-top:18px">${s ? `<button class="btn ghost danger" id="fxDelS" data-act="fxDelS" aria-label="Delete step">${ICON.trash}</button>` : `<button class="btn ghost grow" data-act="fxSaveS" data-more="1">Add & another</button>`}<button class="btn pri grow" data-act="fxSaveS">${s ? 'Save' : 'Add step'}</button></div>
    ${s && s.status !== 'done' ? `<button class="btn fxbtn block" style="margin-top:10px" data-act="fxSaveS" data-go="1">${PLAY} Save & practise now</button>` : ''}
    ${s ? `<button class="btn ghost block" style="margin-top:10px" data-act="fxRetro" data-l="${lid}" data-s="${s.id}">Log a session you already did</button>` : ''}
    ${ss.length ? `<div class="h2" style="margin-top:22px">History</div>${ss.map(x => `<button class="kv fxkv" data-act="fxSess" data-id="${x.id}"><span>${fxWhen(x.date)} · ${minsTxt(x.dur)}</span><b class="num">${x.ratings[0].s} → ${x.peak} → ${x.end}</b></button>`).join('')}` : ''}`);
  if (!s) setTimeout(() => { const i = $('#fxStepText'); if (i) i.focus(); }, 80);
}
function fxSessSheet(id) {
  const x = FD().sessions.find(y => y.id === id); if (!x) return;
  const L = fxL(x.lid), s = fxS(L, x.sid);
  FXE = { sessId: id, del: false };
  openSheet(`<div class="eyebrow">${fxWhen(x.date)} · ${new Date(x.date).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} · ${minsTxt(x.dur)}</div>
    <h3>${esc(s ? s.text : 'Deleted step')}</h3><div class="muted small">${esc(L ? L.name : '')}</div>
    ${fxChartBox(x.ratings, x.dur)}
    <div class="kv"><span class="muted">Start → peak → end</span><b class="num">${x.ratings[0].s} → ${x.peak} → ${x.end}</b></div>
    ${x.predict ? `<div class="fxq"><span class="fxkicker">I predicted</span><p>${esc(x.predict)}</p></div>` : ''}
    ${x.happened ? `<div class="kv"><span class="muted">Did it happen?</span><b>${{ no: 'No', partly: 'Partly', yes: 'Yes' }[x.happened]}</b></div>` : ''}
    ${x.safety ? `<div class="kv"><span class="muted">Safety behaviors</span><b>${{ no: 'None', some: 'A little', yes: 'Yes' }[x.safety]}</b></div>` : ''}
    ${x.learned ? `<div class="fxq"><span class="fxkicker">What I learned</span><p>${esc(x.learned)}</p></div>` : ''}
    <button class="btn ghost danger block" style="margin-top:18px" id="fxDelX" data-act="fxDelX">${ICON.trash} Delete session</button>`);
}

function fxRetroSheet(lid, sid) {
  const s = fxS(fxL(lid), sid); FXE = { lid, sid, day: 0, dur: 15, happened: null };
  const seg = (k, opts) => `<div class="seg">${opts.map(([v, l]) => `<button class="${FXE[k] === v ? 'on' : ''}" data-act="fxRetroOpt" data-k="${k}" data-v="${v}">${l}</button>`).join('')}</div>`;
  openSheet(`<h3>Log a session</h3><div class="muted small">${esc(s.text)}. For when you couldn’t use your phone during it.</div>
    <div class="field"><div class="lab">When</div>${seg('day', [[0, 'Today'], [1, 'Yesterday'], [2, '2 days ago']])}</div>
    <div class="field"><div class="lab">How long did you stay?</div><div class="chips">${[5, 10, 15, 20, 30, 45, 60].map(n => `<button class="chip ${FXE.dur === n ? 'on' : ''}" data-act="fxRetroOpt" data-k="dur" data-v="${n}">${n} min</button>`).join('')}</div></div>
    <div class="field"><div class="lab">At the start</div>${sudsPicker(30, 'rStart')}</div>
    <div class="field"><div class="lab">At its worst</div>${sudsPicker(60, 'rPeak')}</div>
    <div class="field"><div class="lab">By the end</div>${sudsPicker(30, 'rEnd')}</div>
    <div class="field"><div class="lab">Did what you feared happen?</div>${seg('happened', [['no', 'No'], ['partly', 'Partly'], ['yes', 'Yes']])}</div>
    <div class="field"><div class="lab">What did you learn?</div><textarea id="rLearned"></textarea></div>
    <button class="btn fxbtn block" style="margin-top:16px" data-act="fxRetroSave">${ICON.check} Save session</button>`);
}

/* ---------- session (overlay) ---------- */
let FX = null; // { stage: 'setup' | 'run' | 'end', ... } — the persisted part lives in FD().active
function fxGo(lid, sid) {
  if (!fxReady()) { go('#/face'); return; }
  const d = FD();
  if (d.active) { toast('Finish the session in progress first'); FX = { stage: 'run' }; showOverlay('face'); renderFx(); return; }
  const st = fxS(fxL(lid), sid), prev = stepSessions(sid).slice(-1)[0];
  FX = { stage: 'setup', lid, sid, interval: st && st.kind === 'body' ? 1 : d.opts.interval, target: d.opts.target, predict: prev ? prev.predict || '' : '' };
  closeSheet(); showOverlay('face'); renderFx();
}
function fxHead(close, title, sub) { return `<div class="ov-top"><button class="icon-btn" data-act="${close}" aria-label="Close">${ICON.close}</button><div class="t"><b>${esc(title)}</b><span>${esc(sub)}</span></div></div>`; }
const fxAmb = v => glow([sudsColor(v), '#ff3d7f', '#3b2aa8'], 'fixed fxamb');
const RING_C = 2 * Math.PI * 104;
function renderFx() {
  const o = $('#overlay'), d = FD(); if (!FX || !d) return;
  const A = d.active, L = fxL(A ? A.lid : FX.lid), s = fxS(L, A ? A.sid : FX.sid);
  const sName = s ? s.text : 'Exposure', lName = L ? L.name : '';
  const reminders = L && (L.fear || L.safety) ? `<div class="fxrem">${L.fear ? `<div><span>Testing</span>${esc(L.fear)}</div>` : ''}${L.safety ? `<div><span>Drop</span>${esc(L.safety)}</div>` : ''}</div>` : '';
  if (FX.stage === 'setup') {
    const chip = (k, v, l) => `<button class="${FX[k] === v ? 'on' : ''}" data-act="fxOpt" data-k="${k}" data-v="${v}">${l}</button>`;
    o.innerHTML = `${fxAmb(s ? s.suds : 40)}<div class="ov-in fx">${fxHead('fxCancel', 'Get ready', lName)}
      <div class="fxkicker" style="margin-top:6px">${s && s.kind && s.kind !== 'vivo' ? KIND[s.kind][0] + ' · ' : ''}Expected SUDS ${s ? s.suds : ''}</div>
      <h2 class="fx-title">${esc(sName)}</h2>
      ${reminders}
      ${s && s.notes ? `<div class="fxnotes"><span>${s.kind === 'imag' ? 'Your script' : 'Notes'}</span>${esc(s.notes).replace(/\n/g, '<br>')}</div>` : ''}
      <div class="field"><div class="lab">Check in every <span class="unit">minutes</span></div><div class="seg">${[1, 2, 3, 5, 10].map(n => chip('interval', n, n)).join('')}${chip('interval', 0, 'Off')}</div>
        <div class="hint" style="margin:8px 0 0">${FX.interval ? 'A chime and the rating slider at each interval.' : 'No prompts. Good when you can’t use your phone (driving, a meeting). Rate now any time, and at the end.'}</div></div>
      <div class="field"><div class="lab">Aim to stay <span class="unit">minutes</span></div><div class="seg">${chip('target', 0, 'Open')}${[10, 20, 30, 45, 60].map(n => chip('target', n, n)).join('')}</div></div>
      <div class="field"><div class="lab">What do you predict will happen?</div><textarea id="fxPredict" placeholder="e.g. My heart will race and I’ll have to leave within 5 minutes">${esc(FX.predict)}</textarea></div>
      <div class="field"><div class="lab">How anxious are you right now?</div>${sudsPicker(FX.startS != null ? FX.startS : 20)}</div>
      <div class="player-nav"><button class="btn fxbtn" data-act="fxStart">${PLAY} Start</button></div>
    </div>`;
    return;
  }
  const rs = A.ratings, el = (now() - A.start) / 1000, last = rs[rs.length - 1], peak = Math.max(...rs.map(r => r.s));
  if (FX.stage === 'end') {
    const chip = (k, v, l) => `<button class="${FX[k] === v ? 'on' : ''}" data-act="fxEndOpt" data-k="${k}" data-v="${v}">${l}</button>`;
    o.innerHTML = `${fxAmb(last.s)}<div class="ov-in fx">${fxHead('fxBackRun', 'Session', sName)}
      <h2 class="fx-title">You faced it.</h2>
      <div class="fxstats"><div><b>${fmtLong(el)}</b><span>stayed</span></div><div><b style="color:${sudsColor(rs[0].s)}">${rs[0].s}</b><span>start</span></div><div><b style="color:${sudsColor(peak)}">${peak}</b><span>peak</span></div></div>
      ${(() => { const prev = s ? stepSessions(s.id).map(x => x.peak) : []; if (!prev.length) return `<div class="fxprog">First time on this step. Each repeat usually feels a little easier.</div>`;
        const first = prev[0], all = prev.concat([peak]);
        return `<div class="fxprog">${spark(all, 90, 28)}<span>Peaks on this step: <b>${all.slice(-6).join(' → ')}</b>${peak < first ? `. Down ${first - peak} from your first try.` : '. Keep repeating it; it comes down with practice.'}</span></div>`; })()}
      <div class="field"><div class="lab">How anxious are you now?</div>${sudsPicker(last.s, 'endSuds')}</div>
      ${A.predict ? `<div class="fxq"><span class="fxkicker">You predicted</span><p>${esc(A.predict)}</p></div>` : ''}
      <div class="field"><div class="lab">Did what you feared happen?</div><div class="seg">${chip('happened', 'no', 'No')}${chip('happened', 'partly', 'Partly')}${chip('happened', 'yes', 'Yes')}</div></div>
      <div class="field"><div class="lab">Did you use safety behaviors?</div><div class="seg">${chip('safety', 'no', 'No')}${chip('safety', 'some', 'A little')}${chip('safety', 'yes', 'Yes')}</div></div>
      <div class="field"><div class="lab">What did you learn?</div><textarea id="fxLearned" placeholder="e.g. The anxiety peaked at 70 and came down by itself. I didn’t have to leave.">${esc(FX.learned || '')}</textarea></div>
      <div class="player-nav"><button class="btn ghost" style="flex:0 0 auto;padding:0 16px" id="fxDiscard" data-act="fxDiscard">Discard</button><button class="btn fxbtn" data-act="fxSave">${ICON.check} Save session</button></div>
    </div>`;
    return;
  }
  const nextIn = Math.max(0, (A.lastAsk + A.interval * 60000 - now()) / 1000), half = halfDown(rs);
  o.innerHTML = `${fxAmb(last.s)}<div class="ov-in fx">${fxHead('fxHide', sName, lName)}
    <div class="fxring" style="--sc:${sudsColor(last.s)}">
      <svg viewBox="0 0 240 240" aria-hidden="true"><circle class="trk" cx="120" cy="120" r="104"/><circle class="val" id="fxRing" cx="120" cy="120" r="104" stroke-dasharray="${RING_C}" stroke-dashoffset="${RING_C * (1 - fxRingFrac(A, el))}"/></svg>
      <div class="fxring-c"><div class="fxkicker">${A.target ? `Aim ${A.target} min` : 'Elapsed'}</div><div class="big num" id="fxEl">${fmtLong(el)}</div>
        <div class="small">${A.interval ? `check-in in <b id="fxNext" class="num">${fmt(nextIn)}</b>` : 'check-ins off'}</div></div>
    </div>
    <div class="fxnow" style="--sc:${sudsColor(last.s)}"><b>${last.s}</b><div class="grow"><span class="fxkicker">Now · peak ${peak}</span><div>${esc(sudsDesc(last.s))}</div></div></div>
    ${fxChartBox(rs, el)}
    ${half ? `<div class="fxdrop">${ICON.check}<span>Down to half your peak (${peak} → ${last.s}). A good point to finish, or stay longer and let it come down further.</span></div>`
      : `<p class="fxstay">Stay with it. Let the anxiety be there without fighting it or escaping. It usually rises, peaks, and comes down on its own.</p>`}
    ${s && s.notes ? `<details class="fxnotes" ${s.kind === 'imag' ? 'open' : ''}><summary>${s.kind === 'imag' ? 'Your script' : 'Notes'}</summary>${esc(s.notes).replace(/\n/g, '<br>')}</details>` : ''}
    ${reminders}
    <div class="player-nav"><button class="btn" data-act="fxRateNow">Rate now</button><button class="btn fxbtn" data-act="fxFinish">Finish</button></div>
  </div>`;
}
function fxRate(prompted) {
  const A = FD().active; if (!A) return;
  FX.asking = true;
  openSheet(`<h3>${prompted ? 'Check-in' : 'Rate now'}</h3><div class="muted small">How anxious are you right now?</div>
    <div style="margin-top:14px">${sudsPicker(A.ratings[A.ratings.length - 1].s, 'rateSuds')}</div>
    <button class="btn fxbtn block" style="margin-top:16px" data-act="fxLog">Log it</button>`);
  onSheetClose = () => { FX && (FX.asking = false); const a = FD() && FD().active; if (a) { a.lastAsk = now(); fxPersist(); } if (OV === 'face') renderFx(); };
}
// ring: progress to the target, or to the next check-in when there's no target
function fxRingFrac(A, el) { return A.target ? Math.min(1, el / (A.target * 60)) : A.interval ? Math.min(1, (now() - A.lastAsk) / (A.interval * 60000)) : (el % 60) / 60; }
// clock: elapsed, countdown to the next check-in, target reached
setInterval(() => {
  if (OV !== 'face' || !FX || FX.stage !== 'run' || !fxReady()) return;
  const A = FD().active; if (!A) return;
  const el = (now() - A.start) / 1000;
  const e = $('#fxEl'); if (e) e.textContent = fmtLong(el);
  const n = $('#fxNext'); if (n && A.interval) n.textContent = fmt(Math.max(0, (A.lastAsk + A.interval * 60000 - now()) / 1000));
  const r = $('#fxRing'); if (r) r.setAttribute('stroke-dashoffset', RING_C * (1 - fxRingFrac(A, el)));
  if (A.target && !A.targetHit && el >= A.target * 60) { A.targetHit = true; fxPersist(); sfx.done(); toast('You reached your target. Stay longer if you can, or finish.'); }
  if (A.interval && !FX.asking && now() >= A.lastAsk + A.interval * 60000) { sfx.switch(); fxRate(true); }
}, 500);

/* ---------- Today + Progress ---------- */
function faceCard() {
  if (!fxReady()) return S.face.lock ? `<a class="card fxcard" href="#/face"><div class="row"><div class="grow"><div class="eyebrow cc">Face your fears</div><b>Locked</b></div><span class="cqlock">${CQ_LOCK}</span></div></a>` : '';
  const d = FD(); if (!d.ladders.length) return '';
  if (d.active) { const L = fxL(d.active.lid), s = fxS(L, d.active.sid), due = d.active.interval && now() >= d.active.lastAsk + d.active.interval * 60000; return `<div class="card fxcard"><div class="row"><div class="grow"><div class="eyebrow cc">Session in progress${due ? ' · check-in due' : ''}</div><b>${esc(s ? s.text : 'Exposure')}</b></div><button class="btn sm fxbtn" data-act="fxResume">Resume</button></div></div>`; }
  const lastByL = id => { const x = d.sessions.filter(y => y.lid === id).slice(-1)[0]; return x ? new Date(x.date).getTime() : 0; };
  const L = d.ladders.filter(nextStep).sort((a, b) => lastByL(b) - lastByL(a))[0]; if (!L) return '';
  const nx = nextStep(L), today = d.sessions.some(x => new Date(x.date).toDateString() === new Date().toDateString());
  const wk = d.sessions.filter(x => new Date(x.date) >= mondayOf(new Date())).length;
  return `<div class="card fxcard" data-act="fxOpenL" data-l="${L.id}">${glow(FACE_PAL, 'soft')}
    <div class="row" style="align-items:flex-start"><div class="grow"><div class="fxkicker">Face your fears${today ? ' · done today' : ''}</div>
      <div class="title" style="font-size:24px;margin-top:6px">${esc(nx.text)}</div><div class="small" style="margin-top:4px;color:rgba(241,238,230,.75)">${esc(L.name)} · ${plural(wk, 'session')} this week</div></div>${sudsBadge(nx.suds)}</div>
    <button class="btn fxglass block" style="margin-top:14px" data-act="fxGo" data-l="${L.id}" data-s="${nx.id}">${PLAY} Practice</button></div>`;
}
function faceProgress() {
  if (!fxReady()) return '';
  const d = FD(), mon = mondayOf(new Date()), wk = d.sessions.filter(x => new Date(x.date) >= mon);
  if (!d.sessions.length) return '';
  const avg = wk.length ? Math.round(wk.reduce((a, x) => a + x.peak, 0) / wk.length) : null;
  return `<div class="card" style="margin-top:10px"><div class="row"><div class="eyebrow grow">Exposure this week</div><span class="small muted"><b style="color:var(--c-face)">${wk.length}</b> session${wk.length === 1 ? '' : 's'}${avg != null ? ` · avg peak ${avg}` : ''}</span></div>
    <div style="margin-top:10px">${weekDots(wk)}</div>
    <div class="muted small" style="margin-top:8px">${d.ladders.map(L => `${esc(L.name)}: ${L.steps.filter(s => s.status === 'done').length}/${L.steps.length}`).join(' · ')}</div></div>`;
}

/* ---------- SUDS scale ---------- */
VIEWS.suds = () => {
  setTop(`<a class="icon-btn" href="#/face" data-nav="back" aria-label="Back">${ICON.back}</a><h1>SUDS scale</h1>`);
  if (!fxReady()) { $('#view').innerHTML = fxLockedView(); return; }
  const a = FD().anchors;
  $('#view').innerHTML = `<div class="sudsbar"></div><p class="small muted" style="margin-top:0;line-height:1.5">SUDS (Subjective Units of Distress) is how anxious you feel right now, from 0 to 100. There are no right numbers, only consistent ones. Make these descriptions match your own experience so a 60 always means the same thing.</p>
    <div class="anchors">${a.map((t, i) => `<div class="anchor"><span class="sbadge" style="--sc:${sudsColor(i * 10)}">${i * 10}</span><textarea data-anc="${i}" rows="2" aria-label="SUDS ${i * 10}">${esc(t)}</textarea></div>`).join('')}</div>
    <button class="btn ghost block" style="margin-top:14px" data-act="fxAncReset">Reset to the default descriptions</button>`;
};

/* ---------- actions ---------- */
const fxTwoTap = (id, msg) => { if (FXE && !FXE.del) { FXE.del = true; const b = $('#' + id); if (b) { b.innerHTML = msg; b.classList.add('armed'); } return false; } return true; };
Object.assign(ACT, {
  fxOpenL: el => go('#/ladder/' + el.dataset.l),
  fxNewL: () => fxLadderSheet(null),
  fxEditL: el => fxLadderSheet(el.dataset.l),
  fxSaveL: () => {
    const name = ($('#fxName').value || '').trim(); if (!name) { toast('Give it a name'); return; }
    const fear = $('#fxFear').value.trim(), safety = $('#fxSafety').value.trim(), d = FD();
    let L = FXE.lid && fxL(FXE.lid);
    if (L) Object.assign(L, { name, fear, safety });
    else { L = { id: uid(), name, fear, safety, steps: [], created: now() }; d.ladders.push(L); }
    fxPersist(); onSheetClose = null; closeSheet();
    if (!FXE.lid) { go('#/ladder/' + L.id); setTimeout(() => fxStepSheet(L.id, null), 120); } else rerender();
  },
  fxDelL: () => {
    if (!fxTwoTap('fxDelL', `${ICON.trash} Tap again: delete ladder and its sessions`)) return;
    const d = FD(); if (d.active && d.active.lid === FXE.lid) { toast('Finish the session in progress first'); return; }
    d.ladders = d.ladders.filter(l => l.id !== FXE.lid); d.sessions = d.sessions.filter(x => x.lid !== FXE.lid);
    fxPersist(); closeSheet(); go('#/face'); toast('Ladder deleted');
  },
  fxAddStep: el => fxStepSheet(el.dataset.l, null),
  fxStep: el => fxStepSheet(el.dataset.l, el.dataset.s),
  fxKind: el => {
    FXE.kind = el.dataset.k; el.parentNode.querySelectorAll('button').forEach(b => b.classList.toggle('on', b === el));
    const h = $('#fxKindHint'), n = $('#fxNotes'), lab = $('#fxNotesLab'); if (h) h.textContent = KIND[FXE.kind][1]; if (n) n.placeholder = NOTE_PH[FXE.kind];
    if (lab) lab.firstChild.textContent = FXE.kind === 'imag' ? 'Script ' : 'Notes ';
  },
  sudsAdj: el => { const i = $('#' + el.dataset.id); if (!i) return; i.value = clamp(+i.value + +el.dataset.d, 0, 100); i.dispatchEvent(new Event('input', { bubbles: true })); },
  fxStatus: el => { FXE.status = el.dataset.k; el.parentNode.querySelectorAll('button').forEach(b => b.classList.toggle('on', b === el)); },
  fxSaveS: el => {
    const text = ($('#fxStepText').value || '').trim(); if (!text) { toast('Describe the situation'); return; }
    const L = fxL(FXE.lid), suds = sudsVal('stepSuds');
    let s = FXE.sid && fxS(L, FXE.sid);
    const notes = ($('#fxNotes').value || '').trim(), kind = FXE.kind;
    if (s) Object.assign(s, { text, suds, status: FXE.status, kind, notes });
    else { s = { id: uid(), text, suds, status: 'todo', kind, notes, created: now() }; L.steps.push(s); }
    fxPersist(); onSheetClose = null; closeSheet(); rerender();
    if (el.dataset.go) fxGo(L.id, s.id);
    else if (el.dataset.more) { toast('Added. Next one'); setTimeout(() => fxStepSheet(L.id, null, kind), 60); }
    else toast(FXE.sid ? 'Saved' : 'Step added');
  },
  fxDelS: () => {
    if (!fxTwoTap('fxDelS', `${ICON.trash} Tap again`)) return;
    const L = fxL(FXE.lid), d = FD();
    if (d.active && d.active.sid === FXE.sid) { toast('Finish the session in progress first'); return; }
    L.steps = L.steps.filter(s => s.id !== FXE.sid); d.sessions = d.sessions.filter(x => x.sid !== FXE.sid);
    fxPersist(); closeSheet(); rerender();
  },
  fxSess: el => fxSessSheet(el.dataset.id),
  fxPrivacy: () => openSheet(`<h3>Privacy</h3>
    ${fxLocked() ? `<div class="muted small">Locked with a passcode. Everything in Face is encrypted on this phone and in backups. It never locks itself during a session.</div>
      <div class="row" style="margin-top:16px"><button class="btn grow" data-act="fxLockNowBtn">${CQ_LOCK} Lock now</button><button class="btn ghost grow" data-act="fxLockOff">Remove lock</button></div>`
    : `<div class="muted small">Your ladders and sessions are stored only on this phone, not encrypted. Add a passcode to encrypt them.</div>
      ${canLock() ? `<button class="btn pri block" style="margin-top:16px" data-act="fxLockSet">${CQ_LOCK} Lock with a passcode</button>` : ''}`}`),
  fxRetro: el => fxRetroSheet(el.dataset.l, el.dataset.s),
  fxRetroOpt: el => { const k = el.dataset.k; FXE[k] = isNaN(+el.dataset.v) ? el.dataset.v : +el.dataset.v; el.parentNode.querySelectorAll('button').forEach(b => b.classList.toggle('on', b === el)); },
  fxRetroSave: () => {
    const d = FD(), dur = FXE.dur * 60, a = sudsVal('rStart'), e = sudsVal('rEnd'), p = Math.max(a, e, sudsVal('rPeak'));
    const end = new Date(); end.setDate(end.getDate() - FXE.day); if (FXE.day) end.setHours(12, 0, 0, 0);
    d.sessions.push({ id: uid(), lid: FXE.lid, sid: FXE.sid, date: new Date(end.getTime() - dur * 1000).toISOString(), dur, interval: 0, target: 0, predict: '',
      ratings: [{ t: 0, s: a }, { t: Math.round(dur / 3), s: p }, { t: dur, s: e }], peak: p, end: e, happened: FXE.happened, safety: null, learned: ($('#rLearned').value || '').trim(), retro: true });
    d.sessions.sort((x, y) => new Date(x.date) - new Date(y.date));
    const s = fxS(fxL(FXE.lid), FXE.sid); if (s && s.status === 'todo') s.status = 'doing';
    fxPersist(); closeSheet(); rerender(); toast('Session logged');
  },
  fxDelX: () => { if (!fxTwoTap('fxDelX', `${ICON.trash} Tap again to delete`)) return; const d = FD(); d.sessions = d.sessions.filter(x => x.id !== FXE.sessId); fxPersist(); closeSheet(); rerender(); },
  fxGo: el => fxGo(el.dataset.l, el.dataset.s),
  fxOpt: el => {
    const k = el.dataset.k; FX[k] = +el.dataset.v;
    if (k === 'interval') { FX.predict = ($('#fxPredict') || {}).value || FX.predict; FX.startS = sudsVal(); const o = $('#overlay'), y = o.scrollTop; renderFx(); o.scrollTop = y; return; }
    el.parentNode.querySelectorAll('button').forEach(c => c.classList.toggle('on', c === el));
  },
  fxStart: () => {
    const d = FD(), t = now(), s0 = sudsVal();
    d.opts.interval = FX.interval; d.opts.target = FX.target;
    d.active = { id: uid(), lid: FX.lid, sid: FX.sid, start: t, interval: FX.interval, target: FX.target, predict: ($('#fxPredict').value || '').trim(), ratings: [{ t: 0, s: s0 }], lastAsk: t };
    FX = { stage: 'run' }; fxPersist(); sfx.go(); renderFx(); $('#overlay').scrollTop = 0;
  },
  fxCancel: () => { FX = null; hideOverlay(); },
  fxHide: () => { hideOverlay(); toast('Still running. Resume it from Face or Today.'); },
  fxResume: () => { if (!fxReady()) { go('#/face'); return; } FX = { stage: 'run' }; showOverlay('face'); renderFx(); },
  fxRateNow: () => fxRate(false),
  fxLog: () => {
    const A = FD().active; if (!A) return;
    A.ratings.push({ t: Math.round((now() - A.start) / 1000), s: sudsVal('rateSuds') });
    buzz(20); closeSheet(); // onSheetClose resets the check-in clock, saves and redraws
  },
  fxFinish: () => { FX = { stage: 'end', happened: null, safety: null, learned: '' }; renderFx(); $('#overlay').scrollTop = 0; },
  fxBackRun: () => { FX = { stage: 'run' }; renderFx(); },
  fxEndOpt: el => { FX[el.dataset.k] = el.dataset.v; el.parentNode.querySelectorAll('button').forEach(b => b.classList.toggle('on', b === el)); },
  fxSave: () => {
    const d = FD(), A = d.active; if (!A) return;
    const dur = Math.round((now() - A.start) / 1000), end = sudsVal('endSuds');
    const ratings = A.ratings.concat([{ t: dur, s: end }]), peak = Math.max(...ratings.map(r => r.s));
    d.sessions.push({ id: A.id, lid: A.lid, sid: A.sid, date: new Date(A.start).toISOString(), dur, interval: A.interval, target: A.target, predict: A.predict,
      ratings, peak, end, happened: FX.happened, safety: FX.safety, learned: ($('#fxLearned').value || '').trim() });
    const L = fxL(A.lid), s = fxS(L, A.sid);
    if (s && s.status === 'todo') s.status = 'doing';
    d.active = null; FX = null; fxPersist(); sfx.done();
    hideOverlay(); if (L) go('#/ladder/' + L.id);
    toast(s && readyUp(s) ? `Peak ${FX_READY_PEAK} or under twice now. Ready to move up?` : 'Session saved. Well done for facing it.');
  },
  fxDiscard: () => {
    const b = $('#fxDiscard'); if (b && !b.classList.contains('armed')) { b.classList.add('armed'); b.textContent = 'Tap again'; return; }
    FD().active = null; FX = null; fxPersist(); hideOverlay(); toast('Session discarded');
  },
  fxAncReset: () => { FD().anchors = SUDS_DEFAULT.slice(); fxPersist(); rerender(); toast('Descriptions reset'); },
  fxUnlock: async () => {
    const i = $('#fxPass'), p = i && i.value; if (!p) return;
    const ok = await fxUnlock(p);
    if (!ok) { toast('Wrong passcode'); i.value = ''; i.focus(); return; }
    rerender();
  },
  fxLockSet: () => openSheet(`<h3>Lock with a passcode</h3>
    <div class="muted small">Your ladders and sessions get encrypted on this phone. Without the passcode they can’t be read, not even from a backup.</div>
    <input type="password" id="fxP1" autocomplete="new-password" placeholder="Passcode (at least 4 characters)" style="margin-top:14px">
    <input type="password" id="fxP2" autocomplete="new-password" placeholder="Same again" style="margin-top:8px">
    <div class="note rest" style="margin-top:12px">If you forget it, there’s no way to get them back.</div>
    <button class="btn pri block" style="margin-top:12px" data-act="fxSetLock">Lock</button>`),
  fxSetLock: async () => {
    const a = ($('#fxP1') || {}).value || '', b = ($('#fxP2') || {}).value || '';
    if (a.length < 4) { toast('At least 4 characters'); return; }
    if (a !== b) { toast('Those don’t match'); return; }
    await fxSetLock(a); closeSheet(); rerender(); toast('Locked');
  },
  fxLockNowBtn: () => { if (FD().active) { toast('Finish the session in progress first'); return; } closeSheet(); fxLockNow().then(() => { rerender(); toast('Locked'); }); },
  fxLockOff: () => confirmSheet('Remove the lock?', 'Face will be stored without encryption on this phone, and exported backups will include it as plain text.', 'Remove lock', () => { fxRemoveLock(); rerender(); toast('Lock removed'); }, true),
});
document.addEventListener('input', e => {
  const t = e.target;
  if (t.classList && t.classList.contains('suds-r')) {
    const v = +t.value, id = t.id;
    const n = $('#' + id + 'N'), dd = $('#' + id + 'D'), box = $('#' + id + 'Box');
    if (n) n.textContent = v; if (dd) dd.textContent = sudsDesc(v); if (box) box.style.setProperty('--sc', sudsColor(v));
    if (id === 'sudsIn' && FX && FX.stage === 'setup') FX.startS = v;
  } else if (t.id === 'fxPredict' && FX) FX.predict = t.value;
  else if (t.id === 'fxLearned' && FX) FX.learned = t.value;
  else if (t.dataset && t.dataset.anc != null && fxReady()) { FD().anchors[+t.dataset.anc] = t.value; fxPersistSoon(); }
});
document.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.id === 'fxPass') ACT.fxUnlock(); });
// iOS range inputs ignore taps on the track; set the value from where you touched
document.addEventListener('pointerdown', e => {
  const t = e.target; if (!t.classList || !t.classList.contains('suds-r')) return;
  const r = t.getBoundingClientRect(), pad = 15, f = clamp((e.clientX - r.left - pad) / (r.width - pad * 2), 0, 1);
  t.value = Math.round(f * 20) * 5; t.dispatchEvent(new Event('input', { bubbles: true }));
}, { passive: true });
