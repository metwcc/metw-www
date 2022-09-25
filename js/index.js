const w = window, d = document
const session = new metw.Session()
const defaultAlert = alert
var page = p = {}, info = {}
var serviceWorker

//#region FUNCTIONS
async function load(f) {
    var bar = d.getElementById('loading-bar')
    bar.style = 'display: block; transition: 0; animation: none'; mouse.disable()
    setTimeout(() => bar.style = 'display: block; transition: .3s; loading-bar 1s ease-in-out infinite', 1)
    var data = await f()
    bar.style.height = '0'
    setTimeout(() => { if (bar.style.height == '0') bar.style = 'display: none' }, 300)
    mouse.enable()
    return data
}
function progress(v) {
    var bar = d.getElementById('progress-bar')
    if (v === 100) bar.style = 'width: 100%; transition: .3s'
    else if (v === 0) bar.style = 'width: 0; height: 2px'
    else bar.style = `width: ${v}%; height: 2px`
}
function timeSince(date) {
    var seconds = Math.floor((new Date() - date) / 1000), response = '', c = 0
    var interval = seconds / 31536000; if (c < 2 && interval > 1) { response += Math.floor(interval) + ' yıl '; c++ }
    interval = seconds / 2592000; if (c < 2 && interval % 12 > 1) { response += Math.floor(interval % 12) + ' ay '; c++ }
    interval = seconds / 86400; if (c < 2 && interval % 30 > 1) { response += Math.floor(interval % 30) + ' gün '; c++ }
    interval = seconds / 3600; if (c < 2 && interval % 24 > 1) { response += Math.floor(interval % 24) + ' saat '; c++ }
    interval = seconds / 60; if (c < 2 && interval % 60 > 1) { response += Math.floor(interval % 60) + ' dakika '; c++ }
    return !response ? 'şimdi' : response + ' önce'
}
function filedialog(mime) {
    return new Promise(resolve => {
        var input = d.createElement('input'); input.type = 'file', input.accept = mime
        input.click(); input.oninput = () => resolve(input)
    })
}
function toBase64(file) {
    return new Promise(resolve => {
        var reader = new FileReader()
        reader.readAsDataURL(file)
        reader.onload = () => resolve(reader.result)
    })
}
function urlBase64ToUint8Array(base64String) {
    var rawData = window.atob((base64String + '='.repeat((4 - base64String.length % 4) % 4)).replace(/\-/g, '+').replace(/_/g, '/')), outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i); return outputArray;
}
function isConstructor(func) { return (func && typeof func === "function" && func.prototype && func.prototype.constructor) === func }
function pinchZoom(imageElement) {
    let imageElementScale = 1, start = {}, margin = d.createElement('div')
    margin.className = 'margin'
    imageElement.parentNode.insertBefore(margin, imageElement)
    margin.style = `height: ${imageElement.offsetHeight}px; display: none`
    imageElement.addEventListener('load', () => margin.style.height = imageElement.offsetHeight + 'px')
    const distance = (event) => Math.hypot(event.touches[0].pageX - event.touches[1].pageX, event.touches[0].pageY - event.touches[1].pageY)
    imageElement.addEventListener('touchstart', (event) => {
        if (event.touches.length === 2) {
            event.preventDefault()
            imageElement.style.transition = ''
            imageElement.style.position = 'absolute'
            margin.style.display = 'block'
            start.x = (event.touches[0].pageX + event.touches[1].pageX) / 2
            start.y = (event.touches[0].pageY + event.touches[1].pageY) / 2
            start.distance = distance(event)
        }
    })
    imageElement.addEventListener('touchmove', (event) => {
        if (event.touches.length === 2) {
            event.preventDefault()
            let scale = event.scale || distance(event) / start.distance
            imageElementScale = Math.min(Math.max(1, scale), 4)
            imageElement.style.WebkitTransform = imageElement.style.transform = `translate3d(${(((event.touches[0].pageX + event.touches[1].pageX) / 2) - start.x) * 2}px, ${(((event.touches[0].pageY + event.touches[1].pageY) / 2) - start.y - imageElement.offsetHeight / 2) * 2}px, 0) scale(${imageElementScale})`
            imageElement.style.zIndex = "9999"
        }
    })
    imageElement.addEventListener('touchend', (event) => { imageElement.style.transition = '.3s', margin.style.display = 'none', imageElement.style.position = '', imageElement.style.zIndex = imageElement.style.WebkitTransform = imageElement.style.transform = "" } )
}
alert = (message, type) => {
    var list = d.querySelector('#alerts ul'), element = list.querySelector('li:first-of-type').cloneNode(true), delay = message.length * 100 + 500,
        span = d.createElement('span'), bg = `var(--bg-a-${['d', 's', 'e'][[undefined, 'success', 'error'].indexOf(type)]})`
    span.innerHTML = message; element.appendChild(span)
    list.appendChild(element)
    element.style.background = bg
    element.querySelector('svg').onclick = () => { element.style = `background: ${bg}`; setTimeout(() => element.remove(), 300) }
    setTimeout(() => { element.style = `transform: none; opacity: 1; background: ${bg}`; element.querySelector('div').style = `width: 100%; transition: ${delay}ms linear` }, 20)
    setTimeout(() => element.style = `background: ${bg}`, delay)
    setTimeout(() => element.remove(), delay + 300)
    list.scrollTop = list.scrollHeight
}
alert.error = (message) => alert(message, 'error')
alert.success = (message) => alert(message, 'success')
fetch.stream = async (url, progress, fetchInit) => {
    progress(0)
    return await fetch(url, fetchInit).then((res) => {
        var contentLenght = res.headers.get('content-length'), downloadLength = 0
        const reader = res.body.getReader()
        return new ReadableStream({
            start(controller) {
                return pump()
                function pump() {
                    return reader.read().then(({ done, value }) => {
                        if (done) { controller.close(); return }
                        controller.enqueue(value); downloadLength += value.length
                        progress(parseInt(downloadLength / contentLenght * 100))
                        return pump()
                    })
                }
            }
        })
    }).then(stream => { setTimeout(() => progress(100), 40); return new Response(stream) })
}

const acceptInput = ({ target }, pattern, length) => target.value = target.value.match(pattern).join('').substring(0, length)
const popupMenu = ({ target }, buttons) => {
    var popup = d.createElement('div'), rect, offsetWidth
    popup.className = '_popup-menu', popup.style = 'width: unset; height: unset; transition: 0'
    setTimeout(() => { offsetWidth = popup.offsetWidth, popup.style.width = '0' }, 20)
    setTimeout(() => { popup.style.width = `${offsetWidth}px`; place() }, 40)
    var place = () => { rect = target.closest('._popup-menu-button').getBoundingClientRect(), popup.style.left = `${rect.x}px`, popup.style.top = `${rect.y}px` }
    var close = ({ target: targetClick }) => {
        if (targetClick != popup) {
            popup.style.width = '0'; setTimeout(() => popup.remove(), 300)
            d.removeEventListener('click', close, true); d.removeEventListener('touch', close, true)
            w.removeEventListener('resize', place, true); d.removeEventListener('scroll', place, true)
        }
    }
    d.addEventListener('click', close, true); d.addEventListener('touch', close, true)
    w.addEventListener('resize', place, true); d.addEventListener('scroll', place, true)
    popup.innerHTML = buttons.filter(b => b).map(v => `<button class="_inline-img">${icons[v[0]]}${v[1]}</button>`).join('')
    Array.from(popup.children).forEach((button, index) => button.onclick = buttons[index][2])
    d.documentElement.appendChild(popup)
}
//#endregion

//#region F-2
const app = {
    location: { 
        search: [],
        pathname: [],
        format() {
            let [pathname, ...search_] = ((window.location.pathname == '/' && window.location.search.startsWith('?/')) ? decodeURI(window.location.search).substring(1) : `${decodeURI(window.location.pathname)}&${decodeURI(window.location.search.substring(1))}`).split('&'), search = { 'args': [], 'kwargs': {} }
            pathname = pathname.split('/').filter(function (e) { return e != ''; }); for (let x = 0; x < search_.length; x++) { let a = search_[x].split('='); if (a.length == 1) { search.args.push(a[0]) } else { search.kwargs[a[0]] = a[1] } }; delete search_
            if (window.location.search.startsWith('?/')) window.history.pushState(null, '', window.location.search.substring(2).replace('&', '?')); return [this.pathname, this.search] = [pathname, search]
        }
    },
    template: {
        data: {},
        async render(name) {
            await load(async () => {
                if (this.data[name]) {
                    var scripts = [[], []], oldPage = d.getElementById('page')
                    page = p = d.getElementById('page').cloneNode(true)
                    page.innerHTML = this.data[name].replace(/<script init>([\s\S]*?)<\/script>/g, (raw, data) => { scripts[0].push(data); return '' })
                        .replace(/<script>([\s\S]*?)<\/script>/g, (raw, data) => { scripts[1].push(data); return '' })
                        .replace(/<template>([\s\S]*?)<\/template>/g, (raw, data) => data)
                    for (let script of scripts[0]) await new Promise(resolve => eval(`(async resolve => { ${script}; resolve() })`)(resolve))
                    setTimeout(() => d.getElementById('loading-bar').style.height = '0', 2)
                    for (let script of scripts[1]) { var e = d.createElement('script'); e.innerHTML = script; page.appendChild(e) }
                    oldPage.parentNode.replaceChild(page, oldPage); d.querySelector('.page-outer').scroll(0, 0)
                } else { this.data[name] = await fetch.stream(`/pages/${name}.html`, progress).then(r => r.text()); await this.render(name) }
            })
        }
    },
    async redirect(path, title) {
        w.history.pushState(null, title, path)
        await this.load()
    },
    async load() {
        this.location.format()
        var composeEnabled = (e) => d.getElementById('compose-button').style.marginLeft = e ? '' : '-5em'
        if (this.location.pathname[0]?.[0] == '@') { composeEnabled(true); return await this.template.render(this.location.pathname[1] == 'duvar' ? 'wall' : 'profile') }
        switch (this.location.pathname[0]) {
            case 'keşfet': composeEnabled(true); return await this.template.render('explore')
            case 'katıl': composeEnabled(false); return await this.template.render('gateway')
            case 'giriş': composeEnabled(false); return await this.template.render('gateway')
            case 'ayarlar': composeEnabled(false); return await this.template.render('settings')
            case 'gönderi': composeEnabled(true); return await this.template.render('post')
            case 'bildirimler': composeEnabled(false); return await this.template.render('notifications')
            case 'ara': composeEnabled(false); return await this.template.render('search')
            case undefined: composeEnabled(true); return await this.template.render('homepage')
            default: composeEnabled(false); return await this.template.render('404')
        }
    }
}
const mouse = {
    _state: true,
    _element: d.getElementById('disable-mouse'), 
    set state(s) { this._state = s, this._element.style.display = ['none', 'block'][+!s] },
    get state() { return this._state },
    enable() { this.state = true },
    disable() { this.state = false }
}
//#endregion


//#region IMAGE CROP
const crop = d.querySelector('#image-crop')
Object.assign(crop, {
    frame: crop.querySelector('.frame'), active: false,
    div: crop.querySelector('.main'), img: crop.querySelector('img'),
    zoom: crop.querySelector('input'),
    cancel: crop.querySelector('.cancel'), ok: crop.querySelector('.ok')
})
crop.start = async (ratio, resolution) => {
    return new Promise(async resolve => {
        [crop.rawRatio, crop.resolution] = [ratio.split(':'), resolution.split('x')].map(i => i.map(i => parseInt(i)))
        crop.landspace = crop.rawRatio[0] > crop.rawRatio[1]
        crop.ratio = crop.rawRatio[0] / crop.rawRatio[1]
        var image = await filedialog('image/*')
        if (image.files[0]) crop.img.src = await toBase64(image.files[0])
        crop.ok.onclick = () => {
            var canvas = d.createElement('canvas')
            canvas.width = crop.resolution[0], canvas.height = crop.resolution[1]
            var ctx = canvas.getContext('2d'), scales = [crop.img.naturalWidth / crop.img.offsetWidth, crop.img.naturalHeight / crop.img.offsetHeight]
            ctx.drawImage(crop.img, (crop.img.meta.sx < 0 ? 0 : crop.img.meta.sx + crop.frame.offsetWidth > crop.img.offsetWidth ? crop.img.offsetWidth - crop.frame.offsetWidth : crop.img.meta.sx) * scales[0],
                (crop.img.meta.sy < 0 ? 0 : crop.img.meta.sy + crop.frame.offsetHeight > crop.img.offsetHeight ? crop.img.offsetHeight - crop.frame.offsetHeight : crop.img.meta.sy) * scales[1],
                crop.frame.offsetWidth * scales[0], crop.frame.offsetHeight * scales[1], 0, 0, ...crop.resolution)
            resolve(canvas.toDataURL('image/webp'))
            crop.cancel.click()
        }
    })
}
crop.reflow = (reset) => {
    var _p = crop.div.offsetWidth / crop.div.offsetHeight < crop.ratio
    crop.frame.style.width = _p ? crop.div.offsetWidth * .9 + 'px' : null, crop.frame.style.height = _p ? null : crop.div.offsetHeight * .9 + 'px'
    if (reset == true) crop.img.meta = { x: 0, y: 0, landspace: crop.img.offsetWidth > crop.img.offsetHeight, sx: 0, sy: 0, ratio: crop.img.offsetWidth / crop.img.offsetHeight, fixScale: 1 }
    for (let i of ['width', 'height']) crop.img.removeAttribute(i)
    eval(`crop.img.${(crop.img.meta.landspace ? 'width' : 'height')} = (crop.landspace ? crop.frame.offsetWidth : crop.frame.offsetHeight) * crop.zoom.value / 100 * crop.img.meta.fixScale`)
    crop.img.meta.fixScale *= reset ? crop.img.offsetHeight < crop.frame.offsetHeight ? crop.frame.offsetHeight / crop.img.offsetHeight : crop.img.offsetWidth < crop.frame.offsetWidth ? crop.img.meta.fixScale *= crop.frame.offsetWidth / crop.img.offsetWidth : 1 : 1
    crop.img.meta.sx = crop.img.offsetWidth / 2 - (crop.frame.offsetWidth / 2 - crop.img.meta.x), crop.img.meta.sy = crop.img.offsetHeight / 2 - (crop.frame.offsetHeight / 2 - crop.img.meta.y)
    crop.img.meta.x = crop.img.meta.sx < 0 ? -crop.img.offsetWidth / 2 + crop.frame.offsetWidth / 2 : crop.img.meta.sx + crop.frame.offsetWidth > crop.img.offsetWidth ? crop.img.offsetWidth / 2 - crop.frame.offsetWidth / 2 : crop.img.meta.x
    crop.img.meta.y = crop.img.meta.sy < 0 ? -crop.img.offsetHeight / 2 + crop.frame.offsetHeight / 2 : crop.img.meta.sy + crop.frame.offsetHeight > crop.img.offsetHeight ? crop.img.offsetHeight / 2 - crop.frame.offsetHeight / 2 : crop.img.meta.y
    crop.img.style.left = `calc(50% - ${crop.img.meta.x}px)`, crop.img.style.top = `calc(50% - ${crop.img.meta.y}px)`
    if (reset == true) crop.reflow()
}
crop.img.onmousedown = crop.frame.onmousedown = () => crop.click = true
crop.zoom.oninput = crop.reflow
crop.onmouseup = crop.mouseout = () => crop.click = false
crop.div.onmousemove = ({ target }) => { if (!crop.click || !['DIV', 'IMG'].includes(target.tagName)) return; crop.img.meta.x -= event.movementX, crop.img.meta.y -= event.movementY; crop.reflow() }
crop.img.onload = () => {
    crop.active = true, crop.click = false, crop.zoom.value = 100
    crop.frame.style.aspectRatio = `${crop.rawRatio[0]} / ${crop.rawRatio[1]}`
    crop.style.display = 'grid'
    setTimeout(() => crop.style = 'display: grid; opacity: 1; transform: none', 20)
    crop.reflow(true)
}
crop.ontouchstart = ({ touches: [{ screenX, screenY }] }) => crop.touch = [screenX, screenY]
crop.ontouchmove = ({ target, touches: [{ screenX, screenY }] }) => { if (!['DIV', 'IMG'].includes(target.tagName)) return; crop.img.meta.x -= screenX - crop.touch[0], crop.img.meta.y -= screenY - crop.touch[1]; crop.touch = [screenX, screenY]; crop.reflow() }
crop.cancel.onclick = () => { crop.style = 'display: grid'; setTimeout(() => { crop.style = '' }, 300) }
w.addEventListener('resize', () => { if (crop.style.display == 'grid') crop.reflow })
//#endregion


//#region SESSION
session.onlogin = () => {
    localStorage.setItem('SID', session.SID)
    for (e of d.getElementsByClassName('@logged')) e.style.display = ''
    for (e of d.getElementsByClassName('@non-logged')) e.style.display = 'none'
    for (e of d.getElementsByClassName('@username')) e.innerText = session.user.displayName
    for (e of d.getElementsByClassName('@avatar')) e.src = session.user.avatarURL
}
session.onloginfailed = () => {
    for (e of d.getElementsByClassName('@logged')) e.style.display = 'none'
    for (e of d.getElementsByClassName('@non-logged')) e.style.display = ''
    localStorage.removeItem('SID')
}
session.onlogout = () => { session.onloginfailed(); app.redirect('') }

session.onchangeavatar = () => { for (e of d.getElementsByClassName('@avatar')) e.src = session.user.avatarURL }
session.onchangebanner = () => { for (e of d.getElementsByClassName('@banner')) e.src = session.user.bannerURL }
session.onnotification = n => {
    if (app.location.pathname[0] == 'bildirimler') {
        p.list.insertBefore(p.notification(n), p.list.firstChild)
        session.markNotificationsAsRead()
    }
    if (!d.hasFocus() && typeof Notification == 'function' && +localStorage.getItem('notifications')) {
        var _notification = serviceWorker.showNotification(`${n.details.at(-1).displayName} ${['seni takip ediyor', 'gönderini beğendi', ['profiline yorum yazdı', 'gönderine yorum yazdı', 'yorumuna yanıt yazdı'][n.details[1]]][n.type - 1]}`, {
            body: n.type == 1 ? undefined : n.details[0].content,
            icon: n.details.at(-1).avatarURL,
            vibrate: [200, 100, 200, 100, 200, 100, 200],
            badge: '/images/logo/badge-96.png'
        })
        _notification.onclick = () => { if (app.location.pathname[0] != 'bildirimler') app.redirect('/bildirimler'); return true } 
    }
}

session.onupgradefound = () => w.location.reload()
session.onupdatenotificationcount = (count) => {
    for (e of d.getElementsByClassName('@notification-count')) e.style.display = count ? 'block' : 'none', e.innerHTML = count
}

session.ondown = (data) => {
    d.getElementById('down').style.display = 'flex'
    d.querySelector('#down span').innerHTML = data.message
}
session.onunexpectederror = () => session.ondown({ message: 'Beklenmedik bir hata meydana geldi...' })
session.onconnectionerror = () => window.location.replace('/offline.html')

session.etc = {
    async upload(t, d) { return await load(async () => await session.upload(t, d)) },
    async changeAvatar() { return this.upload('avatar', await crop.start('1:1', '128x128')) },
    async changeBanner() { return this.upload('banner', await crop.start('16:9', '800x450'))  }
}

var composeAttachment
d.getElementById('compose-button').onclick = () => {
    var div = d.getElementById('compose'), textarea = div.querySelector('textarea')
    textarea.value = '', composeAttachment = undefined, d.querySelector('#compose .image').style.display = 'none'
    div.style.display = 'grid'
    setTimeout(() => { div.style = 'display: grid; transform: none; opacity: 1'; textarea.focus() }, 20)
    div.querySelector('button.cancel').onclick = () => { div.style = 'display: grid'; setTimeout(() => div.style = '', 320) }
    div.querySelector('button.send').onclick = async () => {
        var content = div.querySelector('textarea').value
        if (content.length < 2) return alert.error('Gönderi 2 karakterden kısa olamaz')
        var response = await load(async () => await session.post(content, composeAttachment))
        if (Array.isArray(response)) return alert.error(response[0])
        div.querySelector('button.cancel').click()
    }
}
d.querySelector('#compose .upload').onclick = async () => {
    var _image = await toBase64((await filedialog('image/*')).files[0]), image = new Image()
    image.onload = () => {
        var canvas = d.createElement('canvas'), s = { w: image.width, h: image.height }, m
        if (image.width > 1800) m = 1800 / image.width, image.width *= m, image.height *= m
        if (image.height > 2700) m = 2700 / image.height, image.width *= m, image.height *= m
        canvas.width = image.width, canvas.height = image.height
        var ctx = canvas.getContext('2d')
        ctx.drawImage(image, 0, 0, s.w, s.h, 0, 0, canvas.width, canvas.height)
        canvas.toBlob(blob => composeAttachment = blob, 'image/webp', .8)
        d.querySelector('#compose .image').style.display = 'block'
        img = d.querySelector('#compose .image img')
        img.src = canvas.toDataURL('image/webp', .8)
        img.style.width = `${image.width / image.height * 6}em`
    }
    await (image.src = _image)
}
d.querySelector('#compose .cancel-upload').onclick = async () => { composeAttachment = undefined; d.querySelector('#compose .image').style.display = 'none' }
//#endregion


w.onload = async () => {
    w.onresize()

    try { info = await fetch(url.backend + '/').then(r => raw = r).then(r => r.json()) }
    catch { w.location.replace('/offline.html') }

    var raw; info.version = raw.headers.get('Version'), info.code = raw.status
    !localStorage.getItem('update-refresh') && localStorage.setItem('update-refresh', '0')
    if ('serviceWorker' in navigator) {
        serviceWorker = await navigator.serviceWorker.register(`/sw.js?v${info.version}`)
        if ((localStorage.getItem('version') && localStorage.getItem('version') != info.version)) { localStorage.setItem('update-refresh', '1'); w.location.reload() }
        else if (localStorage.getItem('update-refresh') == '1') { localStorage.setItem('update-refresh', '2'); w.location.reload() }
        else localStorage.setItem('update-refresh', '0')
        raw.status.toString().startsWith('5') && session.ondown(info)
        localStorage.getItem('no-cache') && navigator.serviceWorker?.controller?.postMessage('no-cache')
    }
    localStorage.setItem('version', info.version)

    SID = localStorage.getItem('SID')
    if (SID) try { await session.connect(SID) } catch { }
    else session.onloginfailed()
    await app.load()
    
    d.getElementById('initial-load').style = 'opacity: 0'
    setTimeout(() => d.getElementById('initial-load').remove(), 300)
}
w.onpopstate = () => { if (!mouse.state) return w.history.pushState(null, null); app.load() }
w.onresize = () => {
    var style = d.getElementsByClassName('@resize')[0], isNew = !style
    if (isNew) style = d.createElement('style'), style.className = '@resize'
    style.innerHTML = `body, body > * { height: ${window.innerHeight + 'px'} }`
    if (isNew) d.querySelector('body').appendChild(style)
}
w.onfocus = () => { session.setStatus('online') }
w.onblur = () => { session.setStatus('offline') }

const ontitlechange = new MutationObserver(([{ target }]) => gtag('config', gaId, { page_title: target.text, page_path: w.location.pathname }) )
ontitlechange.observe(document.querySelector('title'), { childList: true })