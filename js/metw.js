var url = { backend: 'https://api.metw.cc/v1', cdn: 'https://s3.amazonaws.com/cdn.metw.cc', ws: 'https://api.metw.cc/v1/ws' }

class Session {
    constructor(SID) {
        this.SID = SID
        this.user = { id: 0 }
        this.indexed = { users: [], posts: [], comments: [], rawComments: [] }
    }
    async event(name, ...args) {
        if (this['on' + name]) this['on' + name](...args)
    }

    async request(options) {
        return new Promise(async resolve => {
            var headers = {}, body
            if (options.headers) headers = { ...headers, ...options.headers }
            if (options.json) body = JSON.stringify(options.json), headers['content-type'] = 'application/json', options.method = 'post'
            if (this.SID) headers.SID = this.SID
            var raw, ok, res = await fetch(url.backend + options.path, { method: options.method || 'get', headers: headers, body: body })
                .then(res => { ok = res.ok, raw = res; return res.json() }).then(json => [json, ok, raw])
            if (res[2].status == 429 && options.retry != false) setTimeout(async () => resolve(await this.request(options)), (parseInt(res[2].headers.get('RateLimit-Reset'))) * 1000)
            if (res[2].status == 401) this.event('loginfailed')
            else resolve(res)
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
                case 'remove_avatar': this.user.avatar = 0; this.event('avatarchange'); break
                case 'remove_banner': this.user.banner = 0; this.event('bannerchange'); break
                case 'update_bio': this.user.bio = actions.find(action => action.name == 'update_bio').content; break
                case 'change_password':
                    if (responses['change_password'][1]) this.SID = responses['change_password'][0]
                    resp['change_password'] = responses['change_password'][1]
                    break
            }
        return resp
    }
    async upload(param, base64) {
        var [_new, ok] = await this.request({ path: `/upload/${param}`, json: { base64: base64 } })
        if (['avatar', 'banner'].includes(param)) { this.user[param] = _new; this.event(`${param}change`) }
        return ok ? (() => { this.user[param] = _new; return _new })() : ok
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
            this.user = new User(session, this)
            this.indexed = { users: [this.user], posts: [], comments: [], rawComments: [] }
        }
        this.logged = ok
        this.event(ok ? 'login' : 'loginfailed')
        return this.SID
    }
    async disconnect() {
        this.indexed = { users: [], posts: [], comments: [], rawComments: [] }
        this.user = { id: 0 }
        this.logged = false, this.SID = undefined
        this.event('logout')
    }
    async post(content) {
        var [id, ok] = await this.request({ path: '/posts', json: { content: content }, retry: false })
        if (!ok) return id
        var post = new Post({ id, user_id: this.user.id, user: this.user, content }, session)
        this.indexed.posts.push(post)
        this.event('post', post)
        return post
    }

    async index(data) {
        for (let key of Object.keys(data)) {
            if (key != 'users') await this.bulkGet('users', data[key].map(d => d.user_id))
            var _data = []
            for (let d of data[key]) {
                if (key != 'users') var user = await this.get('user', d.user_id)
                _data.push(eval(`new ${key.charAt(0).toUpperCase() + key.slice(1, -1)}({ ...d, user: ${key != 'users' ? 'user' : undefined} }, this)`))
            }
            this.indexed.rawComments.push(..._data)
            if (key == 'comments') {
                _data.forEach(comment => { if (comment.type == 2) this.indexed.rawComments.find(parent => parent.id == comment.parentId && parent.replies?.every(reply => reply.id != comment.id))?.replies.push(comment) })
                _data = _data.filter(comment => comment.type != 2)
            }
            this.indexed[key].push(..._data)
        }

    }
    async get(param, selector) {
        var user = this.indexed[param + 's'].find(typeof selector == 'number' || param != 'user' ? data => data.id == selector : user => user.name == selector)
        return user ? user :
            await (async () => {
                var [data, ok] = await this.request({ path: `/${param}s/${typeof selector == 'number' && param == 'user' ? ':' : ''}${selector}?id=${this.user.id}` })
                if (!ok) return false
                if (param != 'user') var user = await this.get('user', data.user_id)
                data = eval(`new ${param.charAt(0).toUpperCase() + param.substring(1)}({ ...data, user: ${param != 'user' ? 'user' : undefined} }, this)`)
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
}

class User {
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
            var comments = await this._session.bulkGet('comments', (await this._session.request({ path: `/comments?type=0&parent_id=${this.id}&before=${before ? before : 0}` }))[0])
            this.comments.push(...comments)
            return comments
        }
        var [response, ok] = await this._session.request({ path: `/users/:${this.id}/${param}?limit=30&${param == 'posts' ? 'offset' : 'before'}=${before ? before : 0}` }), cursor,
            data = await this._session.bulkGet(param == 'posts' ? 'posts' : 'users', response.map((d, i, a) => i == a.length - 1 && Array.isArray(d) ? (() => { cursor = d[1]; return d[0] })() : d))
        return ok ? (!cursor ? data : { data: data, cursor: cursor }) : []
    }
    async comment(content) {
        var comment = new Comment(
            {
                id: (await this._session.request({ path: `/comments?type=0&parent_id=${this.id}`, json: { content: content } }))[0],
                user_id: this._session.user.id, user: this._session.user, parent_id: this.id, type: 1, content: content
            }, this._session)
        this.commentCount++
        this._session.indexed.comments.push(comment); this.comments.unshift(comment)
        return comment
    }
}

class Post {
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
            var comments = await this._session.bulkGet('comments', (await this._session.request({ path: `/comments?type=1&parent_id=${this.id}&before=${before ? before : 0}` }))[0])
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
        var comment = new Comment({ id: id, user_id: this._session.user.id, user: this._session.user, parent_id: this.id, type: 1, content: content }, this._session)
        this.commentCount++
        this._session.indexed.rawComments.push(comment); this._session.indexed.comments.push(comment); this.comments.unshift(comment)
        return comment
    }
}

class Comment {
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
            this.replies.push(...(await this._session.bulkGet('comments', ids)))
            return this.replies.filter(reply => ids.includes(reply.id))
        }
    }
    async reply(content) {
        var id = (await this._session.request({ path: `/comments?type=2&parent_id=${this.id}&top_parent_id=${this.type != 2 ? this.parentId : (this.topParentId ? this.topParentId : 0)}`, json: { content: content }, retry: false }))[0]
        if (Array.isArray(id)) return id
        var reply = new Comment(
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
metw = { Session: Session, User: User, Post: Post }