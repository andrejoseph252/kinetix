/* Kinetix — UI helpers and screens. */
'use strict';
/* =========================================================
   UI helpers
   ========================================================= */
// which category colour an exercise's tile takes
function exCat(ex) {
  const t = ex.tags || [];
  if (t.includes('breath') || t.includes('stretch') || t.includes('smr')) return 'recovery';
  if (t.includes('power')) return 'athletic';
  if (t.includes('cond')) return 'engine';
  if (t.includes('cars') || t.includes('lmob') || t.includes('mobility') || t.includes('control') || (t.includes('prep') && !t.some(x => ['squat', 'hinge', 'hpush', 'hpull', 'vpush', 'vpull'].includes(x)))) return 'mobility';
  if (ex.eq && ex.eq.length === 1 && ex.eq[0] === 'kb') return 'kb';
  return 'strength';
}
function ph(ex, cls = '', anim = false, badge = '') {
  if (!ex) return '';
  const st = `style="--c:${cvar(exCat(ex))}"`;
  if (!ex.img.length) return `<div class="ph ${cls}" ${st}><div class="nophoto"><div>${ICON.fig}${anim ? `<a class="ytlink" href="${ytUrl(ex.name)}" target="_blank" rel="noopener">${ICON.yt} Watch demos</a>` : ''}</div></div>${badge}</div>`;
  return `<div class="ph ${cls} ${anim ? 'anim' : ''}" ${st} ${anim ? 'data-act="flip"' : ''}><img src="${ex.img[0]}" alt="" loading="lazy" decoding="async">${anim && ex.img[1] ? `<img class="f2" src="${ex.img[1]}" alt="" loading="lazy" decoding="async">` : ''}${badge}</div>`;
}
function tierDots(t) { return `<span class="tier" title="${TIER[t]}">${[1, 2, 3].map(i => `<i class="${i <= t ? 'on' : ''}"></i>`).join('')}</span>`; }
function setTop(html) { $('#topbar').innerHTML = html; }
let toastT;
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => t.hidden = true, 2200); }

function openSheet(html, keep) {
  const cur = $('#sheet-root .sheet');
  if (keep && cur) { const y = cur.scrollTop; cur.innerHTML = `<div class="grab"></div>${html}`; cur.scrollTop = y; return; }
  $('#sheet-root').innerHTML = `<div class="sheet-bg" data-act="closeSheet"></div><div class="sheet"><div class="grab"></div>${html}</div>`;
}
let onSheetClose = null;
function closeSheet() { $('#sheet-root').innerHTML = ''; const f = onSheetClose; onSheetClose = null; if (f) f(); }
function refresh() { if (OV === 'player') renderPlayer(true); else rerender(); }
let confirmFn = null;
function confirmSheet(title, msg, ok, fn, danger) {
  confirmFn = fn;
  openSheet(`<h3>${esc(title)}</h3><p class="muted">${esc(msg)}</p><div class="row" style="margin-top:18px"><button class="btn ghost grow" data-act="closeSheet">Cancel</button><button class="btn ${danger ? 'danger ghost' : 'pri'} grow" data-act="confirmOk">${esc(ok)}</button></div>`);
}

function lastFor(exId) {
  for (let i = S.history.length - 1; i >= 0; i--) {
    const h = S.history[i];
    const e = (h.ex || []).find(x => x.id === exId);
    if (!e) continue;
    const sets = e.sets.filter(s => s.done && (s.w || s.r));
    if (!sets.length) continue;
    const w = sets.map(s => s.w).filter(Boolean);
    const sameW = w.length && w.every(x => x === w[0]);
    const txt = sameW ? `${w[0]}${S.settings.units} × ${sets.map(s => s.r || '–').join(', ')}` : sets.map(s => (s.w ? s.w + S.settings.units + ' × ' : '') + (s.r || '–')).join(', ');
    return { txt, date: h.date, w: w[w.length - 1] || '' };
  }
  return null;
}
const dateTxt = iso => new Date(iso).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });

/* =========================================================
   Views
   ========================================================= */
const VIEWS = {};
let current = 'plan';
const MAIN_TABS = ['today', 'workouts', 'mobility', 'faith', 'progress'];
let lastMain = 'today';
function route() {
  const parts = (location.hash || '#/today').slice(2).split('/');
  let name = parts[0] || 'today';
  if (!VIEWS[name]) name = 'today';
  current = name;
  if (MAIN_TABS.includes(name)) lastMain = name;
  const holy = ['faith', 'faithsetup'].includes(name);
  if (holy && typeof liturgy === 'function') document.body.style.setProperty('--lc', liturgy().hex);
  const tab = MAIN_TABS.includes(name) ? name : ['s', 'quick', 'day', 'plan'].includes(name) ? (lastMain === 'today' || lastMain === 'mobility' ? lastMain : 'workouts') : lastMain;
  document.querySelectorAll('#tabbar a').forEach(a => a.classList.toggle('on', a.dataset.tab === tab));
  VIEWS[name](parts[1]);
  window.scrollTo(0, 0);
}
function rerender() { const y = window.scrollY; const parts = (location.hash || '#/today').slice(2).split('/'); (VIEWS[current] || VIEWS.today)(parts[1]); window.scrollTo(0, y); }

/* ---------- shared bits ---------- */
const PLAY = ICON.play.replace('<svg', '<svg style="fill:currentColor;stroke:none"');
const topIcons = () => `<a class="icon-btn" href="#/library" aria-label="Exercise library">${ICON.book}</a><a class="icon-btn" href="#/timer" aria-label="Timer">${ICON.stopwatch}</a><a class="icon-btn" href="#/setup" aria-label="Settings">${ICON.gear}</a>`;
const mondayOf = d => { const x = new Date(d); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; };
const histCat = h => {
  if (h.cat) return h.cat;
  if (h.kind === 'mobility') return 'mobility';
  const r = Object.values(RECIPES).find(x => x.name === h.title);
  return r ? r.cat : 'strength';
};
const isMob = c => c === 'mobility' || c === 'recovery';
function thumbsOf(sess, n = 6) { return sess.blocks.filter(b => b.fmt !== 'note').flatMap(b => b.items).filter(it => BY[it.ex]).slice(0, n); }
function sessCard(sess, href, eyebrow, done, extra = '', mins = null) {
  const c = catOf(sess);
  return `<a class="card daycard ${done ? 'done' : ''}" href="${href}" style="--c:${cvar(c)}">
    <div class="row" style="align-items:flex-start"><div class="grow"><div class="eyebrow">${eyebrow}</div><div class="title">${esc(sess.name)}</div>${sess.focus ? `<div class="muted small" style="margin-top:4px">${esc(sess.focus)}</div>` : ''}</div>${done ? '<span class="pill-done">Done</span>' : mins ? `<div class="bignum sm">${mins}<small>min</small></div>` : ''}</div>
    <div class="row" style="margin-top:14px;align-items:flex-end"><div class="strip grow" style="margin-top:0">${thumbsOf(sess).map(it => ph(BY[it.ex])).join('')}</div>${extra}</div>
  </a>`;
}
function activeCard() {
  const A = S.active, ad = A && activeDay();
  return ad ? `<div class="card" style="border-color:rgba(200,245,96,.4);margin-bottom:12px"><div class="row"><div class="grow"><div class="eyebrow" style="color:var(--acc)">In progress</div><b>${esc(ad.name)}</b> <span class="muted small" id="activeEl">${fmtLong((now() - A.start) / 1000)}</span></div><button class="btn pri sm" data-act="resume">Resume</button></div></div>` : '';
}
function weekStrip() {
  const mon = mondayOf(new Date()), todayK = new Date().toDateString(), nowT = new Date();
  const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(mon); d.setDate(d.getDate() + i); return d; });
  const by = {}; S.history.forEach(h => { const k = new Date(h.date).toDateString(); (by[k] = by[k] || []).push(histCat(h)); });
  const wk = S.history.filter(h => new Date(h.date) >= mon);
  const mobDays = new Set(wk.filter(h => isMob(histCat(h))).map(h => new Date(h.date).toDateString())).size;
  const train = wk.filter(h => !isMob(histCat(h))).length;
  return `<div class="card">
    <div class="row"><div class="eyebrow grow">This week</div><span class="small muted"><b style="color:var(--c-strength)">${train}</b> training · <b style="color:var(--c-mobility)">${mobDays}</b> mobility day${mobDays === 1 ? '' : 's'}</span></div>
    <div class="wkstrip">${days.map(d => { const k = d.toDateString(), cs = [...new Set(by[k] || [])]; return `<div class="${k === todayK ? 'today' : ''} ${d > nowT && k !== todayK ? 'future' : ''}"><span>${'MTWTFSS'[(d.getDay() + 6) % 7]}</span><b>${d.getDate()}</b><i>${cs.slice(0, 3).map(c => `<em style="background:${cvar(c)}"></em>`).join('')}${S.faith && faithDayCount(d) ? '<em style="background:var(--c-faith)"></em>' : ''}</i></div>`; }).join('')}</div></div>`;
}
const WHEN_CAT = { morning: 'athletic', anytime: 'mobility', evening: 'recovery', target: 'kb' };
function routineHero(r, label) {
  const ents = routineEntries(r), ids = ents.map(e => e.ex), night = ['evening', 'night'].includes(partOfDay());
  return `<div class="card hero" style="--c:${cvar(WHEN_CAT[r.when] || 'mobility')}">
    <div class="eyebrow cc">${night ? ICON.moon : ICON.sun} ${label}</div>
    <div class="row" style="align-items:flex-end;margin-top:10px;gap:14px"><div class="grow"><div class="title">${esc(r.name)}</div><div class="muted small" style="margin-top:6px">${esc(r.blurb)}</div></div><div class="bignum" style="color:var(--c)">${routineMins(ents)}<small>min</small></div></div>
    <div class="strip">${ids.slice(0, 6).map(id => ph(BY[id])).join('')}</div>
    <div class="row" style="margin-top:12px"><button class="btn cbtn grow" data-act="routineGo" data-id="${r.id}">${PLAY} Start</button><button class="btn ghost" data-act="routine" data-id="${r.id}">Preview</button></div>
  </div>`;
}
const QUICK_PICKS = [['control', 30], ['recovery', 20], ['strength', 45], ['engine', 20], ['push', 45], ['pull', 45], ['legs', 45], ['arms', 30], ['kettlebell', 30], ['athletic', 45]];
function quickPicks() {
  const eq = S.ui.quick.eq || S.settings.eq;
  return `<div class="picks">${QUICK_PICKS.filter(([k]) => !RECIPES[k].needs || eq.includes(RECIPES[k].needs)).map(([k, m]) => { const R = RECIPES[k]; return `<button class="pick" data-act="qpick" data-k="${k}" data-m="${m}" style="--c:${cvar(R.cat)}"><b><span class="cdot"></span>${R.name}</b><span>${m} min</span></button>`; }).join('')}
    <button class="pick" data-act="goQuick" style="--c:var(--c-custom)"><b><span class="cdot"></span>Custom</b><span>Your call</span></button></div>`;
}

/* ---------- Today ---------- */
// Options on Today, grouped by what you're in the mood for
const INTENTS = {
  train: { name: 'Train', blurb: 'Lift something', focuses: ['strength', 'push', 'pull', 'legs', 'upper', 'lower', 'arms', 'athletic', 'kettlebell'] },
  move:  { name: 'Move', blurb: 'Mobility & recovery', focuses: ['control', 'recovery'] },
  sweat: { name: 'Sweat', blurb: 'Conditioning', focuses: ['engine', 'athletic'] },
};
const dayKey = d => new Date(d).toDateString();
function daysSince(pred) {
  const t0 = new Date(); t0.setHours(0, 0, 0, 0);
  let best = Infinity;
  for (const h of S.history) if (pred(h)) { const d = new Date(h.date); d.setHours(0, 0, 0, 0); best = Math.min(best, Math.round((t0 - d) / 864e5)); }
  return best;
}
const isTraining = h => !isMob(histCat(h)) && h.kind !== 'mobility' && (h.dur || 0) >= 300;
// One recommendation, with the reason, from what you've actually done
function suggestion() {
  const train = daysSince(isTraining), mob = daysSince(h => isMob(histCat(h))), cond = daysSince(h => histCat(h) === 'engine');
  const lastHard = S.history.filter(isTraining).slice(-1)[0];
  const eq = S.ui.quick.eq || S.settings.eq;
  if (train === 0) return { focus: 'recovery', mins: 20, why: 'You trained today. A short recovery session helps you bounce back.' };
  if (train === 1 && lastHard && (lastHard.rpe || 0) >= 8) return { focus: 'recovery', mins: 30, why: 'Yesterday was a hard one. Keep today easy.' };
  if (mob >= 3 && mob !== Infinity) return { focus: 'control', mins: 30, why: `No mobility for ${mob} days. Time to open things up.` };
  if (train === 1) return { focus: 'control', mins: 30, why: 'You trained yesterday. Mobility and control work today keeps you moving well.' };
  if (cond >= 7 && train !== Infinity) return { focus: 'engine', mins: 20, why: cond === Infinity ? 'You haven’t done any conditioning yet. Build your engine.' : 'No conditioning in over a week.' };
  if (train === Infinity) return { focus: 'strength', mins: 45, why: 'Ease in with a full-body strength session.' };
  return { focus: S.settings.program && S.settings.program !== 'athletic' && eq.includes('machine') ? 'upper' : 'strength', mins: 45, why: `${train} days since you last trained. Good day to lift.` };
}
function optRow(k, mins, extra = '') {
  const R = RECIPES[k];
  return `<button class="qrow" data-act="qpick" data-k="${k}" data-m="${mins}" style="--c:${cvar(R.cat)}">
    <span class="grow"><b>${R.name}</b><span>${extra || R.blurb}</span></span><span class="qrow-m">${mins}<small>min</small></span></button>`;
}
VIEWS.today = () => {
  const pod = partOfDay(), greet = { morning: 'Good morning', afternoon: 'Good afternoon', evening: 'Good evening', night: 'Evening' }[pod];
  setTop(`<div class="grow"><div class="sub">${new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}</div><h1>${greet}</h1></div>${topIcons()}`);
  const P = S.plan, trainedToday = daysSince(isTraining) === 0;
  // --- up next
  let next = '';
  if (trainedToday) {
    const h = S.history.filter(isTraining).slice(-1)[0];
    next = `<div class="card donecard" style="--c:var(--c-strength)"><div class="row"><span class="tick">${ICON.check}</span><div class="grow"><div class="title" style="font-size:24px">Trained today</div><div class="muted small">${esc(h.title)}, ${Math.round((h.dur || 0) / 60)} min. Nice work.</div></div></div></div>`;
  } else if (P) {
    const w = P.week, i = P.days.findIndex((d, j) => !P.done['w' + w + 'd' + j]);
    if (i >= 0) next = sessCard(P.days[i], `#/s/p${i}`, `Week ${w}, day ${i + 1} of your plan`, false, `<button class="btn sm cbtn" data-act="startSess" data-r="p${i}">${PLAY} Start</button>`, estimate(P.days[i], w));
    else next = `<div class="card donecard" style="--c:var(--c-strength)"><div class="row"><span class="tick">${ICON.check}</span><div class="grow"><div class="title" style="font-size:24px">Week ${w} done</div><div class="muted small">${w < BLOCK_WEEKS ? 'Every plan day is ticked off.' : 'Block finished. Start a fresh one in Workouts.'}</div></div>${w < BLOCK_WEEKS ? `<button class="btn sm cbtn" data-act="week" data-d="1">Week ${w + 1}</button>` : ''}</div></div>`;
  } else next = `<a class="card nextcta" href="#/setup"><div class="grow"><div class="title" style="font-size:24px">Set up a plan</div><div class="muted small">PPL, upper / lower, full body, athletic, or build your own.</div></div><span class="btn sm pri">Build</span></a>`;
  const mobility = routineHero(routineNow(), 'Mobility for right now');
  // --- something else
  const intent = INTENTS[S.ui.tIntent] ? S.ui.tIntent : 'train', mins = S.ui.quick.mins || 45;
  const eq = S.ui.quick.eq || S.settings.eq, ok = k => !RECIPES[k].needs || eq.includes(RECIPES[k].needs);
  const sug = suggestion();
  let opts = INTENTS[intent].focuses.filter(ok).filter(k => k !== sug.focus);
  if (intent === 'train') {
    // lead with what fits your program; the rest behind "More"
    const gymish = ['ppl', 'ul', 'full'].includes(S.settings.program);
    const order = gymish ? ['push', 'pull', 'legs', 'upper', 'lower', 'arms', 'strength', 'athletic', 'kettlebell'] : ['strength', 'athletic', 'kettlebell', 'upper', 'lower', 'push', 'pull', 'legs', 'arms'];
    opts.sort((a, b) => order.indexOf(a) - order.indexOf(b));
  }
  const more = opts.length > 4 && !S.ui.tMore ? opts.length - 4 : 0;
  if (more) opts = opts.slice(0, 4);
  const else_ = `<div class="h2">Something else</div>
    <div class="sugg" style="--c:${cvar(RECIPES[sug.focus].cat)}"><div class="sugg-why">${esc(sug.why)}</div>${optRow(sug.focus, sug.mins, 'Suggested for today')}</div>
    <div class="seg intents" style="margin-top:14px">${Object.entries(INTENTS).map(([k, v]) => `<button class="${intent === k ? 'on' : ''}" data-act="tIntent" data-k="${k}">${v.name}</button>`).join('')}</div>
    <div class="row" style="margin:12px 0 10px"><span class="muted small grow">${INTENTS[intent].blurb}</span><div class="minchips">${[20, 30, 45, 60].map(m => `<button class="${mins === m ? 'on' : ''}" data-act="tMins" data-m="${m}">${m}</button>`).join('')}<span class="muted small">min</span></div></div>
    <div class="qlist">${opts.map(k => optRow(k, mins)).join('')}
      ${more ? `<button class="qrow qmore" data-act="tMore"><span class="grow"><b>${more} more</b><span>${INTENTS[intent].focuses.filter(ok).filter(k => k !== sug.focus && !opts.includes(k)).map(k => RECIPES[k].name).join(', ')}</span></span><span class="qrow-m">${ICON.down}</span></button>` : ''}
      ${intent === 'move' ? `<a class="qrow" href="#/mobility" style="--c:var(--c-mobility)"><span class="grow"><b>Guided routines</b><span>Morning, desk, evening and bedtime flows</span></span><span class="qrow-m">${ICON.back.replace('<svg', '<svg style="transform:scaleX(-1)"')}</span></a>` : ''}
      ${intent === 'sweat' ? `<a class="qrow" href="#/timer" style="--c:var(--c-engine)"><span class="grow"><b>Interval timer</b><span>Tabata, EMOM, your own work / rest</span></span><span class="qrow-m">${ICON.stopwatch}</span></a>` : ''}
      <button class="qrow" data-act="goQuick" style="--c:var(--c-custom)"><span class="grow"><b>Customise</b><span>Pick focus, time, energy and equipment</span></span><span class="qrow-m">${ICON.edit}</span></button>
    </div>
    ${S.quick ? `<a class="resume-row" href="#/s/q"><span class="cdot" style="--c:${cvar(catOf(S.quick))}"></span><span class="grow">Pick up <b>${esc(S.quick.name)}</b>, the last session you generated</span><span class="muted small">${estimate(S.quick)} min</span></a>` : ''}`;
  $('#view').innerHTML = `${weekStrip()}
    ${activeCard()}
    ${trainedToday ? mobility + `<div class="h2">Up next</div>` + next : `<div class="h2" style="margin-top:22px">Up next</div>` + next + `<div style="margin-top:12px">${mobility}</div>`}
    ${typeof faithTodayCard === 'function' && faithTodayCard() ? `<div style="margin-top:12px">${faithTodayCard()}</div>` : ''}
    ${else_}`;
};

/* ---------- Workouts ---------- */
const WF = [['all', 'All'], ['plan', 'Plan'], ['mine', 'Mine'], ['strength', 'Strength'], ['mobility', 'Mobility'], ['engine', 'Conditioning'], ['recovery', 'Recovery']];
const wfMatch = (f, c) => ['all', 'plan', 'mine'].includes(f) || (f === 'strength' ? ['strength', 'athletic', 'kb'].includes(c) : f === c);
VIEWS.workouts = () => {
  setTop(`<h1>Workouts</h1>${topIcons()}`);
  const f = S.ui.wf, P = S.plan;
  let html = activeCard() + `<div class="chips scroll">${WF.map(([k, l]) => `<button class="chip ${f === k ? 'on' : ''}" data-act="wf" data-k="${k}">${l}</button>`).join('')}</div>
    <div class="row" style="margin-top:12px"><button class="btn pri grow" data-act="goQuick">${ICON.shuffle} Generate a session</button><button class="btn ghost" data-act="newTpl">${ICON.plus} Blank</button></div>
    <a class="qrow liblink" href="#/library" style="--c:var(--c-kb);margin-top:10px;border-radius:var(--r)"><span class="grow"><b>Exercise library</b><span>${EX.length} moves with photos, cues and demos</span></span><span class="qrow-m">${ICON.book}</span></a>`;
  let n = 0;
  if (f !== 'mine') {
    if (P) {
      const w = P.week, ph_ = phase(w), days = P.days.map((d, i) => [d, i]).filter(([d]) => wfMatch(f, catOf(d)));
      if (days.length) {
        n += days.length;
        html += `<div class="h2 row"><span class="grow">Your plan</span><a class="btn sm ghost" href="#/planedit">${ICON.edit} Edit plan</a></div>
        <div class="card phase">
          <div class="row" style="align-items:flex-start">
            <div class="grow"><div class="eyebrow">Week ${w} of ${BLOCK_WEEKS}</div><div class="wk" style="margin-top:6px">${ph_.name}</div><div class="muted small" style="margin-top:4px">Target effort RPE ${ph_.rpe}</div></div>
            <div class="row" style="gap:6px">
              <button class="icon-btn" data-act="week" data-d="-1" aria-label="Previous week" ${w <= 1 ? 'disabled style="opacity:.35"' : ''}>${ICON.back}</button>
              <button class="icon-btn" data-act="week" data-d="1" aria-label="Next week" style="transform:scaleX(-1)">${ICON.back}</button>
            </div>
          </div>
          <div class="segs" style="margin:14px 0 12px">${Array.from({ length: BLOCK_WEEKS }, (_, i) => `<i class="${i + 1 < w ? 'on' : i + 1 === w ? 'cur' : ''}"></i>`).join('')}</div>
          <div class="small" style="color:#cfd8c2">${ph_.note}</div>
        </div>
        ${days.map(([d, i]) => sessCard(d, `#/s/p${i}`, `Day ${i + 1}`, P.done['w' + w + 'd' + i], '', estimate(d, w))).join('')}
        ${w >= BLOCK_WEEKS ? `<button class="btn ghost block" style="margin-top:12px" data-act="newBlock">Start a fresh 6-week block</button>` : ''}`;
      }
    } else if (f === 'all' || f === 'plan') {
      html += `<div class="h2">Your plan</div><div class="card phase"><div class="muted small">A 6-week block that eases you back in, then builds — warm-ups, power, strength, conditioning and stretching.</div><a class="btn pri sm" style="margin-top:10px" href="#/setup">Build my plan</a></div>`;
    }
  }
  if (f !== 'plan' && f !== 'mine' && S.quick && wfMatch(f, catOf(S.quick))) { n++; html += `<div class="h2">Last generated</div>${sessCard(S.quick, '#/s/q', CAT[catOf(S.quick)], false, '', estimate(S.quick))}`; }
  if (f !== 'plan') {
    const mine = S.saved.filter(t => wfMatch(f, catOf(t)));
    n += mine.length;
    html += `<div class="h2">My workouts</div>` + (mine.length ? mine.map(t => sessCard(t, `#/s/t${t.id}`, `${CAT[catOf(t)]}, ${t.blocks.length} blocks`, false, '', estimate(t))).join('')
      : `<div class="card muted small">Save any session here to reuse it, tap <b>Blank</b> to build one from scratch, or customise a mobility routine.</div>`);
  }
  if (f === 'mobility' || f === 'recovery') html += `<a class="card daycard" href="#/mobility" style="--c:var(--c-mobility);margin-top:12px"><div class="eyebrow"><span class="cdot"></span>Guided routines</div><div class="title">Mobility routines</div><div class="muted small">Morning, desk, evening and bedtime flows.</div></a>`;
  $('#view').innerHTML = html;
};
VIEWS.plan = () => go('#/workouts', { replace: true });

/* ---------- One-off session builder ---------- */
VIEWS.quick = () => {
  const Q = S.ui.quick;
  if (!Q.eq) Q.eq = S.settings.eq.slice();
  setTop(`<a class="icon-btn" href="#/${lastMain}" data-nav="back" aria-label="Back">${ICON.back}</a><h1>New session</h1>`);
  const seg = (k, vals, labels) => `<div class="seg">${vals.map((v, i) => `<button class="${Q[k] === v ? 'on' : ''}" data-act="qset" data-k="${k}" data-v="${v}">${labels ? labels[i] : v}</button>`).join('')}</div>`;
  $('#view').innerHTML = `
    <div class="field" style="margin-top:4px"><div class="lab">Focus</div>
      <div class="opt-grid">${Object.entries(RECIPES).map(([k, r]) => `<button class="opt ${Q.focus === k ? 'on' : ''}" data-act="qset" data-k="focus" data-v="${k}"><b>${r.name}</b><span>${r.blurb}</span></button>`).join('')}</div></div>
    <div class="field"><div class="lab">Time</div>${seg('mins', [20, 30, 45, 60], ['20', '30', '45', '60 min'])}</div>
    <div class="field"><div class="lab">Energy today</div>${seg('energy', ['low', 'normal', 'high'], ['Low', 'Normal', 'High'])}<div class="muted small" style="margin-top:8px">${ENERGY[Q.energy][1]}</div></div>
    <div class="field"><div class="lab">Equipment today</div><div class="hint">Bodyweight is always included.</div>
      <div class="chips">${EQ.map(([k, l]) => `<button class="chip ${Q.eq.includes(k) ? 'on' : ''}" data-act="qeq" data-k="${k}">${l}</button>`).join('')}</div>
      <div class="row" style="margin-top:10px"><button class="btn sm ghost" data-act="qeqPreset" data-v="gym">At the gym</button><button class="btn sm ghost" data-act="qeqPreset" data-v="mine">My usual</button><button class="btn sm ghost" data-act="qeqPreset" data-v="none">Nothing</button></div></div>
    <button class="btn pri block" style="margin-top:24px;height:52px" data-act="qgen">Generate session</button>
    <div class="muted small" style="text-align:center;margin-top:8px">You can swap, edit, add or remove anything afterwards.</div>`;
};

/* ---------- Session view (plan day, one-off, saved) ---------- */
let EDITING = false;
function sessRefLabel(ref) { return ref[0] === 'p' ? 'Plan day ' + (+ref.slice(1) + 1) : ref === 'q' ? 'One-off session' : 'My workout'; }
VIEWS.s = (ref) => {
  const sess = getSess(ref);
  if (!sess) { go('#/' + lastMain); return; }
  const w = weekOf(ref), isPlan = ref[0] === 'p';
  setTop(`<a class="icon-btn" href="#/${lastMain}" data-nav="back" aria-label="Back" data-act="endEdit">${ICON.back}</a>
    <div class="grow" style="min-width:0"><div class="sub" style="color:${cvar(catOf(sess))}">${sessRefLabel(ref)}${w ? ', week ' + w : ''}</div><div class="stitle">${esc(sess.name)} <span>${estimate(sess, w)} min</span></div></div>
    ${isPlan ? `<button class="icon-btn" data-act="shuffleDay" data-i="${ref.slice(1)}" aria-label="Shuffle exercises">${ICON.shuffle}</button>` : ''}
    ${ref === 'q' ? `<button class="icon-btn" data-act="qregen" aria-label="Regenerate">${ICON.shuffle}</button>` : ''}
    <button class="icon-btn ${EDITING ? 'on' : ''}" data-act="toggleEdit" aria-label="Edit">${EDITING ? ICON.check : ICON.edit}</button>`);
  const isActive = S.active && S.active.src === ref;
  $('#view').innerHTML = `
    ${EDITING ? `<div class="card editbar"><div class="field" style="margin:0"><div class="lab">Name</div><input type="text" value="${esc(sess.name)}" data-se="name" data-r="${ref}"></div>
      <div class="muted small" style="margin-top:10px">Tap <b>⋯</b> on a block to change its format, rounds or rest. Tap an exercise's <b>⋯</b> to edit sets, reps, time, notes or swap it.</div></div>` : ''}
    ${sess.blocks.map((b, bi) => blockPreview(sess, ref, b, bi, w)).join('')}
    ${EDITING ? `<button class="btn ghost block" style="margin-top:16px" data-act="addBlock" data-r="${ref}">${ICON.plus} Add block</button>` : ''}
    <div class="row" style="margin-top:18px;flex-wrap:wrap">
      ${ref[0] !== 't' ? `<button class="btn ghost grow" data-act="saveTpl" data-r="${ref}">Save to My workouts</button>` : `<button class="btn ghost grow" data-act="dupTpl" data-r="${ref}">Duplicate</button><button class="btn ghost danger" data-act="delTpl" data-r="${ref}">${ICON.trash}</button>`}
    </div>
    <div style="position:sticky;bottom:calc(var(--tab-h) + var(--safe-b) + 10px);margin-top:16px">
      <button class="btn pri block" data-act="startSess" data-r="${ref}" style="height:54px;font-size:16px;box-shadow:0 10px 30px rgba(0,0,0,.5)">${PLAY} ${isActive ? 'Resume workout' : 'Start workout'}</button>
    </div>`;
};
function blockHead(sess, ref, b, w, inPlayer) {
  const lbl = b.key ? `<span class="k">${esc(b.key)}</span>` : '';
  const reroll = b.gen && sess.q && !inPlayer ? `<button class="icon-btn sm" data-act="reroll" data-r="${ref}" data-b="${b.id}" aria-label="New exercises for this block">${ICON.shuffle}</button>` : '';
  const menu = EDITING || inPlayer ? `<button class="icon-btn sm" data-act="blk" data-r="${ref}" data-b="${b.id}" aria-label="Block options">${ICON.more}</button>` : '';
  return `<div class="block-h"><span class="hbar"></span>${lbl}<span class="t">${esc(b.title)}</span><span class="n">${esc(blockDesc(b, w))}</span>${reroll}${menu}</div>`;
}
function blockPreview(sess, ref, b, bi, w) {
  const note = b.note ? `<div class="bnote">${esc(b.note)}</div>` : '';
  if (b.fmt === 'note') return `<div class="block" style="--c:${cvar(blockCat(b))}">${blockHead(sess, ref, b, w)}<div class="note">${esc(b.text || '')}</div></div>`;
  return `<div class="block" style="--c:${cvar(blockCat(b))}">${blockHead(sess, ref, b, w)}${note}
    ${b.items.map((it, ii) => itemRow(ref, b, it, ii, w)).join('') || '<div class="muted small" style="padding:8px 2px">No exercises yet.</div>'}
    ${EDITING ? `<button class="btn sm ghost" style="margin-top:8px" data-act="pick" data-r="${ref}" data-b="${b.id}">${ICON.plus} Add exercise</button>` : ''}
  </div>`;
}
function itemRow(ref, b, it, ii, w, big) {
  const ex = BY[it.ex] || { id: it.ex, name: 'Unknown', img: [], eq: [], tags: [] };
  const tag = b.key ? `<span class="lbl">${esc(b.key)}${ii + 1}</span>` : b.fmt === 'circuit' || CLOCK.includes(b.fmt) ? `<span class="lbl">${ii + 1}</span>` : '';
  return `<div class="exrow">
    ${tag}
    <button data-act="ex" data-id="${ex.id}" style="flex:none">${ph(ex, big ? 'thumb lg' : 'thumb')}</button>
    <div class="grow" data-act="ex" data-id="${ex.id}"><div class="nm">${esc(ex.name)}</div><div class="ds">${esc(itemTxt(it, b, w))}</div>${it.note ? `<div class="inote">${esc(it.note)}</div>` : ''}</div>
    <button class="icon-btn" data-act="item" data-r="${ref}" data-b="${b.id}" data-i="${it.id}" aria-label="Edit exercise">${ICON.more}</button>
  </div>`;
}

VIEWS.day = i => { go('#/s/p' + i, { replace: true }); };

/* ---------- Plan editor: shape your week ---------- */
VIEWS.planedit = () => {
  const P = S.plan;
  if (!P) { go('#/setup', { replace: true }); return; }
  setTop(`<a class="icon-btn" href="#/workouts" data-nav="back" aria-label="Back">${ICON.back}</a><h1>Edit plan</h1>`);
  const w = P.week;
  $('#view').innerHTML = `
    <p class="muted small" style="margin-top:0">Rename, reorder or swap any day. Tap a day to edit its exercises, sets and reps. Exercises you add to a plan day progress through the 6-week block automatically.</p>
    <div class="pd-list">${P.days.map((d, i) => `<div class="pd" style="--c:${cvar(catOf(d))}">
      <div class="pd-n">${i + 1}</div>
      <div class="grow">
        <input type="text" value="${esc(d.name)}" data-pd="name" data-i="${i}" aria-label="Day ${i + 1} name">
        <div class="muted small" style="margin-top:6px">${estimate(d, w)} min, ${d.blocks.reduce((a, b) => a + b.items.length, 0)} exercises${P.done['w' + w + 'd' + i] ? ', done this week' : ''}</div>
        <div class="row" style="margin-top:10px;gap:6px;flex-wrap:wrap">
          <a class="btn sm" href="#/s/p${i}">${ICON.edit} Edit day</a>
          <button class="btn sm ghost" data-act="pdReplace" data-i="${i}">${ICON.swap} Replace</button>
        </div>
      </div>
      <div class="pd-tools">
        <button class="icon-btn sm" data-act="pdMove" data-i="${i}" data-d="-1" ${i === 0 ? 'disabled style="opacity:.3"' : ''} aria-label="Move up">${ICON.up}</button>
        <button class="icon-btn sm" data-act="pdMove" data-i="${i}" data-d="1" ${i === P.days.length - 1 ? 'disabled style="opacity:.3"' : ''} aria-label="Move down">${ICON.down}</button>
        <button class="icon-btn sm" data-act="pdDup" data-i="${i}" aria-label="Duplicate">${ICON.copy}</button>
        <button class="icon-btn sm" data-act="pdDel" data-i="${i}" aria-label="Delete">${ICON.trash}</button>
      </div>
    </div>`).join('')}</div>
    <button class="btn pri block" style="margin-top:14px" data-act="pdAdd">${ICON.plus} Add a day</button>
    <div class="muted small" style="margin-top:16px">Want a fresh start? <a href="#/setup" style="text-decoration:underline">Generate a new plan</a> — choose Push / Pull / Legs, Upper / Lower, Full Body, Athletic, or Build my own.</div>`;
};
function dayPicker(mode, i) {
  const L = S.settings.length;
  openSheet(`<h3>${mode === 'add' ? 'Add a day' : 'Replace day ' + (i + 1)}</h3>
    <div class="muted small">Start blank, use one of your saved workouts, or generate one.</div>
    <button class="btn block" style="margin-top:14px" data-act="pdPick" data-mode="${mode}" data-i="${i}" data-src="blank">${ICON.plus} Blank day — build it yourself</button>
    ${S.saved.length ? `<div class="h2" style="font-size:20px;margin-top:22px">My workouts</div><div class="stack">${S.saved.map(t => `<button class="pick" style="--c:${cvar(catOf(t))};width:100%" data-act="pdPick" data-mode="${mode}" data-i="${i}" data-src="t${t.id}"><b>${esc(t.name)}</b><span>${estimate(t)} min</span></button>`).join('')}</div>` : ''}
    <div class="h2" style="font-size:20px;margin-top:22px">Generate · ${L} min</div>
    <div class="picks">${Object.entries(RECIPES).filter(([, r]) => !r.needs || S.settings.eq.includes(r.needs)).map(([k, r]) => `<button class="pick" style="--c:${cvar(r.cat)}" data-act="pdPick" data-mode="${mode}" data-i="${i}" data-src="r${k}"><b>${r.name}</b><span>${L} min</span></button>`).join('')}
      ${Object.keys(GYM).map(k => `<button class="pick" style="--c:var(--c-strength)" data-act="pdPick" data-mode="${mode}" data-i="${i}" data-src="g${k}"><b>${GYM[k].name}</b><span>gym</span></button>`).join('')}</div>`);
}
// keep "done" ticks attached to the right day when days move
function remapDone(map) {
  const P = S.plan, nd = {};
  for (const k in P.done) { const m = /^w(\d+)d(\d+)$/.exec(k); if (!m) continue; const j = map(+m[2]); if (j >= 0) nd['w' + m[1] + 'd' + j] = P.done[k]; }
  P.done = nd;
}

/* ---------- Setup ---------- */
let draft = null;
VIEWS.setup = () => {
  if (!draft) draft = JSON.parse(JSON.stringify(S.settings));
  setTop(`${S.plan ? `<a class="icon-btn" href="#/${lastMain}" data-nav="back" aria-label="Back" data-act="cancelSetup">${ICON.back}</a>` : ''}<h1>${S.plan ? 'Settings' : 'Build your plan'}</h1>`);
  const seg = (k, vals, labels) => `<div class="seg">${vals.map((v, i) => `<button class="${draft[k] === v ? 'on' : ''}" data-act="set" data-k="${k}" data-v="${v}">${labels ? labels[i] : v}</button>`).join('')}</div>`;
  const prog = draft.program || 'athletic';
  const KEYNAME = k => { const b = k.replace(/[0-9]+$/, ''); return ({ F1: 'Full Body A', F2: 'Full Body B', S1: 'Squat & Push', S2: 'Hinge & Pull', S3: 'Athletic Single-Leg', MOB: 'Mobility', COND: 'Conditioning' })[k] || (GYM[b] ? GYM[b].name : k); };
  const split = prog === 'custom' ? `${draft.days} blank days for you to build` : ((PROGRAM_DAYS[prog] || PROGRAM_DAYS.athletic)[draft.days] || []).map(KEYNAME).join(', ');
  $('#view').innerHTML = `
    <div class="field" style="margin-top:4px"><div class="lab">Program</div>
      <div class="opt-grid">${Object.entries(PROGRAMS).map(([k, [t, d]]) => `<button class="opt ${prog === k ? 'on' : ''}" data-act="set" data-k="program" data-v="${k}"><b>${t}</b><span>${d}</span></button>`).join('')}</div></div>
    <div class="field"><div class="lab">Days per week</div>${seg('days', [2, 3, 4, 5, 6])}<div class="muted small" style="margin-top:8px">${esc(split)}</div></div>
    <div class="field"><div class="lab">Session length</div>${seg('length', [30, 45, 60], ['30 min', '45 min', '60 min'])}</div>
    <div class="field"><div class="lab">Where you're at</div>${seg('level', ['returning', 'regular'], ['Getting back into it', 'Training regularly'])}</div>
    <div class="field"><div class="lab">Exercise style</div>
      <div class="opt-grid">${Object.entries(STYLES).map(([k, [t, d]]) => `<button class="opt ${draft.style === k ? 'on' : ''}" data-act="set" data-k="style" data-v="${k}"><b>${t}</b><span>${d}</span></button>`).join('')}</div>
    </div>
    <div class="field"><div class="lab">Equipment you have</div><div class="hint">Bodyweight is always included.</div>
      <div class="chips">${EQ.map(([k, l]) => `<button class="chip ${draft.eq.includes(k) ? 'on' : ''}" data-act="eq" data-k="${k}">${l}</button>`).join('')}</div>
      <div class="row" style="margin-top:10px"><button class="btn sm ghost" data-act="eqPreset" data-v="gym">Full gym</button><button class="btn sm ghost" data-act="eqPreset" data-v="home">Home: kettlebell & bands</button><button class="btn sm ghost" data-act="eqPreset" data-v="none">None</button></div>
    </div>
    <div class="field"><div class="lab">Units</div>${seg('units', ['kg', 'lb'])}</div>
    <div class="field"><div class="lab">Timer feedback</div>
      <div class="chips"><button class="chip ${draft.sound ? 'on' : ''}" data-act="tog" data-k="sound">Beeps</button><button class="chip ${draft.vibrate ? 'on' : ''}" data-act="tog" data-k="vibrate">Vibration</button></div>
      <div class="muted small" style="margin-top:8px">On iPhone, beeps won't play while the ring/silent switch is on silent. Vibration isn't available in iOS browsers.</div>
    </div>
    <div style="margin-top:26px" class="stack">
      <button class="btn pri block" data-act="genPlan">${S.plan ? 'Save & generate a new plan' : 'Generate my plan'}</button>
      ${S.plan ? `<button class="btn ghost block" data-act="saveSettings">Save settings only</button><div class="muted small" style="text-align:center">A new plan starts a fresh 6-week block. Your workout history is kept.</div>` : ''}
    </div>
    <div class="h2">Data & offline</div>
    <div class="card stack">
      <button class="btn block" data-act="cacheImgs">Save all exercise photos offline</button>
      <div class="row"><button class="btn grow" data-act="export">Export backup</button><label class="btn grow" style="cursor:pointer">Import<input type="file" accept="application/json" id="importFile" hidden></label></div>
      <div class="muted small">Everything is stored on this device only. Export a backup now and then — clearing Safari's website data deletes it.</div>
      <button class="btn ghost danger block" data-act="reset">Reset all data</button>
    </div>
    <p class="muted small" style="margin-top:24px">Exercise photos and base instructions from <a href="https://github.com/yuhonas/free-exercise-db" style="text-decoration:underline">free-exercise-db</a> (public domain).</p>`;
};

/* ---------- Mobility ---------- */
VIEWS.mobility = () => {
  setTop(`<h1>Mobility</h1>${topIcons()}`);
  const m = S.ui.mob, eq = S.settings.eq;
  const mon = mondayOf(new Date());
  const mobDays = new Set(S.history.filter(h => new Date(h.date) >= mon && isMob(histCat(h))).map(h => new Date(h.date).toDateString())).size;
  const row = r => `<div class="rt" data-act="routine" data-id="${r.id}" style="--c:${cvar(WHEN_CAT[r.when])}">
      <div class="rt-m"><b>${routineMins(routineEntries(r))}</b><span>min</span></div>
      <div class="grow"><div class="nm">${esc(r.name)}</div><div class="muted small">${esc(r.blurb)}</div></div>
      <button class="rt-go" data-act="routineGo" data-id="${r.id}" aria-label="Start ${esc(r.name)}">${PLAY}</button></div>`;
  $('#view').innerHTML = `
    ${routineHero(routineNow(), 'Suggested right now')}
    <div class="mobstat"><div class="mdots">${Array.from({ length: 7 }, (_, i) => `<i class="${i < mobDays ? 'on' : ''}"></i>`).join('')}</div><span class="small muted"><b style="color:var(--c-mobility)">${mobDays}/7</b> days of mobility this week — a little most days beats a lot once.</span></div>
    ${Object.entries(WHEN).map(([w, [t, d]]) => `<div class="h2" style="--c:${cvar(WHEN_CAT[w])}"><span class="hbar"></span>${t}</div><div class="muted small" style="margin:-6px 0 10px">${d}</div>
      <div class="stack">${ROUTINES.filter(r => r.when === w && (!r.needs || eq.includes(r.needs))).map(row).join('')}</div>`).join('')}
    <div class="h2" style="--c:var(--c-mobility)"><span class="hbar"></span>Loaded mobility & control</div>
    <div class="muted small" style="margin:-6px 0 10px">Joint flows, kettlebell mobility, get-ups and carries — strength through range.</div>
    <div class="picks">${[['control', 20], ['control', 30], ['control', 45], ['recovery', 30]].map(([k, mm]) => `<button class="pick" data-act="qpick" data-k="${k}" data-m="${mm}" style="--c:${cvar(RECIPES[k].cat)}"><b><span class="cdot"></span>${RECIPES[k].name}</b><span>${mm} min</span></button>`).join('')}</div>
    <div class="h2" style="--c:var(--c-custom)"><span class="hbar"></span>Build your own</div>
    <div class="card">
      <div class="lab" style="font-weight:700;margin-bottom:8px">Length</div>
      <div class="seg">${[5, 10, 15, 20].map(v => `<button class="${m.mins === v ? 'on' : ''}" data-act="mob" data-k="mins" data-v="${v}">${v} min</button>`).join('')}</div>
      <div class="lab" style="font-weight:700;margin:16px 0 8px">Style</div>
      <div class="seg">${[['dynamic', 'Moving'], ['mix', 'Mix'], ['static', 'Holds']].map(([v, l]) => `<button class="${m.type === v ? 'on' : ''}" data-act="mob" data-k="type" data-v="${v}">${l}</button>`).join('')}</div>
      <div class="lab" style="font-weight:700;margin:16px 0 8px">Focus</div>
      <div class="chips">${FOCUS_OPTS.map(([k, l]) => `<button class="chip ${m.focus.includes(k) ? 'on' : ''}" data-act="mobFocus" data-k="${k}">${l}</button>`).join('')}</div>
      <button class="btn pri block" style="margin-top:18px" data-act="routine" data-id="custom">Build routine</button>
    </div>`;
};
let pendingFlow = null;
function showFlowPreview(title, entries, recipe) {
  pendingFlow = { title, entries, recipe };
  const mins = routineMins(entries), quiet = recipe && recipe.quiet;
  let lastLabel = '';
  openSheet(`<h3>${esc(title)}</h3><div class="muted small">${entries.length} moves, about ${mins} min. Sides switch automatically${quiet ? '; soft chimes, no countdown beeps' : ''}.</div>
    <div style="margin-top:14px">${entries.map(e => {
      const ex = BY[e.ex], st = stepSecs(e.r), m = meta(e.ex);
      const head = e.label && e.label !== lastLabel ? `<div class="eyebrow" style="margin:12px 0 6px">${esc(e.label)}</div>` : ''; lastLabel = e.label || lastLabel;
      const amt = st.reps ? `${st.reps} reps${st.side ? ' / side' : ''}` : `${st.secs}s${st.side ? ' / side' : ''}`;
      return head + `<div class="exrow"><button data-act="ex" data-id="${e.ex}">${ph(ex, 'thumb')}</button><div class="grow" data-act="ex" data-id="${e.ex}"><div class="nm">${esc(ex.name)}</div><div class="ds">${amt}, ${POS_NAME[m.pos]}</div></div></div>`;
    }).join('')}</div>
    <div class="row" style="margin-top:16px"><button class="btn ghost" data-act="reflow" aria-label="Shuffle">${ICON.shuffle}</button><button class="btn ghost" data-act="flowCustom">${ICON.edit} Customise</button><button class="btn pri grow" data-act="startFlow">${PLAY} Start</button></div>
    <div class="muted small" style="margin-top:10px">Routines keep the same moves all week so you can feel them getting easier. Shuffle if you want a change.</div>`);
}
const POS_NAME = { stand: 'standing', chair: 'in a chair', kneel: 'kneeling', quad: 'on all fours', seat: 'seated', lie: 'lying down' };

/* ---------- Timer ---------- */
const IV_PRESETS = [
  { n: 'Tabata', d: '20s on / 10s off × 8', work: 20, rest: 10, rounds: 8 },
  { n: 'KB swing intervals', d: '30s on / 30s off × 10', work: 30, rest: 30, rounds: 10 },
  { n: 'Circuit 40/20', d: '40s on / 20s off × 12', work: 40, rest: 20, rounds: 12 },
  { n: 'EMOM 10', d: 'Every minute on the minute × 10', work: 60, rest: 0, rounds: 10 },
  { n: 'AMRAP 12', d: 'As many rounds as possible in 12 min', work: 720, rest: 0, rounds: 1 },
  { n: 'Sprint repeats', d: '15s on / 45s off × 8', work: 15, rest: 45, rounds: 8 },
];
const SW = { start: 0, acc: 0, running: false, laps: [] };
const swTime = () => SW.acc + (SW.running ? now() - SW.start : 0);
VIEWS.timer = () => {
  setTop(`<a class="icon-btn" href="#/${lastMain}" data-nav="back" aria-label="Back">${ICON.back}</a><h1>Timer</h1>`);
  const t = S.ui.timerTab, iv = S.ui.iv;
  const tabs = `<div class="seg" style="margin-bottom:16px">${[['interval', 'Intervals'], ['rest', 'Rest'], ['sw', 'Stopwatch']].map(([k, l]) => `<button class="${t === k ? 'on' : ''}" data-act="ttab" data-k="${k}">${l}</button>`).join('')}</div>`;
  let body = '';
  if (t === 'interval') {
    const stp = (k, label, step, f = fmt) => `<div><div class="eyebrow" style="margin-bottom:6px">${label}</div><div class="stepper"><button data-act="iv" data-k="${k}" data-d="${-step}">−</button><output class="num">${f(iv[k])}</output><button data-act="iv" data-k="${k}" data-d="${step}">+</button></div></div>`;
    const total = iv.rounds * (iv.work + iv.rest) - iv.rest;
    body = `<div class="card stack">
        ${stp('work', 'Work', 5)}${stp('rest', 'Rest', 5)}${stp('rounds', 'Rounds', 1, v => v)}
        <div class="muted small" style="text-align:center">Total ${fmt(total)} · 10s get-ready</div>
        <button class="btn pri block" data-act="ivStart">${ICON.play.replace('<svg', '<svg style="fill:currentColor;stroke:none"')} Start</button>
      </div>
      <div class="h2">Presets</div>
      <div class="stack">${IV_PRESETS.map((p, i) => `<button class="ivpre" style="width:100%" data-act="ivPreset" data-i="${i}"><b>${p.n}</b><span>${p.d}</span></button>`).join('')}</div>`;
  } else if (t === 'rest') {
    body = `<p class="muted" style="margin-top:0">Tap to start a rest countdown. It keeps running while you switch tabs.</p>
      <div class="presets">${[30, 45, 60, 90, 120, 180].map(s => `<button class="preset" data-act="rest" data-s="${s}"><b>${s < 60 ? s + 's' : fmt(s)}</b><span>${s <= 45 ? 'quick' : s <= 90 ? 'moderate' : 'heavy'}</span></button>`).join('')}</div>`;
  } else {
    body = `<div class="sw-big" id="swEl">${fmtSw(swTime())}</div>
      <div class="tctrl">
        <button class="side" data-act="sw" data-k="lap" aria-label="Lap"><svg viewBox="0 0 24 24" style="fill:none;stroke:currentColor;stroke-width:2.2;stroke-linecap:round"><path d="M5 21V4m0 0h11l-2 4 2 4H5"/></svg></button>
        <button class="main" data-act="sw" data-k="toggle" aria-label="Start/stop">${SW.running ? ICON.pause : ICON.play}</button>
        <button class="side" data-act="sw" data-k="reset" aria-label="Reset"><svg viewBox="0 0 24 24" style="fill:none;stroke:currentColor;stroke-width:2.2;stroke-linecap:round"><path d="M3 12a9 9 0 1 0 3-6.7M3 4v5h5"/></svg></button>
      </div>
      <div class="laps">${SW.laps.map((l, i) => `<div><span class="muted">Lap ${SW.laps.length - i}</span><b>${fmtSw(l)}</b></div>`).join('')}</div>`;
  }
  $('#view').innerHTML = tabs + body;
};
function fmtSw(ms) { const cs = Math.floor(ms / 10) % 100; return fmtLong(ms / 1000) + '.' + String(cs).padStart(2, '0'); }

/* ---------- Library ---------- */
const has_ = (e, ...t) => t.some(x => e.tags.includes(x));
const LIB_FILTERS = [
  ['all', 'All', () => true],
  ['chest', 'Chest', e => has_(e, 'chest') && !has_(e, 'stretch', 'prep', 'mobility')],
  ['back', 'Back', e => has_(e, 'hpull', 'vpull', 'lats') && !has_(e, 'stretch', 'smr')],
  ['shoulders', 'Shoulders', e => (has_(e, 'vpush') || (has_(e, 'shoulders') && has_(e, 'iso', 'prehab'))) && !has_(e, 'stretch')],
  ['arms', 'Arms', e => has_(e, 'arms', 'biceps', 'triceps')],
  ['legs', 'Legs', e => has_(e, 'squat', 'hinge', 'single', 'lateral') || (has_(e, 'iso') && has_(e, 'quads', 'hams', 'glutes', 'calves', 'groin'))],
  ['core', 'Core & carry', e => has_(e, 'core', 'carry')],
  ['machine', 'Machines & cables', e => e.eq.includes('machine') || e.eq.includes('cable')],
  ['kb', 'Kettlebell', e => e.eq.includes('kb')],
  ['bw', 'Bodyweight', e => e.eq.includes('bw') && !e.req.length],
  ['power', 'Power', e => has_(e, 'power')],
  ['mobility', 'Mobility', e => has_(e, 'mobility', 'prep', 'cars', 'lmob')],
  ['stretch', 'Stretch', e => has_(e, 'stretch')],
  ['cond', 'Cardio & conditioning', e => has_(e, 'cond')],
  ['smr', 'Foam roll', e => has_(e, 'smr')],
];
VIEWS.library = () => {
  setTop(`<a class="icon-btn" href="#/${lastMain}" data-nav="back" aria-label="Back">${ICON.back}</a><h1>Library</h1><span class="sub">${EX.length} moves</span>`);
  $('#view').innerHTML = `
    <input type="search" id="libq" placeholder="Search exercises, muscles…" value="${esc(S.ui.q)}" autocomplete="off">
    <div class="chips scroll" style="margin-top:10px">${LIB_FILTERS.map(([k, l]) => `<button class="chip ${S.ui.lib === k ? 'on' : ''}" data-act="lib" data-k="${k}">${l}</button>`).join('')}</div>
    <div class="row" style="margin-top:10px"><button class="chip ${S.ui.libMine ? 'on' : ''}" data-act="libMine">My equipment only</button><span class="grow"></span><span class="muted small" id="libCount"></span></div>
    <div class="lib-grid" id="libGrid"></div>`;
  renderLibGrid();
};
function renderLibGrid() {
  const q = S.ui.q.trim().toLowerCase();
  const f = (LIB_FILTERS.find(x => x[0] === S.ui.lib) || LIB_FILTERS[0])[2];
  const ctx = ctxFor(S.settings);
  const list = EX.filter(e => f(e) && (!S.ui.libMine || avail(e, ctx)) &&
    (!q || (e.name + ' ' + e.tags.map(t => TAG_LABEL[t] || t).join(' ') + ' ' + e.muscles.join(' ') + ' ' + e.eq.map(x => EQ_LABEL[x]).join(' ')).toLowerCase().includes(q)));
  $('#libGrid').innerHTML = list.map(e => `<button class="lib-card" data-act="ex" data-id="${e.id}">${ph(e)}<div class="nm">${esc(e.name)}<small>${tierDots(e.tier)} &nbsp;${e.eq.map(x => EQ_LABEL[x]).join(' / ')}</small></div></button>`).join('') || `<div class="empty" style="grid-column:1/-1">No matches</div>`;
  $('#libCount').textContent = list.length + ' shown';
}

function openEx(id) {
  const e = BY[id]; if (!e) return;
  const last = lastFor(id);
  const pats = e.tags.filter(t => TAG_LABEL[t]);
  openSheet(`
    ${ph(e, '', true)}
    <div class="muted small" style="margin:6px 0 0">${e.img.length > 1 ? 'Start ↔ end position — tap the photo to pause' : ''}</div>
    <h3 style="margin-top:10px">${esc(e.name)}</h3>
    <div class="row small" style="gap:8px;flex-wrap:wrap">${tierDots(e.tier)}<span class="muted">${TIER[e.tier]}</span><span class="muted">·</span><span class="muted">${e.eq.map(x => EQ_LABEL[x]).join(' / ')}${e.req.length ? ' + ' + e.req.map(x => EQ_LABEL[x]).join(', ') : ''}</span></div>
    <div class="chips" style="margin-top:10px">${pats.map(t => `<span class="tag ${['prep', 'mobility', 'power', 'squat', 'hinge', 'single', 'lateral', 'hpush', 'vpush', 'hpull', 'vpull', 'core', 'carry', 'cond', 'stretch', 'smr', 'prehab'].includes(t) ? 'acc' : ''}">${TAG_LABEL[t]}</span>`).join('')}</div>
    <a class="btn block" style="margin-top:14px" href="${ytUrl(e.name)}" target="_blank" rel="noopener">${ICON.yt} Watch demos on YouTube</a>
    ${last ? `<div class="note" style="margin-top:14px">Last time (${dateTxt(last.date)}): <b>${esc(last.txt)}</b></div>` : ''}
    <div class="eyebrow" style="margin-top:18px">Key cues</div>
    <ul class="cues">${e.cues.map(c => `<li>${esc(c)}</li>`).join('')}</ul>
    ${e.steps.length ? `<div class="eyebrow" style="margin-top:14px">How to</div><ol class="steps small">${e.steps.map(s => `<li>${esc(s)}</li>`).join('')}</ol>` : ''}
    ${e.muscles.length ? `<div class="eyebrow" style="margin-top:14px">Muscles</div><div class="small muted" style="margin-top:6px;text-transform:capitalize">${esc([...new Set(e.muscles)].join(', '))}</div>` : ''}
  `);
}

/* ---------- Log ---------- */
VIEWS.progress = () => {
  setTop(`<h1>Progress</h1>${topIcons()}`);
  const H = S.history, mon = mondayOf(new Date());
  const wk = H.filter(h => new Date(h.date) >= mon);
  const mobDays = new Set(wk.filter(h => isMob(histCat(h))).map(h => new Date(h.date).toDateString())).size;
  let streak = 0; const wks = new Set(H.map(h => mondayOf(h.date).getTime()));
  for (let d = new Date(mon); ; d.setDate(d.getDate() - 7)) { if (wks.has(d.getTime())) streak++; else if (d.getTime() !== mon.getTime()) break; if (streak > 200) break; }
  // 4-week grid, coloured by what you did
  const start = new Date(mon); start.setDate(start.getDate() - 21);
  const byDay = {}; H.forEach(h => { const k = new Date(h.date).toDateString(), c = histCat(h); if (!byDay[k] || isMob(byDay[k])) byDay[k] = c; });
  const cells = Array.from({ length: 28 }, (_, i) => { const d = new Date(start); d.setDate(d.getDate() + i); const c = byDay[d.toDateString()]; return `<i class="${d.toDateString() === new Date().toDateString() ? 'today' : ''}" ${c ? `style="background:${cvar(c)}"` : ''}></i>`; }).join('');
  // minutes by category, this week
  const mins = {}; wk.forEach(h => { const c = histCat(h); mins[c] = (mins[c] || 0) + Math.round((h.dur || 0) / 60); });
  const maxM = Math.max(1, ...Object.values(mins));
  $('#view').innerHTML = `
    <div class="stats"><div class="stat" style="--c:var(--c-strength)"><b>${wk.filter(h => !isMob(histCat(h))).length}</b><span>workouts this week</span></div><div class="stat" style="--c:var(--c-mobility)"><b>${mobDays}</b><span>mobility days</span></div><div class="stat" style="--c:var(--c-athletic)"><b>${streak}</b><span>week streak</span></div></div>
    <div class="card" style="margin-top:10px"><div class="eyebrow">Minutes this week</div>
      ${Object.keys(mins).length ? Object.entries(mins).sort((a, b) => b[1] - a[1]).map(([c, m]) => `<div class="mbar" style="--c:${cvar(c)}"><span>${CAT[c] || c}</span><div><i style="width:${m / maxM * 100}%"></i></div><b class="num">${m}</b></div>`).join('') : '<div class="muted small" style="margin-top:8px">Nothing logged yet this week.</div>'}
    </div>
    ${faithProgress()}
    <div class="card" style="margin-top:10px"><div class="eyebrow">Last 4 weeks</div>
      <div class="weekgrid" style="margin-top:8px">${['M', 'T', 'W', 'T', 'F', 'S', 'S'].map(x => `<span class="muted" style="font-size:10px;text-align:center;font-weight:700">${x}</span>`).join('')}</div>
      <div class="weekgrid" style="margin-top:4px">${cells}</div>
      <div class="legend">${Object.keys(CAT).filter(c => c !== 'custom').map(c => `<span><em style="background:${cvar(c)}"></em>${CAT[c]}</span>`).join('')}</div></div>
    <div class="h2">History</div>
    ${H.length ? H.slice().reverse().map(h => { const c = histCat(h); return `<button class="card hrow" style="--c:${cvar(c)}" data-act="hist" data-id="${h.id}">
      <div class="row"><div class="grow"><div class="eyebrow"><span class="cdot"></span>${dateTxt(h.date)} · ${CAT[c] || ''}${h.week ? ' · Week ' + h.week : ''}</div><b>${esc(h.title)}</b></div><div style="text-align:right" class="small muted">${fmtLong(h.dur || 0)}${h.rpe ? '<br>RPE ' + h.rpe : ''}</div></div>
      ${h.ex && h.ex.length && h.kind !== 'mobility' ? `<div class="small muted" style="margin-top:6px">${h.ex.filter(e => e.sets.some(s => s.done)).length} exercises · ${h.ex.reduce((a, e) => a + e.sets.filter(s => s.done).length, 0)} sets</div>` : ''}
    </button>`; }).join('') : `<div class="empty">No sessions yet. Finish a workout or a mobility flow and it'll show up here.</div>`}`;
};
function faithProgress() {
  if (!S.faith || !S.faith.practices.some(p => p.on)) return '';
  const mon = mondayOf(new Date()), days = Array.from({ length: 7 }, (_, i) => addDays(mon, i)).filter(d => d <= new Date());
  const counts = {}; days.forEach(d => Object.keys(S.faith.log[dk(d)] || {}).forEach(k => counts[k] = (counts[k] || 0) + 1));
  const prayDays = days.filter(d => faithDayCount(d)).length;
  const rows = S.faith.practices.filter(p => p.on && counts[p.id]).sort((a, b) => counts[b.id] - counts[a.id]);
  return `<div class="card" style="margin-top:10px;--c:var(--c-faith)"><div class="row"><div class="eyebrow grow">Faith this week</div><span class="small muted"><b style="color:var(--c-faith)">${prayDays}</b> of ${days.length} days</span></div>
    ${rows.length ? rows.map(p => `<div class="mbar"><span>${esc(p.name)}</span><div><i style="width:${counts[p.id] / days.length * 100}%"></i></div><b class="num">${counts[p.id]}</b></div>`).join('') : '<div class="muted small" style="margin-top:8px">Nothing ticked off yet this week.</div>'}</div>`;
}
VIEWS.log = () => go('#/progress', { replace: true });
function openHist(id) {
  const h = S.history.find(x => x.id === id); if (!h) return;
  openSheet(`<div class="eyebrow">${dateTxt(h.date)}</div><h3>${esc(h.title)}</h3>
    <div class="kv"><span class="muted">Duration</span><b>${fmtLong(h.dur || 0)}</b></div>
    ${h.rpe ? `<div class="kv"><span class="muted">Session RPE</span><b>${h.rpe}</b></div>` : ''}
    ${h.notes ? `<div class="note" style="margin:10px 0">${esc(h.notes)}</div>` : ''}
    ${(h.ex || []).filter(e => e.sets.some(s => s.done)).map(e => `<div class="kv"><span>${esc(BY[e.id] ? BY[e.id].name : e.id)}</span><span class="muted num" style="text-align:right">${e.sets.filter(s => s.done).map(s => s.w || s.r ? (s.w ? s.w + '×' : '') + (s.r || '✓') : '✓').join(', ')}</span></div>`).join('')}
    <button class="btn ghost danger block" style="margin-top:18px" data-act="delHist" data-id="${h.id}">Delete entry</button>`);
}

