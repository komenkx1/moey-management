const CACHE_NAME = "kemana-v1";
const CORE_URLS = [
  "/",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/apple-touch-icon.png",
  "/favicon-32.png",
  "/favicon-16.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(CORE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("kemana-") && key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  const requestUrl = new URL(event.request.url);
  const sameOrigin = requestUrl.origin === self.location.origin;

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const cloned = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, cloned)).catch(() => {});
          return response;
        })
        .catch(async () => {
          const cache = await caches.open(CACHE_NAME);
          const cachedPage = await cache.match(event.request);
          if (cachedPage) {
            return cachedPage;
          }
          const appShell = await cache.match("/");
          if (appShell) {
            return appShell;
          }
          return Response.error();
        })
    );
    return;
  }

  const isStaticAsset =
    sameOrigin &&
    (requestUrl.pathname.startsWith("/_next/static/") ||
      /\.(?:js|css|png|jpg|jpeg|svg|webp|avif|ico|woff2?|webmanifest)$/i.test(requestUrl.pathname));

  if (!isStaticAsset) {
    return;
  }

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(event.request);
      if (cached) {
        return cached;
      }

      const fetched = await fetch(event.request);
      if (fetched.ok) {
        cache.put(event.request, fetched.clone()).catch(() => {});
      }
      return fetched;
    })
  );
});
