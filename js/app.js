/* Kinetix — strength & conditioning, mobility and timers.
   Vanilla JS, no build step. State lives in localStorage. */
(() => {
'use strict';

/* =========================================================
   Data & helpers
   ========================================================= */
const EX = window.EXERCISES || [];
const BY = Object.fromEntries(EX.map(e => [e.id, e]));
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const fmt = s => { s = Math.max(0, Math.round(s)); const m = Math.floor(s / 60), r = s % 60; return m + ':' + String(r).padStart(2, '0'); };
const fmtLong = s => { s = Math.max(0, Math.floor(s)); const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), r = s % 60; return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(r).padStart(2, '0'); };
const now = () => Date.now();

const EQ = [
  ['kb', 'Kettlebell'], ['db', 'Dumbbells'], ['bb', 'Barbell + rack'], ['bar', 'Pull-up bar'],
  ['band', 'Bands'], ['bench', 'Bench / box'], ['mb', 'Med ball'], ['roller', 'Foam roller'],
  ['cable', 'Cable machine'], ['trx', 'Rings / TRX'], ['cardio', 'Rower / bike'],
];
const EQ_LABEL = Object.fromEntries([['bw', 'Bodyweight'], ...EQ]);
const STYLES = {
  mixed:      ['Mixed', 'A bit of everything — kettlebell, dumbbell, barbell, bodyweight'],
  simple:     ['Keep it simple', 'Fewer technical lifts, easy to set up and follow'],
  kettlebell: ['Kettlebell first', 'Swings, cleans, presses, get-ups'],
  gym:        ['Classic gym', 'Barbell & dumbbell staples'],
};
const TAG_LABEL = {
  prep: 'Warm-up', mobility: 'Mobility', power: 'Power', squat: 'Squat', hinge: 'Hinge', single: 'Single-leg',
  lateral: 'Lateral', hpush: 'Push', vpush: 'Overhead', hpull: 'Row', vpull: 'Pull', core: 'Core', carry: 'Carry',
  cond: 'Conditioning', stretch: 'Stretch', smr: 'Foam roll', prehab: 'Prehab',
  hips: 'Hips', hams: 'Hamstrings', quads: 'Quads', glutes: 'Glutes', groin: 'Groin', calves: 'Calves', ankles: 'Ankles',
  tspine: 'T-spine', shoulders: 'Shoulders', chest: 'Chest', lats: 'Lats', back: 'Back', wrists: 'Wrists',
  lmob: 'Loaded mobility', control: 'Control', cars: 'Joint CARs', breath: 'Breathing', custom: 'Custom',
};
const PATTERN_TAGS = ['prep', 'mobility', 'power', 'squat', 'hinge', 'single', 'lateral', 'hpush', 'vpush', 'hpull', 'vpull', 'core', 'carry', 'cond', 'stretch', 'smr', 'prehab', 'lmob', 'control', 'cars', 'breath'];
// Block formats
const FMT = {
  sets:      ['Sets', 'Straight sets or a superset — log weight & reps'],
  circuit:   ['Circuit', 'Rounds of A → B → C, rest after each round'],
  flow:      ['Follow-along', 'Timed moves, one after another — warm-ups, flows, stretches'],
  emom:      ['EMOM', 'New exercise at the top of every minute'],
  intervals: ['Intervals', 'Work / rest on a clock'],
  amrap:     ['AMRAP', 'As many rounds as possible in the time'],
  note:      ['Note', 'Free text — e.g. easy cardio'],
};
const CLOCK = ['emom', 'intervals', 'amrap'];
const ytUrl = name => 'https://www.youtube.com/results?search_query=' + encodeURIComponent(name + ' exercise #shorts');
const clone = o => JSON.parse(JSON.stringify(o));
const TIER = ['', 'Simple', 'Standard', 'Advanced'];
const BLOCK_WEEKS = 6;

const ICON = {
  back: '<svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg>',
  close: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  gear: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
  swap: '<svg viewBox="0 0 24 24"><path d="M17 2l4 4-4 4"/><path d="M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4"/><path d="M21 13v2a3 3 0 0 1-3 3H3"/></svg>',
  check: '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  play: '<svg viewBox="0 0 24 24"><path d="M7 4.5v15l13-7.5z"/></svg>',
  pause: '<svg viewBox="0 0 24 24"><rect x="6" y="4.5" width="4" height="15" rx="1"/><rect x="14" y="4.5" width="4" height="15" rx="1"/></svg>',
  next: '<svg viewBox="0 0 24 24"><path d="M5 5v14l10-7zM17 5h2.5v14H17z"/></svg>',
  prev: '<svg viewBox="0 0 24 24"><path d="M19 5v14L9 12zM4.5 5H7v14H4.5z"/></svg>',
  shuffle: '<svg viewBox="0 0 24 24"><path d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/></svg>',
  info: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/></svg>',
  edit: '<svg viewBox="0 0 24 24"><path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z"/><path d="M13.5 6.5l4 4"/></svg>',
  more: '<svg viewBox="0 0 24 24"><circle cx="5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="19" cy="12" r="1.3"/></svg>',
  plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
  up: '<svg viewBox="0 0 24 24"><path d="M6 15l6-6 6 6"/></svg>',
  down: '<svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>',
  trash: '<svg viewBox="0 0 24 24"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></svg>',
  yt: '<svg viewBox="0 0 24 24"><rect x="2.5" y="5.5" width="19" height="13" rx="4"/><path d="M10 9.2v5.6l4.8-2.8z" style="fill:currentColor;stroke:none"/></svg>',
  fig: '<svg viewBox="0 0 64 64"><circle cx="32" cy="11" r="6"/><path d="M32 18v20M32 38l-9 18M32 38l9 18M18 26l14-4 14 4"/></svg>',
};

/* =========================================================
   State
   ========================================================= */
const KEY = 'kinetix:v1';
const DEFAULT_SETTINGS = { days: 3, length: 45, style: 'mixed', level: 'returning', eq: ['kb', 'band'], units: 'kg', sound: true, vibrate: true };
let S = (() => {
  let s = null;
  try { s = JSON.parse(localStorage.getItem(KEY)); } catch (e) {}
  s = s || {};
  s.settings = Object.assign({}, DEFAULT_SETTINGS, s.settings || {});
  s.history = s.history || [];
  s.plan = s.plan || null;
  s.active = s.active || null;
  if (s.active && !s.active.ref) s.active = null; // pre-v2 in-progress workout
  s.saved = s.saved || [];
  s.quick = s.quick || null;
  s.custom = s.custom || [];
  s.ui = Object.assign({ timerTab: 'interval', iv: { work: 30, rest: 30, rounds: 10 }, lib: 'all', libMine: false, q: '', mob: { mins: 10, focus: ['hips'], type: 'mix' } }, s.ui || {});
  s.ui.quick = Object.assign({ focus: 'control', mins: 45, energy: 'normal', eq: null }, s.ui.quick || {});
  return s;
})();
// your own exercises live alongside the library
S.custom.forEach(e => { if (!BY[e.id]) { EX.push(e); BY[e.id] = e; } });
if (S.plan) S.plan.days.forEach(d => normSess(d));
function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { toast('Storage is full or blocked'); } }

/* =========================================================
   Audio / haptics / wake lock
   ========================================================= */
let AC = null;
function ac() {
  if (!AC) { const C = window.AudioContext || window.webkitAudioContext; if (C) AC = new C(); }
  if (AC && AC.state === 'suspended') AC.resume();
  return AC;
}
['touchstart', 'click'].forEach(ev => document.addEventListener(ev, () => ac(), { once: true, passive: true }));
function beep(freq = 880, dur = 0.12, vol = 0.3, delay = 0) {
  if (!S.settings.sound) return;
  const a = ac(); if (!a) return;
  const o = a.createOscillator(), g = a.createGain(), t = a.currentTime + delay;
  o.type = 'sine'; o.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + dur + 0.03);
}
const sfx = {
  tick: () => beep(660, 0.09, 0.25),
  go: () => { beep(990, 0.32, 0.35); buzz(200); },
  rest: () => { beep(520, 0.3, 0.3); buzz([80, 60, 80]); },
  done: () => { beep(784, 0.14); beep(988, 0.14, 0.3, 0.16); beep(1318, 0.3, 0.3, 0.32); buzz([120, 60, 120, 60, 200]); },
  switch: () => { beep(880, 0.1); beep(880, 0.1, 0.3, 0.15); buzz(120); },
};
function buzz(p) { if (S.settings.vibrate && navigator.vibrate) try { navigator.vibrate(p); } catch (e) {} }

let wakeLock = null, wantWake = false;
async function wake(on) {
  wantWake = on;
  try {
    if (on && !wakeLock && 'wakeLock' in navigator) {
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', () => { wakeLock = null; });
    } else if (!on && wakeLock) { await wakeLock.release(); wakeLock = null; }
  } catch (e) {}
}
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') { if (wantWake) wake(true); tick(); } });

/* =========================================================
   Generator
   ========================================================= */
function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function parseDose(d) { const m = /^(\d+)(s|m)?(\/s)?$/.exec(d) || [0, 10]; return { n: +m[1], unit: m[2] === 's' ? 'sec' : m[2] === 'm' ? 'm' : 'reps', side: !!m[3] }; }

function ctxFor(settings, seed, used) {
  const eq = settings.eq || [];
  const has = q => q === 'bw' || eq.includes(q);
  return {
    settings, eq, has, used: used || new Set(),
    rnd: seed == null ? () => 0.5 : rng(seed),
    anyLoad: ['kb', 'db', 'bb', 'cable'].some(q => eq.includes(q)),
    returning: settings.level === 'returning',
  };
}
function avail(ex, ctx) { return ex.eq.some(ctx.has) && ex.req.every(ctx.has); }
function loadable(ex, ctx) { return ex.eq.some(q => ['kb', 'db', 'bb', 'cable', 'band', 'mb'].includes(q) && ctx.has(q)); }

function score(ex, role, ctx, slot) {
  let s = 1 + ctx.rnd() * 0.9;
  const t = ex.tier, st = ctx.settings.style;
  const kb = ex.eq.includes('kb') && ctx.has('kb');
  const heavy = ex.eq.some(q => (q === 'bb' || q === 'db') && ctx.has(q));
  if (st === 'simple') s += t === 1 ? 1.2 : t === 2 ? 0.2 : -2.5;
  if (st === 'kettlebell') { if (kb) s += 1.5; if (t === 3) s -= 0.6; }
  if (st === 'gym') { if (heavy) s += 1.3; if (ex.eq.includes('bb') && ctx.has('bb')) s += 0.4; if (t === 3) s -= 0.3; }
  if (st === 'mixed') { s += t === 1 ? 0.4 : t === 2 ? 0.5 : -0.6; if (kb) s += 0.3; if (heavy) s += 0.3; }
  if (ctx.returning && t === 3) s -= 1.4;
  if ((role === 'main' || role === 'sec') && ctx.anyLoad && !loadable(ex, ctx)) s -= 0.9;
  if ((role === 'main' || role === 'sec') && ex.tags.includes('prep')) s -= 1.5;
  if (role === 'cond' && !ex.eq.some(q => q !== 'bb' && ctx.has(q))) s -= 1.5;
  if (!ex.img.length) s -= 0.6; // prefer moves with reference photos when it's close
  if (ctx.used.has(ex.id)) s -= (role === 'main' || role === 'sec') ? 0.8 : 3; // repeat main lifts across the week is fine
  if ((role === 'main' || role === 'sec') && ex.tags.includes('prehab')) s -= 1.2;
  if (slot && slot.bonus) s += ex.tags.filter(x => slot.bonus.includes(x)).length * 0.9;
  if (ctx.regions) s += ex.tags.filter(x => ctx.regions.includes(x)).length * (ctx.regionW || 0.6);
  if (ctx.covered) s -= ex.tags.filter(x => ctx.covered.has(x) && TAG_LABEL[x] && !['prep', 'stretch', 'mobility', 'smr'].includes(x)).length * 0.5;
  return s;
}
function roleOk(ex, role) {
  const d = parseDose(ex.dose);
  if (role === 'main' || role === 'sec') return !ex.tags.includes('stretch') && !ex.tags.includes('smr') && d.unit === 'reps';
  if (role === 'power') return d.unit === 'reps';
  return true;
}
function candidates(slot, role, ctx, exclude) {
  const best = new Map();
  slot.p.forEach((p, i) => {
    for (const ex of EX) {
      if (!ex.tags.includes(p) || exclude.has(ex.id) || !avail(ex, ctx) || !roleOk(ex, role)) continue;
      if (slot.not && ex.tags.some(t => slot.not.includes(t))) continue;
      if (slot.any && !ex.tags.some(t => slot.any.includes(t))) continue;
      if (slot.maxTier && ex.tier > slot.maxTier) continue;
      if (slot.eq && !ex.eq.includes(slot.eq)) continue;
      const sc = score(ex, role, ctx, slot) - i * 2.5;
      if (!best.has(ex.id) || best.get(ex.id) < sc) best.set(ex.id, sc);
    }
  });
  return [...best.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id);
}
function pick(slot, role, ctx, dayUsed) {
  const id = candidates(slot, role, ctx, dayUsed)[0];
  if (!id) return null;
  dayUsed.add(id); ctx.used.add(id);
  return { id: uid(), ex: id, role, slot };
}

const SL = {
  squat: { p: ['squat', 'single'], not: ['power', 'cond'] },
  hinge: { p: ['hinge'], not: ['power'] },
  single: { p: ['single', 'squat'], not: ['power'] },
  lateral: { p: ['lateral', 'single'], not: ['power', 'core', 'prep'] },
  hpush: { p: ['hpush', 'vpush'], not: ['power'] },
  vpush: { p: ['vpush', 'hpush'], not: ['power', 'core', 'mobility', 'cond'] },
  hpull: { p: ['hpull', 'vpull', 'prehab'], any: ['hpull', 'vpull', 'shoulders'] },
  vpull: { p: ['vpull', 'hpull', 'prehab'], not: ['stretch'], any: ['hpull', 'vpull', 'shoulders'] },
  core: { p: ['core'], not: ['cond', 'hpush', 'vpush', 'hpull', 'single'] },
  carry: { p: ['carry', 'core'], not: ['cond', 'hpush', 'vpush', 'hpull', 'single'] },
  prehab: { p: ['prehab'] },
};
const sl = (k, extra) => Object.assign({}, SL[k], extra || {});

// Strength day templates: power, A superset (main), B superset/triplet (sec + core), C accessories (60 min)
const DAYS = {
  S1: { name: 'Squat & Push', focus: 'Squat · Push · Jump', regions: ['hips', 'quads', 'ankles', 'chest', 'shoulders'],
    power: [{ p: ['power'], bonus: ['squat'], not: ['hpush', 'cond'] }, { p: ['power'], bonus: ['hpush'] }],
    A: [['squat', 'main'], ['hpush', 'main']], B: [['single', 'sec'], ['hpull', 'sec'], ['core', 'acc']], C: [['prehab', 'acc'], ['carry', 'acc']] },
  S2: { name: 'Hinge & Pull', focus: 'Hinge · Pull · Ballistic', regions: ['hams', 'back', 'lats', 'glutes', 'tspine'],
    power: [{ p: ['power'], bonus: ['hinge'], not: ['hpush'] }, { p: ['power'], bonus: ['core'] }],
    A: [['hinge', 'main'], ['vpull', 'main']], B: [['lateral', 'sec'], ['vpush', 'sec'], ['core', 'acc']], C: [['prehab', 'acc'], ['carry', 'acc']] },
  S3: { name: 'Athletic Single-Leg', focus: 'Single-leg · Lateral · Rotation', regions: ['groin', 'hips', 'calves', 'glutes', 'tspine'],
    power: [{ p: ['power'], bonus: ['lateral', 'single'], not: ['hpush'] }, { p: ['power'], bonus: ['core'] }],
    A: [['single', 'main', { bonus: ['squat'] }], ['hpull', 'main']], B: [['hinge', 'sec', { bonus: ['single'] }], ['hpush', 'sec'], ['core', 'acc', { bonus: ['lateral'] }]], C: [['lateral', 'acc'], ['carry', 'acc']] },
  // two-day plans are slightly broader
  F1: { name: 'Full Body A', focus: 'Squat · Push · Row', regions: ['hips', 'quads', 'chest', 'back'],
    power: [{ p: ['power'], bonus: ['squat'], not: ['hpush'] }, { p: ['power'], bonus: ['hpush'] }],
    A: [['squat', 'main'], ['hpush', 'main']], B: [['hinge', 'sec', { bonus: ['single'] }], ['hpull', 'sec'], ['core', 'acc']], C: [['lateral', 'acc'], ['carry', 'acc']] },
  F2: { name: 'Full Body B', focus: 'Hinge · Overhead · Pull', regions: ['hams', 'glutes', 'shoulders', 'lats', 'groin'],
    power: [{ p: ['power'], bonus: ['hinge'] }, { p: ['power'], bonus: ['lateral'] }],
    A: [['hinge', 'main'], ['vpull', 'main']], B: [['single', 'sec'], ['vpush', 'sec'], ['core', 'acc']], C: [['prehab', 'acc'], ['carry', 'acc']] },
};
const SPLITS = {
  2: ['F1', 'F2'],
  3: ['S1', 'S2', 'S3'],
  4: ['S1', 'S2', 'MOB', 'S3'],
  5: ['S1', 'S2', 'MOB', 'S3', 'COND'],
};

function pickMany(n, pool, role, ctx, dayUsed, opts = {}) {
  const out = [];
  ctx.covered = new Set();
  for (let i = 0; i < n; i++) {
    const it = pick({ p: pool, not: opts.not, maxTier: opts.maxTier, bonus: opts.bonus }, role, ctx, dayUsed);
    if (!it) break;
    BY[it.ex].tags.forEach(t => ctx.covered.add(t));
    out.push(it);
  }
  ctx.covered = null;
  return out;
}

function genStrengthDay(key, ctx) {
  const T = DAYS[key], L = ctx.settings.length, dayUsed = new Set();
  ctx.regions = T.regions;
  const blocks = [];
  blocks.push({ kind: 'prep', title: 'Warm-up', items: pickMany(L >= 60 ? 5 : L >= 45 ? 4 : 3, ['prep'], 'prep', ctx, dayUsed, { not: ['cond', 'power'], maxTier: 2 }) });
  ctx.regions = null;
  const pw = [pick(sl('x', T.power[0]), 'power', ctx, dayUsed)];
  if (L >= 60) pw.push(pick(sl('x', T.power[1]), 'power', ctx, dayUsed));
  blocks.push({ kind: 'power', title: 'Power', items: pw.filter(Boolean) });
  const mk = arr => arr.map(([k, role, ex]) => pick(sl(k, ex), role, ctx, dayUsed)).filter(Boolean);
  blocks.push({ kind: 'strength', key: 'A', title: 'Strength', items: mk(T.A) });
  const B = mk(L >= 45 ? T.B : T.B.slice(0, 2));
  blocks.push({ kind: 'strength', key: 'B', title: 'Strength', items: B });
  if (L >= 60) blocks.push({ kind: 'strength', key: 'C', title: 'Accessory', items: mk(T.C) });
  if (L >= 45) blocks.push(genCond(ctx, dayUsed, L >= 60 ? 10 : 8));
  ctx.regions = T.regions;
  blocks.push({ kind: 'stretch', title: 'Cool-down', items: pickMany(L >= 60 ? 4 : 3, ['stretch'], 'stretch', ctx, dayUsed) });
  ctx.regions = null;
  return { key, name: T.name, focus: T.focus, blocks: blocks.filter(b => b.kind === 'cond' || b.items.length) };
}

function genCond(ctx, dayUsed, mins, forceFmt) {
  const r = ctx.rnd();
  const fmt = forceFmt || (r < 0.5 ? 'interval' : 'emom');
  const n = fmt === 'emom' && mins >= 10 ? 3 : 2;
  const items = [];
  for (let i = 0; i < n; i++) {
    const it = pick({ p: ['cond', 'power'], not: ['prep'], maxTier: 2, bonus: ['cond'] }, 'cond', ctx, dayUsed);
    if (it) items.push(it);
  }
  if (fmt === 'interval') return { kind: 'cond', title: 'Conditioning', fmt: 'intervals', work: 30, off: 30, rounds: mins, items };
  return { kind: 'cond', title: 'Conditioning', fmt: 'emom', rounds: mins, items };
}

function genMobilityDay(ctx) {
  const dayUsed = new Set(), blocks = [];
  ctx.regions = ['hips', 'tspine', 'hams', 'shoulders', 'groin', 'ankles'];
  blocks.push({ kind: 'flow', title: 'Mobility flow', note: '2 rounds, smooth and controlled', rounds: 2, items: pickMany(6, ['mobility', 'prep'], 'prep', ctx, dayUsed, { not: ['cond', 'power'] }) });
  ctx.regions = ['back', 'glutes', 'lateral'];
  blocks.push({ kind: 'strength', key: 'A', title: 'Stability', items: pickMany(2, ['core'], 'acc', ctx, dayUsed, { not: ['cond'], maxTier: 2 }) });
  if (ctx.has('roller')) { ctx.regions = ['hams', 'quads', 'tspine', 'glutes']; blocks.push({ kind: 'smr', title: 'Foam roll', items: pickMany(3, ['smr'], 'smr', ctx, dayUsed) }); }
  ctx.regions = ['hips', 'hams', 'groin', 'back', 'chest', 'calves'];
  blocks.push({ kind: 'stretch', title: 'Long holds', long: true, items: pickMany(5, ['stretch'], 'stretch', ctx, dayUsed) });
  blocks.push({ kind: 'note', fmt: 'note', mins: 20, title: 'Easy cardio', text: '20–30 min at a conversational pace — walk, bike, row, swim or light jog. Builds your aerobic base and helps recovery.' });
  ctx.regions = null;
  return { key: 'MOB', name: 'Mobility & Recovery', focus: 'Flow · Stability · Long holds', blocks };
}

function genCondDay(ctx) {
  const dayUsed = new Set(), blocks = [];
  ctx.regions = ['hips', 'ankles', 'shoulders'];
  blocks.push({ kind: 'prep', title: 'Warm-up', items: pickMany(4, ['prep'], 'prep', ctx, dayUsed, { not: ['power'], maxTier: 2 }) });
  ctx.regions = null;
  const c = { kind: 'cond', title: 'Circuit', fmt: 'emom', rounds: 16, items: [] };
  [{ p: ['cond', 'power'], bonus: ['hinge'] }, { p: ['squat', 'single'], not: ['power'] }, { p: ['hpush', 'hpull'], not: ['power'] }, { p: ['core', 'cond'], bonus: ['cond'] }]
    .forEach(s => { s.maxTier = 2; const it = pick(s, 'cond', ctx, dayUsed); if (it) c.items.push(it); });
  blocks.push(c);
  blocks.push({ kind: 'strength', key: 'A', title: 'Carry & Core', items: [pick(sl('carry'), 'acc', ctx, dayUsed), pick(sl('core', { bonus: ['lateral'] }), 'acc', ctx, dayUsed)].filter(Boolean) });
  ctx.regions = ['hips', 'hams', 'calves', 'chest'];
  blocks.push({ kind: 'stretch', title: 'Cool-down', items: pickMany(3, ['stretch'], 'stretch', ctx, dayUsed) });
  ctx.regions = null;
  return { key: 'COND', name: 'Engine', focus: 'Conditioning circuit · Carries', blocks };
}

function genDay(key, ctx) {
  if (key === 'MOB') return normSess(genMobilityDay(ctx));
  if (key === 'COND') return normSess(genCondDay(ctx));
  return normSess(genStrengthDay(key, ctx));
}
// Every session = { id, name, focus, blocks: [{ id, title, fmt, rounds, rest, restItem, work, off, mins, note, items: [{ id, ex, role?, sets, n, unit, side, hold, tempo, note }] }] }
function normBlock(b) {
  if (!b.id) b.id = uid();
  if (!b.fmt || b.fmt === 'interval') {
    if (b.kind === 'cond') { if (b.fmt === 'interval') { b.fmt = 'intervals'; b.off = b.rest; delete b.rest; } else b.fmt = 'emom'; }
    else b.fmt = { prep: 'flow', stretch: 'flow', smr: 'flow', flow: 'flow', power: 'sets', strength: 'sets', note: 'note' }[b.kind] || 'sets';
  }
  if (b.fmt === 'emom' && b.kind === 'cond' && b.rest === 0) delete b.rest;
  if (b.fmt === 'note' && b.mins == null) b.mins = 20;
  b.items = b.items || [];
  b.items.forEach(it => { if (!it.id) it.id = uid(); });
  return b;
}
function normSess(s) { if (!s.id) s.id = uid(); s.blocks.forEach(normBlock); return s; }
function generatePlan(settings) {
  const seed = (Math.random() * 2 ** 31) | 0;
  const ctx = ctxFor(settings, seed);
  const days = SPLITS[settings.days].map(k => genDay(k, ctx));
  return { id: uid(), created: new Date().toISOString(), seed, week: 1, days, done: {} };
}

/* ---------- phases & dosing ---------- */
function phase(w) {
  if (w <= 2) return { key: 're', name: 'Re-entry', power: 3, mainSets: 3, mainReps: 8, secSets: 2, secReps: 10, accSets: 2, holdAdd: 0, rpe: '6–7', mainRest: 90, bwMult: 1,
    note: 'Ease back in. Finish every set feeling like you had 3–4 more reps in you. Own the positions and use full range.' };
  if (w <= 5) { const k = w - 3; return { key: 'build', name: 'Build', power: 4, mainSets: [4, 4, 5][k], mainReps: [8, 6, 5][k], secSets: 3, secReps: [10, 8, 8][k], accSets: 3, holdAdd: [5, 10, 15][k], rpe: ['7', '7–8', '8'][k], mainRest: 120, bwMult: [1.1, 1.2, 1.3][k],
    note: 'Add a little load or a rep each week while form stays sharp. Stop about 2 reps before failure.' }; }
  return { key: 'deload', name: 'Deload', power: 2, mainSets: 2, mainReps: 6, secSets: 2, secReps: 8, accSets: 2, holdAdd: 0, rpe: '6', mainRest: 90, bwMult: 0.8,
    note: 'Lighter week — same moves, about 60% of the work. Let your body catch up, then start a fresh block.' };
}
function dose(item, week) {
  const ex = BY[item.ex], d = parseDose(ex.dose), P = phase(week), ctx = ctxFor(S.settings);
  let sets = 1, n = d.n;
  const bwOnly = !loadable(ex, ctx);
  switch (item.role) {
    case 'power': sets = P.power; if (d.unit === 'reps') n = Math.min(d.n, d.side ? 4 : 5); break;
    case 'main': sets = P.mainSets; if (d.unit === 'reps') n = bwOnly ? Math.max(3, Math.round(d.n * P.bwMult)) : P.mainReps; break;
    case 'sec': sets = P.secSets; if (d.unit === 'reps') n = bwOnly ? Math.max(3, Math.round(d.n * P.bwMult)) : P.secReps; break;
    case 'acc': sets = P.accSets; if (d.unit === 'sec') n = d.n + P.holdAdd; else if (d.unit === 'reps' && bwOnly) n = Math.max(3, Math.round(d.n * P.bwMult)); break;
    default: sets = 1;
  }
  if (d.unit === 'reps' && d.side && (item.role === 'main' || item.role === 'sec') && !bwOnly && n >= 10) n -= 2; // per-side work: trim high reps
  return { sets, n, unit: d.unit, side: d.side, rpe: (item.role === 'main' || item.role === 'sec') ? P.rpe : null };
}
// The prescription actually used for an item: plan items progress by week (role + week),
// and any field set on the item itself (sets, n, unit, side, hold, tempo, note) overrides that.
const RX_KEYS = ['sets', 'n', 'unit', 'side', 'hold', 'tempo', 'note', 'rpe'];
function rx(it, week) {
  const ex = BY[it.ex] || { dose: '10' };
  let r;
  if (it.role && week) r = dose(it, week);
  else { const d = parseDose(ex.dose); r = { sets: 1, n: d.n, unit: d.unit, side: d.side, rpe: null }; }
  for (const k of RX_KEYS) if (it[k] !== undefined && it[k] !== null && it[k] !== '') r[k] = it[k];
  return r;
}
const hasOverride = it => RX_KEYS.some(k => it[k] !== undefined);
function amtTxt(r) { return r.unit === 'sec' ? r.n + 's' : r.unit === 'm' ? r.n + 'm' : r.n + ' reps'; }
function rxTxt(r, o = {}) {
  const sets = o.noSets ? 1 : r.sets;
  let t = (sets > 1 ? sets + ' × ' + (r.unit === 'reps' ? r.n : amtTxt(r)) : amtTxt(r)) + (r.side ? ' / side' : '');
  if (r.hold && r.unit === 'reps') t += ` · ${r.hold}s pause`;
  if (r.tempo) t += ` · tempo ${r.tempo}`;
  if (o.rpe !== false && r.rpe) t += ' · RPE ' + r.rpe;
  return t;
}
function blockRest(b, week) {
  const items = b.items || [];
  if (b.rest != null) return { rest: b.rest, short: b.restItem != null ? b.restItem : (items.length > 1 && b.fmt === 'sets' ? 30 : 0) };
  if (b.fmt === 'circuit') return { rest: 60, short: b.restItem || 0 };
  const P = phase(week || 3);
  if (b.kind === 'power') return { rest: 90, short: 30 };
  if (b.fmt === 'sets') {
    const main = items.some(i => i.role === 'main');
    return { rest: main ? P.mainRest : 75, short: b.restItem != null ? b.restItem : items.length > 1 ? 30 : 0 };
  }
  return { rest: 0, short: 0 };
}
function clockTxt(b) {
  if (b.fmt === 'intervals') return `${b.rounds} rounds · ${b.work}s on / ${b.off}s off`;
  if (b.fmt === 'amrap') return `AMRAP ${b.mins} min`;
  return `EMOM ${b.rounds} min · rotate each minute`;
}
function clockItemTxt(it, b, w) {
  const r = rx(it, w), explicit = it.n != null;
  if (b.fmt === 'intervals' && !explicit) return b.work + 's of work';
  let n = r.n;
  if (!explicit) n = r.unit === 'sec' ? Math.min(n, 40) : r.unit === 'reps' ? clamp(n, 5, 15) : n;
  return rxTxt(Object.assign({}, r, { n, sets: 1 }), { rpe: false });
}
function itemTxt(it, b, w) {
  if (CLOCK.includes(b.fmt)) return clockItemTxt(it, b, w);
  const r = rx(it, w);
  if (b.fmt === 'flow') { if (b.long && r.unit === 'sec') r.n = Math.max(60, r.n); return rxTxt(r, { noSets: true, rpe: false }); }
  return rxTxt(r, { noSets: b.fmt === 'circuit' });
}
function blockDesc(b, w) {
  const { rest, short } = blockRest(b, w), n = (b.items || []).length;
  switch (b.fmt) {
    case 'sets': return (n > 2 ? 'Tri-set · ' : n > 1 ? 'Superset · ' : '') + `rest ${rest}s`;
    case 'circuit': return `${b.rounds || 1} rounds · rest ${rest}s${short ? ` · ${short}s between` : ''}`;
    case 'flow': return `Follow-along${(b.rounds || 1) > 1 ? ` · ${b.rounds} rounds` : ''}`;
    case 'note': return b.mins ? b.mins + ' min' : '';
    default: return clockTxt(b);
  }
}
const loadEx = ex => ex.eq.some(q => ['kb', 'db', 'bb', 'cable', 'mb'].includes(q));
// rough seconds per rep, so slow control work isn't estimated like a squat
function repSecs(ex) {
  if (!ex) return 3.5;
  if (/get-up/i.test(ex.name)) return /half/i.test(ex.name) ? 12 : 25;
  if (ex.tags.includes('cars')) return 10;
  if (ex.tags.includes('control') || ex.tags.includes('lmob')) return 6;
  if (ex.tags.includes('mobility')) return 5;
  if (ex.tags.includes('power')) return 3;
  return 3.5;
}
function workSecs(r, ex) {
  const sides = r.side ? 2 : 1;
  if (r.unit === 'sec') return r.n * sides;
  if (r.unit === 'm') return Math.max(25, r.n * 1.2) * sides;
  return r.n * sides * (repSecs(ex) + (r.hold || 0)) + 10;
}
function stepSecs(r) {
  if (r.unit === 'sec') return { secs: r.n, side: r.side };
  if (r.unit === 'm') return { secs: 30, side: r.side };
  return { secs: clamp(Math.round(r.n * ((r.side ? 5 : 4) + (r.hold || 0))), 25, 120), side: r.side, reps: r.n };
}
function estSecs(sess, w) {
  let t = 0;
  for (const b of sess.blocks) {
    const its = b.items || [], R = b.rounds || 1;
    const { rest, short } = blockRest(b, w);
    const ws = it => workSecs(rx(it, w), BY[it.ex]);
    if (b.fmt === 'note') t += (b.mins || 0) * 60;
    else if (b.fmt === 'emom') t += R * 60 + 60;
    else if (b.fmt === 'intervals') t += R * ((b.work || 30) + (b.off || 0)) + 60;
    else if (b.fmt === 'amrap') t += (b.mins || 10) * 60 + 60;
    else if (b.fmt === 'flow') t += R * its.reduce((a, it) => { const r = rx(it, w), st = stepSecs(r); const sec = b.long && r.unit === 'sec' ? Math.max(60, st.secs) : st.secs; return a + (sec + 8) * (st.side ? 2 : 1); }, 0);
    else if (b.fmt === 'circuit') { if (its.length) t += R * (its.reduce((a, it) => a + ws(it) + 10, 0) + short * (its.length - 1) + rest) - rest + 30; }
    else its.forEach(it => { const r = rx(it, w), rr = its.length > 1 ? (rest + short * (its.length - 1)) / its.length : rest; t += r.sets * (ws(it) + rr) + 20; });
  }
  return t;
}
function estimate(sess, w) { return Math.max(5, Math.round(estSecs(sess, w) / 300) * 5); }

/* =========================================================
   Quick-session generator: focus recipes built from block builders
   ========================================================= */
const ENERGY = {
  low:    ['Low', 'Easier day — fewer rounds, lighter'],
  normal: ['Normal', 'Solid, sustainable session'],
  high:   ['High', 'Feeling good — more volume'],
};
function baseRx(id, mult = 1) {
  const d = parseDose(BY[id].dose);
  let n = d.n;
  if (d.unit === 'reps') n = Math.max(2, Math.round(n * mult));
  else if (d.unit === 'sec') n = Math.max(10, Math.round(n * mult / 5) * 5);
  return { sets: 1, n, unit: d.unit, side: d.side };
}
function fixRx(it, wk) { const d = dose(it, wk); Object.assign(it, { sets: d.sets, n: d.n, unit: d.unit, side: d.side }); if (d.rpe) it.rpe = d.rpe; return it; }
function pickOne(slot, role, ctx, used) { return pick(slot, role, ctx, used); }

const GB = {
  warm(ctx, used, o, Q) {
    ctx.regions = o.regions;
    const items = pickMany(o.n || (Q.L >= 45 ? 4 : 3), o.pool || ['prep'], 'prep', ctx, used, { not: o.allowPower ? ['cond'] : ['cond', 'power'], maxTier: 2, bonus: o.bonus })
      .map(it => Object.assign(it, baseRx(it.ex)));
    ctx.regions = null;
    return { title: o.title || 'Warm-up', kind: 'prep', fmt: 'flow', rounds: o.rounds || 1, items };
  },
  joints(ctx, used, o, Q) {
    ctx.regions = o.regions || ['hips', 'tspine', 'shoulders', 'groin'];
    const items = pickMany(o.n || 3, ['mobility', 'cars'], 'prep', ctx, used, { not: ['cond', 'power', 'core', 'stretch', 'smr'], maxTier: 2, bonus: ['cars', 'tspine', 'hips'] })
      .map(it => Object.assign(it, baseRx(it.ex)));
    ctx.regions = null;
    return { title: o.title || 'Joint prep', kind: 'flow', fmt: 'flow', rounds: o.rounds || 2, note: 'Slow and deliberate — explore the end ranges.', items };
  },
  power(ctx, used, o, Q) {
    const items = o.slots.slice(0, o.n || 1).map(sl_ => pick(Object.assign({ p: ['power'] }, sl_, { maxTier: Q.returning ? 2 : 3 }), 'power', ctx, used)).filter(Boolean).map(it => fixRx(it, Q.wk));
    return { title: 'Power', kind: 'power', fmt: 'sets', note: 'Fast and crisp — quality over fatigue. Full rest.', items };
  },
  sets(ctx, used, o, Q) {
    const items = o.slots.map(([k, role, extra]) => pick(sl(k, extra), role, ctx, used)).filter(Boolean).map(it => fixRx(it, Q.wk));
    return { title: o.title || 'Strength', key: o.key, kind: 'strength', fmt: 'sets', items };
  },
  circuit(ctx, used, o, Q) {
    const items = o.slots.filter(Boolean).map(sl_ => {
      const it = pick(Object.assign({}, sl_, o.kbOnly ? { eq: 'kb' } : {}), sl_.role || 'acc', ctx, used);
      return it && Object.assign(it, baseRx(it.ex, Q.mult), sl_.over || {});
    }).filter(Boolean);
    return { title: o.title || 'Circuit', key: o.key, kind: 'circuit', fmt: 'circuit', rounds: clamp((o.rounds || 3) + Q.r, 1, 6), rest: o.rest != null ? o.rest : 60, restItem: o.restItem || 0, note: o.note, items };
  },
  clock(ctx, used, o, Q) {
    const f = o.fmt || (ctx.rnd() < 0.5 ? 'intervals' : 'emom');
    const slots = o.mixed
      ? [{ p: ['cond', 'power'], bonus: ['hinge'] }, { p: ['squat', 'single'], not: ['power'] }, { p: ['hpush', 'hpull'], not: ['power', 'prehab'] }, { p: ['core', 'cond'], bonus: ['cond'] }].slice(0, o.n || 4)
      : Array.from({ length: o.n || 2 }, () => ({ p: o.pool || ['cond', 'power'], not: ['prep'], bonus: o.bonus || ['cond'] }));
    const items = slots.map(sl_ => pick(Object.assign({ maxTier: 2 }, sl_, o.kbOnly ? { eq: 'kb' } : {}), 'cond', ctx, used)).filter(Boolean).map(it => {
      const b = baseRx(it.ex, Q.mult);
      if (b.unit === 'reps') b.n = clamp(b.n, 5, 15); else if (b.unit === 'sec') b.n = Math.min(b.n, 40);
      return f === 'intervals' ? it : Object.assign(it, b);
    });
    const mins = clamp(o.mins + Q.r * 2, 4, 30);
    const base = { title: o.title || 'Conditioning', kind: 'cond', fmt: f, items };
    if (f === 'intervals') { const w = o.work || (Q.E === 'high' ? 40 : 30), off = o.off || (Q.E === 'high' ? 20 : 30); return Object.assign(base, { work: w, off, rounds: Math.max(4, Math.round(mins * 60 / (w + off))) }); }
    if (f === 'amrap') return Object.assign(base, { mins });
    return Object.assign(base, { rounds: mins });
  },
  holds(ctx, used, o, Q) {
    ctx.regions = o.regions;
    const items = pickMany(o.n || 3, o.pool || ['stretch'], 'stretch', ctx, used).map(it => {
      const b = baseRx(it.ex);
      if (b.unit === 'sec') b.n = Math.max(b.n, o.secs || 40);
      return Object.assign(it, b);
    });
    ctx.regions = null;
    return { title: o.title || 'Cool-down', kind: 'stretch', fmt: 'flow', items };
  },
  breath(ctx, used, o, Q) {
    const it = pick({ p: ['breath'] }, 'stretch', ctx, used);
    if (!it) return null;
    Object.assign(it, baseRx(it.ex), { n: o.secs || 120 });
    return { title: 'Breathe', kind: 'stretch', fmt: 'flow', note: 'Nose in, long slow exhale. Let your heart rate come right down.', items: [it] };
  },
  note(ctx, used, o) { return { title: o.title || 'Easy cardio', kind: 'note', fmt: 'note', mins: o.mins || 10, text: o.text || 'Walk, bike, row or easy jog at a conversational pace. Helps recovery and builds your aerobic base.', items: [] }; },
  smr(ctx, used, o, Q) {
    if (!ctx.has('roller')) return null;
    ctx.regions = o.regions || ['hams', 'quads', 'tspine', 'glutes'];
    const items = pickMany(o.n || 3, ['smr'], 'smr', ctx, used).map(it => Object.assign(it, baseRx(it.ex)));
    ctx.regions = null;
    return { title: 'Foam roll', kind: 'smr', fmt: 'flow', items };
  },
};

const RECIPES = {
  strength: { name: 'Strength & Power', blurb: 'Jumps, heavy supersets, short finisher',
    build: Q => { const T = DAYS[['S1', 'S2', 'S3'][Math.floor(Q.rnd() * 3)]]; return [
      ['warm', { regions: T.regions }],
      Q.L >= 30 && ['power', { n: Q.L >= 60 ? 2 : 1, slots: T.power }],
      ['sets', { key: 'A', slots: T.A }],
      ['sets', { key: 'B', slots: Q.L >= 45 ? T.B : T.B.slice(0, 2) }],
      Q.L >= 60 && ['sets', { key: 'C', title: 'Accessory', slots: T.C }],
      Q.L >= 45 && ['clock', { mins: Q.L >= 60 ? 10 : 6, title: 'Finisher' }],
      ['holds', { regions: T.regions, n: 3 }],
    ]; } },
  control: { name: 'Mobility & Control', blurb: 'Joint flows, loaded mobility, get-ups, carries, long holds',
    build: Q => [
      ['joints', { n: Q.L >= 45 ? 3 : 2, rounds: 2, title: 'Joint flow' }],
      ['circuit', { title: 'Loaded mobility & core', key: 'A', rounds: Q.L >= 45 ? 3 : 2, rest: 45,
        note: 'Slow and controlled — own every position. Light to moderate load.', slots: [
          { p: ['lmob'], bonus: ['squat', 'groin'], any: ['squat', 'hips', 'groin', 'hams'] },
          { p: ['lmob', 'control'], bonus: ['shoulders', 'lmob'], any: ['shoulders', 'tspine'], not: ['carry'] },
          { p: ['core'], bonus: ['control'], not: ['cond', 'power', 'hpush', 'hpull', 'vpush', 'single', 'lateral', 'carry'] },
          Q.L >= 30 && { p: ['control', 'single'], bonus: ['control', 'hinge'], any: ['single'], not: ['power', 'cond', 'carry'] },
        ] }],
      Q.L >= 30 && ['circuit', { title: 'Body control & carries', key: 'B', rounds: Q.L >= 60 ? 3 : 2, rest: 45, slots: [
          { p: ['control'], bonus: ['core', 'shoulders'], any: ['core', 'shoulders'], not: ['carry', 'single', 'prep', 'vpush'] },
          { p: ['carry'], bonus: ['control'] },
        ] }],
      Q.L >= 60 && ['smr', { n: 2 }],
      ['holds', { title: 'Down-regulate', n: Q.L >= 45 ? 2 : 1, secs: 90, regions: ['groin', 'hams', 'tspine', 'quads'] }],
      Q.L >= 30 && ['breath', { secs: 90 }],
    ] },
  kettlebell: { name: 'Kettlebell', blurb: 'Swings, complexes, get-ups and carries', needs: 'kb',
    build: Q => [
      ['warm', { regions: ['hips', 'shoulders', 'tspine'], bonus: ['lmob'] }],
      ['power', { n: 1, slots: [{ p: ['power'], any: ['hinge'], bonus: ['hinge'], eq: 'kb' }] }],
      ['circuit', { title: 'KB complex', key: 'A', rounds: Q.L >= 45 ? 4 : 3, rest: 90, kbOnly: true,
        note: 'One bell. Move straight from one exercise to the next — rest only after the round.', slots: [
          { p: ['power', 'hinge'], any: ['hinge'], bonus: ['power'], not: ['cond'] },
          { p: ['vpush'], not: ['power', 'core', 'prehab'] },
          { p: ['squat', 'single'], not: ['power', 'cond'] },
          { p: ['hpull'], not: ['prehab'] },
        ] }],
      Q.L >= 45 && ['clock', { fmt: 'emom', mins: Q.L >= 60 ? 12 : 8, title: 'Swing EMOM', kbOnly: true, n: 2, pool: ['cond', 'power'], bonus: ['hinge'] }],
      Q.L >= 30 && ['circuit', { title: 'Get-up & carry', key: 'B', rounds: 2, rest: 45, kbOnly: true, slots: [
          { p: ['control'], any: ['core', 'shoulders'], bonus: ['shoulders'], not: ['carry', 'single'] },
          { p: ['carry'] },
        ] }],
      ['holds', { n: Q.L >= 45 ? 3 : 2, regions: ['hips', 'hams', 'shoulders'] }],
    ] },
  athletic: { name: 'Athletic', blurb: 'Jumps, bounds, single-leg & lateral, speed',
    build: Q => [
      ['warm', { n: Q.L >= 45 ? 5 : 4, regions: ['hips', 'ankles', 'calves', 'groin'], bonus: ['lateral'], allowPower: true }],
      ['power', { n: 2, slots: [{ p: ['power'], bonus: ['lateral', 'single'], not: ['hpush'] }, { p: ['power'], bonus: ['squat'], not: ['hpush', 'lateral'] }] }],
      ['sets', { key: 'A', slots: [['single', 'main', { bonus: ['squat'] }], ['lateral', 'sec']] }],
      Q.L >= 45 && ['sets', { key: 'B', slots: [['hinge', 'sec', { bonus: ['single'] }], ['core', 'acc', { bonus: ['lateral'] }]] }],
      Q.L >= 30 && ['clock', { fmt: 'intervals', work: 15, off: 45, mins: Q.L >= 60 ? 10 : 6, title: 'Speed', n: 2, pool: ['cond', 'power'], bonus: ['lateral'] }],
      ['holds', { n: 3, regions: ['hips', 'groin', 'calves', 'hams'] }],
    ] },
  engine: { name: 'Engine', blurb: 'Conditioning — intervals, EMOM or AMRAP',
    build: Q => [
      ['warm', { n: 4, regions: ['hips', 'ankles', 'shoulders'] }],
      ['clock', { fmt: 'intervals', mins: Q.L >= 45 ? 12 : Q.L >= 30 ? 8 : 10, n: 3, title: 'Intervals' }],
      Q.L >= 30 && ['clock', { fmt: Q.rnd() < 0.5 ? 'amrap' : 'emom', mins: Q.L >= 60 ? 16 : Q.L >= 45 ? 12 : 8, n: Q.L >= 45 ? 4 : 3, mixed: true, title: 'Circuit' }],
      Q.L >= 45 && ['circuit', { title: 'Carry & core', rounds: 2, rest: 30, slots: [{ p: ['carry', 'core'], not: ['cond'] }, { p: ['core'], bonus: ['lateral'], not: ['cond', 'carry', 'mobility', 'control'] }] }],
      ['holds', { n: 3, regions: ['hips', 'hams', 'calves', 'chest'] }],
    ] },
  lower: { name: 'Lower Body', blurb: 'Squat, hinge, single-leg, jumps',
    build: Q => [
      ['warm', { regions: ['hips', 'ankles', 'hams', 'groin'] }],
      Q.L >= 30 && ['power', { n: 1, slots: [{ p: ['power'], bonus: ['squat', 'hinge'], not: ['hpush', 'vpush'] }] }],
      ['sets', { key: 'A', slots: [['squat', 'main'], ['core', 'acc']] }],
      ['sets', { key: 'B', slots: Q.L >= 45 ? [['hinge', 'main'], ['single', 'sec']] : [['hinge', 'main']] }],
      Q.L >= 45 && ['sets', { key: 'C', title: 'Accessory', slots: [['lateral', 'acc'], ['carry', 'acc']] }],
      ['holds', { n: 3, regions: ['hips', 'hams', 'quads', 'calves'] }],
    ] },
  upper: { name: 'Upper Body', blurb: 'Push, pull, overhead, shoulder health',
    build: Q => [
      ['warm', { regions: ['shoulders', 'tspine', 'chest'] }],
      Q.L >= 45 && ['power', { n: 1, slots: [{ p: ['power'], bonus: ['hpush', 'vpush'], any: ['hpush', 'vpush', 'core'] }] }],
      ['sets', { key: 'A', slots: [['hpush', 'main'], ['vpull', 'main']] }],
      ['sets', { key: 'B', slots: [['vpush', 'sec'], ['hpull', 'sec']] }],
      Q.L >= 45 && ['sets', { key: 'C', title: 'Shoulders & core', slots: [['prehab', 'acc'], ['core', 'acc']] }],
      ['holds', { n: 3, regions: ['chest', 'lats', 'shoulders', 'tspine'] }],
    ] },
  recovery: { name: 'Recovery', blurb: 'Gentle flow, foam rolling, long holds, breathing',
    build: Q => [
      Q.L >= 45 && ['note', { mins: Q.L >= 60 ? 15 : 10 }],
      ['joints', { n: Q.L >= 45 ? 5 : 4, rounds: Q.L >= 30 ? 2 : 1, title: 'Mobility flow', regions: ['hips', 'tspine', 'hams', 'shoulders', 'ankles'] }],
      Q.L >= 30 && ['smr', { n: 3 }],
      ['holds', { n: Q.L >= 60 ? 6 : Q.L >= 45 ? 5 : 3, secs: 60, title: 'Long holds', regions: ['hips', 'hams', 'groin', 'back', 'chest', 'calves'] }],
      ['breath', { secs: 120 }],
    ] },
};
function quickQ(opts, rnd) {
  const ret = S.settings.level === 'returning', E = opts.energy;
  return { L: opts.mins, E, rnd, returning: ret,
    wk: E === 'low' ? 1 : E === 'high' ? (ret ? 3 : 4) : (ret ? 2 : 3),
    r: E === 'low' ? -1 : E === 'high' ? 1 : 0, mult: E === 'low' ? 0.8 : E === 'high' ? 1.2 : 1 };
}
function quickCtx(opts, seed, used) {
  const settings = Object.assign({}, S.settings, { eq: opts.eq || S.settings.eq, length: opts.mins });
  if (opts.focus === 'kettlebell') settings.style = 'kettlebell';
  return ctxFor(settings, seed, used);
}
function generateQuick(opts) {
  const R = RECIPES[opts.focus], seed = (Math.random() * 2 ** 31) | 0, ctx = quickCtx(opts, seed), Q = quickQ(opts, ctx.rnd), used = new Set();
  const blocks = R.build(Q).filter(Boolean).map(([b, o]) => {
    const blk = GB[b](ctx, used, o, Q);
    if (!blk || (!blk.items.length && blk.fmt !== 'note')) return null;
    blk.gen = { b, o };
    return blk;
  }).filter(Boolean);
  const sess = normSess({ id: uid(), name: R.name, focus: `${opts.mins} min · ${ENERGY[opts.energy][0]} energy`, q: opts, blocks });
  fitTime(sess, opts.mins);
  return sess;
}
// Nudge rounds / sets / hold times until the session lands near the time asked for.
function blockKnobs(b) {
  const secItems = () => b.items.filter(i => i.unit === 'sec');
  switch (b.fmt) {
    case 'circuit': return { grow: () => b.rounds < 5 && ++b.rounds, shrink: () => b.rounds > 1 && b.rounds-- };
    case 'sets': return {
      grow: () => { const it = b.items.find(i => i.sets < (i.role === 'main' ? 5 : 4)); return it ? ++it.sets : false; },
      shrink: () => { const its = b.items.filter(i => i.sets > 2); its.forEach(i => i.sets--); return its.length > 0; } };
    case 'emom': return { grow: () => b.rounds < 20 && (b.rounds += 2), shrink: () => b.rounds > 5 && (b.rounds -= 2) };
    case 'intervals': return { grow: () => b.rounds < 24 && (b.rounds += 2), shrink: () => b.rounds > 4 && (b.rounds -= 2) };
    case 'amrap': return { grow: () => b.mins < 20 && (b.mins += 2), shrink: () => b.mins > 5 && (b.mins -= 2) };
    case 'flow':
      if (b.kind === 'prep') return { grow: () => false, shrink: () => b.items.length > 2 && b.items.pop() };
      if (b.kind === 'flow') return { grow: () => (b.rounds || 1) < 3 && (b.rounds = (b.rounds || 1) + 1), shrink: () => (b.rounds || 1) > 1 && b.rounds-- };
      return {
        grow: () => { const its = secItems().filter(i => i.n < 120); its.forEach(i => i.n += 15); return its.length > 0; },
        shrink: () => { const its = secItems().filter(i => i.n >= 45); its.forEach(i => i.n -= 15); return its.length > 0 || (b.items.length > 1 && b.items.pop()); } };
  }
  return null;
}
function fitTime(sess, mins) {
  const target = mins * 60, main = b => ['sets', 'circuit', ...CLOCK].includes(b.fmt) && b.kind !== 'power';
  const growOrder = [...sess.blocks.filter(main), ...sess.blocks.filter(b => !main(b))];
  const shrinkOrder = [...sess.blocks.filter(b => CLOCK.includes(b.fmt)), ...sess.blocks.filter(b => b.fmt === 'flow'), ...sess.blocks.filter(b => !CLOCK.includes(b.fmt) && b.fmt !== 'flow')];
  let i = 0, fails = 0;
  for (let guard = 0; guard < 80; guard++) {
    const t = estSecs(sess), diff = t - target;
    if (Math.abs(diff) <= 150) return;
    const order = diff > 0 ? shrinkOrder : growOrder;
    const k = blockKnobs(order[i++ % order.length]);
    if (k && k[diff > 0 ? 'shrink' : 'grow']()) fails = 0; else if (++fails > order.length) return;
  }
}
function rerollBlock(sess, b) {
  if (!b.gen || !sess.q) return;
  const used = new Set(sess.blocks.filter(x => x !== b).flatMap(x => x.items.map(i => i.ex)));
  const ctx = quickCtx(sess.q, (Math.random() * 2 ** 31) | 0, new Set(used)), Q = quickQ(sess.q, ctx.rnd);
  const nb = GB[b.gen.b](ctx, used, b.gen.o, Q);
  if (!nb || !nb.items.length) { toast('No other options with your equipment'); return; }
  nb.gen = b.gen; nb.id = b.id;
  normBlock(nb);
  sess.blocks[sess.blocks.indexOf(b)] = nb;
}

/* =========================================================
   Mobility flows (standalone)
   ========================================================= */
const ROUTINES = [
  { id: 'wake', name: 'Morning Wake-Up', mins: 8, focus: ['tspine', 'hips', 'back', 'shoulders'], type: 'dynamic', blurb: 'Loosen everything up — no equipment.' },
  { id: 'hips', name: 'Hips & Hamstrings', mins: 12, focus: ['hips', 'hams', 'groin', 'glutes'], type: 'mix', blurb: 'For tight hips, low back and hamstrings.' },
  { id: 'upper', name: 'Shoulders & Upper Back', mins: 10, focus: ['shoulders', 'tspine', 'chest', 'lats'], type: 'mix', blurb: 'Undo the desk posture.' },
  { id: 'full', name: 'Full-Body Flow', mins: 15, focus: ['hips', 'tspine', 'hams', 'shoulders', 'ankles', 'groin'], type: 'mix', blurb: 'Head-to-toe mobility session.' },
  { id: 'cool', name: 'Post-Workout Stretch', mins: 8, focus: ['hips', 'hams', 'quads', 'chest', 'calves'], type: 'static', blurb: 'Static holds to wind down.' },
  { id: 'roll', name: 'Foam Roll Recovery', mins: 10, focus: ['quads', 'hams', 'calves', 'tspine', 'glutes'], type: 'smr', blurb: 'Self-massage + a few holds.', needs: 'roller' },
];
const FOCUS_OPTS = [['hips', 'Hips'], ['hams', 'Hamstrings'], ['groin', 'Groin'], ['ankles', 'Ankles & calves'], ['tspine', 'T-spine'], ['shoulders', 'Shoulders'], ['back', 'Low back'], ['quads', 'Quads']];

function itemSecs(ex) { return stepSecs(rx({ ex: ex.id }, null)); }
function buildFlow(opts, seed) {
  const ctx = ctxFor(S.settings, seed);
  ctx.regions = opts.focus.flatMap(f => f === 'ankles' ? ['ankles', 'calves'] : [f]);
  ctx.regionW = 1.4;
  const target = opts.mins * 60, used = new Set(), dyn = [], stat = [];
  const pools = opts.type === 'dynamic' ? [['mobility', 'prep']] : opts.type === 'static' ? [['stretch']] : opts.type === 'smr' ? [['smr'], ['stretch']] : [['mobility', 'prep'], ['stretch']];
  let total = 0;
  const cost = ex => { const t = itemSecs(ex); return t.secs * (t.side ? 2 : 1) + 6; };
  let guard = 0;
  while (total < target && guard++ < 40) {
    const which = pools.length === 1 ? 0 : (opts.type === 'smr' ? (dyn.length < Math.max(3, Math.round(opts.mins / 2.2)) ? 0 : 1) : (dyn.length <= stat.length ? 0 : 1));
    ctx.covered = new Set([...dyn, ...stat].flatMap(id => BY[id].tags));
    const c = candidates({ p: pools[which], not: ['cond', 'power', 'core', 'lmob', 'control', 'breath'] }, 'prep', ctx, used)[0];
    if (!c) { if (pools.length > 1 && which === 0) { pools.splice(0, 1); continue; } break; }
    used.add(c); (which === 0 ? dyn : stat).push(c); total += cost(BY[c]);
  }
  return [...dyn, ...stat];
}
// entries: [{ ex, r }] where r is a resolved prescription (see rx)
function flowSteps(entries, minSecs = 0) {
  const steps = [];
  entries.forEach(({ ex: id, r }) => {
    const t = stepSecs(r);
    if (minSecs && !t.reps) t.secs = Math.max(t.secs, minSecs);
    const lbl = [t.reps ? `${t.reps} reps${t.side ? ' / side' : ''}${r.hold ? ` · ${r.hold}s pause` : ''}` : '', r.tempo ? 'tempo ' + r.tempo : ''].filter(Boolean).join(' · ');
    const base = { ex: id, secs: t.secs, sub: lbl, note: r.note || '' };
    if (t.side) { steps.push(Object.assign({}, base, { label: 'Left side' })); steps.push(Object.assign({}, base, { label: 'Right side', sw: true })); }
    else steps.push(Object.assign({}, base, { label: '' }));
  });
  return steps;
}
const idEntries = ids => ids.map(id => ({ ex: id, r: rx({ ex: id }, null) }));

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
function route() {
  const parts = (location.hash || '#/plan').slice(2).split('/');
  let name = parts[0] || 'plan';
  if (!VIEWS[name]) name = 'plan';
  current = name;
  document.querySelectorAll('#tabbar a').forEach(a => a.classList.toggle('on', a.dataset.tab === (['day', 'setup', 's', 'quick'].includes(name) ? 'plan' : name)));
  VIEWS[name](parts[1]);
  window.scrollTo(0, 0);
}
function rerender() { const y = window.scrollY; const parts = (location.hash || '#/plan').slice(2).split('/'); (VIEWS[current] || VIEWS.plan)(parts[1]); window.scrollTo(0, y); }

/* ---------- Train (home) ---------- */
const PLAY = ICON.play.replace('<svg', '<svg style="fill:currentColor;stroke:none"');
function thumbsOf(sess, n = 6) { return sess.blocks.filter(b => b.fmt !== 'note').flatMap(b => b.items).filter(it => BY[it.ex]).slice(0, n); }
function sessCard(sess, href, eyebrow, done) {
  return `<a class="card daycard ${done ? 'done' : ''}" href="${href}">
    <div class="row"><div class="grow"><div class="eyebrow">${eyebrow}</div><div class="title">${esc(sess.name)}</div>${sess.focus ? `<div class="muted small">${esc(sess.focus)}</div>` : ''}</div>${done ? '<span class="pill-done">DONE</span>' : ''}</div>
    <div class="strip">${thumbsOf(sess).map(it => ph(BY[it.ex])).join('')}</div>
  </a>`;
}
VIEWS.plan = () => {
  setTop(`<h1>Train</h1><a class="icon-btn" href="#/setup" aria-label="Settings">${ICON.gear}</a>`);
  const P = S.plan, A = S.active, ad = A && activeDay();
  let html = ad ? `<div class="card" style="border-color:rgba(200,245,96,.4);margin-bottom:12px"><div class="row"><div class="grow"><div class="eyebrow" style="color:var(--acc)">In progress</div><b>${esc(ad.name)}</b> <span class="muted small" id="activeEl">${fmtLong((now() - A.start) / 1000)}</span></div><button class="btn pri sm" data-act="resume">Resume</button></div></div>` : '';
  if (!P) {
    html += `<div class="card phase" style="padding:20px">
        <div class="eyebrow">6-week plan</div>
        <div style="font-size:24px;font-weight:800;letter-spacing:-.02em;line-height:1.15;margin:8px 0 6px">Build an athletic, full-body plan</div>
        <p class="muted small" style="margin:0 0 16px">Pick your days, time and equipment. A 6-week block that eases you back in, then builds.</p>
        <a class="btn pri block" href="#/setup">Build my plan</a>
      </div>`;
  } else {
    const w = P.week, ph_ = phase(w);
    html += `<div class="card phase">
      <div class="row" style="align-items:flex-start">
        <div class="grow"><div class="eyebrow">Plan · Week ${w} of ${BLOCK_WEEKS}</div><div class="wk" style="margin-top:6px">${ph_.name}</div><div class="muted small" style="margin-top:4px">Target effort RPE ${ph_.rpe}</div></div>
        <div class="row" style="gap:6px">
          <button class="icon-btn" data-act="week" data-d="-1" aria-label="Previous week" ${w <= 1 ? 'disabled style="opacity:.35"' : ''}>${ICON.back}</button>
          <button class="icon-btn" data-act="week" data-d="1" aria-label="Next week" style="transform:scaleX(-1)">${ICON.back}</button>
        </div>
      </div>
      <div class="segs" style="margin:14px 0 12px">${Array.from({ length: BLOCK_WEEKS }, (_, i) => `<i class="${i + 1 < w ? 'on' : i + 1 === w ? 'cur' : ''}"></i>`).join('')}</div>
      <div class="small" style="color:#cfd8c2">${ph_.note}</div>
    </div>
    ${P.days.map((d, i) => sessCard(d, `#/s/p${i}`, `Day ${i + 1} · ~${estimate(d, w)} min`, P.done['w' + w + 'd' + i])).join('')}
    ${Object.keys(P.done).filter(k => k.startsWith('w' + w + 'd')).length >= P.days.length && w < BLOCK_WEEKS ? `<button class="btn pri block" style="margin-top:12px" data-act="week" data-d="1">Week complete — start week ${w + 1}</button>` : ''}
    ${w >= BLOCK_WEEKS ? `<button class="btn ghost block" style="margin-top:12px" data-act="newBlock">Start a fresh 6-week block</button>` : ''}`;
  }
  html += `<div class="h2">One-off session</div>
    <div class="muted small" style="margin:-4px 0 10px">Pick a focus — get a full session you can tweak.</div>
    <div class="opt-grid">${Object.entries(RECIPES).map(([k, r]) => `<button class="opt" data-act="qfocus" data-k="${k}"><b>${r.name}</b><span>${r.blurb}</span></button>`).join('')}</div>
    ${S.quick ? `<div style="margin-top:10px">${sessCard(S.quick, '#/s/q', `Last generated · ~${estimate(S.quick)} min`)}</div>` : ''}
    <div class="h2 row"><span class="grow">My workouts</span><button class="btn sm ghost" data-act="newTpl">${ICON.plus} New</button></div>
    ${S.saved.length ? S.saved.map(t => sessCard(t, `#/s/t${t.id}`, `~${estimate(t)} min · ${t.blocks.length} blocks`)).join('') : `<div class="card muted small">Save any session here to reuse it, or tap <b>New</b> to build one from scratch.</div>`}
    <div class="h2">Quick start</div>
    <div class="opt-grid">
      <a class="opt" href="#/mobility"><b>Mobility flow</b><span>Guided, timed routines</span></a>
      <a class="opt" href="#/timer"><b>Interval timer</b><span>Tabata, EMOM, rest</span></a>
    </div>`;
  $('#view').innerHTML = html;
};

/* ---------- One-off session builder ---------- */
VIEWS.quick = () => {
  const Q = S.ui.quick;
  if (!Q.eq) Q.eq = S.settings.eq.slice();
  setTop(`<a class="icon-btn" href="#/plan" aria-label="Back">${ICON.back}</a><h1>New session</h1>`);
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
  if (!sess) { location.hash = '#/plan'; return; }
  const w = weekOf(ref), isPlan = ref[0] === 'p';
  setTop(`<a class="icon-btn" href="#/plan" aria-label="Back" data-act="endEdit">${ICON.back}</a>
    <div class="grow" style="min-width:0"><div class="sub">${sessRefLabel(ref)}${w ? ' · Week ' + w : ''} · ~${estimate(sess, w)} min</div><div style="font-weight:800;font-size:19px;letter-spacing:-.01em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(sess.name)}</div></div>
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
  return `<div class="block-h">${lbl}<span class="t">${esc(b.title)}</span><span class="n">${esc(blockDesc(b, w))}</span>${reroll}${menu}</div>`;
}
function blockPreview(sess, ref, b, bi, w) {
  const note = b.note ? `<div class="bnote">${esc(b.note)}</div>` : '';
  if (b.fmt === 'note') return `<div class="block">${blockHead(sess, ref, b, w)}<div class="note">${esc(b.text || '')}</div></div>`;
  return `<div class="block">${blockHead(sess, ref, b, w)}${note}
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

VIEWS.day = i => { location.replace('#/s/p' + i); };

/* ---------- Setup ---------- */
let draft = null;
VIEWS.setup = () => {
  if (!draft) draft = JSON.parse(JSON.stringify(S.settings));
  setTop(`${S.plan ? `<a class="icon-btn" href="#/plan" aria-label="Back" data-act="cancelSetup">${ICON.back}</a>` : ''}<h1>${S.plan ? 'Settings' : 'Build your plan'}</h1>`);
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
  setTop(`<h1>Mobility</h1>`);
  const m = S.ui.mob;
  const today = new Date().toDateString();
  $('#view').innerHTML = `
    <p class="muted" style="margin-top:0">Guided, follow-along routines. Each move is timed. Sides switch automatically, and you'll hear a beep when it's time to change.</p>
    ${ROUTINES.filter(r => !r.needs || S.settings.eq.includes(r.needs)).map(r => {
      const ids = buildFlow(r, hash(r.id + today));
      return `<button class="card daycard" style="width:100%;text-align:left" data-act="routine" data-id="${r.id}">
        <div class="row"><div class="grow"><div class="eyebrow">${r.mins} min · ${ids.length} moves</div><div class="title">${r.name}</div><div class="muted small">${r.blurb}</div></div></div>
        <div class="strip">${ids.slice(0, 6).map(id => ph(BY[id])).join('')}</div></button>`;
    }).join('')}
    <div class="h2">Build your own</div>
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
function hash(s) { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
let pendingFlow = null;
function showFlowPreview(title, ids) {
  pendingFlow = { title, ids };
  const steps = flowSteps(idEntries(ids)), total = steps.reduce((a, s) => a + s.secs + 5, 0);
  openSheet(`<h3>${esc(title)}</h3><div class="muted small">${ids.length} moves · ~${Math.round(total / 60)} min</div>
    <div style="margin-top:14px">${ids.map(id => { const ex = BY[id], t = itemSecs(ex); return `<div class="exrow"><button data-act="ex" data-id="${id}">${ph(ex, 'thumb')}</button><div class="grow" data-act="ex" data-id="${id}"><div class="nm">${esc(ex.name)}</div><div class="ds">${t.secs}s${t.side ? ' / side' : ''}${t.reps ? ` · ≈ ${t.reps} reps` : ''}</div></div></div>`; }).join('')}</div>
    <div class="row" style="margin-top:16px"><button class="btn ghost" data-act="reflow">${ICON.shuffle} Shuffle</button><button class="btn pri grow" data-act="startFlow">${ICON.play.replace('<svg', '<svg style="fill:currentColor;stroke:none"')} Start</button></div>`);
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
  setTop(`<h1>Timer</h1>`);
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
VIEWS.log = () => {
  setTop(`<h1>Log</h1>`);
  const H = S.history;
  const mon = d => { const x = new Date(d); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; };
  const thisMon = mon(new Date());
  const thisWeek = H.filter(h => new Date(h.date) >= thisMon).length;
  // week streak
  let streak = 0; const wk = new Set(H.map(h => mon(h.date).getTime()));
  for (let d = new Date(thisMon); ; d.setDate(d.getDate() - 7)) { if (wk.has(d.getTime())) streak++; else if (d.getTime() !== thisMon.getTime()) break; if (streak > 200) break; }
  // 4-week grid
  const start = new Date(thisMon); start.setDate(start.getDate() - 21);
  const byDay = {}; H.forEach(h => { const k = new Date(h.date).toDateString(); byDay[k] = byDay[k] || h.kind; if (h.kind === 'workout') byDay[k] = 'workout'; });
  const cells = Array.from({ length: 28 }, (_, i) => { const d = new Date(start); d.setDate(d.getDate() + i); const k = byDay[d.toDateString()]; return `<i class="${k === 'workout' ? 'on' : k ? 'mob' : ''} ${d.toDateString() === new Date().toDateString() ? 'today' : ''}"></i>`; }).join('');
  $('#view').innerHTML = `
    <div class="stats"><div class="stat"><b>${thisWeek}</b><span>this week</span></div><div class="stat"><b>${streak}</b><span>week streak</span></div><div class="stat"><b>${H.length}</b><span>sessions</span></div></div>
    <div class="card" style="margin-top:10px"><div class="row"><div class="eyebrow grow">Last 4 weeks</div><span class="small muted"><span style="color:var(--acc)">■</span> workout &nbsp;<span style="color:var(--info)">■</span> mobility</span></div>
      <div class="weekgrid" style="margin-top:6px">${['M', 'T', 'W', 'T', 'F', 'S', 'S'].map(x => `<span class="muted" style="font-size:10px;text-align:center;font-weight:700">${x}</span>`).join('')}</div>
      <div class="weekgrid" style="margin-top:4px">${cells}</div></div>
    <div class="h2">History</div>
    ${H.length ? H.slice().reverse().map(h => `<button class="card" style="width:100%;text-align:left;display:block" data-act="hist" data-id="${h.id}">
      <div class="row"><div class="grow"><div class="eyebrow">${dateTxt(h.date)}${h.week ? ' · Week ' + h.week : ''}</div><b>${esc(h.title)}</b></div><div style="text-align:right" class="small muted">${fmtLong(h.dur || 0)}${h.rpe ? '<br>RPE ' + h.rpe : ''}</div></div>
      ${h.ex && h.ex.length ? `<div class="small muted" style="margin-top:6px">${h.ex.filter(e => e.sets.some(s => s.done)).length} exercises · ${h.ex.reduce((a, e) => a + e.sets.filter(s => s.done).length, 0)} sets</div>` : ''}
    </button>`).join('') : `<div class="empty">No sessions yet. Finish a workout or a mobility flow and it'll show up here.</div>`}`;
};
function openHist(id) {
  const h = S.history.find(x => x.id === id); if (!h) return;
  openSheet(`<div class="eyebrow">${dateTxt(h.date)}</div><h3>${esc(h.title)}</h3>
    <div class="kv"><span class="muted">Duration</span><b>${fmtLong(h.dur || 0)}</b></div>
    ${h.rpe ? `<div class="kv"><span class="muted">Session RPE</span><b>${h.rpe}</b></div>` : ''}
    ${h.notes ? `<div class="note" style="margin:10px 0">${esc(h.notes)}</div>` : ''}
    ${(h.ex || []).filter(e => e.sets.some(s => s.done)).map(e => `<div class="kv"><span>${esc(BY[e.id] ? BY[e.id].name : e.id)}</span><span class="muted num" style="text-align:right">${e.sets.filter(s => s.done).map(s => s.w || s.r ? (s.w ? s.w + '×' : '') + (s.r || '✓') : '✓').join(', ')}</span></div>`).join('')}
    <button class="btn ghost danger block" style="margin-top:18px" data-act="delHist" data-id="${h.id}">Delete entry</button>`);
}

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
    <div class="progress-dots">${d.blocks.map((_, i) => `<i class="${i < A.bi ? 'on' : i === A.bi ? 'cur' : ''}"></i>`).join('')}</div>
    <div class="block-h" style="margin-top:4px">${b.key ? `<span class="k">${esc(b.key)}</span>` : ''}<span class="t" style="font-size:22px">${esc(b.title)}</span><span class="n">${A.bi + 1} / ${d.blocks.length}</span><button class="icon-btn sm" data-act="blk" data-r="${ref}" data-b="${b.id}" aria-label="Block options">${ICON.more}</button></div>
    <div class="muted small" style="margin:-4px 0 12px">${esc(FMT[F][0])} · ${esc(blockDesc(b, w))}</div>
    ${body}
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
  const h = { id: uid(), date: new Date().toISOString(), kind: 'workout', title: d.name, week: A.week, day: A.day, dur: Math.round((now() - A.start) / 1000), rpe: A.rpe || null, notes, ex };
  S.history.push(h);
  if (A.ref[0] === 'p' && S.plan) S.plan.done['w' + A.week + 'd' + A.day] = h.id;
  if (A.keep) S.saved.unshift(Object.assign(clone(d), { id: uid() }));
  if (A.src === 'q' && S.quick && A.ref === 'a') { /* keep the edited version as the last generated */ S.quick = Object.assign(clone(d), { id: S.quick.id, q: S.quick.q }); }
  S.active = null; stopRest(); HOLD = null; save();
  closeSheet(); hideOverlay(); toast('Workout saved — nice work');
  location.hash = '#/plan';
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
  S.history.push({ id: uid(), date: new Date().toISOString(), kind: 'mobility', title, dur: Math.round(dur), ex: (ids || []).map(id => ({ id, sets: [{ done: true }] })) });
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

/* =========================================================
   Actions
   ========================================================= */
const ACT = {
  closeSheet: () => closeSheet(),
  confirmOk: () => { const f = confirmFn; confirmFn = null; closeSheet(); f && f(); },
  ex: el => openEx(el.dataset.id),
  flip: el => el.classList.toggle('show2'),

  // plan
  week: el => { const d = +el.dataset.d; S.plan.week = clamp(S.plan.week + d, 1, BLOCK_WEEKS); save(); rerender(); },
  newBlock: () => confirmSheet('New 6-week block', 'Generate fresh exercises with your current settings and start back at week 1? History is kept.', 'Start new block', () => { S.plan = generatePlan(S.settings); save(); rerender(); toast('New block ready'); }),
  resume: () => { showOverlay('player'); renderPlayer(); },
  shuffleDay: el => {
    const i = +el.dataset.i;
    confirmSheet('Shuffle this day?', 'Pick new exercises for every slot on this day (same structure). Your edits to this day are replaced.', 'Shuffle', () => {
      const used = new Set(S.plan.days.flatMap((d, j) => j === i ? [] : d.blocks.flatMap(b => (b.items || []).map(x => x.ex))));
      const ctx = ctxFor(S.settings, (Math.random() * 2 ** 31) | 0, used);
      S.plan.days[i] = genDay(S.plan.days[i].key, ctx);
      if (S.active && S.active.ref === 'p' + i) S.active.logs = {};
      save(); rerender();
    });
  },

  // one-off sessions
  qfocus: el => { S.ui.quick.focus = el.dataset.k; save(); location.hash = '#/quick'; },
  qset: el => { const k = el.dataset.k; S.ui.quick[k] = k === 'mins' ? +el.dataset.v : el.dataset.v; save(); rerender(); },
  qeq: el => { const q = S.ui.quick, k = el.dataset.k; q.eq = q.eq.includes(k) ? q.eq.filter(x => x !== k) : [...q.eq, k]; save(); rerender(); },
  qgen: () => {
    const q = S.ui.quick, R = RECIPES[q.focus];
    if (R.needs && !q.eq.includes(R.needs)) { toast(`Add ${EQ_LABEL[R.needs]} to today's equipment`); return; }
    S.quick = generateQuick({ focus: q.focus, mins: q.mins, energy: q.energy, eq: q.eq.slice() });
    EDITING = false; save(); location.hash = '#/s/q';
  },
  qregen: () => confirmSheet('Regenerate?', 'Build a fresh session with the same focus, time and equipment. Your edits are replaced.', 'Regenerate', () => { S.quick = generateQuick(S.quick.q); save(); rerender(); }),
  reroll: el => { const { sess, b } = locate(el); rerollBlock(sess, b); save(); rerender(); },
  toggleEdit: () => { EDITING = !EDITING; rerender(); },
  endEdit: () => { EDITING = false; },
  newTpl: () => {
    const t = normSess({ id: uid(), name: 'New workout', focus: '', blocks: [{ title: 'Warm-up', fmt: 'flow', rounds: 1, items: [] }, { title: 'Main', key: 'A', fmt: 'sets', rest: 90, restItem: 30, items: [] }] });
    S.saved.unshift(t); save(); EDITING = true; location.hash = '#/s/t' + t.id;
  },
  saveTpl: el => { const c = saveAsTemplate(el.dataset.r); toast('Saved to My workouts'); location.hash = '#/s/t' + c.id; },
  dupTpl: el => { const c = clone(getSess(el.dataset.r)); c.id = uid(); c.name += ' (copy)'; S.saved.unshift(c); save(); location.hash = '#/s/t' + c.id; },
  delTpl: el => confirmSheet('Delete this workout?', 'It will be removed from My workouts. Your history is kept.', 'Delete', () => { const id = el.dataset.r.slice(1); S.saved = S.saved.filter(t => t.id !== id); save(); location.hash = '#/plan'; }, true),
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
  eq: el => { const k = el.dataset.k; draft.eq = draft.eq.includes(k) ? draft.eq.filter(x => x !== k) : [...draft.eq, k]; VIEWS.setup(); },
  tog: el => { const k = el.dataset.k; draft[k] = !draft[k]; VIEWS.setup(); },
  cancelSetup: () => { draft = null; },
  genPlan: () => {
    const go = () => { S.settings = draft; draft = null; S.plan = generatePlan(S.settings); S.active = null; save(); location.hash = '#/plan'; toast('Plan ready — week 1'); };
    if (S.plan) confirmSheet('Generate a new plan?', 'This replaces your current plan and starts again at week 1. Your history is kept.', 'Generate', go); else go();
  },
  saveSettings: () => { S.settings = draft; draft = null; save(); location.hash = '#/plan'; toast('Settings saved'); },
  export: () => {
    const blob = new Blob([JSON.stringify(S, null, 1)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'kinetix-backup-' + new Date().toISOString().slice(0, 10) + '.json';
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  },
  reset: () => confirmSheet('Reset everything?', 'Deletes your plan, settings and all history from this device.', 'Delete all', () => { localStorage.removeItem(KEY); location.hash = '#/plan'; location.reload(); }, true),
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
      showFlowPreview(`Custom ${m.mins}-min flow`, buildFlow({ mins: m.mins, focus: m.focus, type: m.type }, (Math.random() * 2 ** 31) | 0));
      pendingFlow.opts = { mins: m.mins, focus: m.focus, type: m.type };
    } else {
      const r = ROUTINES.find(x => x.id === id);
      showFlowPreview(r.name, buildFlow(r, hash(r.id + new Date().toDateString())));
      pendingFlow.opts = r;
    }
  },
  reflow: () => { const p = pendingFlow; const o = p.opts; showFlowPreview(p.title, buildFlow(o, (Math.random() * 2 ** 31) | 0)); pendingFlow.opts = o; },
  startFlow: () => { const p = pendingFlow; closeSheet(); openFlow(p.title, idEntries(p.ids)); },

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
  openTimerTab: () => { S.ui.timerTab = 'sw'; save(); ACT.minimize(); location.hash = '#/timer'; },

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
    confirmSheet('Import backup?', `Replace everything on this device with the backup (${data.history.length} sessions)?`, 'Import', () => { localStorage.setItem(KEY, JSON.stringify(data)); location.hash = '#/plan'; location.reload(); });
  } catch (err) { toast('That file isn\'t a Kinetix backup'); }
});
window.addEventListener('hashchange', () => { if (!location.hash.startsWith('#/setup')) draft = null; closeSheet(); route(); });

// iOS: keep set inputs visible above the keyboard
document.addEventListener('focusin', e => { if (e.target.matches('.set input')) setTimeout(() => e.target.scrollIntoView({ block: 'center', behavior: 'smooth' }), 250); });

/* ---------- boot ---------- */
route();
if (S.active && S.plan) { /* show resume banner on plan; don't force the overlay open */ }
if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => {});

// expose for debugging
window.KX = { S, generatePlan, buildFlow, BY, generateQuick, estimate, rx, itemTxt, blockDesc, RECIPES };
})();
