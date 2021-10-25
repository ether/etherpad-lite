'use strict';

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
 * Generates a random String with the given length. Is needed to generate the Author, Group,
 * readonly, session Ids
 */
const randomString = (len) => {
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  let randomstring = '';
  len = len || 20;
  for (let i = 0; i < len; i++) {
    const rnum = Math.floor(Math.random() * chars.length);
    randomstring += chars.substring(rnum, rnum + 1);
  }
  return randomstring;
};

// Set of "letter or digit" chars is based on section 20.5.16 of the original Java Language Spec.
const wordCharRegex = new RegExp(`[${[
  '\u0030-\u0039',
  '\u0041-\u005A',
  '\u0061-\u007A',
  '\u00C0-\u00D6',
  '\u00D8-\u00F6',
  '\u00F8-\u00FF',
  '\u0100-\u1FFF',
  '\u3040-\u9FFF',
  '\uF900-\uFDFF',
  '\uFE70-\uFEFE',
  '\uFF10-\uFF19',
  '\uFF21-\uFF3A',
  '\uFF41-\uFF5A',
  '\uFF66-\uFFDC',
].join('')}]`);

const urlRegex = (() => {
  // TODO: wordCharRegex matches many characters that are not permitted in URIs. Are they included
  // here as an attempt to support IRIs? (See https://tools.ietf.org/html/rfc3987.)
  const urlChar = `[-:@_.,~%+/?=&#!;()\\[\\]$'*${wordCharRegex.source.slice(1, -1)}]`;
  // Matches a single character that should not be considered part of the URL if it is the last
  // character that matches urlChar.
  const postUrlPunct = '[:.,;?!)\\]\'*]';
  // Schemes that must be followed by ://
  const withAuth = `(?:${[
    '(?:x-)?man',
    'afp',
    'file',
    'ftps?',
    'gopher',
    'https?',
    'nfs',
    'sftp',
    'smb',
    'txmt',
  ].join('|')})://`;
  // Schemes that do not need to be followed by ://
  const withoutAuth = `(?:${[
    'about',
    'geo',
    'mailto',
    'tel',
  ].join('|')}):`;
  return new RegExp(
      `(?:${withAuth}|${withoutAuth}|www\\.)${urlChar}*(?!${postUrlPunct})${urlChar}`, 'g');
})();

const padutils = {
  /**
   * Prints a warning message followed by a stack trace (to make it easier to figure out what code
   * is using the deprecated function).
   *
   * Most browsers include UI widget to examine the stack at the time of the warning, but this
   * includes the stack in the log message for a couple of reasons:
   *   - This makes it possible to see the stack if the code runs in Node.js.
   *   - Users are more likely to paste the stack in bug reports they might file.
   *
   * @param {...*} args - Passed to `console.warn`, with a stack trace appended.
   */
  warnWithStack: (...args) => {
    const err = new Error();
    if (Error.captureStackTrace) Error.captureStackTrace(err, padutils.warnWithStack);
    err.name = '';
    if (err.stack) args.push(err.stack);
    console.warn(...args);
  },

  escapeHtml: (x) => Security.escapeHTML(String(x)),
  uniqueId: () => {
    const pad = require('./pad').pad; // Sidestep circular dependency
    // returns string that is exactly 'width' chars, padding with zeros and taking rightmost digits
    const encodeNum =
        (n, width) => (Array(width + 1).join('0') + Number(n).toString(35)).slice(-width);
    return [
      pad.getClientIp(),
      encodeNum(+new Date(), 7),
      encodeNum(Math.floor(Math.random() * 1e9), 4),
    ].join('.');
  },
  // e.g. "Thu Jun 18 2009 13:09"
  simpleDateTime: (date) => {
    const d = new Date(+date); // accept either number or date
    const dayOfWeek = (['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'])[d.getDay()];
    const month = ([
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ])[d.getMonth()];
    const dayOfMonth = d.getDate();
    const year = d.getFullYear();
    const hourmin = `${d.getHours()}:${(`0${d.getMinutes()}`).slice(-2)}`;
    return `${dayOfWeek} ${month} ${dayOfMonth} ${year} ${hourmin}`;
  },
  wordCharRegex,
  urlRegex,
  // returns null if no URLs, or [[startIndex1, url1], [startIndex2, url2], ...]
  findURLs: (text) => {
    // Copy padutils.urlRegex so that the use of .exec() below (which mutates the RegExp object)
    // does not break other concurrent uses of padutils.urlRegex.
    const urlRegex = new RegExp(padutils.urlRegex, 'g');
    urlRegex.lastIndex = 0;
    let urls = null;
    let execResult;
    // TODO: Switch to String.prototype.matchAll() after support for Node.js < 12.0.0 is dropped.
    while ((execResult = urlRegex.exec(text))) {
      urls = (urls || []);
      const startIndex = execResult.index;
      const url = execResult[0];
      urls.push([startIndex, url]);
    }
    return urls;
  },
  escapeHtmlWithClickableLinks: (text, target) => {
    let idx = 0;
    const pieces = [];
    const urls = padutils.findURLs(text);

    const advanceTo = (i) => {
      if (i > idx) {
        pieces.push(Security.escapeHTML(text.substring(idx, i)));
        idx = i;
      }
    };
    if (urls) {
      for (let j = 0; j < urls.length; j++) {
        const startIndex = urls[j][0];
        const href = urls[j][1];
        advanceTo(startIndex);
        // Using rel="noreferrer" stops leaking the URL/location of the pad when clicking links in
        // the document. Not all browsers understand this attribute, but it's part of the HTML5
        // standard. https://html.spec.whatwg.org/multipage/links.html#link-type-noreferrer
        // Additionally, we do rel="noopener" to ensure a higher level of referrer security.
        // https://html.spec.whatwg.org/multipage/links.html#link-type-noopener
        // https://mathiasbynens.github.io/rel-noopener/
        // https://github.com/ether/etherpad-lite/pull/3636
        pieces.push(
            '<a ',
            (target ? `target="${Security.escapeHTMLAttribute(target)}" ` : ''),
            'href="',
            Security.escapeHTMLAttribute(href),
            '" rel="noreferrer noopener">');
        advanceTo(startIndex + href.length);
        pieces.push('</a>');
      }
    }
    advanceTo(text.length);
    return pieces.join('');
  },
  bindEnterAndEscape: (node, onEnter, onEscape) => {
    // Use keypress instead of keyup in bindEnterAndEscape. Keyup event is fired on enter in IME
    // (Input Method Editor), But keypress is not. So, I changed to use keypress instead of keyup.
    // It is work on Windows (IE8, Chrome 6.0.472), CentOs (Firefox 3.0) and Mac OSX (Firefox
    // 3.6.10, Chrome 6.0.472, Safari 5.0).
    if (onEnter) {
      node.keypress((evt) => {
        if (evt.which === 13) {
          onEnter(evt);
        }
      });
    }

    if (onEscape) {
      node.keydown((evt) => {
        if (evt.which === 27) {
          onEscape(evt);
        }
      });
    }
  },
  timediff: (d) => {
    const pad = require('./pad').pad; // Sidestep circular dependency
    const format = (n, word) => {
      n = Math.round(n);
      return (`${n} ${word}${n !== 1 ? 's' : ''} ago`);
    };
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
  makeAnimationScheduler: (funcToAnimateOneStep, stepTime, stepsAtOnce) => {
    if (stepsAtOnce === undefined) {
      stepsAtOnce = 1;
    }

    let animationTimer = null;

    const scheduleAnimation = () => {
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
    };
    return {scheduleAnimation};
  },
  makeFieldLabeledWhenEmpty: (field, labelText) => {
    field = $(field);

    const clear = () => {
      field.addClass('editempty');
      field.val(labelText);
    };
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
  getCheckbox: (node) => $(node).is(':checked'),
  setCheckbox: (node, value) => {
    if (value) {
      $(node).attr('checked', 'checked');
    } else {
      $(node).removeAttr('checked');
    }
  },
  bindCheckboxChange: (node, func) => {
    $(node).change(func);
  },
  encodeUserId: (userId) => userId.replace(/[^a-y0-9]/g, (c) => {
    if (c === '.') return '-';
    return `z${c.charCodeAt(0)}z`;
  }),
  decodeUserId: (encodedUserId) => encodedUserId.replace(/[a-y0-9]+|-|z.+?z/g, (cc) => {
    if (cc === '-') { return '.'; } else if (cc.charAt(0) === 'z') {
      return String.fromCharCode(Number(cc.slice(1, -1)));
    } else {
      return cc;
    }
  }),
};

let globalExceptionHandler = null;
padutils.setupGlobalExceptionHandler = () => {
  if (globalExceptionHandler == null) {
    require('./vendors/gritter');
    globalExceptionHandler = (e) => {
      let type;
      let err;
      let msg, url, linenumber;
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
      if (err.name != null && msg !== err.name && !msg.startsWith(`${err.name}: `)) {
        msg = `${err.name}: ${msg}`;
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
              .append($('<b>').addClass('error-msg').text(msg)).append($('<br>'))
              .append(txt(`at ${url} at line ${linenumber}`)).append($('<br>'))
              .append(txt(`ErrorId: ${errorId}`)).append($('<br>'))
              .append(txt(type)).append($('<br>'))
              .append(txt(`URL: ${window.location.href}`)).append($('<br>'))
              .append(txt(`UserAgent: ${navigator.userAgent}`)).append($('<br>')),
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
const inThirdPartyIframe = () => {
  try {
    return (!window.top.location.hostname);
  } catch (e) {
    return true;
  }
};

// This file is included from Node so that it can reuse randomString, but Node doesn't have a global
// window object.
if (typeof window !== 'undefined') {
  exports.Cookies = require('js-cookie/dist/js.cookie').withAttributes({
    // Use `SameSite=Lax`, unless Etherpad is embedded in an iframe from another site in which case
    // use `SameSite=None`. For iframes from another site, only `None` has a chance of working
    // because the cookies are third-party (not same-site). Many browsers/users block third-party
    // cookies, but maybe blocked is better than definitely blocked (which would happen with `Lax`
    // or `Strict`). Note: `None` will not work unless secure is true.
    //
    // `Strict` is not used because it has few security benefits but significant usability drawbacks
    // vs. `Lax`. See https://stackoverflow.com/q/41841880 for discussion.
    sameSite: inThirdPartyIframe() ? 'None' : 'Lax',
    secure: window.location.protocol === 'https:',
  });
}
exports.randomString = randomString;
exports.padutils = padutils;
