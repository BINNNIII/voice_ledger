// 오프라인에서도 앱이 열리도록 파일을 보관합니다.
// 인터넷이 되면 항상 최신 파일을 먼저 받아오므로, 수정한 내용이 바로 반영됩니다.
const CACHE = 'voice-ledger-v2';
const FONT_CACHE = 'voice-ledger-fonts';
const FILES = ['./', './index.html', './style.css', './app.js', './manifest.json',
  './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k !== CACHE && k !== FONT_CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  // 글꼴(Pretendard)은 한 번 받으면 보관해두고 재사용 → 오프라인에서도 같은 글꼴
  if (e.request.url.startsWith('https://cdn.jsdelivr.net/gh/orioncactus/pretendard')) {
    e.respondWith(caches.open(FONT_CACHE).then((c) =>
      c.match(e.request).then((hit) => hit || fetch(e.request).then((res) => {
        if (res.ok || res.type === 'opaque') c.put(e.request, res.clone());
        return res;
      }))));
    return;
  }
  if (!e.request.url.startsWith(self.location.origin)) return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy));
        return res;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true }).then((r) => r || caches.match('./index.html')))
  );
});
