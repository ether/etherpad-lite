/**
 * This code is mostly from the old Etherpad. Please help us to comment this code.
 * This helps other people to understand this code better and helps them to improve it.
 * TL;DR COMMENTS ON THIS FILE ARE HIGHLY APPRECIATED
 */

// THIS FILE IS ALSO AN APPJET MODULE: etherpad.collab.ace.linestylefilter
// %APPJET%: import("etherpad.collab.ace.easysync2.Changeset");
// %APPJET%: import("etherpad.admin.plugins");
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

// requires: easysync2.Changeset
// requires: top
// requires: plugins
// requires: undefined

const Changeset = require('./Changeset');
const hooks = require('./pluginfw/hooks');
const linestylefilter = {};
const _ = require('./underscore');
const AttributeManager = require('./AttributeManager');

linestylefilter.ATTRIB_CLASSES = {
  bold: 'tag:b',
  italic: 'tag:i',
  underline: 'tag:u',
  strikethrough: 'tag:s',
};

const lineAttributeMarker = 'lineAttribMarker';
exports.lineAttributeMarker = lineAttributeMarker;

linestylefilter.getAuthorClassName = function (author) {
  return `author-${author.replace(/[^a-y0-9]/g, (c) => {
    if (c == '.') return '-';
    return `z${c.charCodeAt(0)}z`;
  })}`;
};

// lineLength is without newline; aline includes newline,
// but may be falsy if lineLength == 0
linestylefilter.getLineStyleFilter = function (lineLength, aline, textAndClassFunc, apool) {
  // Plugin Hook to add more Attrib Classes
  for (const attribClasses of hooks.callAll('aceAttribClasses', linestylefilter.ATTRIB_CLASSES)) {
    Object.assign(linestylefilter.ATTRIB_CLASSES, attribClasses);
  }

  if (lineLength == 0) return textAndClassFunc;

  const nextAfterAuthorColors = textAndClassFunc;

  const authorColorFunc = (function () {
    const lineEnd = lineLength;
    let curIndex = 0;
    let extraClasses;
    let leftInAuthor;

    function attribsToClasses(attribs) {
      let classes = '';
      let isLineAttribMarker = false;

      // For each attribute number
      Changeset.eachAttribNumber(attribs, (n) => {
        // Give us this attributes key
        const key = apool.getAttribKey(n);
        if (key) {
          const value = apool.getAttribValue(n);
          if (value) {
            if (!isLineAttribMarker && _.indexOf(AttributeManager.lineAttributes, key) >= 0) {
              isLineAttribMarker = true;
            }
            if (key == 'author') {
              classes += ` ${linestylefilter.getAuthorClassName(value)}`;
            } else if (key == 'list') {
              classes += ` list:${value}`;
            } else if (key == 'start') {
              // Needed to introduce the correct Ordered list item start number on import
              classes += ` start:${value}`;
            } else if (linestylefilter.ATTRIB_CLASSES[key]) {
              classes += ` ${linestylefilter.ATTRIB_CLASSES[key]}`;
            } else {
              classes += hooks.callAllStr('aceAttribsToClasses', {
                linestylefilter,
                key,
                value,
              }, ' ', ' ', '');
            }
          }
        }
      });

      if (isLineAttribMarker) classes += ` ${lineAttributeMarker}`;
      return classes.substring(1);
    }

    const attributionIter = Changeset.opIterator(aline);
    let nextOp, nextOpClasses;

    function goNextOp() {
      nextOp = attributionIter.next();
      nextOpClasses = (nextOp.opcode && attribsToClasses(nextOp.attribs));
    }
    goNextOp();

    function nextClasses() {
      if (curIndex < lineEnd) {
        extraClasses = nextOpClasses;
        leftInAuthor = nextOp.chars;
        goNextOp();
        while (nextOp.opcode && nextOpClasses == extraClasses) {
          leftInAuthor += nextOp.chars;
          goNextOp();
        }
      }
    }
    nextClasses();

    return function (txt, cls) {
      const disableAuthColorForThisLine = hooks.callAll('disableAuthorColorsForThisLine', {
        linestylefilter,
        text: txt,
        class: cls,
      }, ' ', ' ', '');
      const disableAuthors = (disableAuthColorForThisLine == null || disableAuthColorForThisLine.length == 0) ? false : disableAuthColorForThisLine[0];
      while (txt.length > 0) {
        if (leftInAuthor <= 0 || disableAuthors) {
          // prevent infinite loop if something funny's going on
          return nextAfterAuthorColors(txt, cls);
        }
        let spanSize = txt.length;
        if (spanSize > leftInAuthor) {
          spanSize = leftInAuthor;
        }
        const curTxt = txt.substring(0, spanSize);
        txt = txt.substring(spanSize);
        nextAfterAuthorColors(curTxt, (cls && `${cls} `) + extraClasses);
        curIndex += spanSize;
        leftInAuthor -= spanSize;
        if (leftInAuthor == 0) {
          nextClasses();
        }
      }
    };
  })();
  return authorColorFunc;
};

linestylefilter.getAtSignSplitterFilter = function (lineText, textAndClassFunc) {
  const at = /@/g;
  at.lastIndex = 0;
  let splitPoints = null;
  let execResult;
  while ((execResult = at.exec(lineText))) {
    if (!splitPoints) {
      splitPoints = [];
    }
    splitPoints.push(execResult.index);
  }

  if (!splitPoints) return textAndClassFunc;

  return linestylefilter.textAndClassFuncSplitter(textAndClassFunc, splitPoints);
};

linestylefilter.getRegexpFilter = function (regExp, tag) {
  return function (lineText, textAndClassFunc) {
    regExp.lastIndex = 0;
    let regExpMatchs = null;
    let splitPoints = null;
    let execResult;
    while ((execResult = regExp.exec(lineText))) {
      if (!regExpMatchs) {
        regExpMatchs = [];
        splitPoints = [];
      }
      const startIndex = execResult.index;
      const regExpMatch = execResult[0];
      regExpMatchs.push([startIndex, regExpMatch]);
      splitPoints.push(startIndex, startIndex + regExpMatch.length);
    }

    if (!regExpMatchs) return textAndClassFunc;

    function regExpMatchForIndex(idx) {
      for (let k = 0; k < regExpMatchs.length; k++) {
        const u = regExpMatchs[k];
        if (idx >= u[0] && idx < u[0] + u[1].length) {
          return u[1];
        }
      }
      return false;
    }

    const handleRegExpMatchsAfterSplit = (function () {
      let curIndex = 0;
      return function (txt, cls) {
        const txtlen = txt.length;
        let newCls = cls;
        const regExpMatch = regExpMatchForIndex(curIndex);
        if (regExpMatch) {
          newCls += ` ${tag}:${regExpMatch}`;
        }
        textAndClassFunc(txt, newCls);
        curIndex += txtlen;
      };
    })();

    return linestylefilter.textAndClassFuncSplitter(handleRegExpMatchsAfterSplit, splitPoints);
  };
};


linestylefilter.REGEX_WORDCHAR = /[\u0030-\u0039\u0041-\u005A\u0061-\u007A\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u00FF\u0100-\u1FFF\u3040-\u9FFF\uF900-\uFDFF\uFE70-\uFEFE\uFF10-\uFF19\uFF21-\uFF3A\uFF41-\uFF5A\uFF66-\uFFDC]/;
linestylefilter.REGEX_URLCHAR = new RegExp(`(${/[-:@a-zA-Z0-9_.,~%+\/\\?=&#!;()$]/.source}|${linestylefilter.REGEX_WORDCHAR.source})`);
linestylefilter.REGEX_URL = new RegExp(`${/(?:(?:https?|s?ftp|ftps|file|nfs):\/\/|(about|geo|mailto|tel):|www\.)/.source + linestylefilter.REGEX_URLCHAR.source}*(?![:.,;])${linestylefilter.REGEX_URLCHAR.source}`, 'g');
linestylefilter.getURLFilter = linestylefilter.getRegexpFilter(
    linestylefilter.REGEX_URL, 'url');

linestylefilter.textAndClassFuncSplitter = function (func, splitPointsOpt) {
  let nextPointIndex = 0;
  let idx = 0;

  // don't split at 0
  while (splitPointsOpt && nextPointIndex < splitPointsOpt.length && splitPointsOpt[nextPointIndex] == 0) {
    nextPointIndex++;
  }

  function spanHandler(txt, cls) {
    if ((!splitPointsOpt) || nextPointIndex >= splitPointsOpt.length) {
      func(txt, cls);
      idx += txt.length;
    } else {
      const splitPoints = splitPointsOpt;
      const pointLocInSpan = splitPoints[nextPointIndex] - idx;
      const txtlen = txt.length;
      if (pointLocInSpan >= txtlen) {
        func(txt, cls);
        idx += txt.length;
        if (pointLocInSpan == txtlen) {
          nextPointIndex++;
        }
      } else {
        if (pointLocInSpan > 0) {
          func(txt.substring(0, pointLocInSpan), cls);
          idx += pointLocInSpan;
        }
        nextPointIndex++;
        // recurse
        spanHandler(txt.substring(pointLocInSpan), cls);
      }
    }
  }
  return spanHandler;
};

linestylefilter.getFilterStack = function (lineText, textAndClassFunc, abrowser) {
  let func = linestylefilter.getURLFilter(lineText, textAndClassFunc);

  const hookFilters = hooks.callAll('aceGetFilterStack', {
    linestylefilter,
    browser: abrowser,
  });
  _.map(hookFilters, (hookFilter) => {
    func = hookFilter(lineText, func);
  });

  if (abrowser !== undefined && abrowser.msie) {
    // IE7+ will take an e-mail address like <foo@bar.com> and linkify it to foo@bar.com.
    // We then normalize it back to text with no angle brackets.  It's weird.  So always
    // break spans at an "at" sign.
    func = linestylefilter.getAtSignSplitterFilter(
        lineText, func);
  }
  return func;
};

// domLineObj is like that returned by domline.createDomLine
linestylefilter.populateDomLine = function (textLine, aline, apool, domLineObj) {
  // remove final newline from text if any
  let text = textLine;
  if (text.slice(-1) == '\n') {
    text = text.substring(0, text.length - 1);
  }

  function textAndClassFunc(tokenText, tokenClass) {
    domLineObj.appendSpan(tokenText, tokenClass);
  }

  let func = linestylefilter.getFilterStack(text, textAndClassFunc);
  func = linestylefilter.getLineStyleFilter(text.length, aline, func, apool);
  func(text, '');
};

exports.linestylefilter = linestylefilter;
