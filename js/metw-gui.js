metw.gui = {
    post(post) {
        var _post = d.createElement('li')
        _post.innerHTML = `
            <img class="avatar" onclick="if (app.location.pathname[0] != '@${post.user.name}' || app.location.pathname.lenght > 1) app.redirect('/@${post.user.name}')" src="${post.user.avatarURL}" />
            <div>
                <span class="username" onclick="if (app.location.pathname[0] != '@${post.user.name}' || app.location.pathname.lenght > 1) app.redirect('/@${post.user.name}')">${post.user.displayName}</span><span class="date">&nbsp;·&nbsp;${timeSince(post.sentOn)}</span>
                <p class="content"></p>
                <div class="buttons">
                    <span class="_inline-img comment" onclick="app.redirect('/gönderi/${post.id}')" comment"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"></path></svg>&nbsp;${post.commentCount}</span>
                    <span class="_inline-img like"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg>&nbsp;<a class="count">${post.likeCount}</a></span>
                    <span class="share"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"></path></svg></span>
                    <span class="dots"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z"></path></svg></span>
                </div>
            </div>`
        _post.querySelector('p').innerText = post.content
        _post.querySelector('.share').onclick = () => navigator.share({ title: 'metw', url: `/gönderi/${post.id}`, text: post.content })
        var uls = () => { _post.querySelector('.buttons .like').style = post.liked ? 'color: #F91880; stroke: #F91880' : ''; _post.querySelector('.buttons .like .count').innerText = post.likeCount }; uls()
        _post.querySelector('.buttons .like').onclick = async () => { if (!session.logged) return; await load(async () => await post.like(!post.liked)); uls() }
        return _post
    },
    posts(posts) {
        var ul = d.createElement('ul'); ul.className = '_p-c _post'
        if (posts) for (let post of posts) ul.appendChild(this.post(post))
        ul.append = posts => { for (let post of posts) ul.appendChild(this.post(post)) }
        ul.unshift = post => ul.insertBefore(this.post(post), ul.firstChild)
        ul.clear = () => { ul.innerHTML = '' }
        return ul
    },
    comment(comment) {
        let _comment = d.createElement('div'), _loadMore = d.createElement('button'), cursor = 0, loadedCount = 0
        _loadMore.innerText = 'devamını yükle', _loadMore.className = '_load-more load-more'
        _comment.innerHTML = `
            <div class="comment">
                <img class="avatar" onclick="app.redirect('/@${comment.user.name}')" src="${comment.user.avatarURL}" />
                <div>
                    <span class="username" onclick="app.redirect('/@${comment.user.name}')">${comment.user.displayName}</span><span class="date">&nbsp;·&nbsp;${timeSince(comment.sentOn)}</span>
                    <p class="content"></p>
                    <div class="buttons">
                        <span class="reply"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"></path></svg></span>
                        <span class="dots"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z"></path></svg></span>
                    </div>
                </div>
            </div>
            <div class="a-c-r add-reply">
                <img src="${session?.user.avatarURL}"/>
                <textarea placeholder="yazmaya başla..."></textarea>
                <div class="buttons-2">
                    <button class="_inline-img cancel">
                        iptal
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg></button>
                    <button class="_inline-img send">
                        gönder
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
                    </button>
                </div>
            </div>
            <div class="replies"></div>`
        _comment.querySelector('.content').innerText = comment.content 

        let _replies = _comment.querySelector('.replies')
        _replies.appendChild(_loadMore)
        for (let reply of comment.replies) _replies.insertBefore(this.comment(reply), _loadMore)

        _loadMore.onclick = async () => {
            var replies = await load(async () => await comment.get('replies', Math.min(...comment.replies.map(reply => reply.id))))
            for (let reply of replies) _replies.insertBefore(this.comment(reply), _loadMore)
            if (comment.replies.length >= comment.replyCount) _loadMore.remove()
        }

        if (comment.replies.length >= comment.replyCount) _loadMore.remove()

        var _addReply = _comment.querySelector('.add-reply')
        Object.assign(_addReply, { textarea: _addReply.querySelector('textarea'), buttons: _addReply.querySelector('.buttons-2'), button: _comment.querySelector('.buttons .reply') })
        if (!session.logged) _addReply.button.remove()
        else {
            _addReply.button.onclick = () => {
                _addReply.style = 'height: unset; margin-top: 1em', _addReply.textarea.value = ''
                var clientHeight = _addReply.clientHeight; _addReply.style.height = '0'
                _addReply.textarea.focus()
                setTimeout(() => _addReply.style.height = clientHeight + 'px', 20)
                setTimeout(() => _addReply.style.height = 'unset', 320)
            }
            _addReply.textarea.oninput = ({ target }) => { target.style.height = '0', target.value = target.value.substring(0, 512); setTimeout(() => target.style.height = target.scrollHeight + 'px', 50) }

            _addReply.querySelector('.cancel').onclick = () => { _addReply.style.height = _addReply.clientHeight + 'px';  setTimeout(() => _addReply.style = '', 20) }
            _addReply.querySelector('.send').onclick = async () => {
                if (_addReply.textarea.value.match(/[\S]*/g).join('').length < 2) return alert.error('Yorum 2 karakterden kısa olamaz')
                data = await load(async () => await comment.reply(_addReply.textarea.value))
                if (Array.isArray(data)) return alert.error(data[0])
                _replies.insertBefore(this.comment(data), _replies.firstChild)
                _addReply.textarea.value = ''; _addReply.buttons.style.height = '0'
                _addReply.style.height = _addReply.clientHeight + 'px'
                setTimeout(() => _addReply.style = '', 20)
            }
        }

        return _comment
    },
    async comments(post) {
        var _comments = d.createElement('div'), _loadMore = d.createElement('button'), cursor = 0, loadedCount = 0
        _comments.className = '_p-c _comments', _loadMore.className = '_load-more'
        _comments.innerHTML = `
            <div class="top">
                <h2>Yorumlar (${post.commentCount})</h2>
                <div class="a-c-r add-comment">
                    <img src="${session?.user.avatarURL}"/>
                    <textarea placeholder="yorum ekle..."></textarea>
                    <div class="buttons-2">
                        <button class="_inline-img cancel">
                            iptal
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg></button>
                        <button class="_inline-img send">
                            gönder
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
                         </button>
                    </div>
                </div>
            </div>`

        var _addComment = _comments.querySelector('.add-comment')
        Object.assign(_addComment, { textarea: _addComment.querySelector('textarea'), buttons: _addComment.querySelector('.buttons-2') })
        if (!session.logged) _addComment.remove()
        else {
            _addComment.textarea.oninput = ({ target }) => { target.style.height = '0', target.value = target.value.substring(0, 512); setTimeout(() => target.style.height = target.scrollHeight + 'px', 50) }
            _addComment.textarea.addEventListener('focus', () => _addComment.buttons.style.height = '2em')
            _addComment.textarea.addEventListener('focusout', () => { if (!_addComment.textarea.value.length) _addComment.buttons.style.height = '0' })

            _addComment.querySelector('.cancel').onclick = () => { _addComment.textarea.value = '', _addComment.buttons.style.height = '0' }
            _addComment.querySelector('.send').onclick = async () => {
                if (_addComment.textarea.value.match(/[\S]*/g).join('').length < 2) return alert.error('Yorum 2 karakterden kısa olamaz')
                data = await load(async () => await post.comment(_addComment.textarea.value))
                if (Array.isArray(data)) return alert.error(data[0])
                _comments.insertBefore(this.comment(data), _comments.children[1])
                _addComment.textarea.value = '', _addComment.textarea.style.height = '0'
                _addComment.buttons.style.height = '0'
                _comments.querySelector('h2').innerHTML = `Yorumlar (${post.commentCount})`
            }
        }
        _comments.appendChild(_loadMore)

        var appendComments = async (before = 0) => {
            var comments = await post.get('comments', before)
            loadedCount += comments.length
            if (loadedCount >= post.commentCount) _loadMore.style.display = 'none'
            cursor = comments.slice(-1)[0]?.id
            for (let comment of comments) _comments.insertBefore(this.comment(comment), _loadMore)
        }; await appendComments()

        _loadMore.innerText = 'devamını yükle'
        _loadMore.onclick = async () => {
            await load(async () => await appendComments(cursor))
        }
        
        return _comments
    }
}