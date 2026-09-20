/* عامل الخدمة: يجعل «أبيات» يعمل بلا اتصال.
   عند نشر تعديل، غيّر رقم VERSION ليصل التحديث إلى المستخدمين. */
const VERSION = 'abyaat-v10';
const CORE = [
  './', 'index.html', 'manifest.webmanifest', 'css/styles.css',
  'js/util.js', 'js/i18n.js', 'js/fsrs.js', 'js/store.js', 'js/app.js', 'data/library.json',
  'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png', 'icons/apple-touch-icon.png',
  'fonts/amiri-arabic-400-normal.woff2', 'fonts/amiri-arabic-700-normal.woff2',
  'fonts/ibm-plex-sans-arabic-latin-400-normal.woff2', 'fonts/ibm-plex-sans-arabic-latin-500-normal.woff2', 'fonts/ibm-plex-sans-arabic-latin-600-normal.woff2',
  'fonts/ibm-plex-sans-arabic-arabic-400-normal.woff2', 'fonts/ibm-plex-sans-arabic-arabic-500-normal.woff2', 'fonts/ibm-plex-sans-arabic-arabic-600-normal.woff2',
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(VERSION);
    await cache.addAll(CORE.map((u) => new Request(u, { cache: 'reload' })));
    try {                                   // كل القصائد المذكورة في المكتبة
      const lib = await (await fetch('data/library.json', { cache: 'no-cache' })).json();
      await cache.addAll(lib.poems.map((p) => new Request(p.file, { cache: 'reload' })));
    } catch (e) { /* يُكمَل عند أول اتصال */ }
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  event.respondWith((async () => {
    const cache = await caches.open(VERSION);
    const hit = await cache.match(req, { ignoreSearch: true });
    if (hit) return hit;
    try {
      const res = await fetch(req);
      if (res.ok) cache.put(req, res.clone());
      return res;
    } catch (e) {
      if (req.mode === 'navigate') return (await cache.match('index.html')) || (await cache.match('./'));
      return new Response('', { status: 503 });
    }
  })());
});
