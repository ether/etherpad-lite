/**
 * Copyright (c) 2012 Marcel Klehr
 * Copyright (c) 2011-2012 Fabien Cazenave, Mozilla
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to
 * deal in the Software without restriction, including without limitation the
 * rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
 * sell copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
 * IN THE SOFTWARE.
 */
window.html10n = (function(window, document, undefined) {

  // fix console
  (function() {
    var noop = function() {};
    var names = ["log", "debug", "info", "warn", "error", "assert", "dir", "dirxml", "group", "groupEnd", "time", "timeEnd", "count", "trace", "profile", "profileEnd"];
    var console = (window.console = window.console || {});
    for (var i = 0; i < names.length; ++i) {
      if (!console[names[i]]) {
        console[names[i]] = noop;
      }
    }
  }());

  // fix Array#forEach in IE
  // taken from https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/forEach
  if (!Array.prototype.forEach) {
    Array.prototype.forEach = function(fn, scope) {
      for(var i = 0, len = this.length; i < len; ++i) {
        if (i in this) {
          fn.call(scope, this[i], i, this);
        }
      }
    };
  }

  // fix Array#indexOf in, guess what, IE! <3
  // taken from https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/indexOf
  if (!Array.prototype.indexOf) {
    Array.prototype.indexOf = function (searchElement /*, fromIndex */ ) {
      "use strict";
      if (this == null) {
        throw new TypeError();
      }
      var t = Object(this);
      var len = t.length >>> 0;
      if (len === 0) {
        return -1;
      }
      var n = 0;
      if (arguments.length > 1) {
        n = Number(arguments[1]);
        if (n != n) { // shortcut for verifying if it's NaN
            n = 0;
        } else if (n != 0 && n != Infinity && n != -Infinity) {
            n = (n > 0 || -1) * Math.floor(Math.abs(n));
        }
      }
      if (n >= len) {
        return -1;
      }
      var k = n >= 0 ? n : Math.max(len - Math.abs(n), 0);
      for (; k < len; k++) {
        if (k in t && t[k] === searchElement) {
            return k;
        }
      }
      return -1;
    }
  }

  /**
   * MicroEvent - to make any js object an event emitter (server or browser)
   */

  var MicroEvent = function(){}
  MicroEvent.prototype = {
    bind: function(event, fct){
      this._events = this._events || {};
      this._events[event] = this._events[event] || [];
      this._events[event].push(fct);
    },
    unbind: function(event, fct){
      this._events = this._events || {};
      if( event in this._events === false  ) return;
      this._events[event].splice(this._events[event].indexOf(fct), 1);
    },
    trigger: function(event /* , args... */){
      this._events = this._events || {};
      if( event in this._events === false  ) return;
      for(var i = 0; i < this._events[event].length; i++){
        this._events[event][i].apply(this, Array.prototype.slice.call(arguments, 1))
      }
    }
  };
  /**
   * mixin will delegate all MicroEvent.js function in the destination object
   * @param {Object} the object which will support MicroEvent
   */
  MicroEvent.mixin = function(destObject){
    var props = ['bind', 'unbind', 'trigger'];
    if(!destObject) return;
    for(var i = 0; i < props.length; i ++){
      destObject[props[i]] = MicroEvent.prototype[props[i]];
    }
  }

  /**
   * Loader
   * The loader is responsible for loading
   * and caching all necessary resources
   */
  function Loader(resources) {
    this.resources = resources
    this.cache = {} // file => contents
    this.langs = {} // lang => strings
  }

  Loader.prototype.load = function(lang, cb) {
    if(this.langs[lang]) return cb()

    if (this.resources.length > 0) {
      var reqs = 0;
      for (var i=0, n=this.resources.length; i < n; i++) {
        this.fetch(this.resources[i], lang, function(e) {
          reqs++;
          if(e) console.warn(e)

          if (reqs < n) return;// Call back once all reqs are completed
          cb && cb()
        })
      }
    }
  }

  Loader.prototype.fetch = function(href, lang, cb) {
    var that = this

    if (this.cache[href]) {
      this.parse(lang, href, this.cache[href], cb)
      return;
    }

    var xhr = new XMLHttpRequest()
    xhr.open('GET', href, /*async: */true)
    if (xhr.overrideMimeType) {
      xhr.overrideMimeType('application/json; charset=utf-8');
    }
    xhr.onreadystatechange = function() {
      if (xhr.readyState == 4) {
        if (xhr.status == 200 || xhr.status === 0) {
          var data = JSON.parse(xhr.responseText)
          that.cache[href] = data
          // Pass on the contents for parsing
          that.parse(lang, href, data, cb)
        } else {
          cb(new Error('Failed to load '+href))
        }
      }
    };
    xhr.send(null);
  }

  Loader.prototype.parse = function(lang, currHref, data, cb) {
    if ('object' != typeof data) {
      cb(new Error('A file couldn\'t be parsed as json.'))
      return
    }

    // Check if lang exists
    if (!data[lang]) {
      // lang not found
      // This may be due to formatting (expected 'ru' but browser sent 'ru-RU')
      // Set err msg before mutating lang (we may need this later)
      var msg = 'Couldn\'t find translations for ' + lang;

      // Check for '-' ('ROOT-VARIANT')
      if (lang.indexOf('-') > -1) {
        // ROOT-VARIANT formatting detected
        lang = lang.split('-')[0]; // set lang to ROOT lang
      }

      // Check if ROOT lang exists (e.g 'ru')
      if (!data[lang]) {
        // ROOT lang not found. (e.g 'zh')
        // Loop through langs data. Maybe we have a variant? e.g (zh-hans)
        var l; // langs item. Declare outside of loop

        for (l in data) {
          // Is not ROOT?
          // And index of ROOT equals 0?
          // And is known lang?
          if (lang != l && l.indexOf(lang) === 0 && data[l]) {
            lang = l; // set lang to ROOT-VARIANT (e.g 'zh-hans')
            break;
          }
        }

        // Did we find a variant? If not, return err.
        if (lang != l) {
          return cb(new Error(msg));
        }
      }
    }

    if ('string' == typeof data[lang]) {
      // Import rule

      // absolute path
      var importUrl = data[lang]

      // relative path
      if(data[lang].indexOf("http") != 0 && data[lang].indexOf("/") != 0) {
        importUrl = currHref+"/../"+data[lang]
      }

      this.fetch(importUrl, lang, cb)
      return
    }

    if ('object' != typeof data[lang]) {
      cb(new Error('Translations should be specified as JSON objects!'))
      return
    }

    this.langs[lang] = data[lang]
    // TODO: Also store accompanying langs
    cb()
  }


  /**
   * The html10n object
   */
  var html10n =
  { language : null
  }
  MicroEvent.mixin(html10n)

  html10n.macros = {}

  html10n.rtl = ["ar","dv","fa","ha","he","ks","ku","ps","ur","yi"]

  /**
   * Get rules for plural forms (shared with JetPack), see:
   * http://unicode.org/repos/cldr-tmp/trunk/diff/supplemental/language_plural_rules.html
   * https://github.com/mozilla/addon-sdk/blob/master/python-lib/plural-rules-generator.p
   *
   * @param {string} lang
   *    locale (language) used.
   *
   * @return {Function}
   *    returns a function that gives the plural form name for a given integer:
   *       var fun = getPluralRules('en');
   *       fun(1)    -> 'one'
   *       fun(0)    -> 'other'
   *       fun(1000) -> 'other'.
   */
  function getPluralRules(lang) {
    var locales2rules = {
      'af': 3,
      'ak': 4,
      'am': 4,
      'ar': 1,
      'asa': 3,
      'az': 0,
      'be': 11,
      'bem': 3,
      'bez': 3,
      'bg': 3,
      'bh': 4,
      'bm': 0,
      'bn': 3,
      'bo': 0,
      'br': 20,
      'brx': 3,
      'bs': 11,
      'ca': 3,
      'cgg': 3,
      'chr': 3,
      'cs': 12,
      'cy': 17,
      'da': 3,
      'de': 3,
      'dv': 3,
      'dz': 0,
      'ee': 3,
      'el': 3,
      'en': 3,
      'eo': 3,
      'es': 3,
      'et': 3,
      'eu': 3,
      'fa': 0,
      'ff': 5,
      'fi': 3,
      'fil': 4,
      'fo': 3,
      'fr': 5,
      'fur': 3,
      'fy': 3,
      'ga': 8,
      'gd': 24,
      'gl': 3,
      'gsw': 3,
      'gu': 3,
      'guw': 4,
      'gv': 23,
      'ha': 3,
      'haw': 3,
      'he': 2,
      'hi': 4,
      'hr': 11,
      'hu': 0,
      'id': 0,
      'ig': 0,
      'ii': 0,
      'is': 3,
      'it': 3,
      'iu': 7,
      'ja': 0,
      'jmc': 3,
      'jv': 0,
      'ka': 0,
      'kab': 5,
      'kaj': 3,
      'kcg': 3,
      'kde': 0,
      'kea': 0,
      'kk': 3,
      'kl': 3,
      'km': 0,
      'kn': 0,
      'ko': 0,
      'ksb': 3,
      'ksh': 21,
      'ku': 3,
      'kw': 7,
      'lag': 18,
      'lb': 3,
      'lg': 3,
      'ln': 4,
      'lo': 0,
      'lt': 10,
      'lv': 6,
      'mas': 3,
      'mg': 4,
      'mk': 16,
      'ml': 3,
      'mn': 3,
      'mo': 9,
      'mr': 3,
      'ms': 0,
      'mt': 15,
      'my': 0,
      'nah': 3,
      'naq': 7,
      'nb': 3,
      'nd': 3,
      'ne': 3,
      'nl': 3,
      'nn': 3,
      'no': 3,
      'nr': 3,
      'nso': 4,
      'ny': 3,
      'nyn': 3,
      'om': 3,
      'or': 3,
      'pa': 3,
      'pap': 3,
      'pl': 13,
      'ps': 3,
      'pt': 3,
      'rm': 3,
      'ro': 9,
      'rof': 3,
      'ru': 11,
      'rwk': 3,
      'sah': 0,
      'saq': 3,
      'se': 7,
      'seh': 3,
      'ses': 0,
      'sg': 0,
      'sh': 11,
      'shi': 19,
      'sk': 12,
      'sl': 14,
      'sma': 7,
      'smi': 7,
      'smj': 7,
      'smn': 7,
      'sms': 7,
      'sn': 3,
      'so': 3,
      'sq': 3,
      'sr': 11,
      'ss': 3,
      'ssy': 3,
      'st': 3,
      'sv': 3,
      'sw': 3,
      'syr': 3,
      'ta': 3,
      'te': 3,
      'teo': 3,
      'th': 0,
      'ti': 4,
      'tig': 3,
      'tk': 3,
      'tl': 4,
      'tn': 3,
      'to': 0,
      'tr': 0,
      'ts': 3,
      'tzm': 22,
      'uk': 11,
      'ur': 3,
      've': 3,
      'vi': 0,
      'vun': 3,
      'wa': 4,
      'wae': 3,
      'wo': 0,
      'xh': 3,
      'xog': 3,
      'yo': 0,
      'zh': 0,
      'zu': 3
    };

    // utility functions for plural rules methods
    function isIn(n, list) {
      return list.indexOf(n) !== -1;
    }
    function isBetween(n, start, end) {
      return start <= n && n <= end;
    }

    // list of all plural rules methods:
    // map an integer to the plural form name to use
    var pluralRules = {
      '0': function(n) {
        return 'other';
      },
      '1': function(n) {
        if ((isBetween((n % 100), 3, 10)))
          return 'few';
        if (n === 0)
          return 'zero';
        if ((isBetween((n % 100), 11, 99)))
          return 'many';
        if (n == 2)
          return 'two';
        if (n == 1)
          return 'one';
        return 'other';
      },
      '2': function(n) {
        if (n !== 0 && (n % 10) === 0)
          return 'many';
        if (n == 2)
          return 'two';
        if (n == 1)
          return 'one';
        return 'other';
      },
      '3': function(n) {
        if (n == 1)
          return 'one';
        return 'other';
      },
      '4': function(n) {
        if ((isBetween(n, 0, 1)))
          return 'one';
        return 'other';
      },
      '5': function(n) {
        if ((isBetween(n, 0, 2)) && n != 2)
          return 'one';
        return 'other';
      },
      '6': function(n) {
        if (n === 0)
          return 'zero';
        if ((n % 10) == 1 && (n % 100) != 11)
          return 'one';
        return 'other';
      },
      '7': function(n) {
        if (n == 2)
          return 'two';
        if (n == 1)
          return 'one';
        return 'other';
      },
      '8': function(n) {
        if ((isBetween(n, 3, 6)))
          return 'few';
        if ((isBetween(n, 7, 10)))
          return 'many';
        if (n == 2)
          return 'two';
        if (n == 1)
          return 'one';
        return 'other';
      },
      '9': function(n) {
        if (n === 0 || n != 1 && (isBetween((n % 100), 1, 19)))
          return 'few';
        if (n == 1)
          return 'one';
        return 'other';
      },
      '10': function(n) {
        if ((isBetween((n % 10), 2, 9)) && !(isBetween((n % 100), 11, 19)))
          return 'few';
        if ((n % 10) == 1 && !(isBetween((n % 100), 11, 19)))
          return 'one';
        return 'other';
      },
      '11': function(n) {
        if ((isBetween((n % 10), 2, 4)) && !(isBetween((n % 100), 12, 14)))
          return 'few';
        if ((n % 10) === 0 ||
            (isBetween((n % 10), 5, 9)) ||
            (isBetween((n % 100), 11, 14)))
          return 'many';
        if ((n % 10) == 1 && (n % 100) != 11)
          return 'one';
        return 'other';
      },
      '12': function(n) {
        if ((isBetween(n, 2, 4)))
          return 'few';
        if (n == 1)
          return 'one';
        return 'other';
      },
      '13': function(n) {
        if ((isBetween((n % 10), 2, 4)) && !(isBetween((n % 100), 12, 14)))
          return 'few';
        if (n != 1 && (isBetween((n % 10), 0, 1)) ||
            (isBetween((n % 10), 5, 9)) ||
            (isBetween((n % 100), 12, 14)))
          return 'many';
        if (n == 1)
          return 'one';
        return 'other';
      },
      '14': function(n) {
        if ((isBetween((n % 100), 3, 4)))
          return 'few';
        if ((n % 100) == 2)
          return 'two';
        if ((n % 100) == 1)
          return 'one';
        return 'other';
      },
      '15': function(n) {
        if (n === 0 || (isBetween((n % 100), 2, 10)))
          return 'few';
        if ((isBetween((n % 100), 11, 19)))
          return 'many';
        if (n == 1)
          return 'one';
        return 'other';
      },
      '16': function(n) {
        if ((n % 10) == 1 && n != 11)
          return 'one';
        return 'other';
      },
      '17': function(n) {
        if (n == 3)
          return 'few';
        if (n === 0)
          return 'zero';
        if (n == 6)
          return 'many';
        if (n == 2)
          return 'two';
        if (n == 1)
          return 'one';
        return 'other';
      },
      '18': function(n) {
        if (n === 0)
          return 'zero';
        if ((isBetween(n, 0, 2)) && n !== 0 && n != 2)
          return 'one';
        return 'other';
      },
      '19': function(n) {
        if ((isBetween(n, 2, 10)))
          return 'few';
        if ((isBetween(n, 0, 1)))
          return 'one';
        return 'other';
      },
      '20': function(n) {
        if ((isBetween((n % 10), 3, 4) || ((n % 10) == 9)) && !(
            isBetween((n % 100), 10, 19) ||
            isBetween((n % 100), 70, 79) ||
            isBetween((n % 100), 90, 99)
            ))
          return 'few';
        if ((n % 1000000) === 0 && n !== 0)
          return 'many';
        if ((n % 10) == 2 && !isIn((n % 100), [12, 72, 92]))
          return 'two';
        if ((n % 10) == 1 && !isIn((n % 100), [11, 71, 91]))
          return 'one';
        return 'other';
      },
      '21': function(n) {
        if (n === 0)
          return 'zero';
        if (n == 1)
          return 'one';
        return 'other';
      },
      '22': function(n) {
        if ((isBetween(n, 0, 1)) || (isBetween(n, 11, 99)))
          return 'one';
        return 'other';
      },
      '23': function(n) {
        if ((isBetween((n % 10), 1, 2)) || (n % 20) === 0)
          return 'one';
        return 'other';
      },
      '24': function(n) {
        if ((isBetween(n, 3, 10) || isBetween(n, 13, 19)))
          return 'few';
        if (isIn(n, [2, 12]))
          return 'two';
        if (isIn(n, [1, 11]))
          return 'one';
        return 'other';
      }
    };

    // return a function that gives the plural form name for a given integer
    var index = locales2rules[lang.replace(/-.*$/, '')];
    if (!(index in pluralRules)) {
      console.warn('plural form unknown for [' + lang + ']');
      return function() { return 'other'; };
    }
    return pluralRules[index];
  }

  /**
   * pre-defined 'plural' macro
   */
  html10n.macros.plural = function(key, param, opts) {
    var str
      , n = parseFloat(param);
    if (isNaN(n))
      return;

    // initialize _pluralRules
    if (!this._pluralRules)
      this._pluralRules = getPluralRules(html10n.language);
    var index = this._pluralRules(n);

    // try to find a [zero|one|two] key if it's defined
    if (n === 0 && ('zero') in opts) {
      str = opts['zero'];
    } else if (n == 1 && ('one') in opts) {
      str = opts['one'];
    } else if (n == 2 && ('two') in opts) {
      str = opts['two'];
    } else if (index in opts) {
      str = opts[index];
    }

    return str;
  };

  /**
   * Localize a document
   * @param langs An array of lang codes defining fallbacks
   */
  html10n.localize = function(langs) {
    var that = this
    // if only one string => create an array
    if ('string' == typeof langs) langs = [langs]

    // Expand two-part locale specs
    var i=0
    langs.forEach(function(lang) {
      if(!lang) return;
      langs[i++] = lang;
      if(~lang.indexOf('-')) langs[i++] = lang.substr(0, lang.indexOf('-'));
    })

    this.build(langs, function(er, translations) {
      html10n.translations = translations
      html10n.translateElement(translations)
      that.trigger('localized')
    })
  }

  /**
   * Triggers the translation process
   * for an element
   * @param translations A hash of all translation strings
   * @param element A DOM element, if omitted, the document element will be used
   */
  html10n.translateElement = function(translations, element) {
    element = element || document.documentElement

    var children = element? getTranslatableChildren(element) : document.childNodes;
    for (var i=0, n=children.length; i < n; i++) {
      this.translateNode(translations, children[i])
    }

    // translate element itself if necessary
    this.translateNode(translations, element)
  }

  function asyncForEach(list, iterator, cb) {
    var i = 0
      , n = list.length
    iterator(list[i], i, function each(err) {
      if(err) console.error(err)
      i++
      if (i < n) return iterator(list[i],i, each);
      cb()
    })
  }

  function getTranslatableChildren(element) {
    if(!document.querySelectorAll) {
      if (!element) return []
      var nodes = element.getElementsByTagName('*')
        , l10nElements = []
      for (var i=0, n=nodes.length; i < n; i++) {
        if (nodes[i].getAttribute('data-l10n-id'))
          l10nElements.push(nodes[i]);
      }
      return l10nElements
    }
    return element.querySelectorAll('*[data-l10n-id]')
  }

  html10n.get = function(id, args) {
    var translations = html10n.translations
    if(!translations) return console.warn('No translations available (yet)')
    if(!translations[id]) return console.warn('Could not find string '+id)

    // apply macros
    var str = translations[id]

    str = substMacros(id, str, args)

    // apply args
    str = substArguments(str, args)

    return str
  }

  // replace {{arguments}} with their values or the
  // associated translation string (based on its key)
  function substArguments(str, args) {
    var reArgs = /\{\{\s*([a-zA-Z\.]+)\s*\}\}/
      , match

    while (match = reArgs.exec(str)) {
      if (!match || match.length < 2)
        return str // argument key not found

      var arg = match[1]
        , sub = ''
      if (arg in args) {
        sub = args[arg]
      } else if (arg in translations) {
        sub = translations[arg]
      } else {
        console.warn('Could not find argument {{' + arg + '}}')
        return str
      }

      str = str.substring(0, match.index) + sub + str.substr(match.index + match[0].length)
    }

    return str
  }

  // replace {[macros]} with their values
  function substMacros(key, str, args) {
    var regex = /\{\[\s*([a-zA-Z]+)\(([a-zA-Z]+)\)((\s*([a-zA-Z]+)\: ?([ a-zA-Z{}]+),?)+)*\s*\]\}/ //.exec('{[ plural(n) other: are {{n}}, one: is ]}')
      , match

    while(match = regex.exec(str)) {
      // a macro has been found
      // Note: at the moment, only one parameter is supported
      var macroName = match[1]
        , paramName = match[2]
        , optv = match[3]
        , opts = {}

      if (!(macroName in html10n.macros)) continue

      if(optv) {
        optv.match(/(?=\s*)([a-zA-Z]+)\: ?([ a-zA-Z{}]+)(?=,?)/g).forEach(function(arg) {
          var parts = arg.split(':')
            , name = parts[0]
            , value = parts[1].trim()
          opts[name] = value
        })
      }

      var param
      if (args && paramName in args) {
        param = args[paramName]
      } else if (paramName in html10n.translations) {
        param = translations[paramName]
      }

      // there's no macro parser: it has to be defined in html10n.macros
      var macro = html10n.macros[macroName]
      str = str.substr(0, match.index) + macro(key, param, opts) + str.substr(match.index+match[0].length)
    }

    return str
  }

  /**
   * Applies translations to a DOM node (recursive)
   */
  html10n.translateNode = function(translations, node) {
    var str = {}

    // get id
    str.id = node.getAttribute('data-l10n-id')
    if (!str.id) return

    if(!translations[str.id]) return console.warn('Couldn\'t find translation key '+str.id)

    // get args
    if(window.JSON) {
      str.args = JSON.parse(node.getAttribute('data-l10n-args'))
    }else{
      try{
        str.args = eval(node.getAttribute('data-l10n-args'))
      }catch(e) {
        console.warn('Couldn\'t parse args for '+str.id)
      }
    }

    str.str = html10n.get(str.id, str.args)

    // get attribute name to apply str to
    var prop
      , index = str.id.lastIndexOf('.')
      , attrList = // allowed attributes
       { "title": 1
       , "innerHTML": 1
       , "alt": 1
       , "textContent": 1
       , "value": 1
       , "placeholder": 1
       }
    if (index > 0 && str.id.substr(index + 1) in attrList) {
      // an attribute has been specified (example: "my_translation_key.placeholder")
      prop = str.id.substr(index + 1)
    } else { // no attribute: assuming text content by default
      prop = document.body.textContent ? 'textContent' : 'innerText'
    }

    // Apply translation
    if (node.children.length === 0 || prop != 'textContent') {
      node[prop] = str.str
      node.setAttribute("aria-label", str.str); // Sets the aria-label
      // The idea of the above is that we always have an aria value
      // This might be a bit of an abrupt solution but let's see how it goes
    } else {
      var children = node.childNodes,
          found = false
      for (var i=0, n=children.length; i < n; i++) {
        if (children[i].nodeType === 3 && /\S/.test(children[i].textContent)) {
          if (!found) {
            children[i].nodeValue = str.str
            found = true
          } else {
            children[i].nodeValue = ''
          }
        }
      }
      if (!found) {
        console.warn('Unexpected error: could not translate element content for key '+str.id, node)
      }
    }
  }

  /**
   * Builds a translation object from a list of langs (loads the necessary translations)
   * @param langs Array - a list of langs sorted by priority (default langs should go last)
   */
  html10n.build = function(langs, cb) {
    var that = this
      , build = {}

    asyncForEach(langs, function (lang, i, next) {
      if(!lang) return next();
      that.loader.load(lang, next)
    }, function() {
      var lang
      langs.reverse()

      // loop through the priority array...
      for (var i=0, n=langs.length; i < n; i++) {
        lang = langs[i]

        if(!lang) continue;
        if(!(lang in that.loader.langs)) {// uh, we don't have this lang availbable..
          // then check for related langs
          if(~lang.indexOf('-')) lang = lang.split('-')[0];
          for(var l in that.loader.langs) {
            if(lang != l && l.indexOf(lang) === 0) {
              lang = l
              break;
            }
          }
          if(lang != l) continue;
        }

        // ... and apply all strings of the current lang in the list
        // to our build object
        for (var string in that.loader.langs[lang]) {
          build[string] = that.loader.langs[lang][string]
        }

        // the last applied lang will be exposed as the
        // lang the page was translated to
        that.language = lang
      }
      cb(null, build)
    })
  }

  /**
   * Returns the language that was last applied to the translations hash
   * thus overriding most of the formerly applied langs
   */
  html10n.getLanguage = function() {
    return this.language;
  }

  /**
   * Returns the direction of the language returned be html10n#getLanguage
   */
  html10n.getDirection = function() {
    if(!this.language) return
    var langCode = this.language.indexOf('-') == -1? this.language : this.language.substr(0, this.language.indexOf('-'))
    return html10n.rtl.indexOf(langCode) == -1? 'ltr' : 'rtl'
  }

  /**
   * Index all <link>s
   */
  html10n.index = function () {
    // Find all <link>s
    var links = document.getElementsByTagName('link')
       , resources = []
    for (var i=0, n=links.length; i < n; i++) {
      if (links[i].type != 'application/l10n+json')
        continue;
      resources.push(links[i].href)
    }
    this.loader = new Loader(resources)
    this.trigger('indexed')
  }

  if (document.addEventListener) // modern browsers and IE9+
   document.addEventListener('DOMContentLoaded', function() {
     html10n.index()
   }, false)
  else if (window.attachEvent)
    window.attachEvent('onload', function() {
     html10n.index()
   }, false)

  // gettext-like shortcut
  if (window._ === undefined)
    window._ = html10n.get;

  return html10n
})(window, document)
