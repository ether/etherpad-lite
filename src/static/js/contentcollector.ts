'use strict';
/**
 * This code is mostly from the old Etherpad. Please help us to comment this code.
 * This helps other people to understand this code better and helps them to improve it.
 * TL;DR COMMENTS ON THIS FILE ARE HIGHLY APPRECIATED
 */

// THIS FILE IS ALSO AN APPJET MODULE: etherpad.collab.ace.contentcollector
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

const _MAX_LIST_LEVEL = 16;

import AttributeMap from './AttributeMap'
import UNorm from 'unorm'
import {MapArrayType} from "../../node/types/MapType";
import {SmartOpAssembler} from "./SmartOpAssembler";
import {Attribute} from "./types/Attribute";
import {Browser} from "@playwright/test";
import {BrowserDetector} from "./vendors/browser";
const Changeset = require('./Changeset');
const hooks = require('./pluginfw/hooks');

type Tag = {
  tagName: string

}

const sanitizeUnicode = (s: string) => UNorm.nfc(s);
const tagName = (n: Element) => n.tagName && n.tagName.toLowerCase();
// supportedElems are Supported natively within Etherpad and don't require a plugin
const supportedElems = new Set([
  'author',
  'b',
  'bold',
  'br',
  'div',
  'font',
  'i',
  'insertorder',
  'italic',
  'li',
  'lmkr',
  'ol',
  'p',
  'pre',
  'strong',
  's',
  'span',
  'u',
  'ul',
]);

type ContentElem = Element & {
  name?: string
}

class Lines {
  private textArray: string[] = [];
  private attribsArray: string[] = [];
  private attribsBuilder:SmartOpAssembler|null = null;
  private op = new Changeset.Op('+');


  length= () => this.textArray.length
  atColumnZero = () => this.textArray[this.textArray.length - 1] === ''
  startNew= () => {
    this.textArray.push('');
    this.flush(true);
    this.attribsBuilder = new SmartOpAssembler();
  }
  textOfLine= (i: number) => this.textArray[i]
  appendText= (txt: string, attrString = '') => {
    this.textArray[this.textArray.length - 1] += txt;
    this.op.attribs = attrString;
    this.op.chars = txt.length;
    this.attribsBuilder!.append(this.op);
  }
  textLines= () => this.textArray.slice()
  attribLines= () => this.attribsArray
  // call flush only when you're done
  flush= (_withNewline?: boolean) => {
    if (this.attribsBuilder) {
      this.attribsArray.push(this.attribsBuilder.toString());
      this.attribsBuilder = null;
}
}
}

type ContentCollectorState = {
  author?:string
  authorLevel?: number
  listNesting?: number
  lineAttributes: {
    list?: string,
    img?: string
    start?: number
  },
  start?: number
  flags: MapArrayType<number>,
  attribs: MapArrayType<number>
  attribString: string
  localAttribs: string[]|null,
  unsupportedElements: Set<string>
}

type ContentCollectorPoint = {
  index: number;
  node: Node
}

type ContentCollectorSel = {
  startPoint: ContentCollectorPoint
  endPoint: ContentCollectorPoint
}


class ContentCollector {
  private blockElems: MapArrayType<number>;
  private cc = {};
  private selection?: ContentCollectorSel
  private startPoint?: ContentCollectorPoint
  private endPoint?: ContentCollectorPoint;
  private selStart = [-1, -1];
  private selEnd = [-1, -1];
  private collectStyles: boolean;
  private apool: AttributePool;
  private className2Author?: (c: string) => string;
  private breakLine?: boolean
  private abrowser?: null|BrowserDetector;

  constructor(collectStyles: boolean, abrowser: null, apool: AttributePool, className2Author?: (c: string)=>string) {
    this.blockElems = {
      div: 1,
      p: 1,
      pre: 1,
      li: 1,
    }
    this.abrowser = abrowser
    this.collectStyles = collectStyles
    this.apool = apool
    this.className2Author = className2Author

    hooks.callAll('ccRegisterBlockElements').forEach((element: "div"|"p"|"pre"|"li") => {
      this.blockElems[element] = 1;
      supportedElems.add(element);
    })


  }
  isBlockElement = (n: Element) => !!this.blockElems[tagName(n) || ''];
  textify = (str: string) => sanitizeUnicode(
    str.replace(/(\n | \n)/g, ' ')
      .replace(/[\n\r ]/g, ' ')
      .replace(/\xa0/g, ' ')
      .replace(/\t/g, '        '))
  getAssoc = (node: MapArrayType<string>, name: string) => node[`_magicdom_${name}`];
  lines = (() => {
    const line = new Lines()
    line.startNew()
    return line;
  })();
  private ensureColumnZero = (state: ContentCollectorState|null) => {
    if (!this.lines.atColumnZero()) {
      this.startNewLine(state);
    }
  }
  private isEmpty = (node: Element, state?: ContentCollectorState) => {
    // consider clean blank lines pasted in IE to be empty
    if (node.childNodes.length === 0) return true;
    if (node.childNodes.length === 1 &&
      // @ts-ignore
      this.getAssoc(node, 'shouldBeEmpty') &&
      node.innerHTML === '&nbsp;' &&
      // @ts-ignore
      !this.getAssoc(node, 'unpasted')) {
      if (state) {
        const child = node.childNodes[0];
        this.reachPoint(child, 0, state);
        this.reachPoint(child, 1, state);
      }
      return true;
    }
    return false;
  }
  pointHere = (charsAfter: number, state: ContentCollectorState) => {
    const ln = this.lines.length() - 1;
    let chr = this.lines.textOfLine(ln).length;
    if (chr === 0 && Object.keys(state.lineAttributes).length !== 0) {
      chr += 1; // listMarker
    }
    chr += charsAfter;
    return [ln, chr];
  }

  reachBlockPoint = (nd: ContentElem, idx: number, state: ContentCollectorState) => {
    if (nd.nodeType !== nd.TEXT_NODE) this.reachPoint(nd, idx, state);
  }
  reachPoint = (nd: Node, idx: number, state: ContentCollectorState) => {
    if (this.startPoint && nd === this.startPoint.node && this.startPoint.index === idx) {
      this.selStart = this.pointHere(0, state);
    }
    if (this.endPoint && nd === this.endPoint.node && this.endPoint.index === idx) {
      this.selEnd = this.pointHere(0, state);
    }
  }
  incrementFlag = (state: ContentCollectorState, flagName: string) => {
    state.flags[flagName] = (state.flags[flagName] || 0) + 1;
  }
  decrementFlag = (state: ContentCollectorState, flagName: string) => {
    state.flags[flagName]--;
  }
  incrementAttrib = (state: ContentCollectorState, attribName: string) => {
    if (!state.attribs[attribName]) {
      state.attribs[attribName] = 1;
    } else {
      state.attribs[attribName]++;
    }
    this.recalcAttribString(state);
  }
  decrementAttrib = (state: ContentCollectorState, attribName: string) => {
    state.attribs[attribName]--;
    this.recalcAttribString(state);
  }
  private enterList = (state: ContentCollectorState, listType?: string) => {
    if (!listType) return;
    const oldListType = state.lineAttributes.list;
    if (listType !== 'none') {
      state.listNesting = (state.listNesting || 0) + 1;
      // reminder that listType can be "number2", "number3" etc.
      if (listType.indexOf('number') !== -1) {
        state.start = (state.start || 0) + 1;
      }
    }

    if (listType === 'none') {
      delete state.lineAttributes.list;
    } else {
      state.lineAttributes.list = listType;
    }
    this.recalcAttribString(state);
    return oldListType;
  }

  private exitList = (state: ContentCollectorState, oldListType: string) => {
    if (state.lineAttributes.list) {
      state.listNesting!--;
    }
    if (oldListType && oldListType !== 'none') {
      state.lineAttributes.list = oldListType;
    } else {
      delete state.lineAttributes.list;
      delete state.lineAttributes.start;
    }
    this.recalcAttribString(state);
  }
  private enterAuthor = (state: ContentCollectorState, author: string) => {
    const oldAuthor = state.author;
    state.authorLevel = (state.authorLevel || 0) + 1;
    state.author = author;
    this.recalcAttribString(state);
    return oldAuthor;
  }
  private exitAuthor = (state: ContentCollectorState, oldAuthor: string) => {
    state.authorLevel!--;
    state.author = oldAuthor;
    this.recalcAttribString(state);
  }
  private recalcAttribString = (state: ContentCollectorState) => {
    const attribs = new AttributeMap(this.apool);
    for (const [a, count] of Object.entries(state.attribs)) {
      if (!count) continue;
      // The following splitting of the attribute name is a workaround
      // to enable the content collector to store key-value attributes
      // see https://github.com/ether/etherpad-lite/issues/2567 for more information
      // in long term the contentcollector should be refactored to get rid of this workaround
      //
      // TODO: This approach doesn't support changing existing values: if both 'foo::bar' and
      // 'foo::baz' are in state.attribs then the last one encountered while iterating will win.
      const ATTRIBUTE_SPLIT_STRING = '::';

      // see if attributeString is splittable
      const attributeSplits = a.split(ATTRIBUTE_SPLIT_STRING);
      if (attributeSplits.length > 1) {
        // the attribute name follows the convention key::value
        // so save it as a key value attribute
        const [k, v] = attributeSplits;
        if (v) attribs.set(k, v);
      } else {
        // the "normal" case, the attribute is just a switch
        // so set it true
        attribs.set(a, 'true');
      }
    }
    if (state.authorLevel! > 0) {
      if (this.apool!.putAttrib(['author', state.author!], true) >= 0) {
        // require that author already be in pool
        // (don't add authors from other documents, etc.)
        if (state.author) attribs.set('author', state.author);
      }
    }
    state.attribString = attribs.toString();
  }
  private produceLineAttributesMarker = (state: ContentCollectorState) => {
    // TODO: This has to go to AttributeManager.
    const attribsF  = Object.entries(state.lineAttributes).map(([k, v]) => [k, v || '']) as Attribute[]
    const attribs = new AttributeMap(this.apool)
      .set('lmkr', '1')
      .set('insertorder', 'first')
      // TODO: Converting all falsy values in state.lineAttributes into removals is awkward.
      // Better would be to never add 0, false, null, or undefined to state.lineAttributes in the
      // first place (I'm looking at you, state.lineAttributes.start).
      .update(attribsF, true);
    this.lines.appendText('*', attribs.toString());
  }
  startNewLine = (state: ContentCollectorState|null) => {
    if (state) {
      const atBeginningOfLine = this.lines.textOfLine(this.lines.length() - 1).length === 0;
      if (atBeginningOfLine && Object.keys(state.lineAttributes).length !== 0) {
        this.produceLineAttributesMarker(state);
      }
    }
    this.lines.startNew();
  }
  notifySelection = (sel: ContentCollectorSel) => {
    if (sel) {
      this.selection = sel;
      this.startPoint = this.selection.startPoint;
      this.endPoint = this.selection.endPoint;
    }
  }
  doAttrib = (state: ContentCollectorState, na: string) => {
    state.localAttribs = (state.localAttribs || []);
    state.localAttribs.push(na);
    this.incrementAttrib(state, na);
  }

  collectContent =  (node: ContentElem, state?: ContentCollectorState)=> {
    let unsupportedElements = null;
    if (!state) {
      state = {
        flags: { /* name -> nesting counter*/
        },
        localAttribs: null,
        attribs: { /* name -> nesting counter*/
        },
        attribString: '',
        // lineAttributes maintain a map from attributes to attribute values set on a line
        lineAttributes: {
          /*
          example:
          'list': 'bullet1',
          */
        },
        unsupportedElements: new Set(),
      };
      unsupportedElements = state.unsupportedElements;
    }
    const localAttribs = state.localAttribs;
    state.localAttribs = null;
    const isBlock = this.isBlockElement(node);
    if (!isBlock && node.name && (node.name !== 'body')) {
      if (!supportedElems.has(node.name)) state.unsupportedElements.add(node.name);
    }
    const isEmpty = this.isEmpty(node, state);
    if (isBlock) this.ensureColumnZero(state);
    const startLine = this.lines.length() - 1;
    this.reachBlockPoint(node, 0, state);

    if (node.nodeType === node.TEXT_NODE) {
      const tname = (node.parentNode as Element)!.getAttribute('name');
      const context = {cc: this, state, tname, node, text: node.nodeValue};
      // Hook functions may either return a string (deprecated) or modify context.text. If any hook
      // function modifies context.text then all returned strings are ignored. If no hook functions
      // modify context.text, the first hook function to return a string wins.
      const [hookTxt] =
        hooks.callAll('collectContentLineText', context).filter((s: string|object) => typeof s === 'string');
      let txt = context.text === node.nodeValue && hookTxt != null ? hookTxt : context.text;

      let rest = '';
      let x = 0; // offset into original text
      if (txt.length === 0) {
        if (this.startPoint && node === this.startPoint.node) {
          this.selStart = this.pointHere(0, state);
        }
        if (this.endPoint && node === this.endPoint.node) {
          this.selEnd = this.pointHere(0, state);
        }
      }
      while (txt.length > 0) {
        let consumed = 0;
        if (state.flags.preMode) {
          const firstLine = txt.split('\n', 1)[0];
          consumed = firstLine.length + 1;
          rest = txt.substring(consumed);
          txt = firstLine;
        } else { /* will only run this loop body once */
        }
        if (this.startPoint && node === this.startPoint.node && this.startPoint.index - x <= txt.length) {
          this.selStart = this.pointHere(this.startPoint.index - x, state);
        }
        if (this.endPoint && node === this.endPoint.node && this.endPoint.index - x <= txt.length) {
          this.selEnd = this.pointHere(this.endPoint.index - x, state);
        }
        let txt2 = txt;
        if ((!state.flags.preMode) && /^[\r\n]*$/.exec(txt)) {
          // prevents textnodes containing just "\n" from being significant
          // in safari when pasting text, now that we convert them to
          // spaces instead of removing them, because in other cases
          // removing "\n" from pasted HTML will collapse words together.
          txt2 = '';
        }
        const atBeginningOfLine = this.lines.textOfLine(this.lines.length() - 1).length === 0;
        if (atBeginningOfLine) {
          // newlines in the source mustn't become spaces at beginning of line box
          txt2 = txt2.replace(/^\n*/, '');
        }
        if (atBeginningOfLine && Object.keys(state.lineAttributes).length !== 0) {
          this.produceLineAttributesMarker(state);
        }
        this.lines.appendText(this.textify(txt2), state.attribString);
        x += consumed;
        txt = rest;
        if (txt.length > 0) {
          this.startNewLine(state);
        }
      }
    } else if (node.nodeType === node.ELEMENT_NODE) {
      const tname = tagName(node as Element) || '';

      if (tname === 'img') {
        hooks.callAll('collectContentImage', {
          cc: this,
          state,
          tname,
          styl: null,
          cls: null,
          node,
        });
      } else {
        // THIS SEEMS VERY HACKY! -- Please submit a better fix!
        delete state.lineAttributes.img;
      }

      if (tname === 'br') {
        this.breakLine = true;
        const tvalue = node.getAttribute('value');
        const [startNewLine = true] = hooks.callAll('collectContentLineBreak', {
          cc: this,
          state,
          tname,
          tvalue,
          styl: null,
          cls: null,
        });
        if (startNewLine) {
          this.startNewLine(state);
        }
      } else if (tname === 'script' || tname === 'style') {
        // ignore
      } else if (!isEmpty) {
        let styl = node.getAttribute('style');
        let cls = node.getAttribute('class');
        let isPre: boolean| RegExpExecArray|"" = (tname === 'pre');
        if ((!isPre) && this.abrowser && this.abrowser.safari) {
          isPre = (styl && /\bwhite-space:\s*pre\b/i.exec(styl))!;
        }
        if (isPre) this.incrementFlag(state, 'preMode');
        let oldListTypeOrNull = null;
        let oldAuthorOrNull = null;

        // LibreOffice Writer puts in weird items during import or copy/paste, we should drop them.
        if (cls === 'Numbering_20_Symbols' || cls === 'Bullet_20_Symbols') {
          styl = null;
          cls = null;

          // We have to return here but this could break things in the future,
          // for now it shows how to fix the problem
          return;
        }
        if (this.collectStyles) {
          hooks.callAll('collectContentPre', {
            cc: this,
            state,
            tname,
            styl,
            cls,
          });
          if (tname === 'b' ||
            (styl && /\bfont-weight:\s*bold\b/i.exec(styl)) ||
            tname === 'strong') {
            this.doAttrib(state, 'bold');
          }
          if (tname === 'i' ||
            (styl && /\bfont-style:\s*italic\b/i.exec(styl)) ||
            tname === 'em') {
            this.doAttrib(state, 'italic');
          }
          if (tname === 'u' ||
            (styl && /\btext-decoration:\s*underline\b/i.exec(styl)) ||
            tname === 'ins') {
            this.doAttrib(state, 'underline');
          }
          if (tname === 's' ||
            (styl && /\btext-decoration:\s*line-through\b/i.exec(styl)) ||
            tname === 'del') {
            this.doAttrib(state, 'strikethrough');
          }
          if (tname === 'ul' || tname === 'ol') {
            let type = node.getAttribute('class');
            const rr = cls && /(?:^| )list-([a-z]+[0-9]+)\b/.exec(cls);
            // lists do not need to have a type, so before we make a wrong guess
            // check if we find a better hint within the node's children
            if (!rr && !type) {
              for (const child of node.childNodes) {
                if (tagName(child as ContentElem) !== 'ul') continue;
                type = (child as ContentElem).getAttribute('class');
                if (type) break;
              }
            }
            if (rr && rr[1]) {
              type = rr[1];
            } else {
              if (tname === 'ul') {
                const cls = node.getAttribute('class');
                if ((type && type.match('indent')) || (cls && cls.match('indent'))) {
                  type = 'indent';
                } else {
                  type = 'bullet';
                }
              } else {
                type = 'number';
              }
              type += String(Math.min(_MAX_LIST_LEVEL, (state.listNesting || 0) + 1));
            }
            oldListTypeOrNull = (this.enterList(state, type) || 'none');
          } else if ((tname === 'div' || tname === 'p') && cls && cls.match(/(?:^| )ace-line\b/)) {
            // This has undesirable behavior in Chrome but is right in other browsers.
            // See https://github.com/ether/etherpad-lite/issues/2412 for reasoning
            if (!this.abrowser!.chrome) {
              oldListTypeOrNull = (this.enterList(state, undefined) || 'none');
            }
          } else if (tname === 'li') {
            state.lineAttributes.start = state.start || 0;
            this.recalcAttribString(state);
            if (state.lineAttributes.list!.indexOf('number') !== -1) {
              /*
               Nested OLs are not --> <ol><li>1</li><ol>nested</ol></ol>
               They are           --> <ol><li>1</li><li><ol><li>nested</li></ol></li></ol>
               Note how the <ol> item has to be inside a <li>
               Because of this we don't increment the start number
              */
              if (node.parentNode && tagName(node.parentNode as Element) !== 'ol') {
                /*
                TODO: start number has to increment based on indentLevel(numberX)
                This means we have to build an object IE
                {
                 1: 4
                 2: 3
                 3: 5
                }
                But the browser seems to handle it fine using CSS..  Why can't we do the same
                with exports?  We can..  But let's leave this comment in because it might be useful
                in the future..
                */
                state.start!++; // not if it's parent is an OL or UL.
              }
            }
            // UL list items never modify the start value.
            if (node.parentNode && tagName(node.parentNode as Element) === 'ul') {
              state.start!++;
              // TODO, this is hacky.
              // Because if the first item is an UL it will increment a list no?
              // A much more graceful way would be to say, ul increases if it's within an OL
              // But I don't know a way to do that because we're only aware of the previous Line
              // As the concept of parent's doesn't exist when processing each domline...
            }
          } else {
            // Below needs more testin if it's necessary as _exitList should take care of this.
            // delete state.start;
            // delete state.listNesting;
            // _recalcAttribString(state);
          }
          if (this.className2Author && cls) {
            const classes = cls.match(/\S+/g);
            if (classes && classes.length > 0) {
              for (let i = 0; i < classes.length; i++) {
                const c = classes[i];
                const a = this.className2Author(c);
                if (a) {
                  oldAuthorOrNull = (this.enterAuthor(state, a) || 'none');
                  break;
                }
              }
            }
          }
        }

        for (const c of node.childNodes) {
          this.collectContent(c as ContentElem, state);
        }

        if (this.collectStyles) {
          hooks.callAll('collectContentPost', {
            cc: this,
            state,
            tname,
            styl,
            cls,
          });
        }

        if (isPre) this.decrementFlag(state, 'preMode');
        if (state.localAttribs) {
          for (let i = 0; i < state.localAttribs.length; i++) {
            this.decrementAttrib(state, state.localAttribs[i]);
          }
        }
        if (oldListTypeOrNull) {
          this.exitList(state, oldListTypeOrNull);
        }
        if (oldAuthorOrNull) {
          this.exitAuthor(state, oldAuthorOrNull);
        }
      }
    }
    this.reachBlockPoint(node, 1, state);
    if (isBlock) {
      if (this.lines.length() - 1 === startLine) {
        // added additional check to resolve https://github.com/JohnMcLear/ep_copy_paste_images/issues/20
        // this does mean that images etc can't be pasted on lists but imho that's fine

        // If we're doing an export event we need to start a new lines
        // Export events don't have window available.
        // commented out to solve #2412 - https://github.com/ether/etherpad-lite/issues/2412
        if ((state.lineAttributes && !state.lineAttributes.list) || typeof window === 'undefined') {
          this.startNewLine(state);
        }
      } else {
        this.ensureColumnZero(state);
      }
    }
    state.localAttribs = localAttribs;
    if (unsupportedElements && unsupportedElements.size) {
      console.warn('Ignoring unsupported elements (you might want to install a plugin): ' +
        `${[...unsupportedElements].join(', ')}`);
    }
  }
  // can pass a falsy value for end of doc
  notifyNextNode = (node: ContentElem) => {
    // an "empty block" won't end a line; this addresses an issue in IE with
    // typing into a blank line at the end of the document.  typed text
    // goes into the body, and the empty line div still looks clean.
    // it is incorporated as dirty by the rule that a dirty region has
    // to end a line.
    if ((!node) || (this.isBlockElement(node) && !this.isEmpty(node))) {
      this.ensureColumnZero(null);
    }
  }

  // each returns [line, char] or [-1,-1]
  getSelectionStart = () => this.selStart;
  getSelectionEnd = () => this.selEnd;


  // returns array of strings for lines found, last entry will be "" if
  // last line is complete (i.e. if a following span should be on a new line).
  // can be called at any point
  getLines = () => this.lines.textLines();

  finish = () => {
    this.lines.flush();
    const lineAttribs = this.lines.attribLines();
    const lineStrings = this.getLines();

    lineStrings.length--;
    lineAttribs.length--;

    const ss = this.getSelectionStart();
    const se = this.getSelectionEnd();

    const fixLongLines = () => {
      // design mode does not deal with with really long lines!
      const lineLimit = 2000; // chars
      const buffer = 10; // chars allowed over before wrapping
      let linesWrapped = 0;
      let numLinesAfter = 0;
      for (let i = lineStrings.length - 1; i >= 0; i--) {
        let oldString = lineStrings[i];
        let oldAttribString = lineAttribs[i];
        if (oldString.length > lineLimit + buffer) {
          const newStrings: string[] = [];
          const newAttribStrings = [];
          while (oldString.length > lineLimit) {
            // var semiloc = oldString.lastIndexOf(';', lineLimit-1);
            // var lengthToTake = (semiloc >= 0 ? (semiloc+1) : lineLimit);
            const lengthToTake = lineLimit;
            newStrings.push(oldString.substring(0, lengthToTake));
            oldString = oldString.substring(lengthToTake);
            newAttribStrings.push(Changeset.subattribution(oldAttribString, 0, lengthToTake));
            oldAttribString = Changeset.subattribution(oldAttribString, lengthToTake);
          }
          if (oldString.length > 0) {
            newStrings.push(oldString);
            newAttribStrings.push(oldAttribString);
          }

          const fixLineNumber = (lineChar: number[]) => {
            if (lineChar[0] < 0) return;
            let n = lineChar[0];
            let c = lineChar[1];
            if (n > i) {
              n += (newStrings.length - 1);
            } else if (n === i) {
              let a = 0;
              while (c > newStrings[a].length) {
                c -= newStrings[a].length;
                a++;
              }
              n += a;
            }
            lineChar[0] = n;
            lineChar[1] = c;
          };
          fixLineNumber(ss);
          fixLineNumber(se);
          linesWrapped++;
          numLinesAfter += newStrings.length;
          lineStrings.splice(i, 1, ...newStrings);
          lineAttribs.splice(i, 1, ...newAttribStrings);
        }
      }
      return {
        linesWrapped,
        numLinesAfter,
      };
    };
    const wrapData = fixLongLines();

    return {
      selStart: ss,
      selEnd: se,
      linesWrapped: wrapData.linesWrapped,
      numLinesAfter: wrapData.numLinesAfter,
      lines: lineStrings,
      lineAttribs,
    };
  }
}

export default ContentCollector
