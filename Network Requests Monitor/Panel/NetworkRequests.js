(function() {
    var curList = [],
        curObjs = {},
        isFiltering = false;
        var test = 0;

    function addEvt(sel, evt, func) {
        document.querySelector(sel).addEventListener(evt, func);
    }

    function initEvents() {
        freshList();
        addEvt('button.refresh-button', 'click', freshList);
        addEvt('#filterText', 'keyup', filterList);
        addEvt('#filterText', 'focus', setFilter);
        addEvt('#filterText', 'blur', blurFilter);
        addEvt('#isRegEx', 'click', checkFilter);
        addEvt('button.copy-button', 'click', copyList);
        addEvt('button.clear-button', 'click', resetList);
        addEvt('span.close', 'click', closeDetailsPanel);
        addEvt('li[tar="detail_request"]', 'click', switchSections);
        addEvt('li[tar="detail_response"]', 'click', switchSections);
        addEvt('li[tar="detail_additional"]', 'click', switchSections);
        addEvt('button.reload-button', 'click', function() {
            resetList();
            curObjs = {flag:1};
            chrome.devtools.inspectedWindow.reload({});
        });
        if(window.chrome && chrome.devtools){
            chrome.devtools.network.onNavigated.addListener(resetList);
            chrome.devtools.network.onRequestFinished.addListener(function(request) {
                if (isFiltering && isUrl(request.request.url)) {
                    curList.push(request.request.url);
                    return;
                }
                curObjs.flag = 1;
                curObjs[request.request.url.replace(/[^a-z0-9]+/gi,'')] = request;
                updateUI([request.request.url], true);
            });
        }
    }

    function showTips(tips) {
        document.querySelector('#tips').innerHTML = tips;
    }

    function copyList() {
        var dom = document.querySelector('#clipData'),
            doc = document.querySelector('#tips'),
            list = [],
            filter = document.querySelectorAll('.preprocessed-urls li');
        if (filter.length == 0) {
            showTips('No matched url copied.');
            return;
        }
        for (var i = 0, il = filter.length; i < il; i++) {
            list.push(filter[i].textContent.replace(/^[^ ]+\s+/g,''));
        }
        dom.value = list.join("\n");
        dom.select();
        var res = document.execCommand("copy");
        if (res) {
            showTips(list.length + ' Resource urls have been Copied to your ClipBoard, Enjoy it');
        } else {
            showTips('Bad News, Copy Data failed');
        }
        setTimeout(function() {
            doc.innerHTML = '';
        }, 5000);
    }

    function formatTpl(tpl, obj) {
        tpl = tpl + '';
        return tpl.replace(/\{(\w+)\}/g, function (m, n) {
            return obj[n] !== undefined
                ? obj[n].toString().replace(/</g,'&lt;').replace(/>/g,'&gt;')
                : (''+m).replace(/</g,'&lt;').replace(/>/g,'&gt;');
        });
    }
    function renderRequestHead(dom, obj){
        var info = [];
        if(obj.method){
            info.push(obj.method);
        }
        if(obj.httpVersion){
            info.push(obj.httpVersion);
        }
        if(obj.status){
            info.push(obj.status + ' ' + (obj.statusText || ''));
        }
        dom.querySelector('thead th.section').innerHTML = '<span>' + info.join('</span> <span>') + '</span>';
        if(obj.url){
            dom.querySelector('thead td.val').innerHTML = obj.url;
        }
    }
    /*
    */
    function renderPostData(tpl, data){
        var html = [],
            itpl = '<div class="post_info"><span class="subkey">{name}</span><span class="subval">{value}</span></div>',
            subtable = [];
        for(var key in data){
            if(data[key] instanceof Array && data[key].length > 0){
                for(var j=0, jl= data[key].length; j<jl; j++){
                    var item = data[key][j];
                    if(item.name && item.value){
                        subtable.push(formatTpl(itpl, item));
                    }
                }
                html.push('<tr><td class="key">' + key.replace(/</g,'&lt;').replace(/>/g,'&gt;') + '</td><td class="val">'+subtable.join('')+'</td></tr>');
            }else{
                html.push(formatTpl(tpl,{name:key, value: data[key]}));
            }
        }
        return html.join('');
    }
    function renderSections(dom, res){
        var html = [],
            sections = ['content', 'headers', 'queryString', 'postData','cookies'],
            tpl      = '<tr><td colspan="2" class="section">{header}</td></tr>',
            dtpl     = '<tr><td class="key">{name}</td><td class="val">{value}</td></tr>';
        for(var i=0, il=sections.length; i<il; i++){
            var key = sections[i];
            if(key in res ){
                if(res[key] instanceof Array && res[key].length > 0){
                    html.push(formatTpl(tpl, {header:key}));
                    var list = res[key];
                    for(var j=0,jl=list.length; j<jl; j++){
                        var item = list[j];
                        if(item.name && item.value){
                            if(key == 'cookies'){
                                item.value += '<strong>'+[
                                    item.expires ? 'expires: '+ item.expires : '',
                                    item.httpOnly ? 'httpOnly' : '',
                                    item.secure ? 'SecurityOnly': ''
                                ].join(' ')+'</strong>'
                            }
                            html.push(formatTpl(dtpl, item));
                        }
                    }
                }else if(key == 'postData'){
                    html.push(formatTpl(tpl, {header:key}));
                    html.push(renderPostData(dtpl,res[key]));
                }
            }
        }
        dom.querySelector('tbody').innerHTML = html.join('');
    }

    function renderAddtionalInfo(dom, res){
        var html = [],
            sections = ['serverIPAddress', 'time', 'startedDateTime', 'timings']
            dtpl     = '<tr><td class="key">{name}</td><td class="val">{value}</td></tr>';
        for(var i=0, il=sections.length; i<il; i++){
            var key = sections[i];
            if(key in res){
                if(typeof(res[key]) == 'string' ){
                    html.push(formatTpl(dtpl, {name:key, value:res[key]}));
                }else{
                    for(var k in res[key]){
                        html.push(formatTpl(dtpl, {name:k, value:res[key][k]}));
                    }
                }
            }
        }
        dom.querySelector('tbody').innerHTML = html.join('');
    }
    function switchSections(evt){
        var li  = evt.target,
            tar = li.getAttribute("tar"),
            lis = li.parentNode.children,
            sections = document.querySelectorAll('.details section');
        for(var i=0,il=lis.length;i<il; i++){
            var cls = lis[i].getAttribute('tar');
            lis[i].className = cls == tar ? 'current': '';
        }
        for(var i=0,il=sections.length; i<il; i++){
            sections[i].style.display = sections[i].className == tar ? '': 'none';
        }
    }

    function viewDetail(li){
        var obj = curObjs[li.url];
        if(obj && obj.request){
            var reqDom = document.querySelector('.details .detail_request');
            renderRequestHead(reqDom, obj.request);
            renderSections(reqDom, obj.request);
            document.querySelector('.details').className = 'details details_open';
        }
        if(obj && obj.response){
            var resDom = document.querySelector('.details .detail_response');
            renderRequestHead(resDom, obj.response);
            renderSections(resDom, obj.response);
        }
        if(obj && obj.timings){
            var addDom = document.querySelector('.details .detail_additional');
            renderAddtionalInfo(addDom, obj);
        }
        document.querySelectorAll('.detail_category')[0].click();
    }

    function createRow(url, boo) {
        var li = document.createElement('li');
        url = url.replace(/[\"\'<>]+/g, '');
        li.url = url.replace(/[^a-z0-9]+/gi,'');
        li.innerHTML = (boo ? '<a class="inspector" href="javascript:;">Inspector</a> ':'')
            +'<a  href="' + url + '" target="_blank">' + url + '</a>';
        if(boo){
            li.getElementsByClassName("inspector")[0].addEventListener('click', function(e){
                viewDetail(e.target.parentNode);
            });
        }
        return li;
    }

    function checkFilter(evt) {
        var tar = evt.target,
            t = document.querySelector('#filterText').value;
        if (t.length == 0) {
            return;
        }
        if (tar.checked) {
            setFilter();
        } else {
            blurFilter();
        }
        filterList();
    }

    function setFilter() {
        isFiltering = true;
    }

    function blurFilter() {
        isFiltering = false;
    }

    function filterList() {
        var filterTxt = document.querySelector('#filterText').value,
            reg = null,
            list = [],
            oldList = curList,
            regFlag = document.querySelector('#isRegEx').checked;
        if (regFlag) {
            if (/^\/.*\/[igm]?$/i.test(filterTxt)) {
                filterTxt = filterTxt.substr(1).replace(/\/.*?$/gi, '');
            }
            showTips(filterTxt);
            try {
                reg = new RegExp(filterTxt, 'gi');
                list = [];
                for (var i = 0, il = curList.length; i < il; i++) {
                    if (reg.test(curList[i])) {
                        list.push(curList[i]);
                    }
                }
                updateUI(list);
                curList = oldList;
            } catch (e) {
                showTips(e.message);
            }
        } else {
            var t = filterTxt.replace(/\*\./g, '.');
            list = [];
            for (var i = 0, il = curList.length; i < il; i++) {
                if (curList[i].indexOf(t) != -1) {
                    list.push(curList[i]);
                }
            }
            updateUI(list);
            curList = oldList;
        }
    }

    function freshList() {
        document.querySelector('#filterText').value = '';
        if(window.chrome && chrome.devtools && chrome.devtools.inspectedWindow){
            chrome.devtools.inspectedWindow.getResources(setList);
        }
    }

    function resetList() {
        updateUI([]);
    }

    function clearList() {
        var rowContainer = document.querySelector('.preprocessed-urls');
        rowContainer.innerHTML = '';
        document.querySelector('#tips').innerHTML = '';
    }

    function setList(res) {
        var list = [];
        for (var i in res) {
            list.push(res[i].url);
            curObjs[res[i].url] = res[i];
        }
        updateUI(list);
    }
    function closeDetailsPanel(){
        document.querySelector('.details').className = 'details details_close';
    }
    function openDetailsPanel(){
        document.querySelector('.details').className = 'details details_close';
    }

    function isUrl(url) {
        return /^https?:\/\//i.test(url);
    }

    function updateUI(lists, boo) {
        var rowContainer = document.querySelector('.preprocessed-urls');
        if (boo === undefined) {
            curList = [];
            clearList();
        }
        lists.forEach(function(url) {
            if (isUrl(url)) {
                curList.push(url);
                rowContainer.appendChild(createRow(url, curObjs.flag == 1));
            }
        });
    }
    window.addEventListener('load', initEvents);
})();
