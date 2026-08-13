// Minimal service worker — its only real job is to exist and control the
// page, which is what Chrome/Edge/Android check for before showing the
// "Install app" prompt. It does a basic network-first pass-through rather
// than aggressive offline caching, since ARX is an API-driven app (Wavespeed
// generations, Firestore data) that needs to stay live/fresh, not work
// fully offline.

const CACHE_NAME = 'arx-shell-v1';
const PRECACHE_URLS = ['/', '/favicon.svg', '/icon-192.PNG'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Only handle simple GETs for the app shell; let everything else
  // (API calls, Firestore, Wavespeed proxy, auth) go straight to the network
  // untouched.
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone)).catch(() => {});
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
