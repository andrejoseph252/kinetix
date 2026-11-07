/* Kinetix — generators: plans, one-off sessions, dosing, mobility flows. */
'use strict';
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
  strength: { cat: 'strength', name: 'Strength & Power', blurb: 'Jumps, heavy supersets, short finisher',
    build: Q => { const T = DAYS[['S1', 'S2', 'S3'][Math.floor(Q.rnd() * 3)]]; return [
      ['warm', { regions: T.regions }],
      Q.L >= 30 && ['power', { n: Q.L >= 60 ? 2 : 1, slots: T.power }],
      ['sets', { key: 'A', slots: T.A }],
      ['sets', { key: 'B', slots: Q.L >= 45 ? T.B : T.B.slice(0, 2) }],
      Q.L >= 60 && ['sets', { key: 'C', title: 'Accessory', slots: T.C }],
      Q.L >= 45 && ['clock', { mins: Q.L >= 60 ? 10 : 6, title: 'Finisher' }],
      ['holds', { regions: T.regions, n: 3 }],
    ]; } },
  control: { cat: 'mobility', name: 'Mobility & Control', blurb: 'Joint flows, loaded mobility, get-ups, carries, long holds',
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
  kettlebell: { cat: 'kb', name: 'Kettlebell', blurb: 'Swings, complexes, get-ups and carries', needs: 'kb',
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
  athletic: { cat: 'athletic', name: 'Athletic', blurb: 'Jumps, bounds, single-leg & lateral, speed',
    build: Q => [
      ['warm', { n: Q.L >= 45 ? 5 : 4, regions: ['hips', 'ankles', 'calves', 'groin'], bonus: ['lateral'], allowPower: true }],
      ['power', { n: 2, slots: [{ p: ['power'], bonus: ['lateral', 'single'], not: ['hpush'] }, { p: ['power'], bonus: ['squat'], not: ['hpush', 'lateral'] }] }],
      ['sets', { key: 'A', slots: [['single', 'main', { bonus: ['squat'] }], ['lateral', 'sec']] }],
      Q.L >= 45 && ['sets', { key: 'B', slots: [['hinge', 'sec', { bonus: ['single'] }], ['core', 'acc', { bonus: ['lateral'] }]] }],
      Q.L >= 30 && ['clock', { fmt: 'intervals', work: 15, off: 45, mins: Q.L >= 60 ? 10 : 6, title: 'Speed', n: 2, pool: ['cond', 'power'], bonus: ['lateral'] }],
      ['holds', { n: 3, regions: ['hips', 'groin', 'calves', 'hams'] }],
    ] },
  engine: { cat: 'engine', name: 'Engine', blurb: 'Conditioning — intervals, EMOM or AMRAP',
    build: Q => [
      ['warm', { n: 4, regions: ['hips', 'ankles', 'shoulders'] }],
      ['clock', { fmt: 'intervals', mins: Q.L >= 45 ? 12 : Q.L >= 30 ? 8 : 10, n: 3, title: 'Intervals' }],
      Q.L >= 30 && ['clock', { fmt: Q.rnd() < 0.5 ? 'amrap' : 'emom', mins: Q.L >= 60 ? 16 : Q.L >= 45 ? 12 : 8, n: Q.L >= 45 ? 4 : 3, mixed: true, title: 'Circuit' }],
      Q.L >= 45 && ['circuit', { title: 'Carry & core', rounds: 2, rest: 30, slots: [{ p: ['carry', 'core'], not: ['cond'] }, { p: ['core'], bonus: ['lateral'], not: ['cond', 'carry', 'mobility', 'control'] }] }],
      ['holds', { n: 3, regions: ['hips', 'hams', 'calves', 'chest'] }],
    ] },
  lower: { cat: 'strength', name: 'Lower Body', blurb: 'Squat, hinge, single-leg, jumps',
    build: Q => [
      ['warm', { regions: ['hips', 'ankles', 'hams', 'groin'] }],
      Q.L >= 30 && ['power', { n: 1, slots: [{ p: ['power'], bonus: ['squat', 'hinge'], not: ['hpush', 'vpush'] }] }],
      ['sets', { key: 'A', slots: [['squat', 'main'], ['core', 'acc']] }],
      ['sets', { key: 'B', slots: Q.L >= 45 ? [['hinge', 'main'], ['single', 'sec']] : [['hinge', 'main']] }],
      Q.L >= 45 && ['sets', { key: 'C', title: 'Accessory', slots: [['lateral', 'acc'], ['carry', 'acc']] }],
      ['holds', { n: 3, regions: ['hips', 'hams', 'quads', 'calves'] }],
    ] },
  upper: { cat: 'strength', name: 'Upper Body', blurb: 'Push, pull, overhead, shoulder health',
    build: Q => [
      ['warm', { regions: ['shoulders', 'tspine', 'chest'] }],
      Q.L >= 45 && ['power', { n: 1, slots: [{ p: ['power'], bonus: ['hpush', 'vpush'], any: ['hpush', 'vpush', 'core'] }] }],
      ['sets', { key: 'A', slots: [['hpush', 'main'], ['vpull', 'main']] }],
      ['sets', { key: 'B', slots: [['vpush', 'sec'], ['hpull', 'sec']] }],
      Q.L >= 45 && ['sets', { key: 'C', title: 'Shoulders & core', slots: [['prehab', 'acc'], ['core', 'acc']] }],
      ['holds', { n: 3, regions: ['chest', 'lats', 'shoulders', 'tspine'] }],
    ] },
  recovery: { cat: 'recovery', name: 'Recovery', blurb: 'Gentle flow, foam rolling, long holds, breathing',
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
  const sess = normSess({ id: uid(), cat: R.cat, name: R.name, focus: `${opts.mins} min · ${ENERGY[opts.energy][0]} energy`, q: opts, blocks });
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
function catOf(s) {
  if (!s) return 'custom';
  if (s.cat) return s.cat;
  if (s.q && RECIPES[s.q.focus]) return RECIPES[s.q.focus].cat;
  if (s.key === 'MOB') return 'mobility';
  if (s.key === 'COND') return 'engine';
  if (s.key) return 'strength';
  return 'custom';
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
  { id: 'wake', when: 'morning', name: 'Morning Wake-Up', mins: 8, focus: ['tspine', 'hips', 'back', 'shoulders'], type: 'dynamic', blurb: 'Get every joint moving — no equipment.' },
  { id: 'quick5', when: 'morning', name: '5-Minute Reset', mins: 5, focus: ['hips', 'tspine', 'hams'], type: 'dynamic', blurb: 'The minimum dose. Do it while the kettle boils.' },
  { id: 'desk', when: 'anytime', name: 'Desk Reset', mins: 6, focus: ['tspine', 'chest', 'hips', 'shoulders'], type: 'mix', blurb: 'Undo sitting — hip flexors, upper back, chest.' },
  { id: 'pre', when: 'anytime', name: 'Pre-Workout Primer', mins: 8, focus: ['hips', 'ankles', 'shoulders', 'tspine'], type: 'dynamic', blurb: 'Before training, a run or sport.' },
  { id: 'post', when: 'anytime', name: 'Post-Workout Stretch', mins: 8, focus: ['hips', 'hams', 'quads', 'chest', 'calves'], type: 'static', blurb: 'Static holds to come back down.' },
  { id: 'evening', when: 'evening', name: 'Evening Unwind', mins: 12, focus: ['hips', 'hams', 'back', 'groin'], type: 'mix', blurb: 'Slow flow into long holds.' },
  { id: 'bed', when: 'evening', name: 'Before Bed', mins: 10, focus: ['back', 'hips', 'hams'], type: 'static', breath: true, blurb: 'Gentle holds and slow breathing to switch off.' },
  { id: 'hips', when: 'target', name: 'Hips & Hamstrings', mins: 12, focus: ['hips', 'hams', 'groin', 'glutes'], type: 'mix', blurb: 'Tight hips, low back and hamstrings.' },
  { id: 'upper', when: 'target', name: 'Shoulders & Upper Back', mins: 10, focus: ['shoulders', 'tspine', 'chest', 'lats'], type: 'mix', blurb: 'Open the chest, free the T-spine.' },
  { id: 'ankles', when: 'target', name: 'Ankles & Calves', mins: 8, focus: ['ankles'], type: 'mix', blurb: 'Better squats and happier knees.' },
  { id: 'full', when: 'target', name: 'Full-Body Flow', mins: 15, focus: ['hips', 'tspine', 'hams', 'shoulders', 'ankles', 'groin'], type: 'mix', blurb: 'Head-to-toe mobility session.' },
  { id: 'roll', when: 'target', name: 'Foam Roll Recovery', mins: 10, focus: ['quads', 'hams', 'calves', 'tspine', 'glutes'], type: 'smr', blurb: 'Self-massage plus a few holds.', needs: 'roller' },
];
const WHEN = {
  morning: ['Morning', 'Wake up and loosen up'],
  anytime: ['Anytime', 'Desk breaks, before and after training'],
  evening: ['Evening', 'Wind down and recover'],
  target: ['Target an area', 'Spend time where you need it'],
};
// What to suggest right now
function routineNow(d = new Date()) {
  const h = d.getHours();
  const id = h < 11 ? 'wake' : h < 17 ? 'desk' : h < 21 ? 'evening' : 'bed';
  return ROUTINES.find(r => r.id === id);
}
function partOfDay(d = new Date()) { const h = d.getHours(); return h < 5 ? 'night' : h < 12 ? 'morning' : h < 17 ? 'afternoon' : h < 22 ? 'evening' : 'night'; }
function routineIds(r) { return buildFlow(r, hash(r.id + new Date().toDateString())); }
function hash(s) { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
const FOCUS_OPTS = [['hips', 'Hips'], ['hams', 'Hamstrings'], ['groin', 'Groin'], ['ankles', 'Ankles & calves'], ['tspine', 'T-spine'], ['shoulders', 'Shoulders'], ['back', 'Low back'], ['quads', 'Quads']];

function itemSecs(ex) { return stepSecs(rx({ ex: ex.id }, null)); }
function buildFlow(opts, seed) {
  const ctx = ctxFor(S.settings, seed);
  ctx.regions = opts.focus.flatMap(f => f === 'ankles' ? ['ankles', 'calves'] : [f]);
  ctx.regionW = 1.4;
  const used = new Set(), dyn = [], stat = [];
  let target = opts.mins * 60, breath = null;
  if (opts.breath) { breath = candidates({ p: ['breath'] }, 'stretch', ctx, used)[0]; if (breath) { used.add(breath); target -= 100; } }
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
  return [...dyn, ...stat, ...(breath ? [breath] : [])];
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

