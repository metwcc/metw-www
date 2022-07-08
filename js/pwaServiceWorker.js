const static = "metw-cc-v1"
const assets = [
    "/",
    "/?/",
    "/css/main.css",
    "/css/loading.css",
    "/js/main.js",
    "/icons/icon-32.png",
    "/icons/icon-64.png",
    "/icons/icon-128.png",
    "/icons/icon-256.png",
    "/icons/icon-512.png"
]

self.addEventListener("install", installEvent => {
    installEvent.waitUntil(
        caches.open(static).then(cache => {
            cache.addAll(assets)
        })
    )
})

self.addEventListener("fetch", fetchEvent => {
    fetchEvent.respondWith(
        caches.match(fetchEvent.request).then(res => {
            return res || fetch(fetchEvent.request)
        })
    )
})