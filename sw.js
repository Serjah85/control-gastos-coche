/* sw.js - PWA Service Worker
   - Cache de app shell (index/manifest/icon)
   - Offline fallback (para navegación)
   - Cache para CDNs (SheetJS / Tesseract) en modo Stale-While-Revalidate
*/
const VERSION = "v1.0.0";
const STATIC_CACHE = `static-${VERSION}`;
const RUNTIME_CACHE = `runtime-${VERSION}`;
// Ajusta esta lista si tu app vive en una subcarpeta distinta o cambias nombres
const STATIC_ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon.svg",
  "./sw.js"
];
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k !== STATIC_CACHE && k !== RUNTIME_CACHE)
          .map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});
// Helpers
function isNavigationRequest(request) {
  return request.mode === "navigate" ||
    (request.method === "GET" && request.headers.get("accept")?.includes("text/html"));
}
function isSameOrigin(request) {
  try {
    return new URL(request.url).origin === self.location.origin;
  } catch {
    return false;
  }
}
function isCDN(request) {
  const url = request.url;
  return (
    url.includes("cdn.sheetjs.com") ||
    url.includes("cdn.jsdelivr.net") ||
    url.includes("unpkg.com")
  );
}
async function cacheFirst(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  const fresh = await fetch(request);
  // cacheamos si OK o si es opaque (cross-origin)
  if (fresh.ok || fresh.type === "opaque") cache.put(request, fresh.clone());
  return fresh;
}
async function networkFirst(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  try {
    const fresh = await fetch(request);
    if (fresh.ok || fresh.type === "opaque") cache.put(request, fresh.clone());
    return fresh;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    // fallback al index si es navegación (offline)
    return caches.match("./index.html");
  }
}
async function staleWhileRevalidate(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cached = await cache.match(request);
  const fetchPromise = fetch(request)
    .then((fresh) => {
      if (fresh.ok || fresh.type === "opaque") cache.put(request, fresh.clone());
      return fresh;
    })
    .catch(() => cached);
  return cached || fetchPromise;
}
self.addEventListener("fetch", (event) => {
  const { request } = event;
  // Solo GET
  if (request.method !== "GET") return;
  // Navegación (app shell): network-first con fallback offline
  if (isNavigationRequest(request)) {
    event.respondWith(networkFirst(request));
    return;
  }
  // Same-origin: cache-first (rápido, offline)
  if (isSameOrigin(request)) {
    event.respondWith(cacheFirst(request));
    return;
  }
  // CDNs: stale-while-revalidate (va fino para libs)
  if (isCDN(request)) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }
  // Otros: network-first por defecto
  event.respondWith(networkFirst(request));
});
