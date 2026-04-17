/* eslint-disable no-restricted-globals */

const CACHE_NAME = "bonde-results-v1";
const API_CACHE_NAME = "bonde-api-v1";

// Static assets to precache
const PRECACHE_URLS = [
  "/",
  "/manifest.json",
];

// API routes to cache with stale-while-revalidate
const API_PATTERNS = [
  /\/api\/classes($|\?)/,
  /\/api\/classes\/[^/]+$/,
  /\/api\/classes\/[^/]+\/students($|\?)/,
];

// ── Install ────────────────────────────────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

// ── Activate ───────────────────────────────────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_NAME && k !== API_CACHE_NAME)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// ── Fetch ──────────────────────────────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin requests
  if (url.origin !== self.location.origin) return;

  // For GET API requests: stale-while-revalidate
  if (
    request.method === "GET" &&
    API_PATTERNS.some((p) => p.test(url.pathname + url.search))
  ) {
    event.respondWith(staleWhileRevalidate(request, API_CACHE_NAME));
    return;
  }

  // For non-API GET requests: cache-first for static assets, network-first otherwise
  if (request.method === "GET") {
    event.respondWith(networkFirst(request, CACHE_NAME));
  }
});

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const fetchPromise = fetch(request)
    .then((response) => {
      if (response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => cached);

  return cached || fetchPromise;
}

async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached || new Response("Offline", { status: 503 });
  }
}
