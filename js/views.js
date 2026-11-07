/* Kinetix — UI helpers and screens. */
'use strict';
/* =========================================================
   UI helpers
   ========================================================= */
function ph(ex, cls = '', anim = false, badge = '') {
  if (!ex) return '';
  if (!ex.img.length) return `<div class="ph ${cls}"><div class="nophoto"><div>${ICON.fig}${anim ? `<a class="ytlink" href="${ytUrl(ex.name)}" target="_blank" rel="noopener">${ICON.yt} Watch demos</a>` : ''}</div></div>${badge}</div>`;
  return `<div class="ph ${cls} ${anim ? 'anim' : ''}" ${anim ? 'data-act="flip"' : ''}><img src="${ex.img[0]}" alt="" loading="lazy" decoding="async">${anim && ex.img[1] ? `<img class="f2" src="${ex.img[1]}" alt="" loading="lazy" decoding="async">` : ''}${badge}</div>`;
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
const MAIN_TABS = ['today', 'workouts', 'mobility', 'library', 'progress'];
let lastMain = 'today';
function route() {
  const parts = (location.hash || '#/today').slice(2).split('/');
  let name = parts[0] || 'today';
  if (!VIEWS[name]) name = 'today';
  current = name;
  if (MAIN_TABS.includes(name)) lastMain = name;
  const tab = MAIN_TABS.includes(name) ? name : ['s', 'quick', 'day', 'plan'].includes(name) ? (lastMain === 'today' || lastMain === 'mobility' ? lastMain : 'workouts') : lastMain;
  document.querySelectorAll('#tabbar a').forEach(a => a.classList.toggle('on', a.dataset.tab === tab));
  VIEWS[name](parts[1]);
  window.scrollTo(0, 0);
}
function rerender() { const y = window.scrollY; const parts = (location.hash || '#/today').slice(2).split('/'); (VIEWS[current] || VIEWS.today)(parts[1]); window.scrollTo(0, y); }

/* ---------- shared bits ---------- */
const PLAY = ICON.play.replace('<svg', '<svg style="fill:currentColor;stroke:none"');
const topIcons = () => `<a class="icon-btn" href="#/timer" aria-label="Timer">${ICON.stopwatch}</a><a class="icon-btn" href="#/setup" aria-label="Settings">${ICON.gear}</a>`;
const mondayOf = d => { const x = new Date(d); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; };
const histCat = h => h.cat || (h.kind === 'mobility' ? 'mobility' : 'strength');
const isMob = c => c === 'mobility' || c === 'recovery';
function thumbsOf(sess, n = 6) { return sess.blocks.filter(b => b.fmt !== 'note').flatMap(b => b.items).filter(it => BY[it.ex]).slice(0, n); }
function sessCard(sess, href, eyebrow, done, extra = '') {
  const c = catOf(sess);
  return `<a class="card daycard ${done ? 'done' : ''}" href="${href}" style="--c:${cvar(c)}">
    <div class="row"><div class="grow"><div class="eyebrow"><span class="cdot"></span>${eyebrow}</div><div class="title">${esc(sess.name)}</div>${sess.focus ? `<div class="muted small">${esc(sess.focus)}</div>` : ''}</div>${done ? '<span class="pill-done">DONE</span>' : extra}</div>
    <div class="strip">${thumbsOf(sess).map(it => ph(BY[it.ex])).join('')}</div>
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
    <div class="wkstrip">${days.map(d => { const k = d.toDateString(), cs = [...new Set(by[k] || [])]; return `<div class="${k === todayK ? 'today' : ''} ${d > nowT && k !== todayK ? 'future' : ''}"><span>${'MTWTFSS'[(d.getDay() + 6) % 7]}</span><b>${d.getDate()}</b><i>${cs.slice(0, 3).map(c => `<em style="background:${cvar(c)}"></em>`).join('')}</i></div>`; }).join('')}</div></div>`;
}
const WHEN_CAT = { morning: 'athletic', anytime: 'mobility', evening: 'recovery', target: 'kb' };
function routineHero(r, label) {
  const ids = routineIds(r), night = ['evening', 'night'].includes(partOfDay());
  return `<div class="card hero" style="--c:${cvar(WHEN_CAT[r.when] || 'mobility')}">
    <div class="eyebrow cc">${night ? ICON.moon : ICON.sun} ${label}</div>
    <div class="title" style="margin-top:6px">${esc(r.name)}</div>
    <div class="muted small">${r.mins} min · ${ids.length} moves · ${esc(r.blurb)}</div>
    <div class="strip">${ids.slice(0, 6).map(id => ph(BY[id])).join('')}</div>
    <div class="row" style="margin-top:12px"><button class="btn cbtn grow" data-act="routineGo" data-id="${r.id}">${PLAY} Start</button><button class="btn ghost" data-act="routine" data-id="${r.id}">Preview</button></div>
  </div>`;
}
const QUICK_PICKS = [['control', 30], ['recovery', 20], ['strength', 45], ['engine', 20], ['kettlebell', 30], ['athletic', 45], ['upper', 30], ['lower', 30]];
function quickPicks() {
  const eq = S.ui.quick.eq || S.settings.eq;
  return `<div class="picks">${QUICK_PICKS.filter(([k]) => !RECIPES[k].needs || eq.includes(RECIPES[k].needs)).map(([k, m]) => { const R = RECIPES[k]; return `<button class="pick" data-act="qpick" data-k="${k}" data-m="${m}" style="--c:${cvar(R.cat)}"><b><span class="cdot"></span>${R.name}</b><span>${m} min</span></button>`; }).join('')}
    <button class="pick" data-act="goQuick" style="--c:var(--c-custom)"><b><span class="cdot"></span>Custom…</b><span>pick focus & time</span></button></div>`;
}

/* ---------- Today ---------- */
VIEWS.today = () => {
  const pod = partOfDay(), greet = { morning: 'Good morning', afternoon: 'Good afternoon', evening: 'Good evening', night: 'Evening' }[pod];
  setTop(`<div class="grow"><div class="sub">${new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}</div><h1>${greet}</h1></div>${topIcons()}`);
  const P = S.plan;
  let train = '';
  if (P) {
    const w = P.week, i = P.days.findIndex((d, j) => !P.done['w' + w + 'd' + j]);
    if (i >= 0) {
      const d = P.days[i];
      train = sessCard(d, `#/s/p${i}`, `Plan · Week ${w} · Day ${i + 1} · ~${estimate(d, w)} min`, false, `<button class="btn sm cbtn" data-act="startSess" data-r="p${i}">${PLAY} Start</button>`);
    } else train = `<div class="card" style="--c:var(--c-strength)"><div class="eyebrow cc">Plan · Week ${w}</div><div class="title" style="margin-top:4px">Week complete ✓</div><div class="muted small">Great work. ${w < BLOCK_WEEKS ? 'Move on to the next week when you’re ready — or keep things moving with mobility.' : 'Block finished — start a fresh one in Workouts.'}</div>${w < BLOCK_WEEKS ? `<button class="btn sm cbtn" style="margin-top:10px" data-act="week" data-d="1">Start week ${w + 1}</button>` : ''}</div>`;
  } else train = `<div class="card phase"><div class="eyebrow">No plan yet</div><div class="title" style="margin-top:4px;font-weight:800;font-size:17px">Want structure?</div><div class="muted small">Set up a 6-week plan — or just grab a one-off session below.</div><a class="btn pri sm" style="margin-top:10px" href="#/setup">Build a plan</a></div>`;
  $('#view').innerHTML = `${activeCard()}
    ${routineHero(routineNow(), 'Mobility · right now')}
    <div class="h2">Training</div>
    ${train}
    <div class="h2">Or do something else</div>
    ${quickPicks()}
    ${S.quick ? `<div style="margin-top:12px">${sessCard(S.quick, '#/s/q', `Last generated · ~${estimate(S.quick)} min`)}</div>` : ''}
    <div class="h2">Consistency</div>
    ${weekStrip()}`;
};

/* ---------- Workouts ---------- */
const WF = [['all', 'All'], ['plan', 'Plan'], ['mine', 'Mine'], ['strength', 'Strength'], ['mobility', 'Mobility'], ['engine', 'Conditioning'], ['recovery', 'Recovery']];
const wfMatch = (f, c) => ['all', 'plan', 'mine'].includes(f) || (f === 'strength' ? ['strength', 'athletic', 'kb'].includes(c) : f === c);
VIEWS.workouts = () => {
  setTop(`<h1>Workouts</h1>${topIcons()}`);
  const f = S.ui.wf, P = S.plan;
  let html = activeCard() + `<div class="chips scroll">${WF.map(([k, l]) => `<button class="chip ${f === k ? 'on' : ''}" data-act="wf" data-k="${k}">${l}</button>`).join('')}</div>
    <div class="row" style="margin-top:12px"><button class="btn pri grow" data-act="goQuick">${ICON.shuffle} Generate a session</button><button class="btn ghost" data-act="newTpl">${ICON.plus} Blank</button></div>`;
  let n = 0;
  if (f !== 'mine') {
    if (P) {
      const w = P.week, ph_ = phase(w), days = P.days.map((d, i) => [d, i]).filter(([d]) => wfMatch(f, catOf(d)));
      if (days.length) {
        n += days.length;
        html += `<div class="h2">Your plan</div>
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
        ${days.map(([d, i]) => sessCard(d, `#/s/p${i}`, `Day ${i + 1} · ~${estimate(d, w)} min`, P.done['w' + w + 'd' + i])).join('')}
        ${w >= BLOCK_WEEKS ? `<button class="btn ghost block" style="margin-top:12px" data-act="newBlock">Start a fresh 6-week block</button>` : ''}`;
      }
    } else if (f === 'all' || f === 'plan') {
      html += `<div class="h2">Your plan</div><div class="card phase"><div class="muted small">A 6-week block that eases you back in, then builds — warm-ups, power, strength, conditioning and stretching.</div><a class="btn pri sm" style="margin-top:10px" href="#/setup">Build my plan</a></div>`;
    }
  }
  if (f !== 'plan' && f !== 'mine' && S.quick && wfMatch(f, catOf(S.quick))) { n++; html += `<div class="h2">Last generated</div>${sessCard(S.quick, '#/s/q', `~${estimate(S.quick)} min`)}`; }
  if (f !== 'plan') {
    const mine = S.saved.filter(t => wfMatch(f, catOf(t)));
    n += mine.length;
    html += `<div class="h2">My workouts</div>` + (mine.length ? mine.map(t => sessCard(t, `#/s/t${t.id}`, `~${estimate(t)} min · ${t.blocks.length} blocks`)).join('')
      : `<div class="card muted small">Save any session here to reuse it, tap <b>Blank</b> to build one from scratch, or customise a mobility routine.</div>`);
  }
  if (f === 'mobility' || f === 'recovery') html += `<a class="card daycard" href="#/mobility" style="--c:var(--c-mobility);margin-top:12px"><div class="eyebrow"><span class="cdot"></span>Guided routines</div><div class="title">Mobility routines →</div><div class="muted small">Morning, desk, evening and bedtime flows.</div></a>`;
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
      <div class="chips">${EQ.map(([k, l]) => `<button class="chip ${Q.eq.includes(k) ? 'on' : ''}" data-act="qeq" data-k="${k}">${l}</button>`).join('')}</div></div>
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
    <div class="grow" style="min-width:0"><div class="sub" style="color:${cvar(catOf(sess))}">${CAT[catOf(sess)]} · ${sessRefLabel(ref)}${w ? ' · Week ' + w : ''} · ~${estimate(sess, w)} min</div><div style="font-weight:800;font-size:19px;letter-spacing:-.01em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(sess.name)}</div></div>
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

/* ---------- Setup ---------- */
let draft = null;
VIEWS.setup = () => {
  if (!draft) draft = JSON.parse(JSON.stringify(S.settings));
  setTop(`${S.plan ? `<a class="icon-btn" href="#/${lastMain}" data-nav="back" aria-label="Back" data-act="cancelSetup">${ICON.back}</a>` : ''}<h1>${S.plan ? 'Settings' : 'Build your plan'}</h1>`);
  const seg = (k, vals, labels) => `<div class="seg">${vals.map((v, i) => `<button class="${draft[k] === v ? 'on' : ''}" data-act="set" data-k="${k}" data-v="${v}">${labels ? labels[i] : v}</button>`).join('')}</div>`;
  const splitDesc = { 2: 'Full Body A / B', 3: 'Squat & Push · Hinge & Pull · Athletic Single-Leg', 4: '3 strength days + Mobility & Recovery', 5: '3 strength + Mobility + Engine (conditioning)' };
  $('#view').innerHTML = `
    <div class="field"><div class="lab">Days per week</div>${seg('days', [2, 3, 4, 5])}<div class="muted small" style="margin-top:8px">${splitDesc[draft.days]}</div></div>
    <div class="field"><div class="lab">Session length</div>${seg('length', [30, 45, 60], ['30 min', '45 min', '60 min'])}</div>
    <div class="field"><div class="lab">Where you're at</div>${seg('level', ['returning', 'regular'], ['Getting back into it', 'Training regularly'])}</div>
    <div class="field"><div class="lab">Exercise style</div>
      <div class="opt-grid">${Object.entries(STYLES).map(([k, [t, d]]) => `<button class="opt ${draft.style === k ? 'on' : ''}" data-act="set" data-k="style" data-v="${k}"><b>${t}</b><span>${d}</span></button>`).join('')}</div>
    </div>
    <div class="field"><div class="lab">Equipment you have</div><div class="hint">Bodyweight is always included.</div>
      <div class="chips">${EQ.map(([k, l]) => `<button class="chip ${draft.eq.includes(k) ? 'on' : ''}" data-act="eq" data-k="${k}">${l}</button>`).join('')}</div>
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
      <div class="rt-m"><b>${r.mins}</b><span>min</span></div>
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
function showFlowPreview(title, ids) {
  pendingFlow = { title, ids };
  const steps = flowSteps(idEntries(ids)), total = steps.reduce((a, s) => a + s.secs + 5, 0);
  openSheet(`<h3>${esc(title)}</h3><div class="muted small">${ids.length} moves · ~${Math.round(total / 60)} min · sides switch automatically</div>
    <div style="margin-top:14px">${ids.map(id => { const ex = BY[id], t = itemSecs(ex); return `<div class="exrow"><button data-act="ex" data-id="${id}">${ph(ex, 'thumb')}</button><div class="grow" data-act="ex" data-id="${id}"><div class="nm">${esc(ex.name)}</div><div class="ds">${t.secs}s${t.side ? ' / side' : ''}${t.reps ? ` · ≈ ${t.reps} reps` : ''}</div></div></div>`; }).join('')}</div>
    <div class="row" style="margin-top:16px"><button class="btn ghost" data-act="reflow" aria-label="Shuffle">${ICON.shuffle}</button><button class="btn ghost" data-act="flowCustom">${ICON.edit} Customise</button><button class="btn pri grow" data-act="startFlow">${PLAY} Start</button></div>`);
}

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
const LIB_FILTERS = [
  ['all', 'All', () => true],
  ['kb', 'Kettlebell', e => e.eq.includes('kb')],
  ['bw', 'Bodyweight', e => e.eq.includes('bw') && !e.req.length],
  ['mobility', 'Mobility', e => e.tags.includes('mobility') || e.tags.includes('prep')],
  ['stretch', 'Stretch', e => e.tags.includes('stretch')],
  ['power', 'Power', e => e.tags.includes('power')],
  ['lower', 'Lower', e => ['squat', 'hinge', 'single', 'lateral'].some(t => e.tags.includes(t))],
  ['upper', 'Upper', e => ['hpush', 'vpush', 'hpull', 'vpull'].some(t => e.tags.includes(t))],
  ['core', 'Core & carry', e => e.tags.includes('core') || e.tags.includes('carry')],
  ['cond', 'Conditioning', e => e.tags.includes('cond')],
  ['smr', 'Foam roll', e => e.tags.includes('smr')],
];
VIEWS.library = () => {
  setTop(`<h1>Library</h1><span class="sub">${EX.length} moves</span>`);
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

