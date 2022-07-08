const staticDevCoffee = "dev-coffee-site-v1"
const assets = [
    "/",
    "/index.html",
    "/css/main.css",
    "/css/loading.css",
    "/js/main.js",
    "/icons/icon-32.jpg",
    "/icons/icon-64.jpg",
    "/icons/icon-128.jpg",
    "/icons/icon-256.jpg",
    "/icons/icon-512.jpg"
]

self.addEventListener("install", installEvent => {
    installEvent.waitUntil(
        caches.open(staticDevCoffee).then(cache => {
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