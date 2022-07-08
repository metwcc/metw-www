backEndUrl = "https://api.metw.cc/", url = window.location.protocol + "//" + window.location.host + "/"
articles = ["mütalaa", "matbuat", "muhtıra"]
commentCount = 0, commentPage = 0, comments = []
captchaKey = false, captchaValidationKey = false

pages_list = document.getElementsByClassName("pages"), pages = []
for (x = 0; x < pages_list.length; x++) { pages[pages_list[x].id] = pages_list[x] }; pages_in_str = Object.keys(pages)

function page(page_name) { for (x in pages_in_str) { pages[pages_in_str[x]].style.display = ["none", "block"][(page_name == pages_in_str[x]) + 1 - 1] } }
function loading(state) { document.getElementById("loading").style.display = ["none", "block"][state + 1 - 1] }
function windowState(title, path, description = "") { document.getElementById("title").innerHTML = title; document.getElementById("og-title").content = title; document.getElementById("og-description").content = description; window.history.pushState({ "pageTitle": title }, title, url + path) }
function captcha(state = 0, callback = null) {
    if (state == 0) {
        loading(1)
        $.ajax({
            url: backEndUrl + "captcha", jsonp: false, jsonpCallback: "jsonCallback",
            success: function (json) {
                loading(0)
                captchaKey = json[0]
                let tempCaptchaKey = captchaKey
                document.querySelector("#captcha > div > img").src = "data:image/png;base64," + json[1]
                document.querySelector("#captcha > div > input").value = ""
                document.querySelector("#captcha > div > input").focus()
                try { document.getElementById("captcha-send").remove() } catch { }
                let send = document.createElement("a"); send.className = "href"; send.id = "captcha-send", send.innerHTML = "gönder"; send.addEventListener("click", function onclick(event) { captcha(state = 2, callback = callback) }, false)
                document.querySelector("#captcha > div").appendChild(send)
                document.getElementById("captcha").style.display = "block"
                setTimeout(function () { if (document.getElementById("captcha").style.display == "block" && tempCaptchaKey == captchaKey) { alert("Captcha geçerlilik süresi doldu, lütfen tekrar deneyin"); captcha(state = 1) } }, 50000);
            }, error: function (jqXHR, error, errorThrown) { loading(0); if (jqXHR.status && jqXHR.status == 429) { alert(jqXHR.responseText); } else { alert("Sunucuya baplanılamadı") } }
        })
    } else if (state == 1) { document.querySelector("#captcha > div > img").src = "data:image/png;base64,"; document.getElementById("captcha").style.display = "none"; captchaKey = false }
    else if (state == 2) {
        loading(1)
        $.ajax({
            url: backEndUrl + `captcha/validate?key=${captchaKey}&value=${document.querySelector("#captcha > div > input").value}`, jsonp: false, jsonpCallback: "jsonCallback",
            success: function (json) { loading(0); if (json[1]) { captcha(state = 1); captchaValidationKey = json[0]; callback() } else { alert(json[0]["message"]) } },
            error: function (jqXHR, error, errorThrown) { loading(0); if (jqXHR.status && jqXHR.status == 429) { alert(jqXHR.responseText); } else { alert("Sunucuya baplanılamadı") } }
        })
    }
}

function homepage() { page("homepage"); windowState("metw", "") }

function articlesList(article) {
    loading(1)
    $.ajax({
        url: backEndUrl + `articles/${article}`, jsonp: false, jsonpCallback: "jsonCallback",
        success: function (json) {
            if (json) {
                let textsList = document.getElementById("articles-list"); textsList.innerHTML = ""; document.getElementById("article-name").innerHTML = articles[article]
                for (let text in json) {
                    let articleButton = document.createElement("li"), articleDetails = document.createElement("a"), articleName = document.createElement("a")
                    articleButton.addEventListener("click", function () { articleText(article, json[text][0]) })
                    articleName.className = "href", articleDetails.style.cursor = "pointer"
                    articleDetails.innerHTML = " - " + json[text][2]
                    articleName.innerHTML = json[text][1]
                    articleButton.appendChild(articleName)
                    articleButton.appendChild(articleDetails)
                    textsList.appendChild(articleButton)
                }
                loading(0); page("articles"); windowState(`${articles[article]} • metw`, `k/${article}`)
            } else { alert("Konu bulunamadı"); loading(0); homepage() }
        }, error: function (jqXHR, error, errorThrown) { loading(0); if (jqXHR.status && jqXHR.status == 429) { alert(jqXHR.responseText); } else { alert("Sunucuya baplanılamadı") } }
    })
}

function articleText(article, textId) {
    loading(1)
    $.ajax({
        url: backEndUrl + `articles/${article}/${textId}`, jsonp: false, jsonpCallback: "jsonCallback",
        success: function (json) {
            if (json) {
                let commentsDiv = document.getElementById("article-comments-list")
                function appendComment(sender, content, date) { let t = ""; if (date != "") { t = new Date(date * 1000).toLocaleString("tr-TR") }; comment = document.createElement("div"); comment.innerHTML += `<a>${t}</a>${sender}<br>${content}`; commentsDiv.appendChild(comment) }
                document.getElementById("article-text").innerHTML = `<br>${json["content"].replaceAll("  ", "&nbsp;&nbsp;").replaceAll("\n", "<br>")}`
                let articleDetails = document.getElementById("article-details"); articleDetails.innerHTML = ""
                let articleTitle = document.createElement("b"); articleTitle.innerHTML = `${json["title"]}<br>`, articleTitle.className = "title"
                let articleAuthor = document.createElement("a"); articleAuthor.innerHTML = `<b>Yazar:</b> ${json["author"]}<br>`
                document.getElementById("article-views").innerHTML = "👁 " + json["views"]
                articleDetails.appendChild(articleTitle); articleDetails.appendChild(articleAuthor)
                if (json["editor"]) { let articleEditor = document.createElement("a"); articleEditor.innerHTML = `<b>Editör:</b> ${json["editor"]}<br>`; articleDetails.appendChild(articleEditor) }
                if (json["comments"].length == 0) { commentsDiv.innerHTML = ""; appendComment("henüz hiç yorum yapılmamış", "", ""); document.getElementById("article-comments-next").style.display = "none", document.getElementById("article-comments-previous").style.display = "none" }
                else {
                    let comments = json["comments"], commentCount = json["comment_count"], commentsPage = 0
                    let commentsNext = document.getElementById("article-comments-next"), commentsPrevious = document.getElementById("article-comments-previous")
                    commentsNext.addEventListener("click", function () { commentsPage += 1; articleTextCommentsLoad() })
                    commentsPrevious.addEventListener("click", function () { commentsPage -= 1; articleTextCommentsLoad() })
                    function articleTextCommentsLoad() {
                        if (commentCount > (commentsPage * 10 + 10)) { commentsNext.style.display = "inline-block" } else { commentsNext.style.display = "none" }
                        if (commentsPage != 0) { commentsPrevious.style.display = "inline-block" } else { commentsPrevious.style.display = "none" }
                        if (comments.length < commentsPage * 10 + 1) {
                            loading(1)
                            $.ajax({
                                url: backEndUrl + `articles/${article}/${textId}/comments?offset=${commentsPage * 10}&limit=${commentCount - commentsPage * 10}`, jsonp: false, jsonpCallback: "jsonCallback",
                                success: function (json) { for (x in json) { comments.push(json[x]) } loading(0); articleTextCommentsLoad() },
                                error: function (jqXHR, error, errorThrown) { loading(0); if (jqXHR.status && jqXHR.status == 429) { alert(jqXHR.responseText); } else { alert("Sunucuya baplanılamadı") } }
                            })
                        } else { commentsDiv.innerHTML = ""; for (x = commentsPage * 10; x < commentsPage * 10 + 10; x++) { try { appendComment(comments[x]["sender"], comments[x]["content"], comments[x]["date"]) } catch { break } } }
                    }
                    articleTextCommentsLoad()
                }
                function articleSendComment(state = 0) {
                    let name = document.getElementById("article-send-comment-name").value, content = document.getElementById("article-send-comment-content").value
                    if (name.length < 4) { alert("İsim 4 karakterden kısa olamaz"); return }; if (name.length > 20) { alert("İsim 20 karakterden uzun olamaz"); return }
                    if (content.length < 4) { alert("İçerik 4 karakterden kısa olamaz"); return }; if (content.length > 2000) { alert("İçerik 2000 karakterden uzun olamaz"); return }
                    if (state == 0) { captcha(state = 0, callback = function a() { articleSendComment(state = 1) }) }
                    else {
                        let xhr = new XMLHttpRequest();
                        xhr.open("POST", backEndUrl + `articles/${article}/${textId}/comments`);
                        xhr.setRequestHeader("Content-Type", "application/json");
                        xhr.onreadystatechange = function () {
                            if (xhr.readyState === 4 && xhr.status === 200) {
                                let json = JSON.parse(xhr.responseText);
                                if (json) { alert("Yorum eklendi"); articleText(article, textId) }
                                else { alert("Yorum eklenemedi") }
                            }
                        };
                        let data = JSON.stringify({ "name": name, "content": content, "captcha_key": captchaKey, "captcha_validation_key": captchaValidationKey });
                        xhr.send(data);
                    }
                }
                document.getElementById("article-comment-send").addEventListener("click", function () { articleSendComment(state = 0) })
                loading(0); page("article"); windowState(`${json["title"]} • metw`, `k/${article}/${textId}`)
            } else { alert("Yazı bulunamadı"); articlesList(article) }
        }, error: function (jqXHR, error, errorThrown) { loading(0); if (jqXHR.status && jqXHR.status == 429) { alert(jqXHR.responseText); } else { alert("Sunucuya baplanılamadı") } }
    })
}

titleBar = document.getElementById("title-buttons")
for (let id = 0; id < articles.length; id++) {
    let button = document.createElement("a")
    let a = document.createElement("a")
    button.className = "href"
    button.addEventListener("click", function () { articlesList(id) })
    button.innerText = articles[id]
    if (id != articles.length - 1) { a.innerText = " " }
    else { a.innerText = " " }
    titleBar.appendChild(button)
    titleBar.appendChild(a)
}

function loadUri() {
    let uri = decodeURI(window.location.search).split("/")
    if (uri.length == 1) { uri = decodeURI(window.location.pathname).split("/"); uri.shift() }
    else { uri.shift(); }
    while (uri[0] == "") { uri.shift() }
    if (uri[0] == undefined) { homepage() }
    else if (uri[0] == "k" && uri.length == 2) { articlesList(uri[1]) }
    else if (uri[0] == "k" && uri.length == 3) { articleText(uri[1], uri[2]) }
    else { page("404") }
}

loadUri()
window.onpopstate = function (event) { loadUri(); };
