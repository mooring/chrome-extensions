(function() {
  function LoadMonitor(onLoadedCallback) {

    function checkForLoad() {
      var expr = 'window.__inspectedWindowLoaded';

      function onEval(isLoaded, isException) {
        if (isException)
          throw new Error('Eval failed for ' + expr, isException.value);
        if (isLoaded)
          onLoadedCallback();
        else
          pollForLoad();
      }
      chrome.devtools.inspectedWindow.eval(expr, onEval);
    }

    function pollForLoad() {
      setTimeout(checkForLoad, 200);
    }

    pollForLoad();
  }

  LoadMonitor.prototype = {
    injectedScript: function() {
      window.__inspectedWindowLoaded = false;
      window.addEventListener('load', function() {
        window.__inspectedWindowLoaded = true;
        console.log('loaded');
      });
    }
  };

  window.InspectedWindow = window.InspectedWindow || {};
  InspectedWindow.LoadMonitor = LoadMonitor;
})();