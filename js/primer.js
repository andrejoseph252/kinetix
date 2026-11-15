/* Kinetix — Primers: a few easy bodyweight moves to wake the muscles up.
   Not a workout. One round, nothing close to failure, no rest timer, no sweat.
   You tap Done when you've done the reps; timed holds count themselves down. */
'use strict';

/* Each slot is a list of options from easiest to hardest:
   [exercise id, amount, 'reps' | 'sec', per side?, note, needs equipment] */
const PO = {
  squat: [['bodyweight-squat', 10, 'reps'], ['reverse-lunge', 5, 'reps', 1], ['split-squat', 5, 'reps', 1], ['cossack-squat', 4, 'reps', 1], ['jump-squat', 5, 'reps']],
  push: [['incline-push-up', 8, 'reps', 0, 'Hands on a counter, desk or wall. The higher your hands, the easier it is.'], ['push-up', 6, 'reps', 0, 'Knees down is fine.'], ['push-up-to-side-plank', 3, 'reps', 1]],
  hinge: [['glute-bridge', 10, 'reps'], ['single-leg-glute-bridge', 6, 'reps', 1], ['single-leg-rdl', 5, 'reps', 1]],
  core: [['dead-bug', 5, 'reps', 1], ['bird-dog', 5, 'reps', 1], ['plank', 20, 'sec'], ['side-plank', 15, 'sec', 1], ['hollow-hold', 15, 'sec']],
  back: [['prone-y-t-w-raise', 4, 'reps'], ['superman', 8, 'reps'], ['band-pull-apart', 12, 'reps', 0, '', 'band']],
  calves: [['calf-raise', 12, 'reps'], ['pogo-hops', 15, 'reps']],
  lateral: [['lateral-lunge', 4, 'reps', 1], ['cossack-squat', 4, 'reps', 1]],
  shoulders: [['arm-circles', 10, 'reps'], ['wall-slides', 8, 'reps'], ['band-pull-apart', 12, 'reps', 0, '', 'band']],
  rotate: [['standing-t-spine-rotation', 5, 'reps', 1]],
  pulse: [['slow-high-knee-march', 6, 'reps', 1], ['star-jumps', 10, 'reps']],
};
const PRIMERS = [
  { id: 'pr-full', name: 'Full-Body Primer', blurb: 'Squat, push, bridge, brace. One easy pass.', slots: ['squat', 'push', 'hinge', 'core'] },
  { id: 'pr-stand', name: 'Standing Primer', blurb: 'No floor, no change of clothes. Good by a desk.', slots: ['squat', 'push', 'calves', 'rotate', 'shoulders'] },
  { id: 'pr-lower', name: 'Legs & Hips', blurb: 'Wake up the legs and glutes.', slots: ['squat', 'hinge', 'lateral', 'calves'] },
  { id: 'pr-upper', name: 'Upper Body & Trunk', blurb: 'Push, upper back, shoulders, brace.', slots: ['push', 'back', 'shoulders', 'core'] },
  { id: 'pr-min', name: 'The Bare Minimum', blurb: 'Squats and push-ups. About a minute.', slots: ['squat', 'push'] },
];
const DOSES = [[0.6, 'Gentle'], [1, 'Easy'], [1.35, 'Brisk']];

// Routines lane in Progress
RSLOT.primer = { name: 'Primer', c: 'primer', ids: PRIMERS.map(p => p.id) };

S.ui.primer = Object.assign({ dose: 1, last: 'pr-full' }, S.ui.primer || {});
S.primerCfg = S.primerCfg || {}; // { [primerId]: { opt: {slot: i}, n: {slot: base}, off: [slot], rounds } }

const findPrimer = id => PRIMERS.find(p => p.id === id) || PRIMERS[0];
function pcfg(pid) { const c = S.primerCfg[pid] = S.primerCfg[pid] || {}; c.opt = c.opt || {}; c.n = c.n || {}; c.off = c.off || []; c.rounds = c.rounds || 1; return c; }
const optOk = o => BY[o[0]] && (!o[5] || S.settings.eq.includes(o[5]));
const slotOpts = key => PO[key].filter(optOk);
const round5 = v => Math.round(v / 5) * 5;
const pDose = () => S.ui.primer.dose || 1;
function primerMoves(P) {
  const c = pcfg(P.id);
  return P.slots.map((key, si) => {
    const os = slotOpts(key), oi = clamp(c.opt[si] || 0, 0, os.length - 1), o = os[oi];
    const base = c.n[si] != null ? c.n[si] : o[1], unit = o[2];
    const n = unit === 'sec' ? clamp(round5(base * pDose()), 5, 120) : clamp(Math.round(base * pDose()), 1, 50);
    return { si, key, oi, count: os.length, ex: o[0], unit, side: !!o[3], note: o[4] || '', n, off: c.off.includes(si) };
  });
}
const pAmt = m => m.unit === 'sec' ? `${m.n}s${m.side ? ' each side' : ''}` : `${m.n}${m.side ? ' each side' : ' reps'}`;
const moveSecs = m => (m.unit === 'sec' ? m.n : m.n * 3) * (m.side ? 2 : 1) + 8;
function primerMins(P) { const t = primerMoves(P).filter(m => !m.off).reduce((a, m) => a + moveSecs(m), 0) * pcfg(P.id).rounds; return Math.max(1, Math.round(t / 60)); }
function primerNow() { return findPrimer(S.ui.primer.last); }

/* ---------- Today card & Mobility section ---------- */
function primerCard() {
  const P = primerNow(), ms = primerMoves(P).filter(m => !m.off);
  return `<div class="card primercard" style="--c:var(--c-primer)">
    <div class="row" style="align-items:flex-start"><div class="grow"><div class="eyebrow cc">Primer · wake the muscles up</div><div class="title" style="font-size:24px;margin-top:4px">${esc(P.name)}</div>
      <div class="muted small" style="margin-top:4px">${ms.map(m => esc(BY[m.ex].name)).join(', ')}</div></div>
      <div class="bignum sm">${primerMins(P)}<small>min</small></div></div>
    <div class="row" style="margin-top:12px"><button class="btn cbtn grow" data-act="primerGo" data-id="${P.id}">${PLAY} Start</button><button class="btn ghost" data-act="primer" data-id="${P.id}">Adjust</button></div>
    <div class="chips scroll" style="margin-top:12px">${PRIMERS.filter(x => x.id !== P.id).map(x => `<button class="chip" data-act="primer" data-id="${x.id}">${esc(x.name)}</button>`).join('')}</div>
  </div>`;
}
function primerSection() {
  const row = P => `<div class="rt" data-act="primer" data-id="${P.id}" style="--c:var(--c-primer)">
      <div class="rt-m"><b>${primerMins(P)}</b><span>min</span></div>
      <div class="grow"><div class="nm">${esc(P.name)}</div><div class="muted small">${esc(P.blurb)}</div></div>
      <button class="rt-go" data-act="primerGo" data-id="${P.id}" aria-label="Start ${esc(P.name)}">${PLAY}</button></div>`;
  return `<div class="h2" style="--c:var(--c-primer)"><span class="hbar"></span>Primers</div>
    <div class="muted small" style="margin:-6px 0 10px">A few easy bodyweight moves to get the muscles going. Not a workout: stop well short of tired.</div>
    <div class="stack">${PRIMERS.map(row).join('')}</div>`;
}

/* ---------- adjust sheet ---------- */
let PRS = null; // primer shown in the sheet
function openPrimer(pid, keep) {
  const P = findPrimer(pid), c = pcfg(P.id), ms = primerMoves(P); PRS = P.id;
  const on = ms.filter(m => !m.off).length;
  openSheet(`<h3>${esc(P.name)}</h3><div class="muted small">${esc(P.blurb)} ${on} move${on === 1 ? '' : 's'}, about ${primerMins(P)} min.</div>
    <div class="field"><div class="lab">Effort <span class="muted small" style="font-weight:500">(all primers)</span></div><div class="seg">${DOSES.map(([v, l]) => `<button class="${pDose() === v ? 'on' : ''}" data-act="prDose" data-v="${v}">${l}</button>`).join('')}</div></div>
    <div class="field"><div class="lab">Rounds</div><div class="seg">${[1, 2, 3].map(n => `<button class="${c.rounds === n ? 'on' : ''}" data-act="prRounds" data-v="${n}">${n}</button>`).join('')}</div></div>
    <div class="field"><div class="lab">Moves</div>
    ${ms.map(m => { const ex = BY[m.ex]; return `<div class="pmv ${m.off ? 'off' : ''}">
      <button data-act="ex" data-id="${m.ex}">${ph(ex, 'thumb')}</button>
      <div class="grow"><div class="nm">${esc(ex.name)}</div>
        <div class="pmv-a">${m.count > 1 ? `<button data-act="prVar" data-s="${m.si}" data-d="-1" ${m.oi === 0 ? 'disabled' : ''}>Easier</button><button data-act="prVar" data-s="${m.si}" data-d="1" ${m.oi >= m.count - 1 ? 'disabled' : ''}>Harder</button>` : ''}<button data-act="prOff" data-s="${m.si}">${m.off ? 'Add back' : 'Skip'}</button></div></div>
      ${m.off ? '' : `<div class="pstep"><button data-act="prN" data-s="${m.si}" data-d="-1" aria-label="Less">−</button><output>${m.n}<small>${m.unit === 'sec' ? 'sec' : 'reps'}${m.side ? '/side' : ''}</small></output><button data-act="prN" data-s="${m.si}" data-d="1" aria-label="More">+</button></div>`}
    </div>`; }).join('')}</div>
    <div class="muted small" style="margin-top:12px">Leave a few reps in the tank on every move. It should feel like waking up, not working out.</div>
    <div class="row" style="margin-top:16px"><button class="btn ghost" data-act="prReset">Reset</button><button class="btn pri grow" data-act="primerGo" data-id="${P.id}">${PLAY} Start</button></div>`, keep);
}
function prTouch(fn) { const P = findPrimer(PRS), c = pcfg(P.id); fn(P, c); save(); openPrimer(P.id, true); rerender(); }

/* ---------- runner ---------- */
let PR = null;
function startPrimer(pid) {
  const P = findPrimer(pid), c = pcfg(P.id), ms = primerMoves(P).filter(m => !m.off);
  if (!ms.length) { toast('Add at least one move back'); return; }
  S.ui.primer.last = P.id; save();
  const steps = [];
  for (let r = 1; r <= c.rounds; r++) ms.forEach(m => steps.push(Object.assign({}, m, { round: r })));
  PR = { pid: P.id, name: P.name, rounds: c.rounds, steps, i: 0, start: now(), done: [], timer: null, finished: false };
  closeSheet(); showOverlay('primer'); renderPrimer();
}
function renderPrimer() {
  const o = $('#overlay'); if (!PR) return;
  if (PR.finished) {
    o.innerHTML = `<div class="ov-in prim"><div class="ov-top"><button class="icon-btn" data-act="prClose" aria-label="Close">${ICON.close}</button><div class="t"><b>${esc(PR.name)}</b></div></div>
      <div style="text-align:center;padding-top:14vh"><div class="eyebrow" style="color:var(--c-primer)">Primed</div><div style="font-size:44px;font-weight:800;letter-spacing:-.03em;margin:8px 0">${fmtLong((now() - PR.start) / 1000)}</div>
      <div class="muted">${plural(PR.done.length, 'move')} done. Muscles awake, nothing spent.</div>
      <div class="row" style="justify-content:center;margin-top:28px"><button class="btn ghost" data-act="prAgain">Another round</button><button class="btn pri" style="min-width:140px" data-act="prClose">Done</button></div></div></div>`;
    return;
  }
  const s = PR.steps[PR.i], ex = BY[s.ex], T = PR.timer;
  const left = T ? Math.max(0, (T.end - now()) / 1000) : 0;
  const nxt = PR.steps[PR.i + 1];
  const amt = s.unit === 'sec'
    ? `<div class="pr-big"><span id="prNum">${T ? (T.side ? Math.ceil(T.half ? left : left - T.total / 2) : Math.ceil(left)) : s.n}</span><small>${T && s.side ? (T.half ? 'right side' : 'left side') : s.side ? 'sec each side' : 'sec'}</small></div>`
    : `<div class="pr-big"><span>${s.n}</span><small>${s.side ? 'reps each side' : 'reps'}</small></div>`;
  o.innerHTML = `<div class="ov-in prim">
    <div class="ov-top"><button class="icon-btn" data-act="prClose" aria-label="Close">${ICON.close}</button><div class="t"><b>${esc(PR.name)}</b><span>Move ${PR.i + 1} of ${PR.steps.length}${PR.rounds > 1 ? ` · round ${s.round} of ${PR.rounds}` : ''}</span></div></div>
    <div class="progress-dots">${PR.steps.map((_, i) => `<i class="${i < PR.i ? 'on' : i === PR.i ? 'cur' : ''}"></i>`).join('')}</div>
    ${ph(ex, 'flow-ph', true)}
    <div class="flow-name">${esc(ex.name)}</div>
    <div class="row" style="align-items:flex-end;margin-top:8px">${amt}
      ${T ? '' : `<div class="pstep" style="margin-left:auto"><button data-act="prRunN" data-d="-1" aria-label="Less">−</button><button data-act="prRunN" data-d="1" aria-label="More">+</button></div>`}</div>
    ${s.unit === 'sec' && T ? `<div class="bar" style="margin-top:10px;height:8px"><i id="prBar" style="width:${(1 - left / T.total) * 100}%;background:var(--c-primer)"></i></div>` : ''}
    ${s.note ? `<div class="inote" style="margin-top:10px">${esc(s.note)}</div>` : ''}
    <ul class="cues" style="--c:var(--c-primer)">${ex.cues.slice(0, 3).map(c => `<li>${esc(c)}</li>`).join('')}</ul>
    <div class="player-nav">
      <button class="btn ghost" style="flex:0 0 auto;padding:0 18px" data-act="prSkip">Skip</button>
      ${s.unit === 'sec' && !T ? `<button class="btn cbtn" style="--c:var(--c-primer)" data-act="prTimer">${PLAY} Start ${s.n}s${s.side ? ' / side' : ''}</button>`
        : `<button class="btn cbtn" style="--c:var(--c-primer)" data-act="prDone">${ICON.check} Done${nxt ? '' : ', finish'}</button>`}
    </div>
    ${nxt ? `<div class="muted small" style="text-align:center;margin-top:12px">Next: ${esc(BY[nxt.ex].name)}, ${pAmt(nxt)}</div>` : ''}
  </div>`;
}
function prNext(did) {
  if (did) PR.done.push(PR.steps[PR.i]);
  PR.timer = null;
  if (PR.i >= PR.steps.length - 1) return prFinish();
  PR.i++; buzz(30); renderPrimer(); $('#overlay').scrollTop = 0;
}
function prFinish() {
  PR.finished = true; PR.timer = null; sfx.done();
  if (PR.done.length) {
    const by = {}; PR.done.forEach(s => (by[s.ex] = by[s.ex] || []).push({ done: true, r: String(s.n) }));
    S.history.push({ id: uid(), date: new Date().toISOString(), kind: 'mobility', cat: 'primer', rid: PR.pid, title: PR.name, dur: Math.max(30, Math.round((now() - PR.start) / 1000)), ex: Object.entries(by).map(([id, sets]) => ({ id, sets })) });
    save();
  }
  renderPrimer();
}
setInterval(() => {
  if (!PR || !PR.timer || OV !== 'primer') return;
  const T = PR.timer, left = (T.end - now()) / 1000, sec = Math.ceil(left);
  if (T.side && !T.half && left <= T.total / 2) { T.half = true; sfx.switch(); renderPrimer(); return; }
  if (left <= 0) { sfx.go(); prNext(true); return; }
  if (sec !== T.last) { if (sec <= 3 && T.last != null) sfx.tick(); T.last = sec; const n = $('#prNum'); if (n) n.textContent = T.side ? Math.ceil(T.half ? left : left - T.total / 2) : sec; }
  const b = $('#prBar'); if (b) b.style.width = (1 - left / T.total) * 100 + '%';
}, 150);

Object.assign(ACT, {
  primer: el => openPrimer(el.dataset.id),
  primerGo: el => startPrimer(el.dataset.id),
  prDose: el => { S.ui.primer.dose = +el.dataset.v; save(); openPrimer(PRS, true); rerender(); },
  prRounds: el => prTouch((P, c) => { c.rounds = +el.dataset.v; }),
  prVar: el => prTouch((P, c) => { const si = +el.dataset.s, n = slotOpts(P.slots[si]).length; c.opt[si] = clamp((c.opt[si] || 0) + +el.dataset.d, 0, n - 1); delete c.n[si]; }),
  prOff: el => prTouch((P, c) => { const si = +el.dataset.s; c.off = c.off.includes(si) ? c.off.filter(x => x !== si) : [...c.off, si]; }),
  prN: el => prTouch((P, c) => { const si = +el.dataset.s, m = primerMoves(P)[si], step = m.unit === 'sec' ? 5 : 1; c.n[si] = clamp(m.n + +el.dataset.d * step, step === 5 ? 5 : 1, step === 5 ? 120 : 50) / pDose(); }),
  prReset: () => prTouch((P) => { delete S.primerCfg[P.id]; }),
  prRunN: el => {
    const s = PR.steps[PR.i], P = findPrimer(PR.pid), c = pcfg(P.id), step = s.unit === 'sec' ? 5 : 1;
    const n = clamp(s.n + +el.dataset.d * step, step, step === 5 ? 120 : 50);
    PR.steps.forEach(x => { if (x.si === s.si) x.n = n; });
    c.n[s.si] = n / pDose(); save(); renderPrimer();
  },
  prTimer: () => { const s = PR.steps[PR.i], total = s.n * (s.side ? 2 : 1); PR.timer = { end: now() + total * 1000, total, side: s.side, half: false, last: null }; sfx.go(); renderPrimer(); },
  prDone: () => prNext(true),
  prSkip: () => prNext(false),
  prAgain: () => { const id = PR.pid; PR = null; startPrimer(id); },
  prClose: () => {
    const p = PR; PR = null; hideOverlay();
    if (p && !p.finished && p.done.length) toast('Closed early, not logged');
  },
});
