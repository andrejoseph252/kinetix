/* Kinetix — navigation & touch gestures.

   Back stack: on touch devices the app adds no browser-history entries (it only replaces the
   URL), so iOS Safari's own left-edge "go back a page" swipe has nothing to do. The app runs its
   own edge swipe instead: drag from the left edge to go back, with the screen following your
   finger. With a mouse, sub-pages are pushed to history so the browser back button works.

   Sheets: drag down by the grab bar any time, or by the content once it's scrolled to the top.
   A quick flick closes; a short drag springs back. (Pattern from cfb-board's sheet.js.)

   Workout player: swipe left / right to move between blocks. */
'use strict';
const USE_HISTORY = matchMedia('(pointer: fine)').matches;
const NAV = { stack: [] };
const curPath = () => (location.hash || '#/today').slice(1);
const isRootPath = p => MAIN_TABS.includes(p.split('/')[1] || 'today');

function onNav() {
  if (!location.hash.startsWith('#/setup')) draft = null;
  onSheetClose = null; closeSheet();
  route();
}
function go(path, opts = {}) {
  path = path.replace(/^#/, '');
  const cur = curPath();
  if (path === cur) { onNav(); return; }
  const root = isRootPath(path);
  if (root) NAV.stack.length = 0;
  else if (!opts.replace) NAV.stack.push(cur);
  const url = location.pathname + location.search + '#' + path;
  if (USE_HISTORY && !root && !opts.replace) history.pushState({ kx: 1 }, '', url);
  else history.replaceState(null, '', url);
  onNav();
}
function back() {
  if (!NAV.stack.length) { go('/' + lastMain); return; }
  if (USE_HISTORY && history.state && history.state.kx) { history.back(); return; }
  const p = NAV.stack.pop();
  history.replaceState(null, '', location.pathname + location.search + '#' + p);
  onNav();
}
addEventListener('popstate', () => { NAV.stack.pop(); onNav(); });
addEventListener('hashchange', onNav); // typed URLs / old links

// In-app links: never let them create history entries on touch devices.
document.addEventListener('click', e => {
  const a = e.target.closest('a[href^="#/"]');
  if (!a) return;
  e.preventDefault();
  if (a.dataset.act && ACT[a.dataset.act] && !['cancelSetup', 'endEdit'].includes(a.dataset.act)) return; // handled as an action
  if (a.dataset.nav === 'back') back(); else go(a.getAttribute('href'));
});

/* ---------- sheet: animated close + drag to dismiss ---------- */
function dismissSheet(fromY = 0) {
  const sh = $('#sheet-root .sheet'), bg = $('#sheet-root .sheet-bg');
  if (!sh) return;
  sh.style.setProperty('--dy', fromY + 'px');
  sh.classList.remove('dragging', 'settle'); sh.style.transform = '';
  sh.classList.add('closing'); if (bg) bg.classList.add('closing');
  setTimeout(() => { if (sh.isConnected) closeSheet(); }, 240);
}

let SD = null;
addEventListener('touchstart', e => {
  if (e.touches.length !== 1) return;
  const sh = $('#sheet-root .sheet');
  if (!sh || !sh.contains(e.target)) return;
  const onBar = !!e.target.closest('.grab');
  if (!onBar && (sh.scrollTop > 0 || e.target.closest('input, textarea, select, .chips.scroll'))) return;
  const t = performance.now();
  SD = { x: e.touches[0].clientX, y: e.touches[0].clientY, onBar, sh, on: false, dy: 0, prev: { dy: 0, t }, last: { dy: 0, t } };
}, { passive: true });
addEventListener('touchmove', e => {
  if (!SD) return;
  const dx = e.touches[0].clientX - SD.x, dy = e.touches[0].clientY - SD.y;
  if (!SD.on) {
    if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
    if (dy <= 0 || Math.abs(dx) > dy || (!SD.onBar && SD.sh.scrollTop > 0)) { SD = null; return; }
    SD.on = true; SD.sh.classList.remove('settle'); SD.sh.classList.add('dragging');
  }
  if (e.cancelable) e.preventDefault();
  SD.dy = Math.max(0, dy);
  SD.prev = SD.last; SD.last = { dy: SD.dy, t: performance.now() };
  SD.sh.style.transform = `translateY(${SD.dy}px)`;
  const bg = $('#sheet-root .sheet-bg'); if (bg) bg.style.opacity = String(Math.max(.15, 1 - SD.dy / (SD.sh.offsetHeight * .9)));
}, { passive: false });
function sheetEnd() {
  if (!SD) return;
  const d = SD; SD = null;
  if (!d.on) return;
  d.sh.classList.remove('dragging');
  const v = (d.last.dy - d.prev.dy) / Math.max(1, d.last.t - d.prev.t); // px/ms downward
  const bg = $('#sheet-root .sheet-bg'); if (bg) bg.style.opacity = '';
  if (d.dy > d.sh.offsetHeight * .22 || (v > .55 && d.dy > 24)) dismissSheet(d.dy);
  else { d.sh.classList.add('settle'); d.sh.style.transform = ''; setTimeout(() => d.sh.classList.remove('settle'), 320); }
}
addEventListener('touchend', sheetEnd, { passive: true });
addEventListener('touchcancel', sheetEnd, { passive: true });

/* ---------- left-edge swipe = back ---------- */
let ED_ = null;
const EDGE = 26;
addEventListener('touchstart', e => {
  if (e.touches.length !== 1 || $('#sheet-root .sheet')) return;
  const p = e.touches[0];
  if (p.clientX > EDGE || OV) return;               // the player has its own swipe (below)
  if (isRootPath(curPath())) return;                  // nothing to go back to from a tab
  ED_ = { x: p.clientX, y: p.clientY, on: false, dx: 0, lastX: p.clientX, lastT: e.timeStamp, v: 0, els: [$('#view'), $('#topbar')] };
}, { passive: true });
addEventListener('touchmove', e => {
  if (!ED_) return;
  const p = e.touches[0], dx = p.clientX - ED_.x, dy = p.clientY - ED_.y;
  if (!ED_.on) {
    if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
    if (Math.abs(dy) > dx) { ED_ = null; return; }
    ED_.on = true; ED_.els.forEach(el => el.classList.add('edge-drag'));
  }
  if (e.cancelable) e.preventDefault();
  ED_.v = (p.clientX - ED_.lastX) / Math.max(1, e.timeStamp - ED_.lastT); ED_.lastX = p.clientX; ED_.lastT = e.timeStamp;
  ED_.dx = Math.max(0, dx);
  ED_.els.forEach(el => { el.style.transform = `translateX(${ED_.dx}px)`; el.style.opacity = String(Math.max(.4, 1 - ED_.dx / 500)); });
}, { passive: false });
function edgeEnd() {
  if (!ED_) return;
  const d = ED_; ED_ = null;
  if (!d.on) return;
  const go_ = d.dx > 90 || (d.dx > 30 && d.v > .5);
  d.els.forEach(el => { el.classList.remove('edge-drag'); el.classList.add('edge-settle'); el.style.transform = go_ ? `translateX(${innerWidth}px)` : ''; el.style.opacity = go_ ? '0' : ''; });
  setTimeout(() => {
    if (go_) back();
    d.els.forEach(el => { el.classList.remove('edge-settle'); el.style.transform = ''; el.style.opacity = ''; });
  }, go_ ? 170 : 260);
}
addEventListener('touchend', edgeEnd, { passive: true });
addEventListener('touchcancel', edgeEnd, { passive: true });

/* ---------- workout player: swipe between blocks ---------- */
let PS = null;
addEventListener('touchstart', e => {
  if (e.touches.length !== 1 || OV !== 'player' || $('#sheet-root .sheet')) return;
  if (e.target.closest('input, textarea, select, .chips.scroll, .holdbtn')) return;
  const p = e.touches[0];
  PS = { x: p.clientX, y: p.clientY, on: false, dx: 0, lastX: p.clientX, lastT: e.timeStamp, v: 0, edge: p.clientX <= EDGE };
}, { passive: true });
addEventListener('touchmove', e => {
  if (!PS) return;
  const p = e.touches[0], dx = p.clientX - PS.x, dy = p.clientY - PS.y;
  if (!PS.on) {
    if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
    if (Math.abs(dx) < Math.abs(dy) * 1.4) { PS = null; return; }
    PS.on = true; PS.el = $('#overlay .ov-body'); if (!PS.el) { PS = null; return; }
    PS.el.classList.add('edge-drag');
  }
  if (e.cancelable) e.preventDefault();
  PS.v = (p.clientX - PS.lastX) / Math.max(1, e.timeStamp - PS.lastT); PS.lastX = p.clientX; PS.lastT = e.timeStamp;
  const d = activeDay(), atStart = S.active.bi === 0, atEnd = d && S.active.bi === d.blocks.length - 1;
  PS.dx = dx > 0 && atStart && !PS.edge ? dx * .3 : dx < 0 && atEnd ? dx * .3 : dx; // rubber-band past the ends
  PS.el.style.transform = `translateX(${PS.dx}px)`;
}, { passive: false });
function playerEnd() {
  if (!PS) return;
  const d = PS; PS = null;
  if (!d.on) return;
  const day = activeDay(), A = S.active;
  const far = Math.abs(d.dx) > 80 || (Math.abs(d.dx) > 30 && Math.abs(d.v) > .5);
  let dir = 0;
  if (far && d.dx < 0 && A.bi < day.blocks.length - 1) dir = 1;
  if (far && d.dx > 0) dir = A.bi > 0 ? -1 : (d.edge ? 'min' : 0);
  d.el.classList.remove('edge-drag'); d.el.classList.add('edge-settle');
  if (!dir) { d.el.style.transform = ''; setTimeout(() => d.el.classList.remove('edge-settle'), 260); return; }
  d.el.style.transform = `translateX(${(d.dx < 0 ? -1 : 1) * innerWidth}px)`; d.el.style.opacity = '0';
  setTimeout(() => {
    if (dir === 'min') { ACT.minimize(); return; }
    A.bi += dir; HOLD = null; save(); renderPlayer();
    const nb = $('#overlay .ov-body'); if (nb) { nb.classList.add('slide-in-' + (dir > 0 ? 'r' : 'l')); }
  }, 150);
}
addEventListener('touchend', playerEnd, { passive: true });
addEventListener('touchcancel', playerEnd, { passive: true });
