const static = "metw-cc-v1"
const assets = [
    "/",
    "/css/main.css",
    "/css/loading.css",
    "/js/main.js",
    "/images/logo/circle/32.png",
    "/images/logo/circle/48.png",
    "/images/logo/circle/72.png",
    "/images/logo/circle/128.png",
    "/images/logo/circle/256.png",
    "/images/logo/circle/512.png",
    "/images/logo/maskable/512.png"
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
                    const cachedResponse = await cache.match("/");
                    return cachedResponse;
                }
            })()
        );
    }
})