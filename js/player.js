/* Kinetix — workout player, rest bar, interval/flow runner, ticker. */
'use strict';
/* =========================================================
   Workout player (overlay)
   ========================================================= */
let OV = null; // 'player' | 'run' | 'flow'
function showOverlay(kind) { OV = kind; const o = $('#overlay'); o.hidden = false; document.body.style.overflow = 'hidden'; document.body.classList.add('ovl'); wake(true); }
function hideOverlay() { OV = null; const o = $('#overlay'); o.hidden = true; o.innerHTML = ''; document.body.style.overflow = ''; document.body.classList.remove('ovl'); wake(false); rerender(); }

function getSess(ref) {
  if (!ref) return null;
  if (ref[0] === 'p') return S.plan ? S.plan.days[+ref.slice(1)] : null;
  if (ref === 'q') return S.quick;
  if (ref === 'a') return S.active ? S.active.sess : null;
  if (ref[0] === 't') return S.saved.find(x => x.id === ref.slice(1)) || null;
  return null;
}
function weekOf(ref) {
  if (ref === 'a' || (S.active && ref === S.active.ref && ref[0] === 'p')) return S.active ? S.active.week : null;
  return ref && ref[0] === 'p' && S.plan ? S.plan.week : null;
}
const findB = (sess, bid) => sess && sess.blocks.find(b => b.id === bid);
function locate(el) {
  const ref = el.dataset.r, sess = getSess(ref), b = findB(sess, el.dataset.b);
  const it = b && el.dataset.i ? b.items.find(x => x.id === el.dataset.i) : null;
  return { ref, sess, b, it };
}

function startSess(ref) {
  const sess = getSess(ref); if (!sess) return;
  if (S.active && S.active.src !== ref) {
    const cur = activeDay();
    confirmSheet('Workout in progress', `You have "${cur ? cur.name : 'a workout'}" in progress. Discard it and start this one?`, 'Discard & start', () => { S.active = null; stopRest(); startSess(ref); }, true);
    return;
  }
  if (!S.active) {
    const plan = ref[0] === 'p';
    S.active = { ref: plan ? ref : 'a', src: ref, sess: plan ? null : clone(sess), week: plan ? S.plan.week : null, day: plan ? +ref.slice(1) : null, start: now(), bi: 0, logs: {}, cond: {} };
  }
  EDITING = false;
  save(); showOverlay('player'); renderPlayer();
}
function activeDay() { return S.active ? getSess(S.active.ref) : null; }
function setsFor(key, n) {
  const L = S.active.logs;
  if (!L[key]) L[key] = Array.from({ length: n }, () => ({ w: '', r: '', done: false }));
  while (L[key].length < n) L[key].push({ w: '', r: '', done: false });
  return L[key];
}
function trimLogs(it, n) {
  const L = S.active && S.active.logs[it.id];
  if (L) while (L.length > n && !L[L.length - 1].done) L.pop();
}
function renderPlayer(keepScroll) {
  const d = activeDay(); if (!d || !d.blocks.length) { S.active = null; save(); hideOverlay(); return; }
  const A = S.active, w = A.week, o = $('#overlay');
  A.bi = clamp(A.bi, 0, d.blocks.length - 1);
  const b = d.blocks[A.bi], F = b.fmt, ref = A.ref;
  const y = keepScroll ? o.scrollTop : 0;
  const addBtn = `<button class="btn sm ghost" style="margin-top:12px" data-act="pick" data-r="${ref}" data-b="${b.id}">${ICON.plus} Add exercise</button>`;
  let body = b.note ? `<div class="bnote" style="margin-bottom:12px">${esc(b.note)}</div>` : '';
  if (F === 'note') {
    body += `<div class="note" style="font-size:15px;padding:16px">${esc(b.text || '')}</div>
      <button class="btn block" style="margin-top:12px" data-act="openTimerTab">Open stopwatch</button>`;
  } else if (!b.items.length) {
    body += `<div class="empty">No exercises in this block.</div>${addBtn}`;
  } else if (CLOCK.includes(F)) {
    const done = A.cond[b.id];
    const how = F === 'intervals' ? 'Work hard for the interval, rest, then move to the next exercise.' : F === 'emom' ? 'Start a new exercise at the top of every minute. Rest for whatever is left of the minute.' : 'Cycle through the list for as many rounds as you can. Count your rounds.';
    body += `<div class="card"><div class="eyebrow">${FMT[F][0]}</div><div style="font-size:20px;font-weight:800;margin:4px 0 4px">${esc(clockTxt(b))}</div>
      <div class="muted small">${how} Pick a pace you can hold.</div></div>
      ${b.items.map((it, ii) => itemRow(ref, b, it, ii, w, true)).join('')}
      <button class="btn pri block" style="margin-top:14px" data-act="condStart">${PLAY} Start timer</button>
      <button class="btn ${done ? '' : 'ghost'} block" style="margin-top:8px" data-act="condDone">${done ? ICON.check + ' Done' : 'Mark as done'}</button>`;
  } else if (F === 'flow') {
    body += `<button class="btn pri block" data-act="blockFlow">${PLAY} Follow along${(b.rounds || 1) > 1 ? ` · ${b.rounds} rounds` : ''}</button>
      <div class="muted small" style="text-align:center;margin:8px 0 6px">or go at your own pace and tick them off</div>
      ${b.items.map(it => {
        const ex = BY[it.ex], sets = setsFor(it.id, 1), done = sets[0].done;
        return `<div class="exrow" style="${done ? 'opacity:.6' : ''}"><button data-act="ex" data-id="${ex.id}">${ph(ex, 'thumb lg')}</button>
          <div class="grow" data-act="ex" data-id="${ex.id}"><div class="nm">${esc(ex.name)}</div><div class="ds">${esc(itemTxt(it, b, w))}${(b.rounds || 1) > 1 ? ` · ${b.rounds} rounds` : ''}</div>${it.note ? `<div class="inote">${esc(it.note)}</div>` : ''}</div>
          <div style="display:flex;flex-direction:column;gap:6px;align-items:center"><button class="set ${done ? 'done' : ''}" style="display:block;padding:0" data-act="tick" data-b="${b.id}" data-i="${it.id}" data-s="0" aria-label="Done"><span class="chk" style="display:grid">${ICON.check}</span></button>
          <button class="icon-btn sm" data-act="item" data-r="${ref}" data-b="${b.id}" data-i="${it.id}" aria-label="Edit">${ICON.more}</button></div></div>`;
      }).join('')}${addBtn}`;
  } else {
    // sets / circuit
    const { rest, short } = blockRest(b, w), circ = F === 'circuit', n = b.items.length;
    const order = b.items.map((_, i) => (b.key || '') + (i + 1)).join(' → ');
    if (circ) body += `<div class="note" style="margin-bottom:12px">Circuit · ${b.rounds || 1} rounds: ${order}${short ? `, ${short}s between moves` : ''}, then rest ${rest}s. Tick each move as you go.</div>`;
    else if (n > 1) body += `<div class="note" style="margin-bottom:12px">${n > 2 ? 'Tri-set' : 'Superset'}: one set of each in order (${order}), resting ${short}s between them and ${rest}s after the round.</div>`;
    else if (rest) body += `<div class="muted small" style="margin-bottom:10px">Rest ${rest}s between sets — the timer starts when you tick a set.</div>`;
    body += b.items.map((it, ii) => {
      const ex = BY[it.ex], r = rx(it, w), key = it.id, sets = setsFor(key, circ ? (b.rounds || 1) : r.sets), last = lastFor(ex.id);
      const timed = r.unit === 'sec', wIn = loadEx(ex), restAfter = ii < n - 1 ? short : rest;
      const word = circ ? 'Round' : 'Set';
      return `<div class="pex">${ph(ex, '', true, b.key || circ ? `<span class="badge">${esc(b.key || '')}${ii + 1}</span>` : '')}
        <div class="body">
          <div class="row" style="align-items:flex-start"><div class="grow"><div class="nm">${esc(ex.name)}</div><div class="dose">${esc(rxTxt(r, { noSets: circ }))}</div>${last ? `<div class="last">Last: ${esc(last.txt)}</div>` : ''}</div>
            <a class="icon-btn" href="${ytUrl(ex.name)}" target="_blank" rel="noopener" aria-label="Watch on YouTube">${ICON.yt}</a>
            <button class="icon-btn" data-act="ex" data-id="${ex.id}" aria-label="How to">${ICON.info}</button></div>
          ${r.note ? `<div class="inote">${esc(r.note)}</div>` : ''}
          <ul class="cues small" style="margin-top:6px">${ex.cues.slice(0, 2).map(c => `<li>${esc(c)}</li>`).join('')}</ul>
          <div class="sets">
          ${sets.map((s, si) => timed ? `
            <div class="set timed ${s.done ? 'done' : ''}"><span class="i">${si + 1}</span>
              <button class="holdbtn ${HOLD && HOLD.key === key && HOLD.si === si ? 'run' : ''}" data-act="hold" data-key="${key}" data-s="${si}" data-n="${r.n}" data-side="${r.side ? 1 : 0}" id="hold-${key}-${si}">${HOLD && HOLD.key === key && HOLD.si === si ? fmt(holdLeft()) : ICON.play + ' ' + r.n + 's' + (r.side ? ' / side' : '')}</button>
              <button class="chk" data-act="tick" data-b="${b.id}" data-i="${it.id}" data-s="${si}" data-rest="${restAfter}">${ICON.check}</button></div>` : `
            <div class="set ${s.done ? 'done' : ''} ${wIn ? '' : 'now'}"><span class="i">${si + 1}</span>
              ${wIn ? `<div><input type="text" inputmode="decimal" placeholder="${esc(last && last.w ? last.w : '—')}" value="${esc(s.w)}" data-in="w" data-key="${key}" data-s="${si}"><div class="lab">${S.settings.units}</div></div>` : ''}
              <div><input type="text" inputmode="numeric" placeholder="${r.unit === 'm' ? r.n + 'm' : r.n}" value="${esc(s.r)}" data-in="r" data-key="${key}" data-s="${si}"><div class="lab">${r.unit === 'm' ? 'metres' : 'reps' + (r.side ? '/side' : '')}</div></div>
              <button class="chk" data-act="tick" data-b="${b.id}" data-i="${it.id}" data-s="${si}" data-rest="${restAfter}">${ICON.check}</button></div>`).join('')}
          </div>
          <div class="row" style="margin-top:6px"><button class="btn sm ghost" data-act="addSet" data-key="${key}">+ ${word}</button><span class="grow"></span><button class="btn sm ghost" data-act="item" data-r="${ref}" data-b="${b.id}" data-i="${it.id}">${ICON.edit} Edit / swap</button></div>
        </div></div>`;
    }).join('') + addBtn;
  }
  const last = A.bi === d.blocks.length - 1;
  o.innerHTML = `<div class="ov-in">
    <div class="ov-top"><button class="icon-btn" data-act="minimize" aria-label="Minimise">${ICON.close}</button>
      <div class="t"><b>${esc(d.name)}</b><span class="num" id="elapsed">${fmtLong((now() - A.start) / 1000)}</span>${w ? `<span> · Week ${w}</span>` : ''}</div>
      <button class="btn sm pri" data-act="finish">Finish</button></div>
    <div class="progress-dots">${d.blocks.map((x, i) => `<i class="${i < A.bi ? 'on' : i === A.bi ? 'cur' : ''}" style="--c:${cvar(blockCat(x))}"></i>`).join('')}</div>
    <div class="ov-body">
    <div class="block-h" style="margin-top:4px;--c:${cvar(blockCat(b))}"><span class="hbar"></span>${b.key ? `<span class="k">${esc(b.key)}</span>` : ''}<span class="t" style="font-size:22px">${esc(b.title)}</span><span class="n">${A.bi + 1} / ${d.blocks.length}</span><button class="icon-btn sm" data-act="blk" data-r="${ref}" data-b="${b.id}" aria-label="Block options">${ICON.more}</button></div>
    <div class="muted small" style="margin:-4px 0 12px">${esc(FMT[F][0])} · ${esc(blockDesc(b, w))}</div>
    ${body}
    </div>
    <div class="player-nav"><button class="btn" data-act="pnav" data-d="-1" ${A.bi === 0 ? 'disabled style="opacity:.4"' : ''}>Back</button>
      ${last ? `<button class="btn pri" data-act="finish">Finish workout</button>` : `<button class="btn pri" data-act="pnav" data-d="1">Next: ${esc(d.blocks[A.bi + 1].title)}</button>`}</div>
  </div>`;
  o.scrollTop = y;
}
function finishSheet() {
  const d = activeDay(), A = S.active;
  const doneSets = Object.values(A.logs).reduce((a, s) => a + s.filter(x => x.done).length, 0);
  openSheet(`<h3>Finish workout</h3><div class="muted small">${esc(d.name)} · ${fmtLong((now() - A.start) / 1000)} · ${doneSets} sets ticked</div>
    <div class="field"><div class="lab">How hard was it overall? (RPE)</div>
      <div class="seg" id="rpeSeg">${[5, 6, 7, 8, 9, 10].map(v => `<button data-act="rpe" data-v="${v}" class="${A.rpe === v ? 'on' : ''}">${v}</button>`).join('')}</div>
      <div class="muted small" style="margin-top:6px">6 = comfortable · 8 = hard but controlled · 10 = all-out</div></div>
    <div class="field"><div class="lab">Notes</div><textarea id="wNotes" placeholder="How did it feel? Anything to change next time?">${esc(A.notes || '')}</textarea></div>
    ${A.ref === 'a' && A.src[0] !== 't' ? `<button class="chip ${A.keep ? 'on' : ''}" style="margin-top:14px" data-act="keepTpl">${A.keep ? '✓ ' : ''}Also save to My workouts</button>` : ''}
    <button class="btn pri block" style="margin-top:16px" data-act="saveWorkout">Save workout</button>
    <button class="btn ghost danger block" style="margin-top:8px" data-act="discardWorkout">Discard</button>`);
}
function saveWorkout() {
  const d = activeDay(), A = S.active;
  const notes = $('#wNotes') ? $('#wNotes').value : '';
  const ex = [];
  d.blocks.forEach(b => b.items.forEach(it => { const L = A.logs[it.id]; if (L) ex.push({ id: it.ex, sets: L.map(s => ({ w: s.w, r: s.r, done: s.done })) }); }));
  const h = { id: uid(), date: new Date().toISOString(), kind: 'workout', cat: catOf(d), title: d.name, week: A.week, day: A.day, dur: Math.round((now() - A.start) / 1000), rpe: A.rpe || null, notes, ex };
  S.history.push(h);
  if (A.ref[0] === 'p' && S.plan) S.plan.done['w' + A.week + 'd' + A.day] = h.id;
  if (A.keep) S.saved.unshift(Object.assign(clone(d), { id: uid() }));
  if (A.src === 'q' && S.quick && A.ref === 'a') { /* keep the edited version as the last generated */ S.quick = Object.assign(clone(d), { id: S.quick.id, q: S.quick.q }); }
  S.active = null; stopRest(); HOLD = null; save();
  closeSheet(); hideOverlay(); toast('Workout saved — nice work');
  go('#/' + (lastMain === 'workouts' ? 'workouts' : 'today'));
}

/* hold timer inside player */
let HOLD = null;
const holdLeft = () => HOLD ? (HOLD.end - now()) / 1000 : 0;
function startHold(key, si, n, side) {
  if (HOLD && HOLD.key === key && HOLD.si === si) { HOLD = null; renderPlayer(true); return; }
  stopRest();
  HOLD = { key, si, n, side, total: n * (side ? 2 : 1), end: now() + (n * (side ? 2 : 1) + 3) * 1000, half: false, lastSec: null, started: false };
  sfx.tick(); renderPlayer(true);
}

/* =========================================================
   Rest bar (global)
   ========================================================= */
let REST = null;
function startRest(secs, label) {
  if (!secs) return;
  REST = { end: now() + secs * 1000, total: secs, label: label || '', lastSec: null };
  renderRest();
}
function stopRest() { REST = null; $('#restbar').hidden = true; document.body.classList.remove('resting'); }
function renderRest() {
  const el = $('#restbar');
  if (!REST) { el.hidden = true; return; }
  const left = Math.max(0, (REST.end - now()) / 1000);
  el.hidden = false; document.body.classList.add('resting');
  el.innerHTML = `<div class="grow"><div class="lb">Rest${REST.label ? ' · next <b>' + esc(REST.label) + '</b>' : ''}</div><div class="tm" id="restTm">${fmt(Math.ceil(left))}</div></div>
    <button class="btn" data-act="restAdd">+15s</button><button class="btn" data-act="restSkip">Skip</button>
    <div class="bar"><i id="restBarI" style="width:${(left / REST.total) * 100}%"></i></div>`;
}

/* =========================================================
   Interval / flow runner (overlay)
   ========================================================= */
let RUN = null;
function makeRun(phases, opts = {}) {
  RUN = { phases, i: 0, end: 0, left: phases[0].secs, running: false, lastSec: null, title: opts.title || 'Timer', mode: opts.mode || 'ring', onDone: opts.onDone, finished: false, startTs: now() };
}
function runStart() { RUN.running = true; RUN.end = now() + RUN.left * 1000; }
function runPause() { RUN.left = Math.max(0, (RUN.end - now()) / 1000); RUN.running = false; }
function runGo(i) {
  const was = RUN.running;
  RUN.i = clamp(i, 0, RUN.phases.length - 1); RUN.left = RUN.phases[RUN.i].secs; RUN.lastSec = null;
  if (was) runStart();
  renderRun();
}
function intervalPhases(work, rest, rounds, names) {
  const ph_ = [{ kind: 'prep', label: 'Get ready', secs: 10, ex: names && names[0] }];
  for (let r = 0; r < rounds; r++) {
    const ex = names && names.length ? names[r % names.length] : null;
    ph_.push({ kind: 'work', label: work >= 60 && rest === 0 ? 'Minute ' + (r + 1) : 'Work', secs: work, round: r + 1, ex });
    if (rest > 0 && r < rounds - 1) ph_.push({ kind: 'rest', label: 'Rest', secs: rest, round: r + 1, ex: names && names.length ? names[(r + 1) % names.length] : null, isNext: true });
  }
  return ph_;
}
function openRun(phases, opts) { makeRun(phases, opts); showOverlay('run'); runStart(); sfx.tick(); renderRun(); }
function renderRun() {
  const o = $('#overlay'); if (!RUN) return;
  const p = RUN.phases[RUN.i];
  if (RUN.finished) {
    o.innerHTML = `<div class="ov-in"><div class="ov-top"><button class="icon-btn" data-act="runClose">${ICON.close}</button><div class="t"><b>${esc(RUN.title)}</b></div></div>
      <div style="text-align:center;padding-top:16vh"><div class="eyebrow" style="color:var(--acc)">Complete</div><div style="font-size:44px;font-weight:800;letter-spacing:-.03em;margin:8px 0">${fmtLong((now() - RUN.startTs) / 1000)}</div>
      <div class="muted">Good work. Breathe and recover.</div>
      <button class="btn pri" style="margin-top:28px;min-width:200px" data-act="runClose">${RUN.onDone ? 'Back to workout' : 'Done'}</button></div></div>`;
    return;
  }
  if (RUN.mode === 'flow') return renderFlow();
  const left = RUN.running ? Math.max(0, (RUN.end - now()) / 1000) : RUN.left;
  const C = 2 * Math.PI * 140, frac = p.secs ? left / p.secs : 0;
  const rounds = RUN.phases.filter(x => x.kind === 'work').length;
  const nextWork = RUN.phases.slice(RUN.i + 1).find(x => x.kind === 'work');
  const exName = p.ex ? BY[p.ex].name : '';
  o.innerHTML = `<div class="ov-in">
    <div class="ov-top"><button class="icon-btn" data-act="runClose" aria-label="Close">${ICON.close}</button><div class="t"><b>${esc(RUN.title)}</b><span>${rounds} rounds</span></div></div>
    <div class="ring-wrap ${p.kind}" id="ringWrap">
      <svg viewBox="0 0 300 300"><circle class="trk" cx="150" cy="150" r="140"/><circle class="val" id="ringVal" cx="150" cy="150" r="140" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - frac)}"/></svg>
      <div class="ring-c"><div class="ph-l">${esc(p.label)}</div><div class="big" id="ringNum">${fmt(Math.ceil(left))}</div><div class="rd">${p.round ? 'Round ' + p.round + ' / ' + rounds : '&nbsp;'}</div></div>
    </div>
    ${p.list ? `<div class="card" style="margin-top:6px"><div class="row"><div class="eyebrow grow">Each round</div><button class="btn sm" data-act="amrapRound">+1 round · <b class="num">${RUN.count || 0}</b></button></div><ul class="cues">${p.list.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>` : ''}
    ${p.ex ? `<div class="now-ex"><div class="eyebrow">${p.kind === 'work' ? 'Now' : 'Up next'}</div><div class="nm">${esc(exName)}</div>${p.sub ? `<div class="muted small">${esc(p.sub)}</div>` : ''}</div>
      <div style="max-width:300px;margin:10px auto 0">${ph(BY[p.ex], '', true)}</div>` : (nextWork && p.kind !== 'work' ? '' : '')}
    <div class="tctrl">
      <button class="side" data-act="runPrev" aria-label="Previous">${ICON.prev}</button>
      <button class="main" data-act="runToggle" aria-label="Play/pause">${RUN.running ? ICON.pause : ICON.play}</button>
      <button class="side" data-act="runNext" aria-label="Next">${ICON.next}</button>
    </div>
    ${p.ex && p.kind === 'work' && nextWork && nextWork.ex && nextWork.ex !== p.ex ? `<div class="muted small" style="text-align:center;margin-top:16px">Next: ${esc(BY[nextWork.ex].name)}</div>` : ''}
  </div>`;
}
function renderFlow() {
  const o = $('#overlay'), p = RUN.phases[RUN.i], ex = BY[p.ex];
  const left = RUN.running ? Math.max(0, (RUN.end - now()) / 1000) : RUN.left;
  const nxt = RUN.phases.slice(RUN.i + 1).find(x => x.kind !== 'prep' && x.ex !== p.ex);
  const isPrep = p.kind === 'prep';
  o.innerHTML = `<div class="ov-in">
    <div class="ov-top"><button class="icon-btn" data-act="runClose" aria-label="Close">${ICON.close}</button><div class="t"><b>${esc(RUN.title)}</b><span>${RUN.phases.filter(x => x.kind !== 'prep').indexOf(isPrep ? RUN.phases[RUN.i + 1] : p) + 1} / ${RUN.phases.filter(x => x.kind !== 'prep').length}</span></div></div>
    <div class="progress-dots">${RUN.phases.filter(x => x.kind !== 'prep').map((x) => { const idx = RUN.phases.indexOf(x); return `<i class="${idx < RUN.i ? 'on' : idx === RUN.i || (isPrep && idx === RUN.i + 1) ? 'cur' : ''}"></i>`; }).join('')}</div>
    ${ph(ex, 'flow-ph', true)}
    <div class="eyebrow" style="margin-top:14px;color:${isPrep ? 'var(--info)' : 'var(--acc)'}">${isPrep ? 'Get ready' : esc(p.label || 'Now')}</div>
    <div class="flow-name" style="margin-top:4px">${esc(ex.name)}</div>
    ${p.sub || p.round ? `<div class="muted small">${esc([p.round ? `Round ${p.round} / ${p.rounds}` : '', p.sub].filter(Boolean).join(' · '))}</div>` : ''}
    ${p.note ? `<div class="inote" style="margin-top:8px">${esc(p.note)}</div>` : ''}
    <div class="flow-time"><div class="big" id="ringNum">${fmt(Math.ceil(left))}</div><div class="bar"><i id="flowBar" style="width:${p.secs ? (1 - left / p.secs) * 100 : 0}%;${isPrep ? 'background:var(--info)' : ''}"></i></div></div>
    <ul class="cues">${ex.cues.map(c => `<li>${esc(c)}</li>`).join('')}</ul>
    <div style="text-align:center;margin-top:6px"><a class="ytlink" href="${ytUrl(ex.name)}" target="_blank" rel="noopener">${ICON.yt} Watch demos</a></div>
    <div class="tctrl" style="margin-top:14px">
      <button class="side" data-act="runPrev" aria-label="Previous">${ICON.prev}</button>
      <button class="main" data-act="runToggle" aria-label="Play/pause">${RUN.running ? ICON.pause : ICON.play}</button>
      <button class="side" data-act="runNext" aria-label="Next">${ICON.next}</button>
    </div>
    ${nxt ? `<div class="muted small" style="text-align:center;margin-top:14px">Next: ${esc(BY[nxt.ex].name)}</div>` : ''}
  </div>`;
}
function openFlow(title, entries, rounds = 1, onDone, minSecs = 0) {
  let steps = [];
  for (let r = 0; r < rounds; r++) steps = steps.concat(flowSteps(entries, minSecs).map(st => Object.assign(st, { round: rounds > 1 ? r + 1 : 0, rounds })));
  const phases = [];
  steps.forEach((s, i) => {
    if (!s.sw) phases.push({ kind: 'prep', secs: i === 0 ? 8 : 5, ex: s.ex });
    phases.push({ kind: 'work', secs: s.secs, ex: s.ex, label: s.label, sub: s.sub, sw: s.sw, note: s.note, round: s.round, rounds: s.rounds });
  });
  makeRun(phases, { title, mode: 'flow', onDone });
  RUN.flowIds = [...new Set(entries.map(e => e.ex))];
  showOverlay('run'); runStart(); sfx.tick(); renderRun();
}
function runAdvance() {
  if (RUN.i >= RUN.phases.length - 1) {
    RUN.finished = true; RUN.running = false; sfx.done();
    if (RUN.mode === 'flow' && !RUN.onDone) logMobility(RUN.title, RUN.flowIds, (now() - RUN.startTs) / 1000);
    renderRun(); return;
  }
  RUN.i++; RUN.left = RUN.phases[RUN.i].secs; RUN.lastSec = null; runStart();
  const p = RUN.phases[RUN.i];
  if (p.kind === 'work') (p.sw ? sfx.switch : sfx.go)(); else sfx.rest();
  renderRun();
}
function logMobility(title, ids, dur) {
  if (dur < 60) return;
  S.history.push({ id: uid(), date: new Date().toISOString(), kind: 'mobility', cat: 'mobility', title, dur: Math.round(dur), ex: (ids || []).map(id => ({ id, sets: [{ done: true }] })) });
  save();
}

/* =========================================================
   Ticker
   ========================================================= */
function tick() {
  const t = now();
  // rest bar
  if (REST) {
    const left = (REST.end - t) / 1000, sec = Math.ceil(left);
    if (left <= 0) { sfx.go(); toast('Rest over — next set'); stopRest(); }
    else {
      if (sec !== REST.lastSec) { if (sec <= 3 && REST.lastSec !== null) sfx.tick(); REST.lastSec = sec; const tm = $('#restTm'); if (tm) tm.textContent = fmt(sec); }
      const bi = $('#restBarI'); if (bi) bi.style.width = (left / REST.total) * 100 + '%';
    }
  }
  // hold timer (3s lead-in, then the hold)
  if (HOLD && OV === 'player') {
    const left = holdLeft(), sec = Math.ceil(left);
    if (!HOLD.started && left <= HOLD.total) { HOLD.started = true; sfx.go(); }
    if (HOLD.side && !HOLD.half && left <= HOLD.n) { HOLD.half = true; sfx.switch(); toast('Switch sides'); }
    if (left <= 0) {
      const L = S.active && S.active.logs[HOLD.key]; if (L && L[HOLD.si]) L[HOLD.si].done = true;
      sfx.done(); HOLD = null; save(); renderPlayer(true);
    } else if (sec !== HOLD.lastSec) {
      if (sec <= 3 && HOLD.started && HOLD.lastSec !== null) sfx.tick();
      HOLD.lastSec = sec;
      const el = document.getElementById('hold-' + HOLD.key + '-' + HOLD.si);
      if (el) el.textContent = HOLD.started ? fmt(sec) : 'Ready… ' + Math.ceil(left - HOLD.total);
    }
  }
  // runner
  if (RUN && RUN.running && OV === 'run') {
    const p = RUN.phases[RUN.i], left = (RUN.end - t) / 1000, sec = Math.ceil(left);
    if (left <= 0) runAdvance();
    else {
      if (sec !== RUN.lastSec) { if (sec <= 3 && RUN.lastSec !== null && p.secs > 4) sfx.tick(); RUN.lastSec = sec; const n = $('#ringNum'); if (n) n.textContent = fmt(sec); }
      const v = $('#ringVal'); if (v) { const C = 2 * Math.PI * 140; v.setAttribute('stroke-dashoffset', C * (1 - left / p.secs)); }
      const fb = $('#flowBar'); if (fb) fb.style.width = (1 - left / p.secs) * 100 + '%';
    }
  }
  // elapsed + stopwatch
  if (OV === 'player' && S.active) { const e = $('#elapsed'); if (e) e.textContent = fmtLong((t - S.active.start) / 1000); }
  if (!OV && current === 'plan' && S.active) { const e = $('#activeEl'); if (e) e.textContent = fmtLong((t - S.active.start) / 1000); }
  if (!OV && current === 'timer' && SW.running) { const e = $('#swEl'); if (e) e.textContent = fmtSw(swTime()); }
}
setInterval(tick, 100);

