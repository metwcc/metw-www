var static, defaultStatic = 'metw', id = 0
var assets = ['/offline.html', '/favicon.ico', '/index.html', '/pages/admin.html',
    ...['index', 'dark-theme'].map(name => `/css/${name}.css`),
    ...['index', 'metw', 'metw-gui'].map(name => `/js/${name}.js`)]

self.oninstall = async event => {
    if (event) self.skipWaiting()
    id = ~~(Math.random() * 999999) + ''
    while (id.length < 6) id = 0 + id
    static = defaultStatic + id
    await Promise.all((await caches.keys()).map(key => caches.delete(key)))
    await caches.open(static).then(cache => cache.addAll(assets.map(a => `${a}?${id}`)))
}

self.onactivate = event => {
    self.clients.claim()
}

const fixStatic = async () => {
    static = (await caches.keys()).find(i => i.startsWith(defaultStatic))
    if (!static) return await self.oninstall()
    id = static.replace(defaultStatic, '') 
}

self.onfetch = async event => {
    const request = event.request, url = new URL(request.url)
    if (url.origin == self.origin) {
        event.respondWith((async () => {
            await fixStatic()
            const cache = await caches.open(static)
            if (request.mode === 'navigate') {
                const cachedPage = await cache.match(`${assets.includes(url.pathname) ? url.pathname : '/index.html'}?${id}`)
                if (cachedPage) return cachedPage
            }
            else {
                const cachedPage = await cache.match(`${url.pathname}?${id}`)
                if (cachedPage) return cachedPage
            }
            await cache.add(`${url.pathname}?${id}`); return await cache.match(`${url.pathname}?${id}`)
        })())
    }
}

self.onpush = async event => {
    const { title, body, url, icon } = JSON.parse(event.data.text())
    event.waitUntil(new Promise(resolve => setTimeout(() => {
        self.registration.showNotification(title, { body, icon, vibrate: [100], data: { url } }).then(() => resolve())
    }, 500)))
}
self.onnotificationclick = event => {
    event.notification.close(); const { url } = event.notification.data
    if (url) event.waitUntil(clients.openWindow(url))
}