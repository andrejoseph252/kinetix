/* Kinetix — tap actions and event wiring. */
'use strict';
/* =========================================================
   Actions
   ========================================================= */
const ACT = {
  closeSheet: () => dismissSheet(),
  confirmOk: () => { const f = confirmFn; confirmFn = null; closeSheet(); f && f(); },
  ex: el => openEx(el.dataset.id),
  flip: el => el.classList.toggle('show2'),

  // plan
  week: el => { const d = +el.dataset.d; S.plan.week = clamp(S.plan.week + d, 1, BLOCK_WEEKS); save(); rerender(); },
  newBlock: () => confirmSheet('New 6-week block', 'Generate fresh exercises with your current settings and start back at week 1? History is kept.', 'Start new block', () => { S.plan = generatePlan(S.settings); save(); rerender(); toast('New block ready'); }),
  resume: () => { showOverlay('player'); renderPlayer(); },
  shuffleDay: el => {
    const i = +el.dataset.i;
    if (!S.plan.days[i].key) { toast('This is your own day — edit it with the pencil'); return; }
    confirmSheet('Shuffle this day?', 'Pick new exercises for every slot on this day (same structure). Your edits to this day are replaced.', 'Shuffle', () => {
      const used = new Set(S.plan.days.flatMap((d, j) => j === i ? [] : d.blocks.flatMap(b => (b.items || []).map(x => x.ex))));
      const ctx = ctxFor(planSettings(), (Math.random() * 2 ** 31) | 0, used);
      const nm = S.plan.days[i].name;
      S.plan.days[i] = genDay(S.plan.days[i].key, ctx);
      S.plan.days[i].name = nm;
      if (S.active && S.active.ref === 'p' + i) S.active.logs = {};
      save(); rerender();
    });
  },

  // plan editor
  pdMove: el => {
    const i = +el.dataset.i, j = i + +el.dataset.d, D = S.plan.days; if (j < 0 || j >= D.length) return;
    [D[i], D[j]] = [D[j], D[i]]; remapDone(k => k === i ? j : k === j ? i : k);
    if (S.active && S.active.ref[0] === 'p') { const a = +S.active.ref.slice(1); if (a === i || a === j) { S.active.ref = 'p' + (a === i ? j : i); S.active.src = S.active.ref; S.active.day = +S.active.ref.slice(1); } }
    save(); rerender();
  },
  pdDup: el => { const i = +el.dataset.i, c = clone(S.plan.days[i]); c.id = uid(); c.name += ' (copy)'; c.blocks.forEach(b => { b.id = uid(); b.items.forEach(it => it.id = uid()); }); S.plan.days.splice(i + 1, 0, c); remapDone(k => k > i ? k + 1 : k); save(); rerender(); },
  pdDel: el => {
    const i = +el.dataset.i;
    if (S.plan.days.length <= 1) { toast('A plan needs at least one day'); return; }
    if (S.active && S.active.ref === 'p' + i) { toast('Finish or discard the workout in progress first'); return; }
    confirmSheet('Delete this day?', `Remove "${S.plan.days[i].name}" from your plan? Your history is kept.`, 'Delete', () => {
      S.plan.days.splice(i, 1); remapDone(k => k === i ? -1 : k > i ? k - 1 : k);
      if (S.active && S.active.ref[0] === 'p') { const a = +S.active.ref.slice(1); if (a > i) { S.active.ref = 'p' + (a - 1); S.active.src = S.active.ref; S.active.day = a - 1; } }
      save(); rerender();
    }, true);
  },
  pdReplace: el => dayPicker('replace', +el.dataset.i),
  pdAdd: () => dayPicker('add', S.plan.days.length),
  pdPick: el => {
    const { mode, src } = el.dataset, i = +el.dataset.i, P = S.plan;
    if (mode === 'replace' && S.active && S.active.ref === 'p' + i) { toast('Finish or discard the workout in progress first'); return; }
    let day;
    if (src === 'blank') day = blankDay(i);
    else if (src[0] === 't') { day = clone(S.saved.find(t => t.id === src.slice(1))); day.id = uid(); }
    else if (src[0] === 'r') day = generateQuick({ focus: src.slice(1), mins: S.settings.length, energy: 'normal', eq: S.settings.eq.slice() });
    else if (src[0] === 'g') { const used = new Set(P.days.flatMap(d => d.blocks.flatMap(b => b.items.map(x => x.ex)))); day = genDay(src.slice(1), ctxFor(planSettings(), (Math.random() * 2 ** 31) | 0, used)); }
    if (!day) return;
    delete day.q; // plan days aren't one-offs
    if (mode === 'add') P.days.push(day);
    else { P.days[i] = day; remapDone(k => k === i ? -1 : k); }
    save(); onSheetClose = null; closeSheet(); rerender(); toast(mode === 'add' ? 'Day added' : 'Day replaced');
  },

  // navigation & quick picks
  wf: el => { S.ui.wf = el.dataset.k; save(); rerender(); },
  goQuick: () => { go('#/quick'); },
  tIntent: el => { S.ui.tIntent = el.dataset.k; S.ui.tMore = false; save(); rerender(); },
  tMore: () => { S.ui.tMore = true; rerender(); },
  tMins: el => { S.ui.quick.mins = +el.dataset.m; save(); rerender(); },
  qpick: el => {
    const k = el.dataset.k, q = S.ui.quick, eq = (q.eq || S.settings.eq).slice();
    if (RECIPES[k].needs && !eq.includes(RECIPES[k].needs)) { toast(`Needs a ${EQ_LABEL[RECIPES[k].needs].toLowerCase()}`); return; }
    S.quick = generateQuick({ focus: k, mins: +el.dataset.m, energy: q.energy, eq });
    EDITING = false; save(); go('#/s/q');
  },
  routineGo: el => { const r = ROUTINES.find(x => x.id === el.dataset.id); openFlow(r.name, routineEntries(r), 1, null, 0, { quiet: r.quiet, rid: r.id }); },
  flowCustom: () => {
    const p = pendingFlow;
    const t = normSess({ id: uid(), cat: 'mobility', name: p.title, focus: 'Mobility routine', blocks: [{ title: 'Flow', kind: 'flow', fmt: 'flow', rounds: 1, items: p.entries.map(e => ({ id: uid(), ex: e.ex, sets: 1, n: e.r.n, unit: e.r.unit, side: e.r.side })) }] });
    S.saved.unshift(t); save(); EDITING = true; onSheetClose = null; closeSheet(); go('#/s/t' + t.id); toast('Saved to My workouts — edit away');
  },

  // one-off sessions
  qfocus: el => { S.ui.quick.focus = el.dataset.k; save(); go('#/quick'); },
  qset: el => { const k = el.dataset.k; S.ui.quick[k] = k === 'mins' ? +el.dataset.v : el.dataset.v; save(); rerender(); },
  qeq: el => { const q = S.ui.quick, k = el.dataset.k; q.eq = q.eq.includes(k) ? q.eq.filter(x => x !== k) : [...q.eq, k]; save(); rerender(); },
  qgen: () => {
    const q = S.ui.quick, R = RECIPES[q.focus];
    if (R.needs && !q.eq.includes(R.needs)) { toast(`Add ${EQ_LABEL[R.needs]} to today's equipment`); return; }
    S.quick = generateQuick({ focus: q.focus, mins: q.mins, energy: q.energy, eq: q.eq.slice() });
    EDITING = false; save(); go('#/s/q');
  },
  qregen: () => confirmSheet('Regenerate?', 'Build a fresh session with the same focus, time and equipment. Your edits are replaced.', 'Regenerate', () => { S.quick = generateQuick(S.quick.q); save(); rerender(); }),
  reroll: el => { const { sess, b } = locate(el); rerollBlock(sess, b); save(); rerender(); },
  toggleEdit: () => { EDITING = !EDITING; rerender(); },
  endEdit: () => { EDITING = false; },
  newTpl: () => {
    const t = normSess({ id: uid(), name: 'New workout', focus: '', blocks: [{ title: 'Warm-up', fmt: 'flow', rounds: 1, items: [] }, { title: 'Main', key: 'A', fmt: 'sets', rest: 90, restItem: 30, items: [] }] });
    S.saved.unshift(t); save(); EDITING = true; go('#/s/t' + t.id);
  },
  saveTpl: el => { const c = saveAsTemplate(el.dataset.r); toast('Saved to My workouts'); go('#/s/t' + c.id); },
  dupTpl: el => { const c = clone(getSess(el.dataset.r)); c.id = uid(); c.name += ' (copy)'; S.saved.unshift(c); save(); go('#/s/t' + c.id); },
  delTpl: el => confirmSheet('Delete this workout?', 'It will be removed from My workouts. Your history is kept.', 'Delete', () => { const id = el.dataset.r.slice(1); S.saved = S.saved.filter(t => t.id !== id); save(); go('#/workouts'); }, true),
  startSess: el => startSess(el.dataset.r),
  addBlock: el => {
    const ref = el.dataset.r;
    openSheet(`<h3>Add block</h3><div class="muted small">Choose how this part of the workout runs. You can change it later.</div>
      <div class="opt-grid" style="margin-top:12px">${Object.entries(FMT).map(([k, [l, d]]) => `<button class="opt" data-act="newBlockFmt" data-r="${ref}" data-v="${k}"><b>${l}</b><span>${d}</span></button>`).join('')}</div>`);
  },
  newBlockFmt: el => {
    const ref = el.dataset.r, sess = getSess(ref), F = el.dataset.v;
    const b = normBlock({ title: FMT[F][0], fmt: F, items: [] });
    if (F === 'note') b.text = '';
    FMT_DEFAULTS[F](b);
    sess.blocks.push(b); save();
    if (F === 'note') openBlock(ref, b.id); else openPicker(ref, b.id);
  },
  item: el => openItem(el.dataset.r, el.dataset.b, el.dataset.i),
  blk: el => openBlock(el.dataset.r, el.dataset.b),
  pick: el => openPicker(el.dataset.r, el.dataset.b),
  ied: el => { const { it, w } = edCtx(), r = rx(it, w), k = el.dataset.k, d = +el.dataset.d; itemSet(k, clamp((k === 'hold' ? (r.hold || 0) : r[k]) + d, k === 'hold' ? 0 : 1, k === 'n' && r.unit !== 'reps' ? 3600 : 99)); },
  iunit: el => itemSet('unit', el.dataset.v),
  iside: () => itemSet('side'),
  ireset: () => { const { it } = edCtx(); RX_KEYS.forEach(k => delete it[k]); save(); renderItemSheet(); },
  imove: el => { const { b, it } = edCtx(), i = b.items.indexOf(it), j = i + +el.dataset.d; if (j < 0 || j >= b.items.length) return; b.items.splice(i, 1); b.items.splice(j, 0, it); save(); renderItemSheet(); },
  idel: () => { const { b, it } = edCtx(); b.items.splice(b.items.indexOf(it), 1); if (S.active && ED.ref === S.active.ref) delete S.active.logs[it.id]; save(); closeSheet(); toast('Removed'); },
  iswap: () => openSwap(ED.ref, ED.bid, ED.iid),
  doSwap: el => { doSwap(el.dataset.id); closeSheet(); },
  swapAny: () => { PK = { ref: ED.ref, bid: ED.bid, swap: ED.iid, q: '', f: 'all', mine: true }; renderPicker(); },
  bed: el => {
    const { b, w } = edCtx(), k = el.dataset.k, d = +el.dataset.d, eff = blockRest(b, w);
    const cur = k === 'rest' ? eff.rest : k === 'restItem' ? eff.short : (b[k] || 0);
    const min = { rounds: 1, mins: k === 'mins' && b.fmt === 'note' ? 0 : 1, work: 5, off: 0, rest: 0, restItem: 0 }[k];
    if (k === 'rest' && b.restItem == null) b.restItem = eff.short;
    b[k] = clamp(cur + d, min, 3600);
    if (k === 'rounds' && b.fmt === 'circuit' && S.active && ED.ref === S.active.ref) b.items.forEach(it => trimLogs(it, b.rounds));
    save(); renderBlockSheet();
  },
  bfmt: el => { const { b } = edCtx(), F = el.dataset.v; if (b.fmt === F) return; b.fmt = F; FMT_DEFAULTS[F](b); if (F === 'note' && b.text == null) b.text = ''; save(); renderBlockSheet(); },
  bmove: el => { const { sess, b } = edCtx(), i = sess.blocks.indexOf(b), j = i + +el.dataset.d; if (j < 0 || j >= sess.blocks.length) return; sess.blocks.splice(i, 1); sess.blocks.splice(j, 0, b); if (S.active && ED.ref === S.active.ref && S.active.bi === i) S.active.bi = j; save(); renderBlockSheet(); },
  bdel: () => {
    const { sess, b } = edCtx();
    if (sess.blocks.length === 1) { toast('A workout needs at least one block'); return; }
    const ref = ED.ref;
    confirmSheet('Delete block?', `Remove "${b.title}" and its ${b.items.length} exercises from this workout?`, 'Delete', () => { sess.blocks.splice(sess.blocks.indexOf(b), 1); save(); if (S.active && ref === S.active.ref) S.active.bi = Math.min(S.active.bi, sess.blocks.length - 1); onSheetClose = null; refresh(); }, true);
  },
  breroll: () => { const { sess, b } = edCtx(); rerollBlock(sess, b); ED.bid = b.id; save(); renderBlockSheet(); },
  pkf: el => { PK.f = el.dataset.k; document.querySelectorAll('[data-act=pkf]').forEach(c => c.classList.toggle('on', c === el)); renderPickList(); },
  pkmine: el => { PK.mine = !PK.mine; el.classList.toggle('on', PK.mine); renderPickList(); },
  padd: el => {
    const id = el.dataset.id;
    if (PK.swap) { ED = { ref: PK.ref, bid: PK.bid, iid: PK.swap }; doSwap(id); PK = null; closeSheet(); return; }
    addItem(id);
    const btn = el.tagName === 'BUTTON' ? el : el.parentNode.querySelector('button.btn');
    if (btn) { btn.textContent = '✓ Added'; btn.classList.add('pri'); }
  },
  pcustom: () => {
    const id = newCustomEx(PK.q.trim());
    if (PK.swap) { ED = { ref: PK.ref, bid: PK.bid, iid: PK.swap }; doSwap(id); PK = null; closeSheet(); return; }
    addItem(id); PK.q = ''; renderPicker();
  },
  keepTpl: el => { S.active.keep = !S.active.keep; S.active.notes = $('#wNotes') ? $('#wNotes').value : S.active.notes; save(); el.classList.toggle('on', S.active.keep); el.textContent = (S.active.keep ? '✓ ' : '') + 'Also save to My workouts'; },

  // setup
  set: el => { const k = el.dataset.k, v = el.dataset.v; draft[k] = ['days', 'length'].includes(k) ? +v : v; VIEWS.setup(); },
  eqPreset: el => { const v = el.dataset.v; draft.eq = v === 'gym' ? EQ.map(e => e[0]) : v === 'home' ? ['kb', 'band'] : []; if (v === 'gym' && draft.program === 'athletic' && draft.style === 'mixed') draft.style = 'gym'; VIEWS.setup(); },
  qeqPreset: el => { const v = el.dataset.v; S.ui.quick.eq = v === 'gym' ? EQ.map(e => e[0]) : v === 'mine' ? S.settings.eq.slice() : []; save(); rerender(); },
  eq: el => { const k = el.dataset.k; draft.eq = draft.eq.includes(k) ? draft.eq.filter(x => x !== k) : [...draft.eq, k]; VIEWS.setup(); },
  tog: el => { const k = el.dataset.k; draft[k] = !draft[k]; VIEWS.setup(); },
  cancelSetup: () => { draft = null; },
  genPlan: () => {
    const doGen = () => { S.settings = draft; draft = null; S.plan = generatePlan(S.settings); S.active = null; save(); go('#/workouts'); toast('Plan ready — week 1'); };
    if (S.plan) confirmSheet('Generate a new plan?', 'This replaces your current plan and starts again at week 1. Your history is kept.', 'Generate', doGen); else doGen();
  },
  saveSettings: () => { S.settings = draft; draft = null; save(); go('#/' + lastMain); toast('Settings saved'); },
  export: () => {
    const blob = new Blob([JSON.stringify(S, null, 1)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'kinetix-backup-' + new Date().toISOString().slice(0, 10) + '.json';
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  },
  reset: () => confirmSheet('Reset everything?', 'Deletes your plan, settings and all history from this device.', 'Delete all', () => { localStorage.removeItem(KEY); go('#/today'); location.reload(); }, true),
  cacheImgs: async el => {
    if (!('caches' in window)) { toast('Offline storage not supported here'); return; }
    el.disabled = true; el.textContent = 'Saving photos…';
    try {
      const c = await caches.open('kx-img-v1');
      const urls = EX.flatMap(e => e.img);
      let n = 0;
      for (let i = 0; i < urls.length; i += 12) {
        await Promise.all(urls.slice(i, i + 12).map(u => c.match(u).then(h => h || c.add(u)).catch(() => {})));
        n = Math.min(urls.length, i + 12); el.textContent = `Saving photos… ${Math.round(n / urls.length * 100)}%`;
      }
      el.textContent = 'All photos saved offline ✓';
    } catch (e) { el.textContent = 'Could not save photos'; }
    el.disabled = false;
  },

  // mobility
  mob: el => { const k = el.dataset.k; S.ui.mob[k] = k === 'mins' ? +el.dataset.v : el.dataset.v; save(); rerender(); },
  mobFocus: el => { const f = S.ui.mob.focus, k = el.dataset.k; S.ui.mob.focus = f.includes(k) ? f.filter(x => x !== k) : [...f, k]; save(); rerender(); },
  routine: el => {
    const id = el.dataset.id;
    if (id === 'custom') {
      const m = S.ui.mob; if (!m.focus.length) { toast('Pick at least one focus area'); return; }
      const R = customRoutine(m);
      showFlowPreview(R.name, buildRoutine(R, (Math.random() * 2 ** 31) | 0), R);
    } else {
      const r = ROUTINES.find(x => x.id === id);
      showFlowPreview(r.name, routineEntries(r), r);
    }
  },
  reflow: () => { const p = pendingFlow; showFlowPreview(p.title, buildRoutine(p.recipe, (Math.random() * 2 ** 31) | 0), p.recipe); },
  startFlow: () => { const p = pendingFlow; closeSheet(); openFlow(p.title, p.entries, 1, null, 0, { quiet: p.recipe && p.recipe.quiet, rid: p.recipe && p.recipe.id }); },

  // timer tab
  ttab: el => { S.ui.timerTab = el.dataset.k; save(); rerender(); },
  iv: el => { const k = el.dataset.k, d = +el.dataset.d, iv = S.ui.iv; iv[k] = clamp(iv[k] + d, k === 'rest' ? 0 : k === 'rounds' ? 1 : 5, k === 'rounds' ? 99 : 3600); save(); rerender(); },
  ivPreset: el => { const p = IV_PRESETS[+el.dataset.i]; S.ui.iv = { work: p.work, rest: p.rest, rounds: p.rounds }; save(); openRun(intervalPhases(p.work, p.rest, p.rounds), { title: p.n }); },
  ivStart: () => { const iv = S.ui.iv; openRun(intervalPhases(iv.work, iv.rest, iv.rounds), { title: `${iv.work}s / ${iv.rest}s × ${iv.rounds}` }); },
  rest: el => { startRest(+el.dataset.s); sfx.tick(); },
  sw: el => {
    const k = el.dataset.k;
    if (k === 'toggle') { if (SW.running) { SW.acc += now() - SW.start; SW.running = false; } else { SW.start = now(); SW.running = true; } }
    if (k === 'lap' && (SW.running || SW.acc)) SW.laps.unshift(swTime());
    if (k === 'reset') { SW.acc = 0; SW.running = false; SW.laps = []; }
    rerender();
  },
  openTimerTab: () => { S.ui.timerTab = 'sw'; save(); ACT.minimize(); go('#/timer'); },

  // library
  lib: el => { S.ui.lib = el.dataset.k; save(); document.querySelectorAll('[data-act=lib]').forEach(c => c.classList.toggle('on', c === el)); renderLibGrid(); },
  libMine: el => { S.ui.libMine = !S.ui.libMine; save(); el.classList.toggle('on', S.ui.libMine); renderLibGrid(); },

  // log
  hist: el => openHist(el.dataset.id),
  delHist: el => confirmSheet('Delete this entry?', 'This can\'t be undone.', 'Delete', () => {
    const id = el.dataset.id; S.history = S.history.filter(h => h.id !== id);
    if (S.plan) for (const k in S.plan.done) if (S.plan.done[k] === id) delete S.plan.done[k];
    save(); rerender();
  }, true),

  // player
  minimize: () => { HOLD = null; hideOverlay(); },
  pnav: el => { const d = activeDay(); S.active.bi = clamp(S.active.bi + +el.dataset.d, 0, d.blocks.length - 1); HOLD = null; save(); renderPlayer(); },
  tick: el => {
    const d = activeDay(), b = findB(d, el.dataset.b); if (!b) return;
    const ii = b.items.findIndex(x => x.id === el.dataset.i), it = b.items[ii], L = S.active.logs[it.id]; if (!L) return;
    const si = +el.dataset.s, s = L[si]; s.done = !s.done;
    if (s.done) {
      if (b.fmt === 'sets' || b.fmt === 'circuit') {
        const r = rx(it, S.active.week);
        if (!s.r && r.unit === 'reps') s.r = String(r.n);
        if (!s.w && loadEx(BY[it.ex])) { const last = lastFor(it.ex); if (last && last.w) s.w = last.w; }
        const restS = +el.dataset.rest || 0, word = b.fmt === 'circuit' ? 'Round ' : 'Set ';
        const nextLbl = ii < b.items.length - 1 ? BY[b.items[ii + 1].ex].name : (si < L.length - 1 ? word + (si + 2) : '');
        if (restS) startRest(restS, nextLbl);
      }
      buzz(30);
    }
    if (HOLD && HOLD.key === it.id && HOLD.si === si) HOLD = null;
    save(); renderPlayer(true);
  },
  addSet: el => { const L = S.active.logs[el.dataset.key]; if (L) L.push({ w: L.length ? L[L.length - 1].w : '', r: '', done: false }); save(); renderPlayer(true); },
  hold: el => startHold(el.dataset.key, +el.dataset.s, +el.dataset.n, el.dataset.side === '1'),
  blockFlow: () => {
    const d = activeDay(), b = d.blocks[S.active.bi], w = S.active.week;
    openFlow(b.title, b.items.map(it => ({ ex: it.ex, r: rx(it, w) })), b.rounds || 1, () => {
      b.items.forEach(it => { const L = S.active.logs[it.id]; if (L) L.forEach(s => s.done = true); });
      save();
    }, b.long ? 60 : 0);
  },
  condStart: () => {
    const d = activeDay(), b = d.blocks[S.active.bi], w = S.active.week;
    const names = b.items.map(i => i.ex), onDone = () => { S.active.cond[b.id] = true; save(); };
    let phases;
    if (b.fmt === 'amrap') phases = [{ kind: 'prep', label: 'Get ready', secs: 10 }, { kind: 'work', label: 'AMRAP', secs: b.mins * 60, list: b.items.map(it => BY[it.ex].name + ' — ' + clockItemTxt(it, b, w)) }];
    else if (b.fmt === 'emom') phases = intervalPhases(60, 0, b.rounds, names);
    else phases = intervalPhases(b.work, b.off, b.rounds, names);
    phases.forEach(p => { if (p.ex) { const it = b.items.find(x => x.ex === p.ex); if (it) p.sub = clockItemTxt(it, b, w); } });
    openRun(phases, { title: b.title, onDone });
  },
  condDone: () => { const b = activeDay().blocks[S.active.bi]; S.active.cond[b.id] = !S.active.cond[b.id]; save(); renderPlayer(true); },
  finish: () => finishSheet(),
  rpe: el => { S.active.rpe = +el.dataset.v; S.active.notes = $('#wNotes') ? $('#wNotes').value : S.active.notes; save(); document.querySelectorAll('#rpeSeg button').forEach(b => b.classList.toggle('on', b === el)); },
  saveWorkout: () => saveWorkout(),
  discardWorkout: () => confirmSheet('Discard workout?', 'Nothing from this session will be saved.', 'Discard', () => { S.active = null; HOLD = null; stopRest(); save(); hideOverlay(); }, true),

  // rest bar
  restAdd: () => { if (REST) { REST.end += 15000; REST.total += 15; renderRest(); } },
  restSkip: () => stopRest(),

  // runner
  amrapRound: () => { RUN.count = (RUN.count || 0) + 1; buzz(30); renderRun(); },
  runToggle: () => { if (RUN.running) runPause(); else runStart(); renderRun(); },
  runNext: () => { if (RUN.i >= RUN.phases.length - 1) { RUN.finished = true; RUN.running = false; renderRun(); return; } runGo(RUN.i + 1); },
  runPrev: () => { const el = RUN.running ? (now() - (RUN.end - RUN.phases[RUN.i].secs * 1000)) / 1000 : RUN.phases[RUN.i].secs - RUN.left; runGo(el > 3 ? RUN.i : RUN.i - 1); },
  runClose: () => {
    const r = RUN; RUN = null;
    if (r && r.finished && r.onDone) r.onDone();
    if (r && r.onDone && S.active) { showOverlay('player'); renderPlayer(); }
    else hideOverlay();
  },
};

