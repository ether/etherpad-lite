var helper = {};

(function(){
  var $iframe, jsLibraries = {};

  helper.init = function(cb){
    $.get('/static/js/jquery.js').done(function(code){
      // make sure we don't override existing jquery
      jsLibraries["jquery"] = "if(typeof $ === 'undefined') {\n" + code + "\n}";

      $.get('/tests/frontend/lib/sendkeys.js').done(function(code){
        jsLibraries["sendkeys"] = code;

        cb();
      });
    });
  }

  helper.randomString = function randomString(len)
  {
    var chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
    var randomstring = '';
    for (var i = 0; i < len; i++)
    {
      var rnum = Math.floor(Math.random() * chars.length);
      randomstring += chars.substring(rnum, rnum + 1);
    }
    return randomstring;
  }

  var getFrameJQuery = function($iframe){
    /*
      I tried over 9000 ways to inject javascript into iframes.
      This is the only way I found that worked in IE 7+8+9, FF and Chrome
    */

    var win = $iframe[0].contentWindow;
    var doc = win.document;

    //IE 8+9 Hack to make eval appear
    //http://stackoverflow.com/questions/2720444/why-does-this-window-object-not-have-the-eval-function
    win.execScript && win.execScript("null");

    win.eval(jsLibraries["jquery"]);
    win.eval(jsLibraries["sendkeys"]);

    win.$.window = win;
    win.$.document = doc;

    return win.$;
  }

  helper.clearSessionCookies = function(){
    // Expire cookies, so author and language are changed after reloading the pad.
    // See https://developer.mozilla.org/en-US/docs/Web/API/Document/cookie#Example_4_Reset_the_previous_cookie
    window.document.cookie = 'token=;expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
    window.document.cookie = 'language=;expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
  }

  // Can only happen when the iframe exists, so we're doing it separately from other cookies
  helper.clearPadPrefCookie = function(){
    helper.padChrome$.document.cookie = 'prefsHttp=;expires=Thu, 01 Jan 1970 00:00:00 GMT';
  }

  // Overwrite all prefs in pad cookie. Assumes http, not https.
  //
  // `helper.padChrome$.document.cookie` (the iframe) and `window.document.cookie`
  // seem to have independent cookies, UNLESS we put path=/ here (which we don't).
  // I don't fully understand it, but this function seems to properly simulate
  // padCookie.setPref in the client code
  helper.setPadPrefCookie = function(prefs){
    helper.padChrome$.document.cookie = ("prefsHttp=" + escape(JSON.stringify(prefs)) + ";expires=Thu, 01 Jan 3000 00:00:00 GMT");
  }

  // Functionality for knowing what key event type is required for tests
  var evtType = "keydown";
  // if it's IE require keypress
  if(window.navigator.userAgent.indexOf("MSIE") > -1){
    evtType = "keypress";
  }
  // Edge also requires keypress.
  if(window.navigator.userAgent.indexOf("Edge") > -1){
    evtType = "keypress";
  }
  // Opera also requires keypress.
  if(window.navigator.userAgent.indexOf("OPR") > -1){
    evtType = "keypress";
  }
  helper.evtType = evtType;

  // @todo needs fixing asap
  // newPad occasionally timeouts, might be a problem with ready/onload code during page setup
  // This ensures that tests run regardless of this problem
  helper.retry = 0

  helper.newPad = function(cb, padName){
    //build opts object
    var opts = {clearCookies: true}
    if(typeof cb === 'function'){
      opts.cb = cb
    } else {
      opts = _.defaults(cb, opts);
    }

    // if opts.params is set we manipulate the URL to include URL parameters IE ?foo=Bah.
    if(opts.params){
      var encodedParams = "?" + $.param(opts.params);
    }

    //clear cookies
    if(opts.clearCookies){
      helper.clearSessionCookies();
    }

    if(!padName)
      padName = "FRONTEND_TEST_" + helper.randomString(20);
    $iframe = $("<iframe src='/p/" + padName + (encodedParams || '') + "'></iframe>");

    // needed for retry
    let origPadName = padName;

    //clean up inner iframe references
    helper.padChrome$ = helper.padOuter$ = helper.padInner$ = null;

    //remove old iframe
    $("#iframe-container iframe").remove();
    //set new iframe
    $("#iframe-container").append($iframe);
    $iframe.one('load', function(){
      helper.padChrome$ = getFrameJQuery($('#iframe-container iframe'));
      if (opts.clearCookies) {
        helper.clearPadPrefCookie();
      }
      if (opts.padPrefs) {
        helper.setPadPrefCookie(opts.padPrefs);
      }
      helper.waitFor(function(){
        return !$iframe.contents().find("#editorloadingbox").is(":visible");
      }, 10000).done(function(){
        helper.padOuter$  = getFrameJQuery(helper.padChrome$('iframe[name="ace_outer"]'));
        helper.padInner$  = getFrameJQuery( helper.padOuter$('iframe[name="ace_inner"]'));

        //disable all animations, this makes tests faster and easier
        helper.padChrome$.fx.off = true;
        helper.padOuter$.fx.off = true;
        helper.padInner$.fx.off = true;

        /*
         * chat messages received
         * @type {Array}
         */
        helper.chatMessages = [];
        
        /*
         * changeset commits from the server
         * @type {Array}
         */
        helper.commits = [];
        
        /*
         * userInfo messages from the server
         * @type {Array}
         */
        helper.userInfos = [];

        // listen for server messages
        helper.spyOnSocketIO();
        opts.cb();
      }).fail(function(){
        if (helper.retry > 3) {
          throw new Error("Pad never loaded");
        }
        helper.retry++;
        helper.newPad(cb,origPadName);
      });
    });

    return padName;
  }

  helper.waitFor = function(conditionFunc, timeoutTime = 1900, intervalTime = 10) {
    var deferred = $.Deferred();

    const _fail = deferred.fail.bind(deferred);
    var listenForFail = false;
    deferred.fail = (...args) => {
      listenForFail = true;
      return _fail(...args);
    };

    const check = () => {
      try {
        if (!conditionFunc()) return;
        deferred.resolve();
      } catch (err) {
        deferred.reject(err);
      }
      clearInterval(intervalCheck);
      clearTimeout(timeout);
    };

    const intervalCheck = setInterval(check, intervalTime);

    const timeout = setTimeout(() => {
      clearInterval(intervalCheck);
      var error = new Error("wait for condition never became true " + conditionFunc.toString());
      deferred.reject(error);

      if(!listenForFail){
        throw error;
      }
    }, timeoutTime);

    // Check right away to avoid an unnecessary sleep if the condition is already true.
    check();

    return deferred;
  };

  /**
   * Same as `waitFor` but using Promises
   *
   * @returns {Promise}
   *
   */
  helper.waitForPromise = async function(...args) {
    // Note: waitFor() has a strange API: On timeout it rejects, but it also throws an uncatchable
    // exception unless .fail() has been called. That uncatchable exception is disabled here by
    // passing a no-op function to .fail().
    return await this.waitFor(...args).fail(() => {});
  };

  helper.selectLines = function($startLine, $endLine, startOffset, endOffset){
    // if no offset is provided, use beginning of start line and end of end line
    startOffset = startOffset || 0;
    endOffset   = endOffset === undefined ? $endLine.text().length : endOffset;

    var inner$    = helper.padInner$;
    var selection = inner$.document.getSelection();
    var range     = selection.getRangeAt(0);

    var start = getTextNodeAndOffsetOf($startLine, startOffset);
    var end   = getTextNodeAndOffsetOf($endLine, endOffset);

    range.setStart(start.node, start.offset);
    range.setEnd(end.node, end.offset);

    selection.removeAllRanges();
    selection.addRange(range);
  }

  var getTextNodeAndOffsetOf = function($targetLine, targetOffsetAtLine){
    var $textNodes = $targetLine.find('*').contents().filter(function(){
      return this.nodeType === Node.TEXT_NODE;
    });

    // search node where targetOffsetAtLine is reached, and its 'inner offset'
    var textNodeWhereOffsetIs = null;
    var offsetBeforeTextNode = 0;
    var offsetInsideTextNode = 0;
    $textNodes.each(function(index, element){
      var elementTotalOffset = element.textContent.length;
      textNodeWhereOffsetIs = element;
      offsetInsideTextNode = targetOffsetAtLine - offsetBeforeTextNode;

      var foundTextNode = offsetBeforeTextNode + elementTotalOffset >= targetOffsetAtLine;
      if (foundTextNode){
        return false; //stop .each by returning false
      }

      offsetBeforeTextNode += elementTotalOffset;
    });

    // edge cases
    if (textNodeWhereOffsetIs === null){
      // there was no text node inside $targetLine, so it is an empty line (<br>).
      // Use beginning of line
      textNodeWhereOffsetIs = $targetLine.get(0);
      offsetInsideTextNode = 0;
    }
    // avoid errors if provided targetOffsetAtLine is higher than line offset (maxOffset).
    // Use max allowed instead
    var maxOffset = textNodeWhereOffsetIs.textContent.length;
    offsetInsideTextNode = Math.min(offsetInsideTextNode, maxOffset);

    return {
      node: textNodeWhereOffsetIs,
      offset: offsetInsideTextNode,
    };
  }

  /* Ensure console.log doesn't blow up in IE, ugly but ok for a test framework imho*/
  window.console = window.console || {};
  window.console.log = window.console.log || function(){}
})()
