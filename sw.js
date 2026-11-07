// Kinetix service worker — offline support.
// Shell: network-first (so GitHub Pages updates show up), falling back to cache.
// Exercise images: cache-first (they never change).
const VERSION = 'v16';
const SHELL = 'kx-shell-' + VERSION;
const IMG = 'kx-img-v1';
const SHELL_FILES = [
  './', 'index.html', 'css/app.css', 'js/core.js', 'js/engine.js', 'js/views.js', 'js/player.js', 'js/editor.js', 'js/actions.js', 'js/faith.js', 'js/nav.js', 'js/main.js', 'js/data.js',
  'manifest.webmanifest', 'fonts/big-shoulders-display.woff2', 'icons/icon.svg', 'icons/icon-192.png', 'icons/apple-touch-icon.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(SHELL).then(c => c.addAll(SHELL_FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k.startsWith('kx-shell-') && k !== SHELL).map(k => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  if (url.pathname.includes('/img/ex/')) {
    e.respondWith(
      caches.open(IMG).then(async c => {
        const hit = await c.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        if (res.ok) c.put(req, res.clone());
        return res;
      })
    );
    return;
  }

  e.respondWith(
    fetch(req).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(SHELL).then(c => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req, { ignoreSearch: true }).then(r => r || caches.match('index.html')))
  );
});
