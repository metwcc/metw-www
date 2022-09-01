const static = 'metw2'
const assets = [ 'offline.html', 'favicon.ico', '404.html' ]

self.addEventListener("install", event => { event.waitUntil(caches.open(static).then(cache => cache.addAll(assets))) })
self.addEventListener("fetch", event => {
    const request = event.request, pathname = decodeURI(event.request.url).matchAll(/https?\:\/\/[\.\w\d]+\/([\s\S]*)/g).next().value[1]
    if (request.method !== "GET") return
    if (event.request.mode === "navigate") 
        event.respondWith((async () => {
            try { var preloadResponse = await event.preloadResponse; if (preloadResponse) return preloadResponse; return (await fetch(event.request)) }
            catch {
                const cache = await caches.open(static)
                if (assets.includes(pathname)) return (await cache.match(pathname))
                else return (await cache.match('/offline.html'))
            }
        })())
})
self.addEventListener('push', async event => {
    const { title, body, url, icon } = JSON.parse(event.data.text())
    event.waitUntil(new Promise(resolve => setTimeout(() => {
        self.registration.showNotification(title, { body, icon, vibrate: [100], data: { url } }).then(() => resolve())
    }, 500)))
})
self.addEventListener('notificationclick', event => {
    event.notification.close(); const { url } = event.notification.data
    if (url) event.waitUntil(clients.openWindow(url))
})