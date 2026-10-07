const CACHE = 'bof-bof-v1';
const CDN = ['cdnjs.cloudflare.com', 'cdn.jsdelivr.net', 'fonts.googleapis.com', 'fonts.gstatic.com'];
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => {
e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
const req = e.request;
if (req.method !== 'GET' || req.headers.has('range')) return;
const url = new URL(req.url);
if (/\.(mp4|webm|mov)$/i.test(url.pathname)) return;
const sameOrigin = url.origin === self.location.origin;
if (!sameOrigin && !CDN.includes(url.hostname)) return;
if (req.mode === 'navigate') {
e.respondWith(fetch(req).then((res) => { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); return res; })
.catch(() => caches.match(req).then((r) => r || caches.match('404.html'))));
return;
}
e.respondWith(caches.open(CACHE).then((cache) => cache.match(req).then((hit) => {
const net = fetch(req).then((res) => { if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone()); return res; }).catch(() => hit);
return hit || net;
})));
});
