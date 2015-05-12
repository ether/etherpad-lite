(function() {
  // Display errors on page load to the user
  // (Gets overridden by padutils.setupGlobalExceptionHandler)
  var originalHandler = window.onerror;
  window.onerror = function(msg, url, line) {
    var box   = document.getElementById('editorloadingbox');
    box.innerHTML = '<p><b>An error occured while loading the pad</b></p>'
                  + '<p><b>'+msg+'</b> '
                  + '<small>in '+ url +' (line '+ line +')</small></p>';
    // call original error handler
    if(typeof(originalHandler) == 'function') originalHandler.call(null, arguments);
  };
})();
