var VERSION = 'version_002';
var URLS = [
    "/",
    "/404.html",
    "/index.html",
    "/css/styles.css",
    "/img/icon.png",
    "/js/app.js"
]

self.addEventListener('fetch', function (e) {
    console.log('Fetch request : ' + e.request.url);
    e.respondWith(
        caches.match(e.request).then(function (request) {
            if (request) {
                console.log('Responding with cache : ' + e.request.url);
                return request
            } else {
                console.log('File is not cached, fetching : ' + e.request.url);
                return fetch(e.request)
            }
        })
    )
})

self.addEventListener('install', function (e) {
    e.waitUntil(
        caches.open(VERSION).then(function (cache) {
            console.log('Installing cache : ' + VERSION);
            return cache.addAll(URLS)
        })
    )
})

self.addEventListener('activate', function (e) {
    e.waitUntil(
        caches.keys().then(function (keyList) {
            var cacheWhitelist = keyList.filter(function (key) {
                return key.indexOf(APP_PREFIX)
            })
            cacheWhitelist.push(VERSION);
            return Promise.all(keyList.map(function (key, i) {
                if (cacheWhitelist.indexOf(key) === -1) {
                    console.log('Deleting cache : ' + keyList[i]);
                    return caches.delete(keyList[i])
                }
            }))
        })
    )
})