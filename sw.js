const CACHE = 'child-keyboard-v3';
const ASSETS = ['./', './index.html', './styles.css', './app.js', './manifest.webmanifest', './icon.svg'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
// Network-first, cache as offline fallback. Cache-first served a stale
// index.html forever, so a server-side `git pull` never reached the device.
// The page itself also skips the HTTP cache (revalidates, usually a 304):
// the server sends no Cache-Control, so the browser would otherwise guess it
// fresh for hours. Everything else is versioned (?v=) or doesn't change.
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const req = e.request.mode === 'navigate' ? new Request(e.request.url, { cache: 'no-cache' }) : e.request;
  e.respondWith(
    fetch(req).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(e.request, copy));
      return res;
    }).catch(() => caches.match(e.request))
  );
});
