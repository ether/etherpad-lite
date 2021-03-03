'use strict';

const helper = {};

(() => {
  let $iframe;
  const jsLibraries = {};

  helper.init = (cb) => {
    $.get('/static/js/vendors/jquery.js').done((code) => {
      // make sure we don't override existing jquery
      jsLibraries.jquery = `if(typeof $ === 'undefined') {\n${code}\n}`;

      $.get('/tests/frontend/lib/sendkeys.js').done((code) => {
        jsLibraries.sendkeys = code;

        cb();
      });
    });
  };

  helper.randomString = (len) => {
    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
    let randomstring = '';
    for (let i = 0; i < len; i++) {
      const rnum = Math.floor(Math.random() * chars.length);
      randomstring += chars.substring(rnum, rnum + 1);
    }
    return randomstring;
  };

  const getFrameJQuery = ($iframe) => {
    /*
      I tried over 9001 ways to inject javascript into iframes.
      This is the only way I found that worked in IE 7+8+9, FF and Chrome
    */
    const win = $iframe[0].contentWindow;
    const doc = win.document;

    // IE 8+9 Hack to make eval appear
    // https://stackoverflow.com/q/2720444
    win.execScript && win.execScript('null');

    win.eval(jsLibraries.jquery);
    win.eval(jsLibraries.sendkeys);

    win.$.window = win;
    win.$.document = doc;

    return win.$;
  };

  helper.clearSessionCookies = () => {
    // Expire cookies, so author and language are changed after reloading the pad. See:
    // https://developer.mozilla.org/en-US/docs/Web/API/Document/cookie#example_4_reset_the_previous_cookie
    window.document.cookie = 'token=;expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
    window.document.cookie = 'language=;expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
  };

  // Can only happen when the iframe exists, so we're doing it separately from other cookies
  helper.clearPadPrefCookie = () => {
    helper.padChrome$.document.cookie = 'prefsHttp=;expires=Thu, 01 Jan 1970 00:00:00 GMT';
  };

  // Overwrite all prefs in pad cookie. Assumes http, not https.
  //
  // `helper.padChrome$.document.cookie` (the iframe) and `window.document.cookie`
  // seem to have independent cookies, UNLESS we put path=/ here (which we don't).
  // I don't fully understand it, but this function seems to properly simulate
  // padCookie.setPref in the client code
  helper.setPadPrefCookie = (prefs) => {
    helper.padChrome$.document.cookie =
        (`prefsHttp=${escape(JSON.stringify(prefs))};expires=Thu, 01 Jan 3000 00:00:00 GMT`);
  };

  // Functionality for knowing what key event type is required for tests
  let evtType = 'keydown';
  // if it's IE require keypress
  if (window.navigator.userAgent.indexOf('MSIE') > -1) {
    evtType = 'keypress';
  }
  // Edge also requires keypress.
  if (window.navigator.userAgent.indexOf('Edge') > -1) {
    evtType = 'keypress';
  }
  // Opera also requires keypress.
  if (window.navigator.userAgent.indexOf('OPR') > -1) {
    evtType = 'keypress';
  }
  helper.evtType = evtType;

  // @todo needs fixing asap
  // newPad occasionally timeouts, might be a problem with ready/onload code during page setup
  // This ensures that tests run regardless of this problem
  helper.retry = 0;

  helper.newPad = (cb, padName) => {
    // build opts object
    let opts = {clearCookies: true};
    if (typeof cb === 'function') {
      opts.cb = cb;
    } else {
      opts = _.defaults(cb, opts);
    }

    // if opts.params is set we manipulate the URL to include URL parameters IE ?foo=Bah.
    let encodedParams;
    if (opts.params) {
      encodedParams = `?${$.param(opts.params)}`;
    }
    let hash;
    if (opts.hash) {
      hash = `#${opts.hash}`;
    }

    // clear cookies
    if (opts.clearCookies) {
      helper.clearSessionCookies();
    }

    if (!padName) padName = `FRONTEND_TEST_${helper.randomString(20)}`;
    $iframe = $(`<iframe src='/p/${padName}${hash || ''}${encodedParams || ''}'></iframe>`);
    // needed for retry
    const origPadName = padName;

    // clean up inner iframe references
    helper.padChrome$ = helper.padOuter$ = helper.padInner$ = null;

    // remove old iframe
    $('#iframe-container iframe').remove();
    // set new iframe
    $('#iframe-container').append($iframe);
    $iframe.one('load', () => {
      helper.padChrome$ = getFrameJQuery($('#iframe-container iframe'));
      if (opts.clearCookies) {
        helper.clearPadPrefCookie();
      }
      if (opts.padPrefs) {
        helper.setPadPrefCookie(opts.padPrefs);
      }
      helper.waitFor(() => !$iframe.contents().find('#editorloadingbox')
          .is(':visible'), 10000).done(() => {
        helper.padOuter$ = getFrameJQuery(helper.padChrome$('iframe[name="ace_outer"]'));
        helper.padInner$ = getFrameJQuery(helper.padOuter$('iframe[name="ace_inner"]'));

        // disable all animations, this makes tests faster and easier
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
      }).fail(() => {
        if (helper.retry > 3) {
          throw new Error('Pad never loaded');
        }
        helper.retry++;
        helper.newPad(cb, origPadName);
      });
    });

    return padName;
  };

  helper.newAdmin = async (page) => {
    // define the iframe
    $iframe = $(`<iframe src='/admin/${page}'></iframe>`);

    // clean up inner iframe references
    helper.admin$ = null;

    // remove old iframe
    $('#iframe-container iframe').remove();
    // set new iframe
    $('#iframe-container').append($iframe);
    $iframe.one('load', () => {
      helper.admin$ = getFrameJQuery($('#iframe-container iframe'));
    });
  };

  helper.waitFor = (conditionFunc, timeoutTime = 1900, intervalTime = 10) => {
    // Create an Error object to use if the condition is never satisfied. This is created here so
    // that the Error has a useful stack trace associated with it.
    const timeoutError =
        new Error(`waitFor condition never became true ${conditionFunc.toString()}`);
    const deferred = new $.Deferred();

    const _fail = deferred.fail.bind(deferred);
    let listenForFail = false;
    deferred.fail = (...args) => {
      listenForFail = true;
      return _fail(...args);
    };

    const check = async () => {
      try {
        if (!await conditionFunc()) return;
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
      deferred.reject(timeoutError);

      if (!listenForFail) {
        throw timeoutError;
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
  // Note: waitFor() has a strange API: On timeout it rejects, but it also throws an uncatchable
  // exception unless .fail() has been called. That uncatchable exception is disabled here by
  // passing a no-op function to .fail().
  helper.waitForPromise = async (...args) => await helper.waitFor(...args).fail(() => {});

  helper.selectLines = ($startLine, $endLine, startOffset, endOffset) => {
    // if no offset is provided, use beginning of start line and end of end line
    startOffset = startOffset || 0;
    endOffset = endOffset === undefined ? $endLine.text().length : endOffset;

    const inner$ = helper.padInner$;
    const selection = inner$.document.getSelection();
    const range = selection.getRangeAt(0);

    const start = getTextNodeAndOffsetOf($startLine, startOffset);
    const end = getTextNodeAndOffsetOf($endLine, endOffset);

    range.setStart(start.node, start.offset);
    range.setEnd(end.node, end.offset);

    selection.removeAllRanges();
    selection.addRange(range);
  };

  const getTextNodeAndOffsetOf = ($targetLine, targetOffsetAtLine) => {
    const $textNodes = $targetLine.find('*').contents().filter(function () {
      return this.nodeType === Node.TEXT_NODE;
    });

    // search node where targetOffsetAtLine is reached, and its 'inner offset'
    let textNodeWhereOffsetIs = null;
    let offsetBeforeTextNode = 0;
    let offsetInsideTextNode = 0;
    $textNodes.each((index, element) => {
      const elementTotalOffset = element.textContent.length;
      textNodeWhereOffsetIs = element;
      offsetInsideTextNode = targetOffsetAtLine - offsetBeforeTextNode;

      const foundTextNode = offsetBeforeTextNode + elementTotalOffset >= targetOffsetAtLine;
      if (foundTextNode) {
        return false; // stop .each by returning false
      }

      offsetBeforeTextNode += elementTotalOffset;
    });

    // edge cases
    if (textNodeWhereOffsetIs == null) {
      // there was no text node inside $targetLine, so it is an empty line (<br>).
      // Use beginning of line
      textNodeWhereOffsetIs = $targetLine.get(0);
      offsetInsideTextNode = 0;
    }
    // avoid errors if provided targetOffsetAtLine is higher than line offset (maxOffset).
    // Use max allowed instead
    const maxOffset = textNodeWhereOffsetIs.textContent.length;
    offsetInsideTextNode = Math.min(offsetInsideTextNode, maxOffset);

    return {
      node: textNodeWhereOffsetIs,
      offset: offsetInsideTextNode,
    };
  };

  /* Ensure console.log doesn't blow up in IE, ugly but ok for a test framework imho*/
  window.console = window.console || {};
  window.console.log = window.console.log || (() => {});
})();
