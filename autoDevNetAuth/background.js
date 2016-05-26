var tabTouched = false,
    activeTabId = null;
function touchTab(tabId, info){
    if(info.status && info.status == 'complete'){
        setTimeout(function(){
            if(activeTabId != null){
                chrome.tabs.highlight(activeTabId);
                chrome.tabs.reload(activeTabId);
                chrome.tabs.remove([tabId]);
                chrome.tabs.executeScript(tabId, {
                    code:'setTimeout(function(){ window.close();},3000);',
                    runAt:'document_end'
                });
                activeTabId = null;
            }
        },3000);
    }
}
function networkError(detail){
    var jumpurl = 'http://your-web-auth.domain.com/auth.php'
    if(detail.method =='GET' && detail.error == 'net::ERR_TUNNEL_CONNECTION_FAILED'){
        if(!tabTouched){
            chrome.tabs.onUpdated.addListener(touchTab);
            tabTouched = true;
        }
        chrome.tabs.query({active: true, currentWindow: true, highlighted:true}, function(tabs) {
            activeTabId = tabs && tabs.length>0 ? tabs[0].id : null;
            chrome.tabs.create({url:jumpurl, active:false});
        });
    }
}
function tabActived(info){
    chrome.tabs.get(info.tabId,function(tab){
        if(tab.status == 'complete' && tab.title.indexOf('申请临时访问') != -1){
            touchTab(info.tabId, tab);
        }
    });
}
chrome.webRequest.onErrorOccurred.addListener(networkError,{
    urls:['<all_urls>'],types:['main_frame','sub_frame']
});
//chrome.tabs.onActivated.addListener(tabActived);
