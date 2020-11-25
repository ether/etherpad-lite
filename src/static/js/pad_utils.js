/**
 * This code is mostly from the old Etherpad. Please help us to comment this code.
 * This helps other people to understand this code better and helps them to improve it.
 * TL;DR COMMENTS ON THIS FILE ARE HIGHLY APPRECIATED
 */

/**
 * Copyright 2009 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS-IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const Security = require('./security');

/**
 * Generates a random String with the given length. Is needed to generate the Author, Group, readonly, session Ids
 */

function randomString(len) {
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  let randomstring = '';
  len = len || 20;
  for (let i = 0; i < len; i++) {
    const rnum = Math.floor(Math.random() * chars.length);
    randomstring += chars.substring(rnum, rnum + 1);
  }
  return randomstring;
}

var padutils = {
  escapeHtml(x) {
    return Security.escapeHTML(String(x));
  },
  uniqueId() {
    const pad = require('./pad').pad; // Sidestep circular dependency
    function encodeNum(n, width) {
      // returns string that is exactly 'width' chars, padding with zeros
      // and taking rightmost digits
      return (Array(width + 1).join('0') + Number(n).toString(35)).slice(-width);
    }
    return [pad.getClientIp(), encodeNum(+new Date(), 7), encodeNum(Math.floor(Math.random() * 1e9), 4)].join('.');
  },
  uaDisplay(ua) {
    let m;

    function clean(a) {
      const maxlen = 16;
      a = a.replace(/[^a-zA-Z0-9\.]/g, '');
      if (a.length > maxlen) {
        a = a.substr(0, maxlen);
      }
      return a;
    }

    function checkver(name) {
      const m = ua.match(RegExp(`${name}\\/([\\d\\.]+)`));
      if (m && m.length > 1) {
        return clean(name + m[1]);
      }
      return null;
    }

    // firefox
    if (checkver('Firefox')) {
      return checkver('Firefox');
    }

    // misc browsers, including IE
    m = ua.match(/compatible; ([^;]+);/);
    if (m && m.length > 1) {
      return clean(m[1]);
    }

    // iphone
    if (ua.match(/\(iPhone;/)) {
      return 'iPhone';
    }

    // chrome
    if (checkver('Chrome')) {
      return checkver('Chrome');
    }

    // safari
    m = ua.match(/Safari\/[\d\.]+/);
    if (m) {
      let v = '?';
      m = ua.match(/Version\/([\d\.]+)/);
      if (m && m.length > 1) {
        v = m[1];
      }
      return clean(`Safari${v}`);
    }

    // everything else
    const x = ua.split(' ')[0];
    return clean(x);
  },
  // e.g. "Thu Jun 18 2009 13:09"
  simpleDateTime(date) {
    const d = new Date(+date); // accept either number or date
    const dayOfWeek = (['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'])[d.getDay()];
    const month = (['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'])[d.getMonth()];
    const dayOfMonth = d.getDate();
    const year = d.getFullYear();
    const hourmin = `${d.getHours()}:${(`0${d.getMinutes()}`).slice(-2)}`;
    return `${dayOfWeek} ${month} ${dayOfMonth} ${year} ${hourmin}`;
  },
  findURLs(text) {
    // copied from ACE
    const _REGEX_WORDCHAR = /[\u0030-\u0039\u0041-\u005A\u0061-\u007A\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u00FF\u0100-\u1FFF\u3040-\u9FFF\uF900-\uFDFF\uFE70-\uFEFE\uFF10-\uFF19\uFF21-\uFF3A\uFF41-\uFF5A\uFF66-\uFFDC]/;
    const _REGEX_URLCHAR = new RegExp(`(${/[-:@a-zA-Z0-9_.,~%+\/?=&#;()$]/.source}|${_REGEX_WORDCHAR.source})`);
    const _REGEX_URL = new RegExp(`${/(?:(?:https?|s?ftp|ftps|file|nfs):\/\/|(about|geo|mailto|tel):)/.source + _REGEX_URLCHAR.source}*(?![:.,;])${_REGEX_URLCHAR.source}`, 'g');

    // returns null if no URLs, or [[startIndex1, url1], [startIndex2, url2], ...]


    function _findURLs(text) {
      _REGEX_URL.lastIndex = 0;
      let urls = null;
      let execResult;
      while ((execResult = _REGEX_URL.exec(text))) {
        urls = (urls || []);
        const startIndex = execResult.index;
        const url = execResult[0];
        urls.push([startIndex, url]);
      }

      return urls;
    }

    return _findURLs(text);
  },
  escapeHtmlWithClickableLinks(text, target) {
    let idx = 0;
    const pieces = [];
    const urls = padutils.findURLs(text);

    function advanceTo(i) {
      if (i > idx) {
        pieces.push(Security.escapeHTML(text.substring(idx, i)));
        idx = i;
      }
    }
    if (urls) {
      for (let j = 0; j < urls.length; j++) {
        const startIndex = urls[j][0];
        const href = urls[j][1];
        advanceTo(startIndex);
        // Using rel="noreferrer" stops leaking the URL/location of the pad when clicking links in the document.
        // Not all browsers understand this attribute, but it's part of the HTML5 standard.
        // https://html.spec.whatwg.org/multipage/links.html#link-type-noreferrer
        // Additionally, we do rel="noopener" to ensure a higher level of referrer security.
        // https://html.spec.whatwg.org/multipage/links.html#link-type-noopener
        // https://mathiasbynens.github.io/rel-noopener/
        // https://github.com/ether/etherpad-lite/pull/3636
        pieces.push('<a ', (target ? `target="${Security.escapeHTMLAttribute(target)}" ` : ''), 'href="', Security.escapeHTMLAttribute(href), '" rel="noreferrer noopener">');
        advanceTo(startIndex + href.length);
        pieces.push('</a>');
      }
    }
    advanceTo(text.length);
    return pieces.join('');
  },
  bindEnterAndEscape(node, onEnter, onEscape) {
    // Use keypress instead of keyup in bindEnterAndEscape
    // Keyup event is fired on enter in IME (Input Method Editor), But
    // keypress is not. So, I changed to use keypress instead of keyup.
    // It is work on Windows (IE8, Chrome 6.0.472), CentOs (Firefox 3.0) and Mac OSX (Firefox 3.6.10, Chrome 6.0.472, Safari 5.0).
    if (onEnter) {
      node.keypress((evt) => {
        if (evt.which == 13) {
          onEnter(evt);
        }
      });
    }

    if (onEscape) {
      node.keydown((evt) => {
        if (evt.which == 27) {
          onEscape(evt);
        }
      });
    }
  },
  timediff(d) {
    const pad = require('./pad').pad; // Sidestep circular dependency
    function format(n, word) {
      n = Math.round(n);
      return (`${n} ${word}${n != 1 ? 's' : ''} ago`);
    }
    d = Math.max(0, (+(new Date()) - (+d) - pad.clientTimeOffset) / 1000);
    if (d < 60) {
      return format(d, 'second');
    }
    d /= 60;
    if (d < 60) {
      return format(d, 'minute');
    }
    d /= 60;
    if (d < 24) {
      return format(d, 'hour');
    }
    d /= 24;
    return format(d, 'day');
  },
  makeAnimationScheduler(funcToAnimateOneStep, stepTime, stepsAtOnce) {
    if (stepsAtOnce === undefined) {
      stepsAtOnce = 1;
    }

    let animationTimer = null;

    function scheduleAnimation() {
      if (!animationTimer) {
        animationTimer = window.setTimeout(() => {
          animationTimer = null;
          let n = stepsAtOnce;
          let moreToDo = true;
          while (moreToDo && n > 0) {
            moreToDo = funcToAnimateOneStep();
            n--;
          }
          if (moreToDo) {
            // more to do
            scheduleAnimation();
          }
        }, stepTime * stepsAtOnce);
      }
    }
    return {
      scheduleAnimation,
    };
  },
  makeShowHideAnimator(funcToArriveAtState, initiallyShown, fps, totalMs) {
    let animationState = (initiallyShown ? 0 : -2); // -2 hidden, -1 to 0 fade in, 0 to 1 fade out
    const animationFrameDelay = 1000 / fps;
    const animationStep = animationFrameDelay / totalMs;

    const scheduleAnimation = padutils.makeAnimationScheduler(animateOneStep, animationFrameDelay).scheduleAnimation;

    function doShow() {
      animationState = -1;
      funcToArriveAtState(animationState);
      scheduleAnimation();
    }

    function doQuickShow() { // start showing without losing any fade-in progress
      if (animationState < -1) {
        animationState = -1;
      } else if (animationState > 0) {
        animationState = Math.max(-1, Math.min(0, -animationState));
      }
      funcToArriveAtState(animationState);
      scheduleAnimation();
    }

    function doHide() {
      if (animationState >= -1 && animationState <= 0) {
        animationState = 1e-6;
        scheduleAnimation();
      }
    }

    function animateOneStep() {
      if (animationState < -1 || animationState == 0) {
        return false;
      } else if (animationState < 0) {
        // animate show
        animationState += animationStep;
        if (animationState >= 0) {
          animationState = 0;
          funcToArriveAtState(animationState);
          return false;
        } else {
          funcToArriveAtState(animationState);
          return true;
        }
      } else if (animationState > 0) {
        // animate hide
        animationState += animationStep;
        if (animationState >= 1) {
          animationState = 1;
          funcToArriveAtState(animationState);
          animationState = -2;
          return false;
        } else {
          funcToArriveAtState(animationState);
          return true;
        }
      }
    }

    return {
      show: doShow,
      hide: doHide,
      quickShow: doQuickShow,
    };
  },
  _nextActionId: 1,
  uncanceledActions: {},
  getCancellableAction(actionType, actionFunc) {
    let o = padutils.uncanceledActions[actionType];
    if (!o) {
      o = {};
      padutils.uncanceledActions[actionType] = o;
    }
    const actionId = (padutils._nextActionId++);
    o[actionId] = true;
    return function () {
      const p = padutils.uncanceledActions[actionType];
      if (p && p[actionId]) {
        actionFunc();
      }
    };
  },
  cancelActions(actionType) {
    const o = padutils.uncanceledActions[actionType];
    if (o) {
      // clear it
      delete padutils.uncanceledActions[actionType];
    }
  },
  makeFieldLabeledWhenEmpty(field, labelText) {
    field = $(field);

    function clear() {
      field.addClass('editempty');
      field.val(labelText);
    }
    field.focus(() => {
      if (field.hasClass('editempty')) {
        field.val('');
      }
      field.removeClass('editempty');
    });
    field.blur(() => {
      if (!field.val()) {
        clear();
      }
    });
    return {
      clear,
    };
  },
  getCheckbox(node) {
    return $(node).is(':checked');
  },
  setCheckbox(node, value) {
    if (value) {
      $(node).attr('checked', 'checked');
    } else {
      $(node).removeAttr('checked');
    }
  },
  bindCheckboxChange(node, func) {
    $(node).change(func);
  },
  encodeUserId(userId) {
    return userId.replace(/[^a-y0-9]/g, (c) => {
      if (c == '.') return '-';
      return `z${c.charCodeAt(0)}z`;
    });
  },
  decodeUserId(encodedUserId) {
    return encodedUserId.replace(/[a-y0-9]+|-|z.+?z/g, (cc) => {
      if (cc == '-') { return '.'; } else if (cc.charAt(0) == 'z') {
        return String.fromCharCode(Number(cc.slice(1, -1)));
      } else {
        return cc;
      }
    });
  },
};

let globalExceptionHandler = null;
padutils.setupGlobalExceptionHandler = () => {
  if (globalExceptionHandler == null) {
    globalExceptionHandler = (e) => {
      let type;
      let err;
      let msg, url, lineno;
      if (e instanceof ErrorEvent) {
        type = 'Uncaught exception';
        err = e.error || {};
        ({message: msg, filename: url, lineno: linenumber} = e);
      } else if (e instanceof PromiseRejectionEvent) {
        type = 'Unhandled Promise rejection';
        err = e.reason || {};
        ({message: msg = 'unknown', fileName: url = 'unknown', lineNumber: linenumber = -1} = err);
      } else {
        throw new Error(`unknown event: ${e.toString()}`);
      }
      const errorId = randomString(20);

      let msgAlreadyVisible = false;
      $('.gritter-item .error-msg').each(function () {
        if ($(this).text() === msg) {
          msgAlreadyVisible = true;
        }
      });

      if (!msgAlreadyVisible) {
        const txt = document.createTextNode.bind(document); // Convenience shorthand.
        const errorMsg = [
          $('<p>')
              .append($('<b>').text('Please press and hold Ctrl and press F5 to reload this page')),
          $('<p>')
              .text('If the problem persists, please send this error message to your webmaster:'),
          $('<div>').css('text-align', 'left').css('font-size', '.8em').css('margin-top', '1em')
              .append(txt(`ErrorId: ${errorId}`)).append($('<br>'))
              .append(txt(type)).append($('<br>'))
              .append(txt(`URL: ${window.location.href}`)).append($('<br>'))
              .append(txt(`UserAgent: ${navigator.userAgent}`)).append($('<br>'))
              .append($('<b>').addClass('error-msg').text(msg)).append($('<br>'))
              .append(txt(`at ${url} at line ${linenumber}`)).append($('<br>')),
        ];

        $.gritter.add({
          title: 'An error occurred',
          text: errorMsg,
          class_name: 'error',
          position: 'bottom',
          sticky: true,
        });
      }

      // send javascript errors to the server
      $.post('../jserror', {
        errorInfo: JSON.stringify({
          errorId,
          type,
          msg,
          url: window.location.href,
          source: url,
          linenumber,
          userAgent: navigator.userAgent,
          stack: err.stack,
        }),
      });
    };
    window.onerror = null; // Clear any pre-existing global error handler.
    window.addEventListener('error', globalExceptionHandler);
    window.addEventListener('unhandledrejection', globalExceptionHandler);
  }
};

padutils.binarySearch = require('./ace2_common').binarySearch;

// https://stackoverflow.com/a/42660748
function inThirdPartyIframe() {
  try {
    return (!window.top.location.hostname);
  } catch (e) {
    return true;
  }
}

// This file is included from Node so that it can reuse randomString, but Node doesn't have a global
// window object.
if (typeof window !== 'undefined') {
  exports.Cookies = require('js-cookie/src/js.cookie');
  // Use `SameSite=Lax`, unless Etherpad is embedded in an iframe from another site in which case
  // use `SameSite=None`. For iframes from another site, only `None` has a chance of working
  // because the cookies are third-party (not same-site). Many browsers/users block third-party
  // cookies, but maybe blocked is better than definitely blocked (which would happen with `Lax`
  // or `Strict`). Note: `None` will not work unless secure is true.
  //
  // `Strict` is not used because it has few security benefits but significant usability drawbacks
  // vs. `Lax`. See https://stackoverflow.com/q/41841880 for discussion.
  exports.Cookies.defaults.sameSite = inThirdPartyIframe() ? 'None' : 'Lax';
  exports.Cookies.defaults.secure = window.location.protocol === 'https:';
}
exports.randomString = randomString;
exports.padutils = padutils;
