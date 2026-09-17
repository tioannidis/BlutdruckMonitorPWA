const CACHE_NAME = 'blood-pressure-tracker-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/stats.html',
  '/settings.html',
  '/css/common.css',
  '/css/index.css',
  '/css/stats.css',
  '/css/settings.css',
  '/js/utils.js',
  '/js/StorageManager.js',
  '/js/MistralClient.js',
  '/js/BloodPressureTracker.js',
  '/js/StatsManager.js',
  '/js/ThemeManager.js',
  '/version.js',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
  self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => response || fetch(event.request))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});