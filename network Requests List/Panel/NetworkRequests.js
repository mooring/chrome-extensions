(function() {
	var curList = [],
		isFiltering = false;

	function initEvents() {
		var doc = document;
		freshList();
		doc.querySelector('button.refresh-button').addEventListener('click', freshList);
		doc.querySelector('#filterText').addEventListener('keyup', filterList);
		doc.querySelector('#filterText').addEventListener('focus', setFilter);
		doc.querySelector('#filterText').addEventListener('blur', blurFilter);
		doc.querySelector('#isRegEx').addEventListener('click', checkFilter);
		doc.querySelector('button.copy-button').addEventListener('click', copyList);
		doc.querySelector('button.clear-button').addEventListener('click', resetList);
		doc.querySelector('button.reload-button').addEventListener('click', function() {
			resetList();
			chrome.devtools.inspectedWindow.reload({});
		});
		chrome.devtools.network.onNavigated.addListener(resetList);
		chrome.devtools.network.onRequestFinished.addListener(function(request) {
			if (isFiltering && isUrl(request.request.url)) {
				curList.push(request.request.url);
				return;
			}
			updateUI([request.request.url], true);
		});
	}

	function showTips(tips) {
		var doc = document.querySelector('#tips');
		doc.innerHTML = tips;
	}

	function copyList() {
		var dom = document.querySelector('#clipData'),
			list = [],
			filter = document.querySelectorAll('.preprocessed-urls li');
		for (var i = 0, il = filter.length; i < il; i++) {
			list.push(filter[i].textContent);
		}
		dom.value = list.join("\n");
		dom.select();
		var res = document.execCommand("copy"),
			doc = document.querySelector('#tips');
		if (res) {
			showTips(list.length + ' Resource urls have been Copied to your ClipBoard, Enjoy it');
		} else {
			showTips('Bad News, Copy Data failed');
		}
		setTimeout(function() {
			doc.innerHTML = '';
		}, 5000);
	}

	function createRow(url) {
		var li = document.createElement('li');
		url = url.replace(/[\"\'<>]+/g, '');
		li.innerHTML = '<a  href="' + url + '" target="_blank">' + url + '</a>';
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
		chrome.devtools.inspectedWindow.getResources(setList);
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
		}
		updateUI(list);
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
				rowContainer.appendChild(createRow(url));
			}
		});
	}
	window.addEventListener('load', initEvents);
})();