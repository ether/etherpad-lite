/*
  Copied from jQuery 1.8, the last jquery version with browser recognition support
*/

(function(){
  // Use of jQuery.browser is frowned upon.
  // More details: http://api.jquery.com/jQuery.browser
  // jQuery.uaMatch maintained for back-compat
  var uaMatch = function( ua ) {
      ua = ua.toLowerCase();

      var match = /(chrome)[ \/]([\w.]+)/.exec( ua ) ||
          /(webkit)[ \/]([\w.]+)/.exec( ua ) ||
          /(opera)(?:.*version|)[ \/]([\w.]+)/.exec( ua ) ||
          /(msie) ([\w.]+)/.exec( ua ) ||
          ua.indexOf("compatible") < 0 && /(mozilla)(?:.*? rv:([\w.]+)|)/.exec( ua ) ||
          [];

      return {
          browser: match[ 1 ] || "",
          version: match[ 2 ] || "0"
      };
  };

  var userAgent = navigator.userAgent;
  var matched = uaMatch(userAgent);
  var browser = {};

  if ( matched.browser ) {
      browser[ matched.browser ] = true;
      browser.version = matched.version;
  }

  // Chrome is Webkit, but Webkit is also Safari.
  if ( browser.chrome ) {
      browser.webkit = true;
  } else if ( browser.webkit ) {
      browser.safari = true;
  }

  //custom extensions, the original jquery didn't have these
  browser.windows = /windows/i.test(userAgent);
  browser.mobile = /mobile/i.test(userAgent) || /android/i.test(userAgent);

  if(typeof exports !== 'undefined'){
    exports.browser = browser;
  } else{
    $.browser = browser;
  }
})();