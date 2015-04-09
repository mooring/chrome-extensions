(function () {
	var curList = [];
	function initEvents() {
		resList();
		document.querySelector('button.refresh-button').addEventListener('click', resList);
		document.querySelector('button.reload-button').addEventListener('click', function () {
			updateUI([]);
			chrome.devtools.inspectedWindow.reload({});
		});
		document.querySelector('button.copy-button').addEventListener('click', function () {
			var dom = document.querySelector('#clipData');
			dom.value = curList.join("\n");
			dom.select();
			var res = document.execCommand("copy"),
			doc = document.querySelector('#tips');
			if (res) {
				doc.innerHTML = curList.length + ' Resource urls have been Copied to your ClipBoard, Enjoy it';
			} else {
				doc.innerHTML = 'Bad News, Copy Data failed';
			}
			setTimeout(function () {
				doc.innerHTML = '';
			}, 5000);
		});
		document.querySelector('button.clear-button').addEventListener('click', function () {
			updateUI([]);
		});
		chrome.devtools.network.onNavigated.addListener(function (url) {
            updateUI([]);
        });
		chrome.devtools.network.onRequestFinished.addListener(function (request) {
			updateUI([request.request.url], true);
		});
	}
	function createRow(url) {
		var li = document.createElement('li');
		li.textContent = url;
		return li;
	}
	function updateUI(lists, boo) {
		var rowContainer = document.querySelector('.preprocessed-urls');
		if (boo === undefined) {
			rowContainer.innerHTML = '';
			curList = [];
			document.querySelector('#tips').innerHTML = '';
		}
		lists.forEach(function (url) {
			if (/^https?:\/\//i.test(url)) {
				curList.push(url);
				rowContainer.appendChild(createRow(url));
			}
		});
	}
	function resList() {
		chrome.devtools.inspectedWindow.getResources(setList);
	}
	function setList(res) {
		var list = [];
		for (var i in res) {
			list.push(res[i].url)
		}
		updateUI(list);
	}
	window.addEventListener('load', initEvents);
})();
