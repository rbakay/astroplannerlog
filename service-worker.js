
const CACHE_NAME = "astroplannerlog-v3";
const OFFLINE_URLS = [
  "./",
  "index.html",
  "app.css",
  "app.js",
  "manifest.webmanifest",
  "apple-touch-icon.png",
  "astroplannerlog-192.png",
  "astroplannerlog-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(OFFLINE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return (
        response ||
        fetch(event.request).catch(() => {
          if (event.request.mode === "navigate") {
            return caches.match("index.html");
          }
        })
      );
    })
  );
});
