// Service worker "brise-cache" — utilisé uniquement pour la version web (GitHub Pages).
// Dans l'APK, les fichiers sont embarqués : chaque nouvel APK = nouvelle version.
// Incrémenter CACHE_NAME à chaque livraison touchant un fichier statique.
const CACHE_NAME = 'rando-mbtiles-cache-v14';
const PRECACHE_ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.webmanifest',
  './vendor/leaflet/leaflet.css',
  './vendor/leaflet/leaflet.js',
  './vendor/jszip.min.js'
];
const APP_URLS = new Set(
  ['./', './index.html', './style.css', './app.js', './manifest.webmanifest']
    .map((p) => new URL(p, self.location).href)
);

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_ASSETS)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      clients.claim(),
      caches.keys().then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
      )
    ])
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  // Tuiles en ligne et autres ressources externes : réseau direct, aucun cache
  // (respect des politiques d'usage des serveurs de tuiles).
  if (url.origin !== self.location.origin) return;

  // Network-first : fichiers de l'app (HTML/JS/CSS)
  if (request.mode === 'navigate' || APP_URLS.has(url.href)) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Cache-first : bibliothèques vendorisées, images de Leaflet…
  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ||
        fetch(request).then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
    )
  );
});
