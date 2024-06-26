﻿metw.gui = {
    richText(raw, user) {
        var _ = /(([^<>]+)(?:((?=<[^>]*>[^\<]*<\/[^>]*>))|(<[^\/]*\/>))+|[^>]*$)/g;
        return raw ? raw.replace(/\</g, '&lt;').replace(/\>/g, '&gt;')
            .replace(/(https?)\:\/\/([\w\d\.\-ğüışöç]+)(?:\/([\w\d\.\-ğüşıöç\;\,\?\:\@\&\=\+\$\!\(\)\#\/\%]*))?/g, (raw, protocol, origin, pathname) => `<a class="href" href="${raw.replace(/\&lt;/g, '<')}" target="blank">${(origin + (pathname?.length ? '/' : '') + ((pathname?.length > 16 ? pathname.substring(0, 16) + '...' : pathname) || ''))}</a>`)
            .replace(/(video)\:\/\/([\w\d\.\-ğüışöç]+)(?:\/([\w\d\.\-ğüşıöç\;\,\?\:\@\&\=\+\$\!\(\)\#\/\%]*))?/g, (raw, protocol, origin, pathname) => user && user.hasPermissions('$ & "admin" | $ & "attachments.level_2"') ? `<video controls> <source src="${raw.replace(/\&lt;/g, '<').replace(/^video/, 'https')}"/></video>` : 'video gösterilemedi')
            .replace(_, text => text.replace(/([^\w\d]?)\@([\w\d-\.\/]+)/g, (_, text, name) => `${text}<a class="href" href="javascript:app.redirect('/@${name}')">@${name.replace(/\_/, '&#95')}</a><wbr/>`))
            .replace(_, text => text.replace(/ /g, '&nbsp;<wbr>').replace(/\_((?:(?!\_)[\s\S])+)\_/g, (raw, text) => `<u>${text}</u>`))
            .replace(/\*\*((?:(?!\*\*)[\s\S])+)\*\*/g, (raw, text) => `<b>${text}</b>`)
            .replace(/\*((?:(?!\*)[\s\S])+)\*/g, (raw, text) => `<i>${text}</i>`)
            .replace(/\~\~((?:(?!\~\~)[\s\S])+)\~\~/g, (raw, text) => `<del>${text}</del>`)
            .replace(/##((?:(?!##)[\s\S])+)##/g, (raw, text) => `<span class="rainbow">${text}</span>`)
            .replace(/\n/g, '<br>') : ''
    },
    post(post) {
        var _post = d.createElement('li')
        if (post.hasFlag('$ & "deleted"')) { _post.innerHTML = `gönderi silinmiş...`;  return _post }
        _post.innerHTML = `
            <img loading="lazy" class="avatar" onclick="app.redirect('/@${post.user.name}')" src="${post.user.avatarURL}" />
            <div>
                <a class="username a" href="/@${post.user.name}">${post.user.displayName}</a><span class="date"> · ${timeSince(post.sentOn)} ${post.hasFlag('$ & "edited"') ? '(düzenlendi)' : ''}</span>
                <p class="content">${this.richText(post.content, post.user)}</p>
                <div class="edit">
                    <textarea></textarea>
                    <div class="edit-buttons"><button class="cancel">iptal</button><button class="ok">kaydet</button></div>
                </div>
                <img class="attachment" loading="lazy" src="${post.hasFlag('$ & "has_attachment"') ? (url.cdn + '/attachments/' + post.id) : ''}" />
                <div class="buttons">
                    <a class="_inline-img comment a" href="/gönderi/${post.id}" comment">${icons.comment}&nbsp;${post.commentCount}</a>
                    <a class="_inline-img like">${icons.like}&nbsp;<span class="count">${post.likeCount}</span></a>
                    <a class="share">${icons.share}</a>
                    <a class="dots _popup-menu-button">${icons.dots}</a>
                </div>
            </div>`
        if (!(post.flags & 1)) _post.querySelector('.attachment').remove()
        else pinchZoom(_post.querySelector('.attachment'))
        app.formatElement(_post)

        var uls = () => { Array.from(_post.querySelectorAll('.buttons .like *')).forEach(v => v.style = post.liked ? 'color: #F91880 !important' : ''); _post.querySelector('.buttons .like .count').innerText = post.likeCount }; uls()
        _post.querySelector('.share').onclick = () => navigator.share({ title: 'metw', url: `http://metw.cc/g${post.id}`, text: post.content })
        if (session.logged) {
            _post.querySelector('.dots').onclick = event =>
                popupMenu(event, [['report', 'bildir', console.log],
                    session.user.hasPermissions('$ & "admin" | $ & "posts.delete"') || post.user.id == session.user.id ? ['delete', 'sil', async () =>
                        await askFor('Gönderiyi Sil', 'Gönderiyi silmek istediğinizden emin misiniz?', ok = 'sil') && await load(async () => { await post.delete(); _post.innerHTML = 'gönderi silindi' })] : false,
                session.user.hasPermissions('$ & "admin" | $ & "posts.edit"') || post.user.id == session.user.id ? ['edit', 'düzenle', () => {
                    var edit = _post.querySelector('.edit'), content = _post.querySelector('.content'), targetHeight, contentHeight,
                        textarea = edit.querySelector('textarea')
                    if (edit.style.height) return
                    textarea.value = post.content
                    textarea.oninput = () => { textarea.style.height = `calc(${textarea.scrollHeight}px + .05em)`, textarea.value = textarea.value.substring(0, 1024) }; textarea.oninput()
                    contentHeight = content.offsetHeight; content.style.height = contentHeight + 'px'
                    edit.style.height = 'unset'; targetHeight = edit.offsetHeight; edit.style.height = '0'
                    setTimeout(() => { edit.style = `transition: height .3s; height: ${targetHeight}px`, content.style.height = '0' }, 20)
                    setTimeout(() => edit.style.height = 'unset', 320)
                    edit.querySelector('.cancel').onclick = () => {
                        edit.style.height = edit.offsetHeight + 'px', content.style.height = textarea.scrollHeight + 'px'
                        setTimeout(() => edit.style.height = '0', 20); setTimeout(() => edit.style = '', 320)
                    }
                    edit.querySelector('.ok').onclick = async () => {
                        await load(async () => await post.edit(textarea.value))
                        content.innerHTML = this.richText(textarea.value)
                        if (!post.hasFlag('$ & "edited"')) _post.querySelector('.date').innerHTML += ' (düzenlendi)'
                        edit.querySelector('.cancel').click()
                    }
                }] : false])
            _post.querySelector('.buttons .like').onclick = async () => { if (!session.logged) return; await load(async () => await post.like(!post.liked)); uls() }

        }
        else {
            _post.querySelector('.dots').remove()
            _post.querySelector('.like').classList.remove('like')
        } 

        return _post
    },
    posts(posts) {
        var ul = d.createElement('ul'); ul.className = '_p-c _posts'
        if (posts) for (let post of posts) ul.appendChild(this.post(post))
        ul.append = posts => { for (let post of posts) ul.appendChild(this.post(post)) }
        ul.unshift = post => ul.insertBefore(this.post(post), ul.firstChild)
        ul.clear = () => { ul.innerHTML = '' }
        return ul
    },
    comment(comment, highlightedComment, highlighted) {
        let _comment = d.createElement('div'), _loadMore = d.createElement('button'), cursor = 0, loadedCount = 0
        if (comment.hasFlag('$ & "deleted"')) { _comment.innerHTML = `<div class="comment">yorum silinmiş...</div>`; return _comment }
        _loadMore.innerText = 'devamını yükle', _loadMore.className = '_load-more load-more'
        _comment.innerHTML = `
            <div class="comment" style="${highlighted ? 'border-color: var(--bg-b-1)' : ''}">
                <img loading="lazy" class="avatar" onclick="app.redirect('/@${comment.user.name}')" src="${comment.user.avatarURL}" />
                <div>
                    <a class="username a" href="/@${comment.user.name}">${comment.user.displayName}</a><span class="date"> · ${timeSince(comment.sentOn)}</span>
                    <p class="content">${this.richText(comment.content, comment.user)}</p>
                    <div class="buttons">
                        <a class="reply">${icons.reply}</a>
                        <a class="dots _popup-menu-button">${icons.dots}</a>
                    </div>
                </div>
            </div>
            <div class="a-c-r add-reply">
                <img src="${session?.user.avatarURL}"/>
                <textarea placeholder="yazmaya başla..."></textarea>
                <div class="buttons-2">
                    <button class="_inline-img cancel">iptal${icons.x}</button>
                    <button class="_inline-img ok send">gönder${icons.accept}</button>
                </div>
            </div>
            <div class="replies"></div>`
        app.formatElement(_comment)

        let _replies = _comment.querySelector('.replies')
        _replies.appendChild(_loadMore)
        if (highlightedComment) _replies.insertBefore(this.comment(highlightedComment, undefined, true), _loadMore)
        for (let reply of comment.replies) if (reply.id != highlightedComment?.id) _replies.insertBefore(this.comment(reply), _loadMore)

        _loadMore.onclick = async () => {
            var replies = await load(async () => await comment.get('replies', Math.min(...comment.replies.map(reply => reply.id))))
            for (let reply of replies) if (reply.id != highlightedComment?.id) _replies.insertBefore(this.comment(reply), _loadMore)
            if (comment.replies.length >= comment.replyCount - !!highlightedComment) _loadMore.remove()
        }
        if (session.logged) _comment.querySelector('.dots').onclick = event =>
            popupMenu(event, [['report', 'bildir', console.log],
                session.user.hasPermissions('$ & "admin" | $ & "posts.delete"') ||
                    [comment.user.id, comment.topParent?.user?.id, comment.parent?.user?.id, [comment?.parent?.id, comment?.parent?.user_id, [comment?.topParentId, comment?.topParent?.user_id][comment.topParentType]][comment.type]].includes(session.user.id) ?
                    ['delete', 'sil', async () => await askFor('Yorumu Sil', 'Yorumu silmek istediğinizden emin misiniz?', ok = 'sil') && load(async () => { await comment.delete(); _comment.querySelector('.comment:first-of-type').innerHTML = 'yorum silindi'; _comment.querySelector('.replies').remove() })] : false])
        else _comment.querySelector('.dots').remove()

        if (comment.replies.length >= comment.replyCount - !!highlightedComment) _loadMore.remove()

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
            _addReply.textarea.oninput = ({ target }) => { target.style.height = target.scrollHeight + 'px', target.value = target.value.substring(0, 512) }

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
    async comments(post, highlightedComment) {
        var _comments = d.createElement('div'), _loadMore = d.createElement('button'), cursor = 0, loadedCount = 0
        _comments.className = '_p-c _comments', _loadMore.className = '_load-more'
        _comments.innerHTML = `
            <div class="top">
                <h2>Yorumlar (${post.commentCount})</h2>
                <div class="a-c-r add-comment">
                    <img src="${session?.user.avatarURL}"/>
                    <textarea placeholder="yorum ekle..."></textarea>
                    <div class="buttons-2">
                        <button class="_inline-img cancel">iptal${icons.x}</button>
                        <button class="_inline-img ok send">gönder${icons.accept}</button>
                    </div>
                </div>
            </div>`

        var _addComment = _comments.querySelector('.add-comment')
        Object.assign(_addComment, { textarea: _addComment.querySelector('textarea'), buttons: _addComment.querySelector('.buttons-2') })
        if (!session.logged) _addComment.remove()
        else {
            _addComment.textarea.oninput = ({ target }) => { target.style.height = target.scrollHeight + 'px', target.value = target.value.substring(0, 512) }
            _addComment.textarea.addEventListener('focus', () => {
                _addComment.buttons.style.height = 'unset'; var targetHeight = _addComment.buttons.offsetHeight
                _addComment.buttons.style.height = '0'
                setTimeout(() => { _addComment.buttons.style.height = targetHeight + 'px' }, 20)
            })
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
    },
    user(user) {
        let _user = d.createElement('li'); _user.className = `users-${user.id}`
        _user.innerHTML = `<img src="${user.avatarURL}" />${user.displayName}<style>.users-${user.id}:before { background-image: url("${user.bannerURL}") !important }</style>`
        _user.onclick = () => app.redirect(`/@${user.name}`)
        return _user
    }
}
