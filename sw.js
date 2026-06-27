/* ============================================================
   HabitTrack Service Worker
   - Cache-first for static assets
   - Network-first for API calls
   - SkipWaiting on message for instant updates
   ============================================================ */

// ⚠️ BUMP THIS DATE every time you push an update to GitHub.
// This is what forces users to get fresh code after a deploy.
const CACHE_NAME = 'habittrack-v6-20260627';
const STATIC_ASSETS = [
  './',
  './index.html',
  './css/app.css',
  './js/main.js',
  './js/firebase.js',
  './js/state.js',
  './js/constants.js',
  './js/helpers.js',
  './js/storage.js',
  './js/broadcast.js',
  './js/sync.js',
  './js/auth.js',
  './js/habits.js',
  './js/sw-register.js',
  './js/renders/home.js',
  './js/renders/routines.js',
  './js/renders/log.js',
  './js/renders/analytics.js',
  './js/renders/settings.js',
  './js/ui/nav.js',
  './js/ui/modals.js',
  './js/ui/snackbar.js',
  './js/ui/theme.js',
  './js/ui/skeleton.js',
  './js/ui/bubbles.js',
  './js/ui/a11y.js',
  './js/ui/badges.js',
  './js/ui/gestures.js',
  './js/ui/backup-reminder.js',
  'https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/9.23.0/firebase-auth-compat.js',
  'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore-compat.js',
  'https://www.gstatic.com/firebasejs/9.23.0/firebase-database-compat.js',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js',
];

// ---- Install: cache static assets ----
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }).catch((err) => {
      console.warn('[SW] Cache addAll failed:', err);
    })
  );
  self.skipWaiting();
});

// ---- Activate: clean old caches ----
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) => {
      return Promise.all(
        names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))
      );
    })
  );
  self.clients.claim();
});

// ---- Fetch: cache-first for static, network-first for API ----
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip Firebase/Google API calls — always network
  if (
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('firebase') ||
    url.hostname.includes('gstatic.com') ||
    url.hostname.includes('chart.js')
  ) {
    return;
  }

  // Cache-first for static assets (JS, CSS, HTML)
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        // Don't cache opaque responses or errors
        if (!response || response.status !== 200 || response.type === 'opaque') {
          return response;
        }
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        return response;
      }).catch(() => {
        // Offline fallback: return cached index.html for navigation
        if (request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});

// ---- Message: handle skipWaiting from app ----
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
