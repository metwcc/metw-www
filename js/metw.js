var info, metw = {}

metw.util = {
    objectDeepKeys: (obj) => {
        var keys = []
        for (let key in obj) { keys.push(key); if (typeof obj[key] == 'object') keys.push(...metw.util.objectDeepKeys(obj[key]).map(subkey => `${key}.${subkey}`)) }
        return keys
    },
    BitwiseTester: class {
        constructor(data) {
            this.data = {}
            for (let key of metw.util.objectDeepKeys(data)) eval(`if(!isNaN(data.${key})) this.data['${key}'] = 2 ** data.${key}`)
        }
        basicEval(condition) {
            return +condition.split('|').map(c => {
                let nums = c.split('&').map(v => parseInt(v))
                if (nums.length == 1) return nums[0]
                let target = Array.from(new Set(nums.slice(1))).reduce((t, n) => t += n)
                return ((nums[0] & target) === target) && !!target
            }).some(v => v == true)
        }
        eval(num, condition) {
            var _condition = condition.replace(/(?:\'([^\']*)\'|\"([^\"]*)\")/g, (input, s1, s2) => this.data[s1] || this.data[s2]).replace(/\$/g, num).replace(/\s/g, '')
            let re = /\(([^\(\)]*)\)/g, _eval = () => { _condition = _condition.replace(re, (input, data) => this.basicEval(data)); if (_condition.match(re)) _eval() }; _eval()
            return !!this.basicEval(_condition)
        }
    }
}

metw.Session = class Session {
    constructor(SID) {
        this.SID = SID
        this.user = { id: 0 }
        this.notificationCount = 0
        this.indexed = { users: [], posts: [], comments: [], raw: [], notifications: [] }
        setInterval(() => { if (this.ws.readyState == 1) this.ws.send('0') }, 30000)
    }
    async event(name, ...args) {
        if (typeof this['on' + name] == 'function') this['on' + name](...args)
    }

    async request(options) {
        return await new Promise(async resolve => {
            var headers = {}, body
            if (options.headers) headers = { ...headers, ...options.headers }
            if (options.json) body = JSON.stringify(options.json), headers['content-type'] = 'application/json', options.method = 'post'
            if (options.form) body = options.form, options.method = 'post'
            if (this.SID) headers.SID = this.SID
            try {
                var raw, ok, isErr, res = await fetch(url.backend + options.path, { method: options.method || 'get', headers: headers, body: body })
                    .then(res => { ok = res.ok, raw = res; return res.json() }).catch(err => isErr = true).then(json => [json, ok, raw])
                if (isErr) return this.event('unexpectederror')
                if (info && raw.headers.get('Version') != info.version) this.event('upgradefound')
                if (res[2].status.toString().startsWith('5')) resolve(this.event('down', res[0]))
                if (res[2].status == 401 && res[0][1] == 205) this.event('loginfailed')
                if (res[2].status == 429 && options.retry !== false) setTimeout(async () => resolve(await this.request(options)), (parseInt(res[2].headers.get('RateLimit-Reset'))) * 1000)
                else resolve(res)
            } catch { this.event('connectionerror') }
        })
    }

    async explore() {
        return await this.bulkGet((await this.request({ path: '/explore' }))[0])
    }
    async homepage(before) {
        return await this.bulkGet('posts', (await this.request({ path: `/homepage?id=${this.user.id}&before=${before ? before : 0}` }))[0])
    }

    async settings(actions) {
        var [responses, ok] = await this.request({ path: '/settings', json: actions })
        var resp = {}
        for (var response of Object.keys(responses))
            switch (response) {
                case 'remove_avatar': this.user.avatar = 0; this.event('changeavatar'); break
                case 'remove_banner': this.user.banner = 0; this.event('changebanner'); break
                case 'update_bio': this.user.bio = actions.find(action => action.name == 'update_bio').content; break
                case 'change_password':
                    if (responses['change_password'][1]) {
                        this.SID = responses['change_password'][0]
                    }
                    resp['change_password'] = responses['change_password'][1]
                    break
            }
        return resp
    }
    async upload(param, base64, key) {
        if (['avatar', 'banner'].includes(param)) {
            var [_new, ok] = await this.request({ path: `/upload/${param}`, json: { base64: base64 } })
            if (['avatar', 'banner'].includes(param)) { this.user[param] = _new; this.event(`change${param}`) }
            return ok ? (() => { this.user[param] = _new; return _new })() : ok
        } else {
            var form = new FormData(); form.append('file', base64)
            var [_new, ok] = await this.request({ path: `/upload/${param}?key=${key}`, form })
            return _new
        }
    }

    async signup(username, password, captcha) {
        var [SID, ok] = await this.request({ path: '/signup', json: { username: username, password: password, captcha: captcha }, retry: false })
        if (!ok) return SID; this.SID = SID; return await this.connect()
    }
    async login(username, password) {
        var [SID, ok] = await this.request({ path: '/login', json: { username: username, password: password }, retry: false })
        if (!ok) return SID; this.SID = SID; return await this.connect()
    }
    async connect(SID) {
        if (SID) this.SID = SID
        var [session, ok] = await this.request({ path: '/session', headers: { SID: this.SID } })
        if (ok) {
            this.user = new metw.User(session, this)
            this.indexed = { users: [this.user], posts: [], comments: [], raw: [], notifications: [] }
            this.notificationCount = 0
            this.ws = new WebSocket(url.ws + `?${this.SID}`)
            this.ws.onmessage = message => this._onwsmessage(message)
            this.ws.onclose = () => this._onwsclose()
        }
        this.logged = ok
        this.event(ok ? 'login' : 'loginfailed')
        return this.SID
    }
    async disconnect() {
        this.indexed = { users: [], posts: [], comments: [], raw: [], notifications: [] }
        this.notificationCount = 0
        this.user = { id: 0 }
        this.logged = false, this.SID = undefined
        this.ws.close()
        this.event('logout')
    }
    async post(content, attachment) {
        var [id, ok] = await this.request({ path: '/posts', json: Object.assign({ content: content }, attachment ? { has_attachment: true } : {}), retry: false })
        if (!ok) return id
        if (attachment) {
            await this.upload('image', attachment, id.upload_key)
        }
        var post = new metw.Post({ id: id.id, user_id: this.user.id, user: this.user, content, flags: (attachment ? 1 : 0) }, session)
        this.indexed.posts.push(post)
        this.event('post', post)
        return post
    }

    async manage(json) {
        await session.request({ path: '/admin', json: json })
    }

    async index(data) {
        for (let key of Object.keys(data)) {
            if (!['users', 'notifications'].includes(key)) await this.bulkGet('users', data[key].map(d => d.user_id))
            var _data = []
            for (let d of data[key]) {
                if (!['users', 'notifications'].includes(key)) var user = await this.get('user', d.user_id)
                _data.push(eval(`new metw.${key.charAt(0).toUpperCase() + key.slice(1, -1)}({ ...d, user: ${key != 'users' ? 'user' : undefined} }, this)`))
            }
            this.indexed.raw.push(..._data)
            if (key == 'comments') 
                _data.forEach(comment => { if (comment.type == 2) this.indexed.raw.find(parent => (Object.getPrototypeOf(parent).constructor == Comment) && (parent.id == comment.parentId) && (parent.replies.every(reply => reply.id != comment.id)))?.replies.push(comment) })
            if (key == 'notifications') {
                let dataToGet = { users: [], posts: [], comments: [] }
                dataToGet.users.push(..._data.filter(n => [1, 2].includes(n.type)).map(n => n.details[+(n.type == 2)]))
                dataToGet.users.push(..._data.filter(n => n.type == 3 && n.details[1] == 0).map(n => n.details[2]))
                dataToGet.users.push(..._data.filter(n => n.type == 3).map(n => n.details[3]))
                dataToGet.posts.push(..._data.filter(n => n.type == 2).map(n => n.details[0]))
                dataToGet.posts.push(..._data.filter(n => n.type == 3 && n.details[1] == 1).map(n => n.details[2]))
                dataToGet.comments = _data.filter(n => n.type == 3).map(n => n.details[0])
                for (let k of Object.keys(dataToGet)) { dataToGet[k] = Array.from(new Set(dataToGet[k])); if (!dataToGet[k].length) dataToGet[k] = [0]}
                await this.bulkGet(dataToGet)
                await Promise.all(_data.map(n => n.format()))
            }
            this.indexed[key].push(..._data)
        }

    }
    async get(param, selector) {
        if (param == 'notifications') {
            var data = await this.bulkGet('notifications', (await this.request({ path: `/notifications?id=${this.user.id}&before=${selector || 0}` }))[0])
            if (this.notificationCount != 0) this.request({ path: '/notifications/read' }); return data
        }
        var user = this.indexed[param + 's'].find(typeof selector == 'number' ? data => data.id == selector : user => user.name == selector)
        return user ||
            await (async () => {
                var [data, ok] = await this.request({ path: `/${param}s/${typeof selector == 'number' && param == 'user' ? ':' : ''}${selector}?id=${this.user.id}` })
                if (!ok) return false
                if (param != 'user') var user = await this.get('user', data.user_id)
                data = eval(`new metw.${param.charAt(0).toUpperCase() + param.substring(1)}({ ...data, user: ${param != 'user' ? 'user' : undefined} }, this)`)
                this.indexed[param + 's'].push(data)
                return data
            })()
    }
    async bulkGet(param, ids) {
        if (!Array.isArray(ids)) {
            var _param = { ...param }, response = {}
            for (let key of Object.keys(_param))
                _param[key] = _param[key].slice(0, 50).filter((id, index, array) => array.indexOf(id) == index && !this.indexed[key].some(data => data.id == id))
            if (Object.values(_param).some(v => v.length)) var [data, ok] = await this.request({ path: `/bulk?id=${this.user.id}`, json: _param })
            if (ok) await this.index(Array.isArray(data) ? { [Object.keys(_param)[0]]: data } : data)
            Object.keys(param).forEach(key => response[key] = param[key].map(id => this.indexed[key].find(i => i.id == id)).filter(i => !!i))
            return response
        }
        var _ids = ids.slice(0, 100).filter((id, index, array) => array.indexOf(id) == index && !this.indexed[param].some(data => data.id == id))
        if (_ids.length) var [data, ok] = await this.request({ path: `/${param}/bulk?id=${this.user.id}`, json: _ids })
        if (ok) await this.index({ [param]: data })
        return ids.map(id => this.indexed[param].find(i => i.id == id)).filter(i => !!i)
    }

    async _onwsmessage(message) {
        var type = message.data[0], data = message.data.substring(1)
        switch (type) {
            case '1': this.notificationCount += 1; this.event('updatenotificationcount', this.notificationCount); break
            case '2': this.notificationCount = parseInt(data); this.event('updatenotificationcount', parseInt(data)); break
        }
    }
    async _onwsclose() { if (!this.logged) return; this._wsconnect() }
    _wsconnect() {
        this.ws = new WebSocket(this.ws.url)
        this.ws.onmessage = this._onwsmessage.bind(this)
        this.ws.onclose = this._onwsclose.bind(this)
    }
}

metw.Notification = class Notification_ {
    constructor(data, session) {
        this.id = data.id, this.type = data.type
        this.details = data.details, this.text = data.text
        this.readen = data.readen, this.timestamp = new Date(this.timestamp)
        this._session = session
    }
    async format() {
        const detail = async (n, type) => this.details[n] = await this._session.get(type, this.details[n])
        switch (this.type + 'a') {
            case '1a': await detail(0, 'user'); break
            case '2a': await detail(0, 'post'); await detail(1, 'user'); break
            case '3a':
                await detail(0, 'comment')
                await detail(2, ['user', 'post', 'comment'][this.details[1]])
                await detail(3, 'user'); break
        }
    }
}

metw.User = class User {
    static permissionTester = new metw.util.BitwiseTester({
        'admin': 0,
        'users': {
            'ban': 1,
            'change_usernames': 2,
            'edit_profiles': 3,
            'wipe_user_data': 4,
            'manage_flags': 5,
            'manage_permissions': 6
        },
        'posts': {
            'delete': 7,
            'edit': 8,
            'downvote': 9,
            'remove_attachments': 10,
            'manage_flags': 11
        },
        'attachments': { 'level_2': 12, 'level_3': 13 }
    })

    constructor(data, session) {
        this.id = data.id, this.name = data.name
        this.avatar = data.avatar, this.banner = data.banner
        this.joinTimestamp = new Date(data.join_timestamp), this.lastOnline = data.last_online ? new Date(data.last_online) : new Date()
        this.followingCount = parseInt(data.following_count), this.followerCount = parseInt(data.follower_count), this.postCount = parseInt(data.post_count), this.commentCount = parseInt(data.comment_count)
        this.flags = data.flags, this.permissions = data.permissions, this.followed = data.followed
        this.bio = data.bio
        this.comments = []
        this._session = session
    }

    get displayName() { return '@' + this.name }
    get avatarURL() { return url.cdn + `${!this.avatar ? '/assets/avatars/1' : '/usercontent/' + this.id + '/0' + this.avatar}` }
    get bannerURL() { return !this.banner ? 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==' : url.cdn + '/usercontent/' + this.id + '/1' + this.banner }

    async follow(follow = true) {
        var [response, ok] = await this._session.request({ path: `/users/:${this.id}/${!follow ? 'un' : ''}follow` }), done = response && ok
        if (done) this.followed = follow, this.followerCount += 1 * (follow ? 1 : -1), this._session.user.followingCount += 1 * (follow ? 1 : -1); return done
    }

    async get(param, before) {
        if (param == 'comments') {
            var comments = (await this._session.bulkGet('comments', (await this._session.request({ path: `/comments?type=0&parent_id=${this.id}&before=${before ? before : 0}` }))[0])).filter(c => c.type == 0)
            this.comments.push(...comments)
            return comments
        }
        var [response, ok] = await this._session.request({ path: `/users/:${this.id}/${param}?limit=30&${param == 'posts' ? 'offset' : 'before'}=${before ? before : 0}` }), cursor,
            data = await this._session.bulkGet(param == 'posts' ? 'posts' : 'users', response.map((d, i, a) => i == a.length - 1 && Array.isArray(d) ? (() => { cursor = d[1]; return d[0] })() : d))
        return ok ? (!cursor ? data : { data: data, cursor: cursor }) : []
    }
    async comment(content) {
        var comment = new metw.Comment(
            {
                id: (await this._session.request({ path: `/comments?type=0&parent_id=${this.id}`, json: { content: content } }))[0],
                user_id: this._session.user.id, user: this._session.user, parent_id: this.id, type: 1, content: content
            }, this._session)
        this.commentCount++
        this._session.indexed.comments.push(comment); this.comments.unshift(comment)
        return comment
    }

    hasPermissions(permissions) { return metw.User.permissionTester.eval(this.permissions, permissions) }
}

metw.Post = class Post {
    constructor(data, session) {
        this.id = data.id, this.userId = data.user_id, this.user = data.user
        this.likeCount = parseInt(data.like_count) || 0, this.liked = data.liked || false
        this.commentCount = parseInt(data.comment_count) || 0
        this.sentOn = new Date(data.sent_on) || new Date()
        this.content = data.content || ''
        this.flags = data.flags || 0
        this.comments = []
        this._session = session
    }
    async get(param, before) {
        if (param == 'comments') {
            var comments = (await this._session.bulkGet('comments', (await this._session.request({ path: `/comments?type=1&parent_id=${this.id}&before=${before ? before : 0}` }))[0])).filter(c => c.type == 1)
            this.comments.push(...comments)
            return comments
        }
    }
    async like(like = true) {
        var [response, ok] = await this._session.request({ path: `/posts/${this.id}/${!like ? 'un' : ''}like` }), done = response && ok
        if (done) this.liked = like, this.likeCount += 1 * (like ? 1 : -1); return done
    }
    async comment(content) {
        var id = (await this._session.request({ path: `/comments?type=1&parent_id=${this.id}`, json: { content: content }, retry: false }))[0]
        if (Array.isArray(id)) return id
        var comment = new metw.Comment({ id: id, user_id: this._session.user.id, user: this._session.user, parent_id: this.id, type: 1, content: content }, this._session)
        this.commentCount++
        this._session.indexed.raw.push(comment); this._session.indexed.comments.push(comment); this.comments.unshift(comment)
        return comment
    }
}

metw.Comment = class Comment {
    constructor(data, session) {
        this.id = data.id, this.userId = data.user_id, this.user = data.user
        this.type = data.type; this.parentId = data.parent_id; this.topParentId = data.top_parent_id || 0
        this.replyCount = parseInt(data.reply_count) || 0
        this.sentOn = new Date(data.sent_on) || new Date()
        this.content = data.content
        this.flags = data.flags || 0
        this.replies = []
        this._session = session
    }
    async get(param, before) {
        if (param == 'replies') {
            var ids = (await this._session.request({ path: `/comments?type=2&parent_id=${this.id}&before=${before ? before : 0}` }))[0]
            await this._session.bulkGet('comments', ids)
            var newReplies = ids.map(c => this._session.indexed.raw.concat(this._session.indexed.comments).find(r => (Object.getPrototypeOf(r).constructor == Comment) && (r.id == c) && (r.parentId == this.id))).filter(i => !!i)
            this.replies.push(...newReplies.filter(r => this.replies.every(s => s.id != r.id)))
            return newReplies
        }
    }
    async reply(content) {
        var id = (await this._session.request({ path: `/comments?type=2&parent_id=${this.id}&top_parent_id=${this.type != 2 ? this.parentId : (this.topParentId ? this.topParentId : 0)}`, json: { content: content }, retry: false }))[0]
        if (Array.isArray(id)) return id
        var reply = new metw.Comment(
            {
                id: id,
                user_id: this._session.user.id, user: this._session.user, parent_id: this.id, top_parent_id: this.top_parent_id, type: 2, reply_count: 0,
                content: content
            }, this._session)
        this.replyCount++
        this.replies.unshift(reply)
        return reply
    }
}
