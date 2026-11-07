/* Kinetix — boot. */
'use strict';
/* ---------- boot ---------- */
if (S.plan) S.plan.days.forEach(d => normSess(d));
if (!location.hash || location.hash === '#/plan') location.replace('#/today');
route();
if (S.active && S.plan) { /* show resume banner on plan; don't force the overlay open */ }
if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => {});

// expose for debugging
window.KX = { S, generatePlan, buildFlow, BY, generateQuick, estimate, rx, itemTxt, blockDesc, RECIPES };
