'use strict';

/**
 * This code is mostly from the old Etherpad. Please help us to comment this code.
 * This helps other people to understand this code better and helps them to improve it.
 * TL;DR COMMENTS ON THIS FILE ARE HIGHLY APPRECIATED
 */

// THIS FILE IS ALSO AN APPJET MODULE: etherpad.collab.ace.linestylefilter
// %APPJET%: import("etherpad.collab.ace.easysync2.Changeset");
// %APPJET%: import("etherpad.admin.plugins");
import AttributePool from "./AttributePool";

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
const attributes = require('./attributes');
const hooks = require('./pluginfw/hooks');
const linestylefilter = {};
import AttributeManager from "./AttributeManager";
import {padUtils as padutils} from "./pad_utils";
import {Attribute} from "./types/Attribute";
import Op from "./Op";

type DomLineObject = {
  appendSpan(tokenText: string, tokenClass:string):void
}

class Linestylefilter {
   ATTRIB_CLASSES: {
     [key: string]: string
   } = {
    bold: 'tag:b',
    italic: 'tag:i',
    underline: 'tag:u',
    strikethrough: 'tag:s',
  }
  getAuthorClassName = (author: string) => `author-${author.replace(/[^a-y0-9]/g, (c) => {
    if (c === '.') return '-';
    return `z${c.charCodeAt(0)}z`;
  })}`

  // lineLength is without newline; aline includes newline,
// but may be falsy if lineLength == 0
  getLineStyleFilter = (lineLength: number, aline: string, textAndClassFunc: Function, apool: AttributePool) => {
    // Plugin Hook to add more Attrib Classes
    for (const attribClasses of hooks.callAll('aceAttribClasses', this.ATTRIB_CLASSES)) {
      Object.assign(this.ATTRIB_CLASSES, attribClasses);
    }

    if (lineLength === 0) return textAndClassFunc;

    const nextAfterAuthorColors = textAndClassFunc;

    const authorColorFunc = (() => {
      const lineEnd = lineLength;
      let curIndex = 0;
      let extraClasses: string;
      let leftInAuthor: number;

      const attribsToClasses = (attribs: string) => {
        let classes = '';
        let isLineAttribMarker = false;

        for (const [key, value] of attributes.attribsFromString(attribs, apool)) {
          if (!key || !value) continue;
          if (!isLineAttribMarker && AttributeManager.lineAttributes.indexOf(key) >= 0) {
            isLineAttribMarker = true;
          }
          if (key === 'author') {
            classes += ` ${this.getAuthorClassName(value)}`;
          } else if (key === 'list') {
            classes += ` list:${value}`;
          } else if (key === 'start') {
            // Needed to introduce the correct Ordered list item start number on import
            classes += ` start:${value}`;
          } else if (this.ATTRIB_CLASSES[key]) {
            classes += ` ${this.ATTRIB_CLASSES[key]}`;
          } else {
            const results = hooks.callAll('aceAttribsToClasses', {linestylefilter, key, value});
            classes += ` ${results.join(' ')}`;
          }
        }

        if (isLineAttribMarker) classes += ` ${lineAttributeMarker}`;
        return classes.substring(1);
      };

      const attrOps = Changeset.deserializeOps(aline);
      let attrOpsNext = attrOps.next();
      let nextOp: Op, nextOpClasses: string;

      const goNextOp = () => {
        nextOp = attrOpsNext.done ? new Changeset.Op() : attrOpsNext.value;
        if (!attrOpsNext.done) attrOpsNext = attrOps.next();
        nextOpClasses = (nextOp.opcode && attribsToClasses(nextOp.attribs));
      };
      goNextOp();

      const nextClasses = () => {
        if (curIndex < lineEnd) {
          extraClasses = nextOpClasses;
          leftInAuthor = nextOp.chars;
          goNextOp();
          while (nextOp.opcode && nextOpClasses === extraClasses) {
            leftInAuthor += nextOp.chars;
            goNextOp();
          }
        }
      };
      nextClasses();

      return (txt: string, cls: string) => {
        const disableAuthColorForThisLine = hooks.callAll('disableAuthorColorsForThisLine', {
          linestylefilter,
          text: txt,
          class: cls,
        });
        const disableAuthors = (disableAuthColorForThisLine == null ||
          disableAuthColorForThisLine.length === 0) ? false : disableAuthColorForThisLine[0];
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
          if (leftInAuthor === 0) {
            nextClasses();
          }
        }
      };
    })();
    return authorColorFunc;
  }

getAtSignSplitterFilter = (lineText: string, textAndClassFunc: Function) => {
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

    return this.textAndClassFuncSplitter(textAndClassFunc, splitPoints);
  }

  getRegexpFilter = (regExp: RegExp, tag: string) => (lineText: string, textAndClassFunc: Function) => {
    regExp.lastIndex = 0;
    let regExpMatchs = null;
    let splitPoints: number[]|null = null;
    let execResult;
    while ((execResult = regExp.exec(lineText))) {
      if (!regExpMatchs) {
        regExpMatchs = [];
        splitPoints = [];
      }
      const startIndex = execResult.index;
      const regExpMatch = execResult[0];
      regExpMatchs.push([startIndex, regExpMatch]);
      splitPoints!.push(startIndex, startIndex + regExpMatch.length);
    }

    if (!regExpMatchs) return textAndClassFunc;

    const regExpMatchForIndex = (idx: number) => {
      for (let k = 0; k < regExpMatchs.length; k++) {
        const u = regExpMatchs[k] as number[];
        // @ts-ignore
        if (idx >= u[0] && idx < u[0] + u[1].length) {
          return u[1];
        }
      }
      return false;
    }

    const handleRegExpMatchsAfterSplit = (() => {
      let curIndex = 0;
      return (txt: string, cls: string) => {
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

    return this.textAndClassFuncSplitter(handleRegExpMatchsAfterSplit, splitPoints!);
  }
  getURLFilter = this.getRegexpFilter(padutils.urlRegex, 'url')
  textAndClassFuncSplitter = (func: Function, splitPointsOpt: number[]) => {
    let nextPointIndex = 0;
    let idx = 0;

    // don't split at 0
    while (splitPointsOpt &&
    nextPointIndex < splitPointsOpt.length &&
    splitPointsOpt[nextPointIndex] === 0) {
      nextPointIndex++;
    }

    const spanHandler = (txt: string, cls: string) => {
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
          if (pointLocInSpan === txtlen) {
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
    };
    return spanHandler;
  }
  getFilterStack = (lineText: string, textAndClassFunc: Function, abrowser?:(tokenText: string, tokenClass: string)=>void) => {
    let func = this.getURLFilter(lineText, textAndClassFunc);

    const hookFilters = hooks.callAll('aceGetFilterStack', {
      linestylefilter,
      browser: abrowser,
    });
    hookFilters.map((hookFilter: (arg0: string, arg1: Function) => Function) => {
      func = hookFilter(lineText, func);
    });

    return func;
  }

  // domLineObj is like that returned by domline.createDomLine
  populateDomLine = (textLine: string, aline: string, apool: AttributePool, domLineObj: DomLineObject) => {
    // remove final newline from text if any
    let text = textLine;
    if (text.slice(-1) === '\n') {
      text = text.substring(0, text.length - 1);
    }

    const textAndClassFunc = (tokenText: string, tokenClass: string) => {
      domLineObj.appendSpan(tokenText, tokenClass);
    };

    let func = this.getFilterStack(text, textAndClassFunc);
    func = this.getLineStyleFilter(text.length, aline, func, apool);
    func(text, '');
  };
}

export default new Linestylefilter()

export const lineAttributeMarker = 'lineAttribMarker';
