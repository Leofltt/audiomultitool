const CACHE_NAME = 'audiomultitool-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/styles.css',
  '/app.js',
  '/tools/generator.js',
  '/tools/sweep.js',
  '/tools/metronome.js',
  '/tools/tuner.js',
  '/tools/noise.js',
  '/tools/converter.js',
  '/tools/recorder.js'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      return cachedResponse || fetch(e.request);
    })
  );
});
