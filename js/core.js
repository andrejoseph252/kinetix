/* Kinetix — core: data, helpers, state, audio. Plain scripts sharing one global scope (no build step). */
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
  ['cable', 'Cable machine'], ['machine', 'Gym machines'], ['trx', 'Rings / TRX'], ['cardio', 'Cardio machines'],
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
  iso: 'Isolation', arms: 'Arms', biceps: 'Biceps', triceps: 'Triceps', neck: 'Neck',
};
const PATTERN_TAGS = ['iso', 'arms', 'prep', 'mobility', 'power', 'squat', 'hinge', 'single', 'lateral', 'hpush', 'vpush', 'hpull', 'vpull', 'core', 'carry', 'cond', 'stretch', 'smr', 'prehab', 'lmob', 'control', 'cars', 'breath'];
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
// Session categories — each has its own colour (CSS var --c-<key>)
const CAT = {
  strength: 'Strength', athletic: 'Athletic', kb: 'Kettlebell', engine: 'Conditioning',
  mobility: 'Mobility', recovery: 'Recovery', custom: 'Custom',
};
const cvar = c => `var(--c-${CAT[c] ? c : 'custom'})`;
function blockCat(b) {
  if (b.kind === 'power') return 'athletic';
  if (CLOCK.includes(b.fmt) || b.kind === 'cond') return 'engine';
  if (b.kind === 'stretch' || b.kind === 'smr' || b.fmt === 'note') return 'recovery';
  if (b.fmt === 'flow' || b.kind === 'prep' || b.kind === 'flow') return 'mobility';
  return 'strength';
}
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
  stopwatch: '<svg viewBox="0 0 24 24"><circle cx="12" cy="13" r="8"/><path d="M12 13V9M10 2h4M19 6l-1.5 1.5"/></svg>',
  sun: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
  moon: '<svg viewBox="0 0 24 24"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/></svg>',
  edit: '<svg viewBox="0 0 24 24"><path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z"/><path d="M13.5 6.5l4 4"/></svg>',
  more: '<svg viewBox="0 0 24 24"><circle cx="5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="19" cy="12" r="1.3"/></svg>',
  plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
  up: '<svg viewBox="0 0 24 24"><path d="M6 15l6-6 6 6"/></svg>',
  down: '<svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>',
  copy: '<svg viewBox="0 0 24 24"><rect x="8" y="8" width="12" height="12" rx="2.5"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></svg>',
  trash: '<svg viewBox="0 0 24 24"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></svg>',
  yt: '<svg viewBox="0 0 24 24"><rect x="2.5" y="5.5" width="19" height="13" rx="4"/><path d="M10 9.2v5.6l4.8-2.8z" style="fill:currentColor;stroke:none"/></svg>',
  fig: '<svg viewBox="0 0 64 64"><circle cx="32" cy="11" r="6"/><path d="M32 18v20M32 38l-9 18M32 38l9 18M18 26l14-4 14 4"/></svg>',
};

/* =========================================================
   State
   ========================================================= */
const KEY = 'kinetix:v1';
const DEFAULT_SETTINGS = { program: 'athletic', days: 3, length: 45, style: 'mixed', level: 'returning', eq: ['kb', 'band'], units: 'kg', sound: true, vibrate: true };
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
  s.ui.wf = s.ui.wf || 'all';
  s.ui.quick = Object.assign({ focus: 'control', mins: 45, energy: 'normal', eq: null }, s.ui.quick || {});
  return s;
})();
// your own exercises live alongside the library
S.custom.forEach(e => { if (!BY[e.id]) { EX.push(e); BY[e.id] = e; } });
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
  // gentle chime for evening / bedtime routines
  soft: (n = 1) => { for (let i = 0; i < n; i++) beep(528, 0.6, 0.07, i * 0.5); },
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

