const static = "metw-cc-v1"
const assets = [
    "/offline.html",
    "https://code.jquery.com/jquery-3.4.1.min.js",
    "https://fonts.googleapis.com/css2?family=Source+Code+Pro:ital,wght@0,400;0,700;1,400;1,700&display=swap",
    "https://fonts.googleapis.com", "https://fonts.gstatic.com"
]

self.addEventListener("install", event => { event.waitUntil(precache()); }); function precache() { return caches.open(static).then(cache => cache.addAll(assets)); }

self.addEventListener("fetch", event => {
    const request = event.request; if (request.method !== "GET") { return; }
    if (event.request.mode === "navigate") {
        event.respondWith(
            (async () => {
                try {
                    const preloadResponse = await event.preloadResponse;
                    if (preloadResponse) { return preloadResponse; }
                    const networkResponse = await fetch(event.request);
                    return networkResponse;
                } catch (error) {
                    const cache = await caches.open(static);
                    const cachedResponse = await cache.match("/offline.html");
                    return cachedResponse;
                }
            })()
        );
    }
})