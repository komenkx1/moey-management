const CACHE_NAME = "kemana-2.0.25";
const PRECACHE_URLS = [
  "/",
  "/manifest.webmanifest",
  "/favicon-32.png",
  "/favicon-16.png",
  "/apple-touch-icon.png",
  "/icons/icon-192.png",
  "/icons/icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();

      await Promise.all(
        keys
          .filter((key) => key.startsWith("kemana-") && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      );

      await self.clients.claim();
    })()
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  const url = new URL(event.request.url);
  const sameOrigin = url.origin === self.location.origin;

  if (event.request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const network = await fetch(event.request, { cache: "no-store" });
          const cache = await caches.open(CACHE_NAME);
          await cache.put("/", network.clone());
          return network;
        } catch {
          const cache = await caches.open(CACHE_NAME);
          const cached = await cache.match("/");
          return cached || Response.error();
        }
      })()
    );
    return;
  }

  const isNextStatic = sameOrigin && url.pathname.startsWith("/_next/static/");
  const isAsset =
    sameOrigin && /\.(?:js|css|png|jpg|jpeg|svg|webp|avif|ico|woff2?|webmanifest)$/i.test(url.pathname);

  if (!isNextStatic && !isAsset) {
    return;
  }

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(event.request);
      if (cached) {
        return cached;
      }

      const response = await fetch(event.request);
      if (response.ok) {
        cache.put(event.request, response.clone()).catch(() => {});
      }
      return response;
    })
  );
});
