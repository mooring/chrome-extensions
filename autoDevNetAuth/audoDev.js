function checkPage(evt){
    var s = document.getElementById('showButtonDiv');
    if(s && s.style.display == 'block'){
        var btn = s.getElementsByClassName('btn_close');
        if(btn.length>0){
            btn[0].click();
        }
    }
}
window.addEventListener("DOMContentLoaded", checkPage, false);
window.addEventListener("load", checkPage, false);