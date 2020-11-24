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
let _, $, jQuery, plugins, Ace2Common;
const browser = require('./browser');
if (browser.msie) {
  // Honestly fuck IE royally.
  // Basically every hack we have since V11 causes a problem
  if (parseInt(browser.version) >= 11) {
    delete browser.msie;
    browser.chrome = true;
    browser.modernIE = true;
  }
}

Ace2Common = require('./ace2_common');

plugins = require('ep_etherpad-lite/static/js/pluginfw/client_plugins');
$ = jQuery = require('./rjquery').$;
_ = require('./underscore');

const isNodeText = Ace2Common.isNodeText;
const getAssoc = Ace2Common.getAssoc;
const setAssoc = Ace2Common.setAssoc;
const isTextNode = Ace2Common.isTextNode;
const binarySearchInfinite = Ace2Common.binarySearchInfinite;
const htmlPrettyEscape = Ace2Common.htmlPrettyEscape;
const noop = Ace2Common.noop;
const hooks = require('./pluginfw/hooks');

function Ace2Inner() {
  const makeChangesetTracker = require('./changesettracker').makeChangesetTracker;
  const colorutils = require('./colorutils').colorutils;
  const makeContentCollector = require('./contentcollector').makeContentCollector;
  const makeCSSManager = require('./cssmanager').makeCSSManager;
  const domline = require('./domline').domline;
  const AttribPool = require('./AttributePool');
  const Changeset = require('./Changeset');
  const ChangesetUtils = require('./ChangesetUtils');
  const linestylefilter = require('./linestylefilter').linestylefilter;
  const SkipList = require('./skiplist');
  const undoModule = require('./undomodule').undoModule;
  const AttributeManager = require('./AttributeManager');
  const Scroll = require('./scroll');

  const DEBUG = false; // $$ build script replaces the string "var DEBUG=true;//$$" with "var DEBUG=false;"
  // changed to false
  let isSetUp = false;

  const THE_TAB = '    '; // 4
  const MAX_LIST_LEVEL = 16;

  const FORMATTING_STYLES = ['bold', 'italic', 'underline', 'strikethrough'];
  const SELECT_BUTTON_CLASS = 'selected';

  const caughtErrors = [];

  let thisAuthor = '';

  let disposed = false;
  const editorInfo = parent.editorInfo;


  const iframe = window.frameElement;
  const outerWin = iframe.ace_outerWin;
  iframe.ace_outerWin = null; // prevent IE 6 memory leak
  const sideDiv = iframe.nextSibling;
  const lineMetricsDiv = sideDiv.nextSibling;
  let lineNumbersShown;
  let sideDivInner;
  initLineNumbers();

  const scroll = Scroll.init(outerWin);

  let outsideKeyDown = noop;

  let outsideKeyPress = function (e) { return true; };

  let outsideNotifyDirty = noop;

  // selFocusAtStart -- determines whether the selection extends "backwards", so that the focus
  // point (controlled with the arrow keys) is at the beginning; not supported in IE, though
  // native IE selections have that behavior (which we try not to interfere with).
  // Must be false if selection is collapsed!
  const rep = {
    lines: new SkipList(),
    selStart: null,
    selEnd: null,
    selFocusAtStart: false,
    alltext: '',
    alines: [],
    apool: new AttribPool(),
  };

  // lines, alltext, alines, and DOM are set up in init()
  if (undoModule.enabled) {
    undoModule.apool = rep.apool;
  }

  let root, doc; // set in init()
  let isEditable = true;
  let doesWrap = true;
  let hasLineNumbers = true;
  let isStyled = true;

  let console = (DEBUG && window.console);
  let documentAttributeManager;

  if (!window.console) {
    const names = ['log', 'debug', 'info', 'warn', 'error', 'assert', 'dir', 'dirxml', 'group', 'groupEnd', 'time', 'timeEnd', 'count', 'trace', 'profile', 'profileEnd'];
    console = {};
    for (let i = 0; i < names.length; ++i) console[names[i]] = noop;
  }

  let PROFILER = window.PROFILER;
  if (!PROFILER) {
    PROFILER = function () {
      return {
        start: noop,
        mark: noop,
        literal: noop,
        end: noop,
        cancel: noop,
      };
    };
  }

  // "dmesg" is for displaying messages in the in-page output pane
  // visible when "?djs=1" is appended to the pad URL.  It generally
  // remains a no-op unless djs is enabled, but we make a habit of
  // only calling it in error cases or while debugging.
  let dmesg = noop;
  window.dmesg = noop;

  const scheduler = parent; // hack for opera required

  let dynamicCSS = null;
  let outerDynamicCSS = null;
  let parentDynamicCSS = null;

  function initDynamicCSS() {
    dynamicCSS = makeCSSManager('dynamicsyntax');
    outerDynamicCSS = makeCSSManager('dynamicsyntax', 'outer');
    parentDynamicCSS = makeCSSManager('dynamicsyntax', 'parent');
  }

  const changesetTracker = makeChangesetTracker(scheduler, rep.apool, {
    withCallbacks(operationName, f) {
      inCallStackIfNecessary(operationName, () => {
        fastIncorp(1);
        f(
            {
              setDocumentAttributedText(atext) {
                setDocAText(atext);
              },
              applyChangesetToDocument(changeset, preferInsertionAfterCaret) {
                const oldEventType = currentCallStack.editEvent.eventType;
                currentCallStack.startNewEvent('nonundoable');

                performDocumentApplyChangeset(changeset, preferInsertionAfterCaret);

                currentCallStack.startNewEvent(oldEventType);
              },
            });
      });
    },
  });

  const authorInfos = {}; // presence of key determines if author is present in doc

  function getAuthorInfos() {
    return authorInfos;
  }
  editorInfo.ace_getAuthorInfos = getAuthorInfos;

  function setAuthorStyle(author, info) {
    if (!dynamicCSS) {
      return;
    }
    const authorSelector = getAuthorColorClassSelector(getAuthorClassName(author));

    const authorStyleSet = hooks.callAll('aceSetAuthorStyle', {
      dynamicCSS,
      parentDynamicCSS,
      outerDynamicCSS,
      info,
      author,
      authorSelector,
    });

    // Prevent default behaviour if any hook says so
    if (_.any(authorStyleSet, (it) => it)) {
      return;
    }

    if (!info) {
      dynamicCSS.removeSelectorStyle(authorSelector);
      parentDynamicCSS.removeSelectorStyle(authorSelector);
    } else if (info.bgcolor) {
      let bgcolor = info.bgcolor;
      if ((typeof info.fade) === 'number') {
        bgcolor = fadeColor(bgcolor, info.fade);
      }

      const authorStyle = dynamicCSS.selectorStyle(authorSelector);
      const parentAuthorStyle = parentDynamicCSS.selectorStyle(authorSelector);

      // author color
      authorStyle.backgroundColor = bgcolor;
      parentAuthorStyle.backgroundColor = bgcolor;

      const textColor = colorutils.textColorFromBackgroundColor(bgcolor, parent.parent.clientVars.skinName);
      authorStyle.color = textColor;
      parentAuthorStyle.color = textColor;
    }
  }

  function setAuthorInfo(author, info) {
    if ((typeof author) !== 'string') {
      // Potentially caused by: https://github.com/ether/etherpad-lite/issues/2802");
      throw new Error(`setAuthorInfo: author (${author}) is not a string`);
    }
    if (!info) {
      delete authorInfos[author];
    } else {
      authorInfos[author] = info;
    }
    setAuthorStyle(author, info);
  }

  function getAuthorClassName(author) {
    return `author-${author.replace(/[^a-y0-9]/g, (c) => {
      if (c == '.') return '-';
      return `z${c.charCodeAt(0)}z`;
    })}`;
  }

  function className2Author(className) {
    if (className.substring(0, 7) == 'author-') {
      return className.substring(7).replace(/[a-y0-9]+|-|z.+?z/g, (cc) => {
        if (cc == '-') { return '.'; } else if (cc.charAt(0) == 'z') {
          return String.fromCharCode(Number(cc.slice(1, -1)));
        } else {
          return cc;
        }
      });
    }
    return null;
  }

  function getAuthorColorClassSelector(oneClassName) {
    return `.authorColors .${oneClassName}`;
  }

  function fadeColor(colorCSS, fadeFrac) {
    let color = colorutils.css2triple(colorCSS);
    color = colorutils.blend(color, [1, 1, 1], fadeFrac);
    return colorutils.triple2css(color);
  }

  editorInfo.ace_getRep = function () {
    return rep;
  };

  editorInfo.ace_getAuthor = function () {
    return thisAuthor;
  };

  const _nonScrollableEditEvents = {
    applyChangesToBase: 1,
  };

  _.each(hooks.callAll('aceRegisterNonScrollableEditEvents'), (eventType) => {
    _nonScrollableEditEvents[eventType] = 1;
  });

  function isScrollableEditEvent(eventType) {
    return !_nonScrollableEditEvents[eventType];
  }

  var currentCallStack = null;

  function inCallStack(type, action) {
    if (disposed) return;

    if (currentCallStack) {
      // Do not uncomment this in production.  It will break Etherpad being provided in iFrames.  I'm leaving this in for testing usefulness.
      // top.console.error("Can't enter callstack " + type + ", already in " + currentCallStack.type);
    }

    let profiling = false;

    function profileRest() {
      profiling = true;
    }

    function newEditEvent(eventType) {
      return {
        eventType,
        backset: null,
      };
    }

    function submitOldEvent(evt) {
      if (rep.selStart && rep.selEnd) {
        const selStartChar = rep.lines.offsetOfIndex(rep.selStart[0]) + rep.selStart[1];
        const selEndChar = rep.lines.offsetOfIndex(rep.selEnd[0]) + rep.selEnd[1];
        evt.selStart = selStartChar;
        evt.selEnd = selEndChar;
        evt.selFocusAtStart = rep.selFocusAtStart;
      }
      if (undoModule.enabled) {
        let undoWorked = false;
        try {
          if (isPadLoading(evt.eventType)) {
            undoModule.clearHistory();
          } else if (evt.eventType == 'nonundoable') {
            if (evt.changeset) {
              undoModule.reportExternalChange(evt.changeset);
            }
          } else {
            undoModule.reportEvent(evt);
          }
          undoWorked = true;
        } finally {
          if (!undoWorked) {
            undoModule.enabled = false; // for safety
          }
        }
      }
    }

    function startNewEvent(eventType, dontSubmitOld) {
      const oldEvent = currentCallStack.editEvent;
      if (!dontSubmitOld) {
        submitOldEvent(oldEvent);
      }
      currentCallStack.editEvent = newEditEvent(eventType);
      return oldEvent;
    }

    currentCallStack = {
      type,
      docTextChanged: false,
      selectionAffected: false,
      userChangedSelection: false,
      domClean: false,
      profileRest,
      isUserChange: false,
      // is this a "user change" type of call-stack
      repChanged: false,
      editEvent: newEditEvent(type),
      startNewEvent,
    };
    let cleanExit = false;
    let result;
    try {
      result = action();

      hooks.callAll('aceEditEvent', {
        callstack: currentCallStack,
        editorInfo,
        rep,
        documentAttributeManager,
      });

      cleanExit = true;
    } catch (e) {
      caughtErrors.push(
          {
            error: e,
            time: +new Date(),
          });
      dmesg(e.toString());
      throw e;
    } finally {
      const cs = currentCallStack;
      if (cleanExit) {
        submitOldEvent(cs.editEvent);
        if (cs.domClean && cs.type != 'setup') {
          // if (cs.isUserChange)
          // {
          //  if (cs.repChanged) parenModule.notifyChange();
          //  else parenModule.notifyTick();
          // }
          if (cs.selectionAffected) {
            updateBrowserSelectionFromRep();
          }
          if ((cs.docTextChanged || cs.userChangedSelection) && isScrollableEditEvent(cs.type)) {
            scrollSelectionIntoView();
          }
          if (cs.docTextChanged && cs.type.indexOf('importText') < 0) {
            outsideNotifyDirty();
          }
        }
      } else {
        // non-clean exit
        if (currentCallStack.type == 'idleWorkTimer') {
          idleWorkTimer.atLeast(1000);
        }
      }
      currentCallStack = null;
    }
    return result;
  }
  editorInfo.ace_inCallStack = inCallStack;

  function inCallStackIfNecessary(type, action) {
    if (!currentCallStack) {
      inCallStack(type, action);
    } else {
      action();
    }
  }
  editorInfo.ace_inCallStackIfNecessary = inCallStackIfNecessary;

  function dispose() {
    disposed = true;
    if (idleWorkTimer) idleWorkTimer.never();
    teardown();
  }

  function setWraps(newVal) {
    doesWrap = newVal;
    const dwClass = 'doesWrap';
    root.classList.toggle('doesWrap', doesWrap);
    scheduler.setTimeout(() => {
      inCallStackIfNecessary('setWraps', () => {
        fastIncorp(7);
        recreateDOM();
        fixView();
      });
    }, 0);
  }

  function setStyled(newVal) {
    const oldVal = isStyled;
    isStyled = !!newVal;

    if (newVal != oldVal) {
      if (!newVal) {
        // clear styles
        inCallStackIfNecessary('setStyled', () => {
          fastIncorp(12);
          const clearStyles = [];
          for (const k in STYLE_ATTRIBS) {
            clearStyles.push([k, '']);
          }
          performDocumentApplyAttributesToCharRange(0, rep.alltext.length, clearStyles);
        });
      }
    }
  }

  function setTextFace(face) {
    root.style.fontFamily = face;
    lineMetricsDiv.style.fontFamily = face;
  }

  function recreateDOM() {
    // precond: normalized
    recolorLinesInRange(0, rep.alltext.length);
  }

  function setEditable(newVal) {
    isEditable = newVal;
    root.contentEditable = isEditable ? 'true' : 'false';
    root.classList.toggle('static', !isEditable);
  }

  function enforceEditability() {
    setEditable(isEditable);
  }

  function importText(text, undoable, dontProcess) {
    let lines;
    if (dontProcess) {
      if (text.charAt(text.length - 1) != '\n') {
        throw new Error('new raw text must end with newline');
      }
      if (/[\r\t\xa0]/.exec(text)) {
        throw new Error('new raw text must not contain CR, tab, or nbsp');
      }
      lines = text.substring(0, text.length - 1).split('\n');
    } else {
      lines = _.map(text.split('\n'), textify);
    }
    let newText = '\n';
    if (lines.length > 0) {
      newText = `${lines.join('\n')}\n`;
    }

    inCallStackIfNecessary(`importText${undoable ? 'Undoable' : ''}`, () => {
      setDocText(newText);
    });

    if (dontProcess && rep.alltext != text) {
      throw new Error('mismatch error setting raw text in importText');
    }
  }

  function importAText(atext, apoolJsonObj, undoable) {
    atext = Changeset.cloneAText(atext);
    if (apoolJsonObj) {
      const wireApool = (new AttribPool()).fromJsonable(apoolJsonObj);
      atext.attribs = Changeset.moveOpsToNewPool(atext.attribs, wireApool, rep.apool);
    }
    inCallStackIfNecessary(`importText${undoable ? 'Undoable' : ''}`, () => {
      setDocAText(atext);
    });
  }

  function setDocAText(atext) {
    if (atext.text === '') {
      /*
       * The server is fine with atext.text being an empty string, but the front
       * end is not, and crashes.
       *
       * It is not clear if this is a problem in the server or in the client
       * code, and this is a client-side hack fix. The underlying problem needs
       * to be investigated.
       *
       * See for reference:
       * - https://github.com/ether/etherpad-lite/issues/3861
       */
      atext.text = '\n';
    }

    fastIncorp(8);

    const oldLen = rep.lines.totalWidth();
    const numLines = rep.lines.length();
    const upToLastLine = rep.lines.offsetOfIndex(numLines - 1);
    const lastLineLength = rep.lines.atIndex(numLines - 1).text.length;
    const assem = Changeset.smartOpAssembler();
    const o = Changeset.newOp('-');
    o.chars = upToLastLine;
    o.lines = numLines - 1;
    assem.append(o);
    o.chars = lastLineLength;
    o.lines = 0;
    assem.append(o);
    Changeset.appendATextToAssembler(atext, assem);
    const newLen = oldLen + assem.getLengthChange();
    const changeset = Changeset.checkRep(
        Changeset.pack(oldLen, newLen, assem.toString(), atext.text.slice(0, -1)));
    performDocumentApplyChangeset(changeset);

    performSelectionChange([0, rep.lines.atIndex(0).lineMarker], [0, rep.lines.atIndex(0).lineMarker]);

    idleWorkTimer.atMost(100);

    if (rep.alltext != atext.text) {
      dmesg(htmlPrettyEscape(rep.alltext));
      dmesg(htmlPrettyEscape(atext.text));
      throw new Error('mismatch error setting raw text in setDocAText');
    }
  }

  function setDocText(text) {
    setDocAText(Changeset.makeAText(text));
  }

  function getDocText() {
    const alltext = rep.alltext;
    let len = alltext.length;
    if (len > 0) len--; // final extra newline
    return alltext.substring(0, len);
  }

  function exportText() {
    if (currentCallStack && !currentCallStack.domClean) {
      inCallStackIfNecessary('exportText', () => {
        fastIncorp(2);
      });
    }
    return getDocText();
  }

  function editorChangedSize() {
    fixView();
  }

  function setOnKeyPress(handler) {
    outsideKeyPress = handler;
  }

  function setOnKeyDown(handler) {
    outsideKeyDown = handler;
  }

  function setNotifyDirty(handler) {
    outsideNotifyDirty = handler;
  }

  function getFormattedCode() {
    if (currentCallStack && !currentCallStack.domClean) {
      inCallStackIfNecessary('getFormattedCode', incorporateUserChanges);
    }
    const buf = [];
    if (rep.lines.length() > 0) {
      // should be the case, even for empty file
      let entry = rep.lines.atIndex(0);
      while (entry) {
        const domInfo = entry.domInfo;
        buf.push((domInfo && domInfo.getInnerHTML()) || domline.processSpaces(domline.escapeHTML(entry.text), doesWrap) || '&nbsp;' /* empty line*/);
        entry = rep.lines.next(entry);
      }
    }
    return `<div class="syntax"><div>${buf.join('</div>\n<div>')}</div></div>`;
  }

  const CMDS = {
    clearauthorship(prompt) {
      if ((!(rep.selStart && rep.selEnd)) || isCaret()) {
        if (prompt) {
          prompt();
        } else {
          performDocumentApplyAttributesToCharRange(0, rep.alltext.length, [
            ['author', ''],
          ]);
        }
      } else {
        setAttributeOnSelection('author', '');
      }
    },
  };

  function execCommand(cmd) {
    cmd = cmd.toLowerCase();
    const cmdArgs = Array.prototype.slice.call(arguments, 1);
    if (CMDS[cmd]) {
      inCallStackIfNecessary(cmd, () => {
        fastIncorp(9);
        CMDS[cmd].apply(CMDS, cmdArgs);
      });
    }
  }

  function replaceRange(start, end, text) {
    inCallStackIfNecessary('replaceRange', () => {
      fastIncorp(9);
      performDocumentReplaceRange(start, end, text);
    });
  }

  editorInfo.ace_focus = focus;
  editorInfo.ace_importText = importText;
  editorInfo.ace_importAText = importAText;
  editorInfo.ace_exportText = exportText;
  editorInfo.ace_editorChangedSize = editorChangedSize;
  editorInfo.ace_setOnKeyPress = setOnKeyPress;
  editorInfo.ace_setOnKeyDown = setOnKeyDown;
  editorInfo.ace_setNotifyDirty = setNotifyDirty;
  editorInfo.ace_dispose = dispose;
  editorInfo.ace_getFormattedCode = getFormattedCode;
  editorInfo.ace_setEditable = setEditable;
  editorInfo.ace_execCommand = execCommand;
  editorInfo.ace_replaceRange = replaceRange;
  editorInfo.ace_getAuthorInfos = getAuthorInfos;
  editorInfo.ace_performDocumentReplaceRange = performDocumentReplaceRange;
  editorInfo.ace_performDocumentReplaceCharRange = performDocumentReplaceCharRange;
  editorInfo.ace_renumberList = renumberList;
  editorInfo.ace_doReturnKey = doReturnKey;
  editorInfo.ace_isBlockElement = isBlockElement;
  editorInfo.ace_getLineListType = getLineListType;

  editorInfo.ace_callWithAce = function (fn, callStack, normalize) {
    let wrapper = function () {
      return fn(editorInfo);
    };

    if (normalize !== undefined) {
      const wrapper1 = wrapper;
      wrapper = function () {
        editorInfo.ace_fastIncorp(9);
        wrapper1();
      };
    }

    if (callStack !== undefined) {
      return editorInfo.ace_inCallStack(callStack, wrapper);
    } else {
      return wrapper();
    }
  };

  // This methed exposes a setter for some ace properties
  // @param key the name of the parameter
  // @param value the value to set to
  editorInfo.ace_setProperty = function (key, value) {
    // These properties are exposed
    const setters = {
      wraps: setWraps,
      showsauthorcolors: (val) => root.classList.toggle('authorColors', !!val),
      showsuserselections: (val) => root.classList.toggle('userSelections', !!val),
      showslinenumbers(value) {
        hasLineNumbers = !!value;
        sideDiv.parentNode.classList.toggle('line-numbers-hidden', !hasLineNumbers);
        fixView();
      },
      grayedout: (val) => outerWin.document.body.classList.toggle('grayedout', !!val),
      dmesg() { dmesg = window.dmesg = value; },
      userauthor(value) {
        thisAuthor = String(value);
        documentAttributeManager.author = thisAuthor;
      },
      styled: setStyled,
      textface: setTextFace,
      rtlistrue(value) {
        root.classList.toggle('rtl', value);
        root.classList.toggle('ltr', !value);
        document.documentElement.dir = value ? 'rtl' : 'ltr';
      },
    };

    const setter = setters[key.toLowerCase()];

    // check if setter is present
    if (setter !== undefined) {
      setter(value);
    }
  };

  editorInfo.ace_setBaseText = function (txt) {
    changesetTracker.setBaseText(txt);
  };
  editorInfo.ace_setBaseAttributedText = function (atxt, apoolJsonObj) {
    changesetTracker.setBaseAttributedText(atxt, apoolJsonObj);
  };
  editorInfo.ace_applyChangesToBase = function (c, optAuthor, apoolJsonObj) {
    changesetTracker.applyChangesToBase(c, optAuthor, apoolJsonObj);
  };
  editorInfo.ace_prepareUserChangeset = function () {
    return changesetTracker.prepareUserChangeset();
  };
  editorInfo.ace_applyPreparedChangesetToBase = function () {
    changesetTracker.applyPreparedChangesetToBase();
  };
  editorInfo.ace_setUserChangeNotificationCallback = function (f) {
    changesetTracker.setUserChangeNotificationCallback(f);
  };
  editorInfo.ace_setAuthorInfo = function (author, info) {
    setAuthorInfo(author, info);
  };
  editorInfo.ace_setAuthorSelectionRange = function (author, start, end) {
    changesetTracker.setAuthorSelectionRange(author, start, end);
  };

  editorInfo.ace_getUnhandledErrors = function () {
    return caughtErrors.slice();
  };

  editorInfo.ace_getDocument = function () {
    return doc;
  };

  editorInfo.ace_getDebugProperty = function (prop) {
    if (prop == 'debugger') {
      // obfuscate "eval" so as not to scare yuicompressor
      window['ev' + 'al']('debugger');
    } else if (prop == 'rep') {
      return rep;
    } else if (prop == 'window') {
      return window;
    } else if (prop == 'document') {
      return document;
    }
    return undefined;
  };

  function now() {
    return Date.now();
  }

  function newTimeLimit(ms) {
    const startTime = now();
    let lastElapsed = 0;
    let exceededAlready = false;
    let printedTrace = false;
    const isTimeUp = function () {
      if (exceededAlready) {
        if ((!printedTrace)) { // && now() - startTime - ms > 300) {
          printedTrace = true;
        }
        return true;
      }
      const elapsed = now() - startTime;
      if (elapsed > ms) {
        exceededAlready = true;
        return true;
      } else {
        lastElapsed = elapsed;
        return false;
      }
    };

    isTimeUp.elapsed = function () {
      return now() - startTime;
    };
    return isTimeUp;
  }


  function makeIdleAction(func) {
    let scheduledTimeout = null;
    let scheduledTime = 0;

    function unschedule() {
      if (scheduledTimeout) {
        scheduler.clearTimeout(scheduledTimeout);
        scheduledTimeout = null;
      }
    }

    function reschedule(time) {
      unschedule();
      scheduledTime = time;
      let delay = time - now();
      if (delay < 0) delay = 0;
      scheduledTimeout = scheduler.setTimeout(callback, delay);
    }

    function callback() {
      scheduledTimeout = null;
      // func may reschedule the action
      func();
    }
    return {
      atMost(ms) {
        const latestTime = now() + ms;
        if ((!scheduledTimeout) || scheduledTime > latestTime) {
          reschedule(latestTime);
        }
      },
      // atLeast(ms) will schedule the action if not scheduled yet.
      // In other words, "infinity" is replaced by ms, even though
      // it is technically larger.
      atLeast(ms) {
        const earliestTime = now() + ms;
        if ((!scheduledTimeout) || scheduledTime < earliestTime) {
          reschedule(earliestTime);
        }
      },
      never() {
        unschedule();
      },
    };
  }

  function fastIncorp(n) {
    // normalize but don't do any lexing or anything
    incorporateUserChanges();
  }
  editorInfo.ace_fastIncorp = fastIncorp;

  var idleWorkTimer = makeIdleAction(() => {
    if (inInternationalComposition) {
      // don't do idle input incorporation during international input composition
      idleWorkTimer.atLeast(500);
      return;
    }

    inCallStackIfNecessary('idleWorkTimer', () => {
      const isTimeUp = newTimeLimit(250);

      let finishedImportantWork = false;
      let finishedWork = false;

      try {
        incorporateUserChanges();

        if (isTimeUp()) return;

        updateLineNumbers(); // update line numbers if any time left
        if (isTimeUp()) return;

        const visibleRange = scroll.getVisibleCharRange(rep);
        const docRange = [0, rep.lines.totalWidth()];
        finishedImportantWork = true;
        finishedWork = true;
      } finally {
        if (finishedWork) {
          idleWorkTimer.atMost(1000);
        } else if (finishedImportantWork) {
          // if we've finished highlighting the view area,
          // more highlighting could be counter-productive,
          // e.g. if the user just opened a triple-quote and will soon close it.
          idleWorkTimer.atMost(500);
        } else {
          let timeToWait = Math.round(isTimeUp.elapsed() / 2);
          if (timeToWait < 100) timeToWait = 100;
          idleWorkTimer.atMost(timeToWait);
        }
      }
    });
  });

  let _nextId = 1;

  function uniqueId(n) {
    // not actually guaranteed to be unique, e.g. if user copy-pastes
    // nodes with ids
    const nid = n.id;
    if (nid) return nid;
    return (n.id = `magicdomid${_nextId++}`);
  }


  function recolorLinesInRange(startChar, endChar) {
    if (endChar <= startChar) return;
    if (startChar < 0 || startChar >= rep.lines.totalWidth()) return;
    let lineEntry = rep.lines.atOffset(startChar); // rounds down to line boundary
    let lineStart = rep.lines.offsetOfEntry(lineEntry);
    let lineIndex = rep.lines.indexOfEntry(lineEntry);
    let selectionNeedsResetting = false;
    let firstLine = null;
    let lastLine = null;

    // tokenFunc function; accesses current value of lineEntry and curDocChar,
    // also mutates curDocChar
    let curDocChar;
    const tokenFunc = function (tokenText, tokenClass) {
      lineEntry.domInfo.appendSpan(tokenText, tokenClass);
    };

    while (lineEntry && lineStart < endChar) {
      const lineEnd = lineStart + lineEntry.width;

      curDocChar = lineStart;
      lineEntry.domInfo.clearSpans();
      getSpansForLine(lineEntry, tokenFunc, lineStart);
      lineEntry.domInfo.finishUpdate();

      markNodeClean(lineEntry.lineNode);

      if (rep.selStart && rep.selStart[0] == lineIndex || rep.selEnd && rep.selEnd[0] == lineIndex) {
        selectionNeedsResetting = true;
      }

      if (firstLine === null) firstLine = lineIndex;
      lastLine = lineIndex;
      lineStart = lineEnd;
      lineEntry = rep.lines.next(lineEntry);
      lineIndex++;
    }
    if (selectionNeedsResetting) {
      currentCallStack.selectionAffected = true;
    }
  }

  // like getSpansForRange, but for a line, and the func takes (text,class)
  // instead of (width,class); excludes the trailing '\n' from
  // consideration by func


  function getSpansForLine(lineEntry, textAndClassFunc, lineEntryOffsetHint) {
    let lineEntryOffset = lineEntryOffsetHint;
    if ((typeof lineEntryOffset) !== 'number') {
      lineEntryOffset = rep.lines.offsetOfEntry(lineEntry);
    }
    const text = lineEntry.text;
    const width = lineEntry.width; // text.length+1
    if (text.length === 0) {
      // allow getLineStyleFilter to set line-div styles
      const func = linestylefilter.getLineStyleFilter(
          0, '', textAndClassFunc, rep.apool);
      func('', '');
    } else {
      const offsetIntoLine = 0;
      let filteredFunc = linestylefilter.getFilterStack(text, textAndClassFunc, browser);
      const lineNum = rep.lines.indexOfEntry(lineEntry);
      const aline = rep.alines[lineNum];
      filteredFunc = linestylefilter.getLineStyleFilter(
          text.length, aline, filteredFunc, rep.apool);
      filteredFunc(text, '');
    }
  }

  let observedChanges;

  function clearObservedChanges() {
    observedChanges = {
      cleanNodesNearChanges: {},
    };
  }
  clearObservedChanges();

  function getCleanNodeByKey(key) {
    const p = PROFILER('getCleanNodeByKey', false);
    p.extra = 0;
    let n = doc.getElementById(key);
    // copying and pasting can lead to duplicate ids
    while (n && isNodeDirty(n)) {
      p.extra++;
      n.id = '';
      n = doc.getElementById(key);
    }
    p.literal(p.extra, 'extra');
    p.end();
    return n;
  }

  function observeChangesAroundNode(node) {
    // Around this top-level DOM node, look for changes to the document
    // (from how it looks in our representation) and record them in a way
    // that can be used to "normalize" the document (apply the changes to our
    // representation, and put the DOM in a canonical form).
    let cleanNode;
    let hasAdjacentDirtyness;
    if (!isNodeDirty(node)) {
      cleanNode = node;
      var prevSib = cleanNode.previousSibling;
      var nextSib = cleanNode.nextSibling;
      hasAdjacentDirtyness = ((prevSib && isNodeDirty(prevSib)) || (nextSib && isNodeDirty(nextSib)));
    } else {
      // node is dirty, look for clean node above
      let upNode = node.previousSibling;
      while (upNode && isNodeDirty(upNode)) {
        upNode = upNode.previousSibling;
      }
      if (upNode) {
        cleanNode = upNode;
      } else {
        let downNode = node.nextSibling;
        while (downNode && isNodeDirty(downNode)) {
          downNode = downNode.nextSibling;
        }
        if (downNode) {
          cleanNode = downNode;
        }
      }
      if (!cleanNode) {
        // Couldn't find any adjacent clean nodes!
        // Since top and bottom of doc is dirty, the dirty area will be detected.
        return;
      }
      hasAdjacentDirtyness = true;
    }

    if (hasAdjacentDirtyness) {
      // previous or next line is dirty
      observedChanges.cleanNodesNearChanges[`$${uniqueId(cleanNode)}`] = true;
    } else {
      // next and prev lines are clean (if they exist)
      const lineKey = uniqueId(cleanNode);
      var prevSib = cleanNode.previousSibling;
      var nextSib = cleanNode.nextSibling;
      const actualPrevKey = ((prevSib && uniqueId(prevSib)) || null);
      const actualNextKey = ((nextSib && uniqueId(nextSib)) || null);
      const repPrevEntry = rep.lines.prev(rep.lines.atKey(lineKey));
      const repNextEntry = rep.lines.next(rep.lines.atKey(lineKey));
      const repPrevKey = ((repPrevEntry && repPrevEntry.key) || null);
      const repNextKey = ((repNextEntry && repNextEntry.key) || null);
      if (actualPrevKey != repPrevKey || actualNextKey != repNextKey) {
        observedChanges.cleanNodesNearChanges[`$${uniqueId(cleanNode)}`] = true;
      }
    }
  }

  function observeChangesAroundSelection() {
    if (currentCallStack.observedSelection) return;
    currentCallStack.observedSelection = true;

    const p = PROFILER('getSelection', false);
    const selection = getSelection();
    p.end();

    if (selection) {
      const node1 = topLevel(selection.startPoint.node);
      const node2 = topLevel(selection.endPoint.node);
      if (node1) observeChangesAroundNode(node1);
      if (node2 && node1 != node2) {
        observeChangesAroundNode(node2);
      }
    }
  }

  function observeSuspiciousNodes() {
    // inspired by Firefox bug #473255, where pasting formatted text
    // causes the cursor to jump away, making the new HTML never found.
    if (root.getElementsByTagName) {
      const nds = root.getElementsByTagName('style');
      for (let i = 0; i < nds.length; i++) {
        const n = topLevel(nds[i]);
        if (n && n.parentNode == root) {
          observeChangesAroundNode(n);
        }
      }
    }
  }

  function incorporateUserChanges() {
    if (currentCallStack.domClean) return false;

    currentCallStack.isUserChange = true;

    if (DEBUG && window.DONT_INCORP || window.DEBUG_DONT_INCORP) return false;

    const p = PROFILER('incorp', false);

    // returns true if dom changes were made
    if (!root.firstChild) {
      root.innerHTML = '<div><!-- --></div>';
    }

    p.mark('obs');
    observeChangesAroundSelection();
    observeSuspiciousNodes();
    p.mark('dirty');
    let dirtyRanges = getDirtyRanges();
    let dirtyRangesCheckOut = true;
    let j = 0;
    let a, b;
    while (j < dirtyRanges.length) {
      a = dirtyRanges[j][0];
      b = dirtyRanges[j][1];
      if (!((a === 0 || getCleanNodeByKey(rep.lines.atIndex(a - 1).key)) && (b == rep.lines.length() || getCleanNodeByKey(rep.lines.atIndex(b).key)))) {
        dirtyRangesCheckOut = false;
        break;
      }
      j++;
    }
    if (!dirtyRangesCheckOut) {
      const numBodyNodes = root.childNodes.length;
      for (var k = 0; k < numBodyNodes; k++) {
        const bodyNode = root.childNodes.item(k);
        if ((bodyNode.tagName) && ((!bodyNode.id) || (!rep.lines.containsKey(bodyNode.id)))) {
          observeChangesAroundNode(bodyNode);
        }
      }
      dirtyRanges = getDirtyRanges();
    }

    clearObservedChanges();

    p.mark('getsel');
    const selection = getSelection();

    let selStart, selEnd; // each one, if truthy, has [line,char] needed to set selection
    let i = 0;
    const splicesToDo = [];
    let netNumLinesChangeSoFar = 0;
    const toDeleteAtEnd = [];
    p.mark('ranges');
    p.literal(dirtyRanges.length, 'numdirt');
    const domInsertsNeeded = []; // each entry is [nodeToInsertAfter, [info1, info2, ...]]
    while (i < dirtyRanges.length) {
      const range = dirtyRanges[i];
      a = range[0];
      b = range[1];
      let firstDirtyNode = (((a === 0) && root.firstChild) || getCleanNodeByKey(rep.lines.atIndex(a - 1).key).nextSibling);
      firstDirtyNode = (firstDirtyNode && isNodeDirty(firstDirtyNode) && firstDirtyNode);
      let lastDirtyNode = (((b == rep.lines.length()) && root.lastChild) || getCleanNodeByKey(rep.lines.atIndex(b).key).previousSibling);
      lastDirtyNode = (lastDirtyNode && isNodeDirty(lastDirtyNode) && lastDirtyNode);
      if (firstDirtyNode && lastDirtyNode) {
        const cc = makeContentCollector(isStyled, browser, rep.apool, null, className2Author);
        cc.notifySelection(selection);
        const dirtyNodes = [];
        for (let n = firstDirtyNode; n && !(n.previousSibling && n.previousSibling == lastDirtyNode);
          n = n.nextSibling) {
          if (browser.msie) {
            // try to undo IE's pesky and overzealous linkification
            try {
              n.createTextRange().execCommand('unlink', false, null);
            } catch (e) {}
          }
          cc.collectContent(n);
          dirtyNodes.push(n);
        }
        cc.notifyNextNode(lastDirtyNode.nextSibling);
        let lines = cc.getLines();
        if ((lines.length <= 1 || lines[lines.length - 1] !== '') && lastDirtyNode.nextSibling) {
          // dirty region doesn't currently end a line, even taking the following node
          // (or lack of node) into account, so include the following clean node.
          // It could be SPAN or a DIV; basically this is any case where the contentCollector
          // decides it isn't done.
          // Note that this clean node might need to be there for the next dirty range.
          b++;
          const cleanLine = lastDirtyNode.nextSibling;
          cc.collectContent(cleanLine);
          toDeleteAtEnd.push(cleanLine);
          cc.notifyNextNode(cleanLine.nextSibling);
        }

        const ccData = cc.finish();
        const ss = ccData.selStart;
        const se = ccData.selEnd;
        lines = ccData.lines;
        const lineAttribs = ccData.lineAttribs;
        const linesWrapped = ccData.linesWrapped;
        var scrollToTheLeftNeeded = false;

        if (linesWrapped > 0) {
          if (!browser.msie) {
            // chrome decides in it's infinite wisdom that its okay to put the browsers visisble window in the middle of the span
            // an outcome of this is that the first chars of the string are no longer visible to the user..  Yay chrome..
            // Move the browsers visible area to the left hand side of the span
            // Firefox isn't quite so bad, but it's still pretty quirky.
            var scrollToTheLeftNeeded = true;
          }
        }

        if (ss[0] >= 0) selStart = [ss[0] + a + netNumLinesChangeSoFar, ss[1]];
        if (se[0] >= 0) selEnd = [se[0] + a + netNumLinesChangeSoFar, se[1]];

        const entries = [];
        const nodeToAddAfter = lastDirtyNode;
        const lineNodeInfos = new Array(lines.length);
        for (var k = 0; k < lines.length; k++) {
          const lineString = lines[k];
          const newEntry = createDomLineEntry(lineString);
          entries.push(newEntry);
          lineNodeInfos[k] = newEntry.domInfo;
        }
        // var fragment = magicdom.wrapDom(document.createDocumentFragment());
        domInsertsNeeded.push([nodeToAddAfter, lineNodeInfos]);
        _.each(dirtyNodes, (n) => {
          toDeleteAtEnd.push(n);
        });
        const spliceHints = {};
        if (selStart) spliceHints.selStart = selStart;
        if (selEnd) spliceHints.selEnd = selEnd;
        splicesToDo.push([a + netNumLinesChangeSoFar, b - a, entries, lineAttribs, spliceHints]);
        netNumLinesChangeSoFar += (lines.length - (b - a));
      } else if (b > a) {
        splicesToDo.push([a + netNumLinesChangeSoFar,
          b - a,
          [],
          []]);
      }
      i++;
    }

    const domChanges = (splicesToDo.length > 0);

    // update the representation
    p.mark('splice');
    _.each(splicesToDo, (splice) => {
      doIncorpLineSplice(splice[0], splice[1], splice[2], splice[3], splice[4]);
    });

    // do DOM inserts
    p.mark('insert');
    _.each(domInsertsNeeded, (ins) => {
      insertDomLines(ins[0], ins[1]);
    });

    p.mark('del');
    // delete old dom nodes
    _.each(toDeleteAtEnd, (n) => {
      // var id = n.uniqueId();
      // parent of n may not be "root" in IE due to non-tree-shaped DOM (wtf)
      if (n.parentNode) n.parentNode.removeChild(n);

      // dmesg(htmlPrettyEscape(htmlForRemovedChild(n)));
    });

    if (scrollToTheLeftNeeded) { // needed to stop chrome from breaking the ui when long strings without spaces are pasted
      $('#innerdocbody').scrollLeft(0);
    }

    p.mark('findsel');
    // if the nodes that define the selection weren't encountered during
    // content collection, figure out where those nodes are now.
    if (selection && !selStart) {
      // if (domChanges) dmesg("selection not collected");
      const selStartFromHook = hooks.callAll('aceStartLineAndCharForPoint', {
        callstack: currentCallStack,
        editorInfo,
        rep,
        root,
        point: selection.startPoint,
        documentAttributeManager,
      });
      selStart = (selStartFromHook == null || selStartFromHook.length == 0) ? getLineAndCharForPoint(selection.startPoint) : selStartFromHook;
    }
    if (selection && !selEnd) {
      const selEndFromHook = hooks.callAll('aceEndLineAndCharForPoint', {
        callstack: currentCallStack,
        editorInfo,
        rep,
        root,
        point: selection.endPoint,
        documentAttributeManager,
      });
      selEnd = (selEndFromHook == null || selEndFromHook.length == 0) ? getLineAndCharForPoint(selection.endPoint) : selEndFromHook;
    }

    // selection from content collection can, in various ways, extend past final
    // BR in firefox DOM, so cap the line
    const numLines = rep.lines.length();
    if (selStart && selStart[0] >= numLines) {
      selStart[0] = numLines - 1;
      selStart[1] = rep.lines.atIndex(selStart[0]).text.length;
    }
    if (selEnd && selEnd[0] >= numLines) {
      selEnd[0] = numLines - 1;
      selEnd[1] = rep.lines.atIndex(selEnd[0]).text.length;
    }

    p.mark('repsel');
    // update rep if we have a new selection
    // NOTE: IE loses the selection when you click stuff in e.g. the
    // editbar, so removing the selection when it's lost is not a good
    // idea.
    if (selection) repSelectionChange(selStart, selEnd, selection && selection.focusAtStart);
    // update browser selection
    p.mark('browsel');
    if (selection && (domChanges || isCaret())) {
      // if no DOM changes (not this case), want to treat range selection delicately,
      // e.g. in IE not lose which end of the selection is the focus/anchor;
      // on the other hand, we may have just noticed a press of PageUp/PageDown
      currentCallStack.selectionAffected = true;
    }

    currentCallStack.domClean = true;

    p.mark('fixview');

    fixView();

    p.end('END');

    return domChanges;
  }

  var STYLE_ATTRIBS = {
    bold: true,
    italic: true,
    underline: true,
    strikethrough: true,
    list: true,
  };

  function isStyleAttribute(aname) {
    return !!STYLE_ATTRIBS[aname];
  }

  function isDefaultLineAttribute(aname) {
    return AttributeManager.DEFAULT_LINE_ATTRIBUTES.indexOf(aname) !== -1;
  }

  function insertDomLines(nodeToAddAfter, infoStructs) {
    let lastEntry;
    let lineStartOffset;
    if (infoStructs.length < 1) return;
    const startEntry = rep.lines.atKey(uniqueId(infoStructs[0].node));
    const endEntry = rep.lines.atKey(uniqueId(infoStructs[infoStructs.length - 1].node));
    const charStart = rep.lines.offsetOfEntry(startEntry);
    const charEnd = rep.lines.offsetOfEntry(endEntry) + endEntry.width;

    _.each(infoStructs, (info) => {
      const p2 = PROFILER('insertLine', false);
      const node = info.node;
      const key = uniqueId(node);
      let entry;
      p2.mark('findEntry');
      if (lastEntry) {
        // optimization to avoid recalculation
        const next = rep.lines.next(lastEntry);
        if (next && next.key == key) {
          entry = next;
          lineStartOffset += lastEntry.width;
        }
      }
      if (!entry) {
        p2.literal(1, 'nonopt');
        entry = rep.lines.atKey(key);
        lineStartOffset = rep.lines.offsetOfKey(key);
      } else { p2.literal(0, 'nonopt'); }
      lastEntry = entry;
      p2.mark('spans');
      getSpansForLine(entry, (tokenText, tokenClass) => {
        info.appendSpan(tokenText, tokenClass);
      }, lineStartOffset);
      p2.mark('addLine');
      info.prepareForAdd();
      entry.lineMarker = info.lineMarker;
      if (!nodeToAddAfter) {
        root.insertBefore(node, root.firstChild);
      } else {
        root.insertBefore(node, nodeToAddAfter.nextSibling);
      }
      nodeToAddAfter = node;
      info.notifyAdded();
      p2.mark('markClean');
      markNodeClean(node);
      p2.end();
    });
  }

  function isCaret() {
    return (rep.selStart && rep.selEnd && rep.selStart[0] == rep.selEnd[0] && rep.selStart[1] == rep.selEnd[1]);
  }
  editorInfo.ace_isCaret = isCaret;

  // prereq: isCaret()


  function caretLine() {
    return rep.selStart[0];
  }
  editorInfo.ace_caretLine = caretLine;

  function caretColumn() {
    return rep.selStart[1];
  }
  editorInfo.ace_caretColumn = caretColumn;

  function caretDocChar() {
    return rep.lines.offsetOfIndex(caretLine()) + caretColumn();
  }
  editorInfo.ace_caretDocChar = caretDocChar;

  function handleReturnIndentation() {
    // on return, indent to level of previous line
    if (isCaret() && caretColumn() === 0 && caretLine() > 0) {
      const lineNum = caretLine();
      const thisLine = rep.lines.atIndex(lineNum);
      const prevLine = rep.lines.prev(thisLine);
      const prevLineText = prevLine.text;
      let theIndent = /^ *(?:)/.exec(prevLineText)[0];
      const shouldIndent = parent.parent.clientVars.indentationOnNewLine;
      if (shouldIndent && /[\[\(\:\{]\s*$/.exec(prevLineText)) {
        theIndent += THE_TAB;
      }
      const cs = Changeset.builder(rep.lines.totalWidth()).keep(
          rep.lines.offsetOfIndex(lineNum), lineNum).insert(
          theIndent, [
            ['author', thisAuthor],
          ], rep.apool).toString();
      performDocumentApplyChangeset(cs);
      performSelectionChange([lineNum, theIndent.length], [lineNum, theIndent.length]);
    }
  }

  function getPointForLineAndChar(lineAndChar) {
    const line = lineAndChar[0];
    let charsLeft = lineAndChar[1];
    // Do not uncomment this in production it will break iFrames.
    // top.console.log("line: %d, key: %s, node: %o", line, rep.lines.atIndex(line).key,
    // getCleanNodeByKey(rep.lines.atIndex(line).key));
    const lineEntry = rep.lines.atIndex(line);
    charsLeft -= lineEntry.lineMarker;
    if (charsLeft < 0) {
      charsLeft = 0;
    }
    const lineNode = lineEntry.lineNode;
    let n = lineNode;
    let after = false;
    if (charsLeft === 0) {
      let index = 0;

      if (browser.msie && parseInt(browser.version) >= 11) {
        browser.msie = false; // Temp fix to resolve enter and backspace issues..
        // Note that this makes MSIE behave like modern browsers..
      }
      if (browser.msie && line == (rep.lines.length() - 1) && lineNode.childNodes.length === 0) {
        // best to stay at end of last empty div in IE
        index = 1;
      }
      return {
        node: lineNode,
        index,
        maxIndex: 1,
      };
    }
    while (!(n == lineNode && after)) {
      if (after) {
        if (n.nextSibling) {
          n = n.nextSibling;
          after = false;
        } else { n = n.parentNode; }
      } else if (isNodeText(n)) {
        const len = n.nodeValue.length;
        if (charsLeft <= len) {
          return {
            node: n,
            index: charsLeft,
            maxIndex: len,
          };
        }
        charsLeft -= len;
        after = true;
      } else if (n.firstChild) { n = n.firstChild; } else { after = true; }
    }
    return {
      node: lineNode,
      index: 1,
      maxIndex: 1,
    };
  }

  function nodeText(n) {
    if (browser.msie) {
	  return n.innerText;
    } else {
	  return n.textContent || n.nodeValue || '';
    }
  }

  function getLineAndCharForPoint(point) {
    // Turn DOM node selection into [line,char] selection.
    // This method has to work when the DOM is not pristine,
    // assuming the point is not in a dirty node.
    if (point.node == root) {
      if (point.index === 0) {
        return [0, 0];
      } else {
        const N = rep.lines.length();
        const ln = rep.lines.atIndex(N - 1);
        return [N - 1, ln.text.length];
      }
    } else {
      let n = point.node;
      let col = 0;
      // if this part fails, it probably means the selection node
      // was dirty, and we didn't see it when collecting dirty nodes.
      if (isNodeText(n)) {
        col = point.index;
      } else if (point.index > 0) {
        col = nodeText(n).length;
      }
      let parNode, prevSib;
      while ((parNode = n.parentNode) != root) {
        if ((prevSib = n.previousSibling)) {
          n = prevSib;
          col += nodeText(n).length;
        } else {
          n = parNode;
        }
      }
      if (n.firstChild && isBlockElement(n.firstChild)) {
        col += 1; // lineMarker
      }
      const lineEntry = rep.lines.atKey(n.id);
      const lineNum = rep.lines.indexOfEntry(lineEntry);
      return [lineNum, col];
    }
  }
  editorInfo.ace_getLineAndCharForPoint = getLineAndCharForPoint;

  function createDomLineEntry(lineString) {
    const info = doCreateDomLine(lineString.length > 0);
    const newNode = info.node;
    return {
      key: uniqueId(newNode),
      text: lineString,
      lineNode: newNode,
      domInfo: info,
      lineMarker: 0,
    };
  }

  function canApplyChangesetToDocument(changes) {
    return Changeset.oldLen(changes) == rep.alltext.length;
  }

  function performDocumentApplyChangeset(changes, insertsAfterSelection) {
    doRepApplyChangeset(changes, insertsAfterSelection);

    let requiredSelectionSetting = null;
    if (rep.selStart && rep.selEnd) {
      const selStartChar = rep.lines.offsetOfIndex(rep.selStart[0]) + rep.selStart[1];
      const selEndChar = rep.lines.offsetOfIndex(rep.selEnd[0]) + rep.selEnd[1];
      const result = Changeset.characterRangeFollow(changes, selStartChar, selEndChar, insertsAfterSelection);
      requiredSelectionSetting = [result[0], result[1], rep.selFocusAtStart];
    }

    const linesMutatee = {
      splice(start, numRemoved, newLinesVA) {
        const args = Array.prototype.slice.call(arguments, 2);
        domAndRepSplice(start, numRemoved, _.map(args, (s) => s.slice(0, -1)));
      },
      get(i) {
        return `${rep.lines.atIndex(i).text}\n`;
      },
      length() {
        return rep.lines.length();
      },
      slice_notused(start, end) {
        return _.map(rep.lines.slice(start, end), (e) => `${e.text}\n`);
      },
    };

    Changeset.mutateTextLines(changes, linesMutatee);

    if (requiredSelectionSetting) {
      performSelectionChange(lineAndColumnFromChar(requiredSelectionSetting[0]), lineAndColumnFromChar(requiredSelectionSetting[1]), requiredSelectionSetting[2]);
    }

    function domAndRepSplice(startLine, deleteCount, newLineStrings) {
      const keysToDelete = [];
      if (deleteCount > 0) {
        let entryToDelete = rep.lines.atIndex(startLine);
        for (let i = 0; i < deleteCount; i++) {
          keysToDelete.push(entryToDelete.key);
          entryToDelete = rep.lines.next(entryToDelete);
        }
      }

      const lineEntries = _.map(newLineStrings, createDomLineEntry);

      doRepLineSplice(startLine, deleteCount, lineEntries);

      let nodeToAddAfter;
      if (startLine > 0) {
        nodeToAddAfter = getCleanNodeByKey(rep.lines.atIndex(startLine - 1).key);
      } else { nodeToAddAfter = null; }

      insertDomLines(nodeToAddAfter, _.map(lineEntries, (entry) => entry.domInfo));

      _.each(keysToDelete, (k) => {
        const n = doc.getElementById(k);
        n.parentNode.removeChild(n);
      });

      if ((rep.selStart && rep.selStart[0] >= startLine && rep.selStart[0] <= startLine + deleteCount) || (rep.selEnd && rep.selEnd[0] >= startLine && rep.selEnd[0] <= startLine + deleteCount)) {
        currentCallStack.selectionAffected = true;
      }
    }
  }

  function doRepApplyChangeset(changes, insertsAfterSelection) {
    Changeset.checkRep(changes);

    if (Changeset.oldLen(changes) != rep.alltext.length) throw new Error(`doRepApplyChangeset length mismatch: ${Changeset.oldLen(changes)}/${rep.alltext.length}`);

    (function doRecordUndoInformation(changes) {
      const editEvent = currentCallStack.editEvent;
      if (editEvent.eventType == 'nonundoable') {
        if (!editEvent.changeset) {
          editEvent.changeset = changes;
        } else {
          editEvent.changeset = Changeset.compose(editEvent.changeset, changes, rep.apool);
        }
      } else {
        const inverseChangeset = Changeset.inverse(changes, {
          get(i) {
            return `${rep.lines.atIndex(i).text}\n`;
          },
          length() {
            return rep.lines.length();
          },
        }, rep.alines, rep.apool);

        if (!editEvent.backset) {
          editEvent.backset = inverseChangeset;
        } else {
          editEvent.backset = Changeset.compose(inverseChangeset, editEvent.backset, rep.apool);
        }
      }
    })(changes);

    // rep.alltext = Changeset.applyToText(changes, rep.alltext);
    Changeset.mutateAttributionLines(changes, rep.alines, rep.apool);

    if (changesetTracker.isTracking()) {
      changesetTracker.composeUserChangeset(changes);
    }
  }

  /*
    Converts the position of a char (index in String) into a [row, col] tuple
  */
  function lineAndColumnFromChar(x) {
    const lineEntry = rep.lines.atOffset(x);
    const lineStart = rep.lines.offsetOfEntry(lineEntry);
    const lineNum = rep.lines.indexOfEntry(lineEntry);
    return [lineNum, x - lineStart];
  }

  function performDocumentReplaceCharRange(startChar, endChar, newText) {
    if (startChar == endChar && newText.length === 0) {
      return;
    }
    // Requires that the replacement preserve the property that the
    // internal document text ends in a newline.  Given this, we
    // rewrite the splice so that it doesn't touch the very last
    // char of the document.
    if (endChar == rep.alltext.length) {
      if (startChar == endChar) {
        // an insert at end
        startChar--;
        endChar--;
        newText = `\n${newText.substring(0, newText.length - 1)}`;
      } else if (newText.length === 0) {
        // a delete at end
        startChar--;
        endChar--;
      } else {
        // a replace at end
        endChar--;
        newText = newText.substring(0, newText.length - 1);
      }
    }
    performDocumentReplaceRange(lineAndColumnFromChar(startChar), lineAndColumnFromChar(endChar), newText);
  }

  function performDocumentReplaceRange(start, end, newText) {
    if (start === undefined) start = rep.selStart;
    if (end === undefined) end = rep.selEnd;

    // dmesg(String([start.toSource(),end.toSource(),newText.toSource()]));
    // start[0]: <--- start[1] --->CCCCCCCCCCC\n
    //           CCCCCCCCCCCCCCCCCCCC\n
    //           CCCC\n
    // end[0]:   <CCC end[1] CCC>-------\n
    const builder = Changeset.builder(rep.lines.totalWidth());
    ChangesetUtils.buildKeepToStartOfRange(rep, builder, start);
    ChangesetUtils.buildRemoveRange(rep, builder, start, end);
    builder.insert(newText, [
      ['author', thisAuthor],
    ], rep.apool);
    const cs = builder.toString();

    performDocumentApplyChangeset(cs);
  }

  function performDocumentApplyAttributesToCharRange(start, end, attribs) {
    end = Math.min(end, rep.alltext.length - 1);
    documentAttributeManager.setAttributesOnRange(lineAndColumnFromChar(start), lineAndColumnFromChar(end), attribs);
  }
  editorInfo.ace_performDocumentApplyAttributesToCharRange = performDocumentApplyAttributesToCharRange;


  function setAttributeOnSelection(attributeName, attributeValue) {
    if (!(rep.selStart && rep.selEnd)) return;

    documentAttributeManager.setAttributesOnRange(rep.selStart, rep.selEnd, [
      [attributeName, attributeValue],
    ]);
  }
  editorInfo.ace_setAttributeOnSelection = setAttributeOnSelection;


  function getAttributeOnSelection(attributeName, prevChar) {
    if (!(rep.selStart && rep.selEnd)) return;
    const isNotSelection = (rep.selStart[0] == rep.selEnd[0] && rep.selEnd[1] === rep.selStart[1]);
    if (isNotSelection) {
      if (prevChar) {
        // If it's not the start of the line
        if (rep.selStart[1] !== 0) {
          rep.selStart[1]--;
        }
      }
    }

    const withIt = Changeset.makeAttribsString('+', [
      [attributeName, 'true'],
    ], rep.apool);
    const withItRegex = new RegExp(`${withIt.replace(/\*/g, '\\*')}(\\*|$)`);
    function hasIt(attribs) {
      return withItRegex.test(attribs);
    }

    return rangeHasAttrib(rep.selStart, rep.selEnd);

    function rangeHasAttrib(selStart, selEnd) {
      // if range is collapsed -> no attribs in range
      if (selStart[1] == selEnd[1] && selStart[0] == selEnd[0]) return false;

      if (selStart[0] != selEnd[0]) { // -> More than one line selected
        var hasAttrib = true;

        // from selStart to the end of the first line
        hasAttrib = hasAttrib && rangeHasAttrib(selStart, [selStart[0], rep.lines.atIndex(selStart[0]).text.length]);

        // for all lines in between
        for (let n = selStart[0] + 1; n < selEnd[0]; n++) {
          hasAttrib = hasAttrib && rangeHasAttrib([n, 0], [n, rep.lines.atIndex(n).text.length]);
        }

        // for the last, potentially partial, line
        hasAttrib = hasAttrib && rangeHasAttrib([selEnd[0], 0], [selEnd[0], selEnd[1]]);

        return hasAttrib;
      }

      // Logic tells us we now have a range on a single line

      const lineNum = selStart[0];
      const start = selStart[1];
      const end = selEnd[1];
      var hasAttrib = true;

      // Iterate over attribs on this line

      const opIter = Changeset.opIterator(rep.alines[lineNum]);
      let indexIntoLine = 0;

      while (opIter.hasNext()) {
        const op = opIter.next();
        const opStartInLine = indexIntoLine;
        const opEndInLine = opStartInLine + op.chars;
        if (!hasIt(op.attribs)) {
          // does op overlap selection?
          if (!(opEndInLine <= start || opStartInLine >= end)) {
            hasAttrib = false; // since it's overlapping but hasn't got the attrib -> range hasn't got it
            break;
          }
        }
        indexIntoLine = opEndInLine;
      }

      return hasAttrib;
    }
  }

  editorInfo.ace_getAttributeOnSelection = getAttributeOnSelection;

  function toggleAttributeOnSelection(attributeName) {
    if (!(rep.selStart && rep.selEnd)) return;

    let selectionAllHasIt = true;
    const withIt = Changeset.makeAttribsString('+', [
      [attributeName, 'true'],
    ], rep.apool);
    const withItRegex = new RegExp(`${withIt.replace(/\*/g, '\\*')}(\\*|$)`);

    function hasIt(attribs) {
      return withItRegex.test(attribs);
    }

    const selStartLine = rep.selStart[0];
    const selEndLine = rep.selEnd[0];
    for (let n = selStartLine; n <= selEndLine; n++) {
      const opIter = Changeset.opIterator(rep.alines[n]);
      let indexIntoLine = 0;
      let selectionStartInLine = 0;
      if (documentAttributeManager.lineHasMarker(n)) {
        selectionStartInLine = 1; // ignore "*" used as line marker
      }
      let selectionEndInLine = rep.lines.atIndex(n).text.length; // exclude newline
      if (n == selStartLine) {
        selectionStartInLine = rep.selStart[1];
      }
      if (n == selEndLine) {
        selectionEndInLine = rep.selEnd[1];
      }
      while (opIter.hasNext()) {
        const op = opIter.next();
        const opStartInLine = indexIntoLine;
        const opEndInLine = opStartInLine + op.chars;
        if (!hasIt(op.attribs)) {
          // does op overlap selection?
          if (!(opEndInLine <= selectionStartInLine || opStartInLine >= selectionEndInLine)) {
            selectionAllHasIt = false;
            break;
          }
        }
        indexIntoLine = opEndInLine;
      }
      if (!selectionAllHasIt) {
        break;
      }
    }


    const attributeValue = selectionAllHasIt ? '' : 'true';
    documentAttributeManager.setAttributesOnRange(rep.selStart, rep.selEnd, [[attributeName, attributeValue]]);
    if (attribIsFormattingStyle(attributeName)) {
      updateStyleButtonState(attributeName, !selectionAllHasIt); // italic, bold, ...
    }
  }
  editorInfo.ace_toggleAttributeOnSelection = toggleAttributeOnSelection;

  function performDocumentReplaceSelection(newText) {
    if (!(rep.selStart && rep.selEnd)) return;
    performDocumentReplaceRange(rep.selStart, rep.selEnd, newText);
  }

  // Change the abstract representation of the document to have a different set of lines.
  // Must be called after rep.alltext is set.


  function doRepLineSplice(startLine, deleteCount, newLineEntries) {
    _.each(newLineEntries, (entry) => {
      entry.width = entry.text.length + 1;
    });

    const startOldChar = rep.lines.offsetOfIndex(startLine);
    const endOldChar = rep.lines.offsetOfIndex(startLine + deleteCount);

    const oldRegionStart = rep.lines.offsetOfIndex(startLine);
    const oldRegionEnd = rep.lines.offsetOfIndex(startLine + deleteCount);
    rep.lines.splice(startLine, deleteCount, newLineEntries);
    currentCallStack.docTextChanged = true;
    currentCallStack.repChanged = true;
    const newRegionEnd = rep.lines.offsetOfIndex(startLine + newLineEntries.length);

    const newText = _.map(newLineEntries, (e) => `${e.text}\n`).join('');

    rep.alltext = rep.alltext.substring(0, startOldChar) + newText + rep.alltext.substring(endOldChar, rep.alltext.length);

    // var newTotalLength = rep.alltext.length;
    // rep.lexer.updateBuffer(rep.alltext, oldRegionStart, oldRegionEnd - oldRegionStart,
    // newRegionEnd - oldRegionStart);
  }

  function doIncorpLineSplice(startLine, deleteCount, newLineEntries, lineAttribs, hints) {
    const startOldChar = rep.lines.offsetOfIndex(startLine);
    const endOldChar = rep.lines.offsetOfIndex(startLine + deleteCount);

    const oldRegionStart = rep.lines.offsetOfIndex(startLine);

    let selStartHintChar, selEndHintChar;
    if (hints && hints.selStart) {
      selStartHintChar = rep.lines.offsetOfIndex(hints.selStart[0]) + hints.selStart[1] - oldRegionStart;
    }
    if (hints && hints.selEnd) {
      selEndHintChar = rep.lines.offsetOfIndex(hints.selEnd[0]) + hints.selEnd[1] - oldRegionStart;
    }

    const newText = _.map(newLineEntries, (e) => `${e.text}\n`).join('');
    const oldText = rep.alltext.substring(startOldChar, endOldChar);
    const oldAttribs = rep.alines.slice(startLine, startLine + deleteCount).join('');
    const newAttribs = `${lineAttribs.join('|1+1')}|1+1`; // not valid in a changeset
    const analysis = analyzeChange(oldText, newText, oldAttribs, newAttribs, selStartHintChar, selEndHintChar);
    const commonStart = analysis[0];
    let commonEnd = analysis[1];
    let shortOldText = oldText.substring(commonStart, oldText.length - commonEnd);
    let shortNewText = newText.substring(commonStart, newText.length - commonEnd);
    let spliceStart = startOldChar + commonStart;
    let spliceEnd = endOldChar - commonEnd;
    let shiftFinalNewlineToBeforeNewText = false;

    // adjust the splice to not involve the final newline of the document;
    // be very defensive
    if (shortOldText.charAt(shortOldText.length - 1) == '\n' && shortNewText.charAt(shortNewText.length - 1) == '\n') {
      // replacing text that ends in newline with text that also ends in newline
      // (still, after analysis, somehow)
      shortOldText = shortOldText.slice(0, -1);
      shortNewText = shortNewText.slice(0, -1);
      spliceEnd--;
      commonEnd++;
    }
    if (shortOldText.length === 0 && spliceStart == rep.alltext.length && shortNewText.length > 0) {
      // inserting after final newline, bad
      spliceStart--;
      spliceEnd--;
      shortNewText = `\n${shortNewText.slice(0, -1)}`;
      shiftFinalNewlineToBeforeNewText = true;
    }
    if (spliceEnd == rep.alltext.length && shortOldText.length > 0 && shortNewText.length === 0) {
      // deletion at end of rep.alltext
      if (rep.alltext.charAt(spliceStart - 1) == '\n') {
        // (if not then what the heck?  it will definitely lead
        // to a rep.alltext without a final newline)
        spliceStart--;
        spliceEnd--;
      }
    }

    if (!(shortOldText.length === 0 && shortNewText.length === 0)) {
      const oldDocText = rep.alltext;
      const oldLen = oldDocText.length;

      const spliceStartLine = rep.lines.indexOfOffset(spliceStart);
      const spliceStartLineStart = rep.lines.offsetOfIndex(spliceStartLine);

      const startBuilder = function () {
        const builder = Changeset.builder(oldLen);
        builder.keep(spliceStartLineStart, spliceStartLine);
        builder.keep(spliceStart - spliceStartLineStart);
        return builder;
      };

      const eachAttribRun = function (attribs, func /* (startInNewText, endInNewText, attribs)*/) {
        const attribsIter = Changeset.opIterator(attribs);
        let textIndex = 0;
        const newTextStart = commonStart;
        const newTextEnd = newText.length - commonEnd - (shiftFinalNewlineToBeforeNewText ? 1 : 0);
        while (attribsIter.hasNext()) {
          const op = attribsIter.next();
          const nextIndex = textIndex + op.chars;
          if (!(nextIndex <= newTextStart || textIndex >= newTextEnd)) {
            func(Math.max(newTextStart, textIndex), Math.min(newTextEnd, nextIndex), op.attribs);
          }
          textIndex = nextIndex;
        }
      };

      const justApplyStyles = (shortNewText == shortOldText);
      let theChangeset;

      if (justApplyStyles) {
        // create changeset that clears the incorporated styles on
        // the existing text.  we compose this with the
        // changeset the applies the styles found in the DOM.
        // This allows us to incorporate, e.g., Safari's native "unbold".
        const incorpedAttribClearer = cachedStrFunc((oldAtts) => Changeset.mapAttribNumbers(oldAtts, (n) => {
          const k = rep.apool.getAttribKey(n);
          if (isStyleAttribute(k)) {
            return rep.apool.putAttrib([k, '']);
          }
          return false;
        }));

        const builder1 = startBuilder();
        if (shiftFinalNewlineToBeforeNewText) {
          builder1.keep(1, 1);
        }
        eachAttribRun(oldAttribs, (start, end, attribs) => {
          builder1.keepText(newText.substring(start, end), incorpedAttribClearer(attribs));
        });
        const clearer = builder1.toString();

        const builder2 = startBuilder();
        if (shiftFinalNewlineToBeforeNewText) {
          builder2.keep(1, 1);
        }
        eachAttribRun(newAttribs, (start, end, attribs) => {
          builder2.keepText(newText.substring(start, end), attribs);
        });
        const styler = builder2.toString();

        theChangeset = Changeset.compose(clearer, styler, rep.apool);
      } else {
        const builder = startBuilder();

        const spliceEndLine = rep.lines.indexOfOffset(spliceEnd);
        const spliceEndLineStart = rep.lines.offsetOfIndex(spliceEndLine);
        if (spliceEndLineStart > spliceStart) {
          builder.remove(spliceEndLineStart - spliceStart, spliceEndLine - spliceStartLine);
          builder.remove(spliceEnd - spliceEndLineStart);
        } else {
          builder.remove(spliceEnd - spliceStart);
        }

        let isNewTextMultiauthor = false;
        const authorAtt = Changeset.makeAttribsString('+', (thisAuthor ? [
          ['author', thisAuthor],
        ] : []), rep.apool);
        const authorizer = cachedStrFunc((oldAtts) => {
          if (isNewTextMultiauthor) {
            // prefer colors from DOM
            return Changeset.composeAttributes(authorAtt, oldAtts, true, rep.apool);
          } else {
            // use this author's color
            return Changeset.composeAttributes(oldAtts, authorAtt, true, rep.apool);
          }
        });

        let foundDomAuthor = '';
        eachAttribRun(newAttribs, (start, end, attribs) => {
          const a = Changeset.attribsAttributeValue(attribs, 'author', rep.apool);
          if (a && a != foundDomAuthor) {
            if (!foundDomAuthor) {
              foundDomAuthor = a;
            } else {
              isNewTextMultiauthor = true; // multiple authors in DOM!
            }
          }
        });

        if (shiftFinalNewlineToBeforeNewText) {
          builder.insert('\n', authorizer(''));
        }

        eachAttribRun(newAttribs, (start, end, attribs) => {
          builder.insert(newText.substring(start, end), authorizer(attribs));
        });
        theChangeset = builder.toString();
      }

      // dmesg(htmlPrettyEscape(theChangeset));
      doRepApplyChangeset(theChangeset);
    }

    // do this no matter what, because we need to get the right
    // line keys into the rep.
    doRepLineSplice(startLine, deleteCount, newLineEntries);
  }

  function cachedStrFunc(func) {
    const cache = {};
    return function (s) {
      if (!cache[s]) {
        cache[s] = func(s);
      }
      return cache[s];
    };
  }

  function analyzeChange(oldText, newText, oldAttribs, newAttribs, optSelStartHint, optSelEndHint) {
    // we need to take into account both the styles attributes & attributes defined by
    // the plugins, so basically we can ignore only the default line attribs used by
    // Etherpad
    function incorpedAttribFilter(anum) {
      return !isDefaultLineAttribute(rep.apool.getAttribKey(anum));
    }

    function attribRuns(attribs) {
      const lengs = [];
      const atts = [];
      const iter = Changeset.opIterator(attribs);
      while (iter.hasNext()) {
        const op = iter.next();
        lengs.push(op.chars);
        atts.push(op.attribs);
      }
      return [lengs, atts];
    }

    function attribIterator(runs, backward) {
      const lengs = runs[0];
      const atts = runs[1];
      let i = (backward ? lengs.length - 1 : 0);
      let j = 0;
      return function next() {
        while (j >= lengs[i]) {
          if (backward) i--;
          else i++;
          j = 0;
        }
        const a = atts[i];
        j++;
        return a;
      };
    }

    const oldLen = oldText.length;
    const newLen = newText.length;
    const minLen = Math.min(oldLen, newLen);

    const oldARuns = attribRuns(Changeset.filterAttribNumbers(oldAttribs, incorpedAttribFilter));
    const newARuns = attribRuns(Changeset.filterAttribNumbers(newAttribs, incorpedAttribFilter));

    let commonStart = 0;
    const oldStartIter = attribIterator(oldARuns, false);
    const newStartIter = attribIterator(newARuns, false);
    while (commonStart < minLen) {
      if (oldText.charAt(commonStart) == newText.charAt(commonStart) && oldStartIter() == newStartIter()) {
        commonStart++;
      } else { break; }
    }

    let commonEnd = 0;
    const oldEndIter = attribIterator(oldARuns, true);
    const newEndIter = attribIterator(newARuns, true);
    while (commonEnd < minLen) {
      if (commonEnd === 0) {
        // assume newline in common
        oldEndIter();
        newEndIter();
        commonEnd++;
      } else if (oldText.charAt(oldLen - 1 - commonEnd) == newText.charAt(newLen - 1 - commonEnd) && oldEndIter() == newEndIter()) {
        commonEnd++;
      } else { break; }
    }

    let hintedCommonEnd = -1;
    if ((typeof optSelEndHint) === 'number') {
      hintedCommonEnd = newLen - optSelEndHint;
    }


    if (commonStart + commonEnd > oldLen) {
      // ambiguous insertion
      var minCommonEnd = oldLen - commonStart;
      var maxCommonEnd = commonEnd;
      if (hintedCommonEnd >= minCommonEnd && hintedCommonEnd <= maxCommonEnd) {
        commonEnd = hintedCommonEnd;
      } else {
        commonEnd = minCommonEnd;
      }
      commonStart = oldLen - commonEnd;
    }
    if (commonStart + commonEnd > newLen) {
      // ambiguous deletion
      var minCommonEnd = newLen - commonStart;
      var maxCommonEnd = commonEnd;
      if (hintedCommonEnd >= minCommonEnd && hintedCommonEnd <= maxCommonEnd) {
        commonEnd = hintedCommonEnd;
      } else {
        commonEnd = minCommonEnd;
      }
      commonStart = newLen - commonEnd;
    }

    return [commonStart, commonEnd];
  }

  function equalLineAndChars(a, b) {
    if (!a) return !b;
    if (!b) return !a;
    return (a[0] == b[0] && a[1] == b[1]);
  }

  function performSelectionChange(selectStart, selectEnd, focusAtStart) {
    if (repSelectionChange(selectStart, selectEnd, focusAtStart)) {
      currentCallStack.selectionAffected = true;
    }
  }
  editorInfo.ace_performSelectionChange = performSelectionChange;

  // Change the abstract representation of the document to have a different selection.
  // Should not rely on the line representation.  Should not affect the DOM.


  function repSelectionChange(selectStart, selectEnd, focusAtStart) {
    focusAtStart = !!focusAtStart;

    const newSelFocusAtStart = (focusAtStart && ((!selectStart) || (!selectEnd) || (selectStart[0] != selectEnd[0]) || (selectStart[1] != selectEnd[1])));

    if ((!equalLineAndChars(rep.selStart, selectStart)) || (!equalLineAndChars(rep.selEnd, selectEnd)) || (rep.selFocusAtStart != newSelFocusAtStart)) {
      rep.selStart = selectStart;
      rep.selEnd = selectEnd;
      rep.selFocusAtStart = newSelFocusAtStart;
      currentCallStack.repChanged = true;

      // select the formatting buttons when there is the style applied on selection
      selectFormattingButtonIfLineHasStyleApplied(rep);

      hooks.callAll('aceSelectionChanged', {
        rep,
        callstack: currentCallStack,
        documentAttributeManager,
      });

      // we scroll when user places the caret at the last line of the pad
      // when this settings is enabled
      const docTextChanged = currentCallStack.docTextChanged;
      if (!docTextChanged) {
        const isScrollableEvent = !isPadLoading(currentCallStack.type) && isScrollableEditEvent(currentCallStack.type);
        const innerHeight = getInnerHeight();
        scroll.scrollWhenCaretIsInTheLastLineOfViewportWhenNecessary(rep, isScrollableEvent, innerHeight);
      }

      return true;
      // Do not uncomment this in production it will break iFrames.
      // top.console.log("selStart: %o, selEnd: %o, focusAtStart: %s", rep.selStart, rep.selEnd,
      // String(!!rep.selFocusAtStart));
    }
    return false;
  // Do not uncomment this in production it will break iFrames.
  // top.console.log("%o %o %s", rep.selStart, rep.selEnd, rep.selFocusAtStart);
  }

  function isPadLoading(eventType) {
    return (eventType === 'setup') || (eventType === 'setBaseText') || (eventType === 'importText');
  }

  function updateStyleButtonState(attribName, hasStyleOnRepSelection) {
    const $formattingButton = parent.parent.$(`[data-key="${attribName}"]`).find('a');
    $formattingButton.toggleClass(SELECT_BUTTON_CLASS, hasStyleOnRepSelection);
  }

  function attribIsFormattingStyle(attributeName) {
    return _.contains(FORMATTING_STYLES, attributeName);
  }

  function selectFormattingButtonIfLineHasStyleApplied(rep) {
    _.each(FORMATTING_STYLES, (style) => {
      const hasStyleOnRepSelection = documentAttributeManager.hasAttributeOnSelectionOrCaretPosition(style);
      updateStyleButtonState(style, hasStyleOnRepSelection);
    });
  }

  function doCreateDomLine(nonEmpty) {
    if (browser.msie && (!nonEmpty)) {
      const result = {
        node: null,
        appendSpan: noop,
        prepareForAdd: noop,
        notifyAdded: noop,
        clearSpans: noop,
        finishUpdate: noop,
        lineMarker: 0,
      };

      const lineElem = doc.createElement('div');
      result.node = lineElem;

      result.notifyAdded = function () {
        // magic -- settng an empty div's innerHTML to the empty string
        // keeps it from collapsing.  Apparently innerHTML must be set *after*
        // adding the node to the DOM.
        // Such a div is what IE 6 creates naturally when you make a blank line
        // in a document of divs.  However, when copy-and-pasted the div will
        // contain a space, so we note its emptiness with a property.
        lineElem.innerHTML = ' '; // Frist we set a value that isnt blank
        // a primitive-valued property survives copy-and-paste
        setAssoc(lineElem, 'shouldBeEmpty', true);
        // an object property doesn't
        setAssoc(lineElem, 'unpasted', {});
        lineElem.innerHTML = ''; // Then we make it blank..  New line and no space = Awesome :)
      };
      let lineClass = 'ace-line';
      result.appendSpan = function (txt, cls) {
        if ((!txt) && cls) {
          // gain a whole-line style (currently to show insertion point in CSS)
          lineClass = domline.addToLineClass(lineClass, cls);
        }
        // otherwise, ignore appendSpan, this is an empty line
      };
      result.clearSpans = function () {
        lineClass = ''; // non-null to cause update
      };

      const writeClass = function () {
        if (lineClass !== null) lineElem.className = lineClass;
      };

      result.prepareForAdd = writeClass;
      result.finishUpdate = writeClass;
      result.getInnerHTML = function () {
        return '';
      };
      return result;
    } else {
      return domline.createDomLine(nonEmpty, doesWrap, browser, doc);
    }
  }

  function textify(str) {
    return str.replace(/[\n\r ]/g, ' ').replace(/\xa0/g, ' ').replace(/\t/g, '        ');
  }

  const _blockElems = {
    div: 1,
    p: 1,
    pre: 1,
    li: 1,
    ol: 1,
    ul: 1,
  };

  _.each(hooks.callAll('aceRegisterBlockElements'), (element) => {
    _blockElems[element] = 1;
  });

  function isBlockElement(n) {
    return !!_blockElems[(n.tagName || '').toLowerCase()];
  }

  function getDirtyRanges() {
    // based on observedChanges, return a list of ranges of original lines
    // that need to be removed or replaced with new user content to incorporate
    // the user's changes into the line representation.  ranges may be zero-length,
    // indicating inserted content.  for example, [0,0] means content was inserted
    // at the top of the document, while [3,4] means line 3 was deleted, modified,
    // or replaced with one or more new lines of content. ranges do not touch.
    const p = PROFILER('getDirtyRanges', false);
    p.forIndices = 0;
    p.consecutives = 0;
    p.corrections = 0;

    const cleanNodeForIndexCache = {};
    const N = rep.lines.length(); // old number of lines


    function cleanNodeForIndex(i) {
      // if line (i) in the un-updated line representation maps to a clean node
      // in the document, return that node.
      // if (i) is out of bounds, return true. else return false.
      if (cleanNodeForIndexCache[i] === undefined) {
        p.forIndices++;
        let result;
        if (i < 0 || i >= N) {
          result = true; // truthy, but no actual node
        } else {
          const key = rep.lines.atIndex(i).key;
          result = (getCleanNodeByKey(key) || false);
        }
        cleanNodeForIndexCache[i] = result;
      }
      return cleanNodeForIndexCache[i];
    }
    const isConsecutiveCache = {};

    function isConsecutive(i) {
      if (isConsecutiveCache[i] === undefined) {
        p.consecutives++;
        isConsecutiveCache[i] = (function () {
          // returns whether line (i) and line (i-1), assumed to be map to clean DOM nodes,
          // or document boundaries, are consecutive in the changed DOM
          const a = cleanNodeForIndex(i - 1);
          const b = cleanNodeForIndex(i);
          if ((!a) || (!b)) return false; // violates precondition
          if ((a === true) && (b === true)) return !root.firstChild;
          if ((a === true) && b.previousSibling) return false;
          if ((b === true) && a.nextSibling) return false;
          if ((a === true) || (b === true)) return true;
          return a.nextSibling == b;
        })();
      }
      return isConsecutiveCache[i];
    }

    function isClean(i) {
      // returns whether line (i) in the un-updated representation maps to a clean node,
      // or is outside the bounds of the document
      return !!cleanNodeForIndex(i);
    }
    // list of pairs, each representing a range of lines that is clean and consecutive
    // in the changed DOM.  lines (-1) and (N) are always clean, but may or may not
    // be consecutive with lines in the document.  pairs are in sorted order.
    const cleanRanges = [
      [-1, N + 1],
    ];

    function rangeForLine(i) {
      // returns index of cleanRange containing i, or -1 if none
      let answer = -1;
      _.each(cleanRanges, (r, idx) => {
        if (i >= r[1]) return false; // keep looking
        if (i < r[0]) return true; // not found, stop looking
        answer = idx;
        return true; // found, stop looking
      });
      return answer;
    }

    function removeLineFromRange(rng, line) {
      // rng is index into cleanRanges, line is line number
      // precond: line is in rng
      const a = cleanRanges[rng][0];
      const b = cleanRanges[rng][1];
      if ((a + 1) == b) cleanRanges.splice(rng, 1);
      else if (line == a) cleanRanges[rng][0]++;
      else if (line == (b - 1)) cleanRanges[rng][1]--;
      else cleanRanges.splice(rng, 1, [a, line], [line + 1, b]);
    }

    function splitRange(rng, pt) {
      // precond: pt splits cleanRanges[rng] into two non-empty ranges
      const a = cleanRanges[rng][0];
      const b = cleanRanges[rng][1];
      cleanRanges.splice(rng, 1, [a, pt], [pt, b]);
    }
    const correctedLines = {};

    function correctlyAssignLine(line) {
      if (correctedLines[line]) return true;
      p.corrections++;
      correctedLines[line] = true;
      // "line" is an index of a line in the un-updated rep.
      // returns whether line was already correctly assigned (i.e. correctly
      // clean or dirty, according to cleanRanges, and if clean, correctly
      // attached or not attached (i.e. in the same range as) the prev and next lines).
      const rng = rangeForLine(line);
      const lineClean = isClean(line);
      if (rng < 0) {
        if (lineClean) {
          // somehow lost clean line
        }
        return true;
      }
      if (!lineClean) {
        // a clean-range includes this dirty line, fix it
        removeLineFromRange(rng, line);
        return false;
      } else {
        // line is clean, but could be wrongly connected to a clean line
        // above or below
        const a = cleanRanges[rng][0];
        const b = cleanRanges[rng][1];
        let didSomething = false;
        // we'll leave non-clean adjacent nodes in the clean range for the caller to
        // detect and deal with.  we deal with whether the range should be split
        // just above or just below this line.
        if (a < line && isClean(line - 1) && !isConsecutive(line)) {
          splitRange(rng, line);
          didSomething = true;
        }
        if (b > (line + 1) && isClean(line + 1) && !isConsecutive(line + 1)) {
          splitRange(rng, line + 1);
          didSomething = true;
        }
        return !didSomething;
      }
    }

    function detectChangesAroundLine(line, reqInARow) {
      // make sure cleanRanges is correct about line number "line" and the surrounding
      // lines; only stops checking at end of document or after no changes need
      // making for several consecutive lines. note that iteration is over old lines,
      // so this operation takes time proportional to the number of old lines
      // that are changed or missing, not the number of new lines inserted.
      let correctInARow = 0;
      let currentIndex = line;
      while (correctInARow < reqInARow && currentIndex >= 0) {
        if (correctlyAssignLine(currentIndex)) {
          correctInARow++;
        } else { correctInARow = 0; }
        currentIndex--;
      }
      correctInARow = 0;
      currentIndex = line;
      while (correctInARow < reqInARow && currentIndex < N) {
        if (correctlyAssignLine(currentIndex)) {
          correctInARow++;
        } else { correctInARow = 0; }
        currentIndex++;
      }
    }

    if (N === 0) {
      p.cancel();
      if (!isConsecutive(0)) {
        splitRange(0, 0);
      }
    } else {
      p.mark('topbot');
      detectChangesAroundLine(0, 1);
      detectChangesAroundLine(N - 1, 1);

      p.mark('obs');
      for (const k in observedChanges.cleanNodesNearChanges) {
        const key = k.substring(1);
        if (rep.lines.containsKey(key)) {
          const line = rep.lines.indexOfKey(key);
          detectChangesAroundLine(line, 2);
        }
      }
      p.mark('stats&calc');
      p.literal(p.forIndices, 'byidx');
      p.literal(p.consecutives, 'cons');
      p.literal(p.corrections, 'corr');
    }

    const dirtyRanges = [];
    for (let r = 0; r < cleanRanges.length - 1; r++) {
      dirtyRanges.push([cleanRanges[r][1], cleanRanges[r + 1][0]]);
    }

    p.end();

    return dirtyRanges;
  }

  function markNodeClean(n) {
    // clean nodes have knownHTML that matches their innerHTML
    const dirtiness = {};
    dirtiness.nodeId = uniqueId(n);
    dirtiness.knownHTML = n.innerHTML;
    if (browser.msie) {
      // adding a space to an "empty" div in IE designMode doesn't
      // change the innerHTML of the div's parent; also, other
      // browsers don't support innerText
      dirtiness.knownText = n.innerText;
    }
    setAssoc(n, 'dirtiness', dirtiness);
  }

  function isNodeDirty(n) {
    const p = PROFILER('cleanCheck', false);
    if (n.parentNode != root) return true;
    const data = getAssoc(n, 'dirtiness');
    if (!data) return true;
    if (n.id !== data.nodeId) return true;
    if (browser.msie) {
      if (n.innerText !== data.knownText) return true;
    }
    if (n.innerHTML !== data.knownHTML) return true;
    p.end();
    return false;
  }

  function getViewPortTopBottom() {
    const theTop = scroll.getScrollY();
    const doc = outerWin.document;
    const height = doc.documentElement.clientHeight; // includes padding

    // we have to get the exactly height of the viewport. So it has to subtract all the values which changes
    // the viewport height (E.g. padding, position top)
    const viewportExtraSpacesAndPosition = getEditorPositionTop() + getPaddingTopAddedWhenPageViewIsEnable();
    return {
      top: theTop,
      bottom: (theTop + height - viewportExtraSpacesAndPosition),
    };
  }


  function getEditorPositionTop() {
    const editor = parent.document.getElementsByTagName('iframe');
    const editorPositionTop = editor[0].offsetTop;
    return editorPositionTop;
  }

  // ep_page_view adds padding-top, which makes the viewport smaller
  function getPaddingTopAddedWhenPageViewIsEnable() {
    const rootDocument = parent.parent.document;
    const aceOuter = rootDocument.getElementsByName('ace_outer');
    const aceOuterPaddingTop = parseInt($(aceOuter).css('padding-top'));
    return aceOuterPaddingTop;
  }

  function handleCut(evt) {
    inCallStackIfNecessary('handleCut', () => {
      doDeleteKey(evt);
    });
    return true;
  }

  function handleClick(evt) {
    inCallStackIfNecessary('handleClick', () => {
      idleWorkTimer.atMost(200);
    });

    function isLink(n) {
      return (n.tagName || '').toLowerCase() == 'a' && n.href;
    }

    // only want to catch left-click
    if ((!evt.ctrlKey) && (evt.button != 2) && (evt.button != 3)) {
      // find A tag with HREF
      let n = evt.target;
      while (n && n.parentNode && !isLink(n)) {
        n = n.parentNode;
      }
      if (n && isLink(n)) {
        try {
          window.open(n.href, '_blank', 'noopener,noreferrer');
        } catch (e) {
          // absorb "user canceled" error in IE for certain prompts
        }
        evt.preventDefault();
      }
    }

    hideEditBarDropdowns();
  }

  function hideEditBarDropdowns() {
    if (window.parent.parent.padeditbar) { // required in case its in an iframe should probably use parent..  See Issue 327 https://github.com/ether/etherpad-lite/issues/327
      window.parent.parent.padeditbar.toggleDropDown('none');
    }
  }

  function doReturnKey() {
    if (!(rep.selStart && rep.selEnd)) {
      return;
    }

    const lineNum = rep.selStart[0];
    let listType = getLineListType(lineNum);

    if (listType) {
      const text = rep.lines.atIndex(lineNum).text;
      listType = /([a-z]+)([0-9]+)/.exec(listType);
      const type = listType[1];
      const level = Number(listType[2]);

      // detect empty list item; exclude indentation
      if (text === '*' && type !== 'indent') {
        // if not already on the highest level
        if (level > 1) {
          setLineListType(lineNum, type + (level - 1));// automatically decrease the level
        } else {
          setLineListType(lineNum, '');// remove the list
          renumberList(lineNum + 1);// trigger renumbering of list that may be right after
        }
      } else if (lineNum + 1 <= rep.lines.length()) {
        performDocumentReplaceSelection('\n');
        setLineListType(lineNum + 1, type + level);
      }
    } else {
      performDocumentReplaceSelection('\n');
      handleReturnIndentation();
    }
  }

  function doIndentOutdent(isOut) {
    if (!((rep.selStart && rep.selEnd) ||
        ((rep.selStart[0] == rep.selEnd[0]) && (rep.selStart[1] == rep.selEnd[1]) && rep.selEnd[1] > 1)) &&
        (isOut != true)
    ) {
      return false;
    }

    let firstLine, lastLine;
    firstLine = rep.selStart[0];
    lastLine = Math.max(firstLine, rep.selEnd[0] - ((rep.selEnd[1] === 0) ? 1 : 0));
    const mods = [];
    for (let n = firstLine; n <= lastLine; n++) {
      let listType = getLineListType(n);
      let t = 'indent';
      let level = 0;
      if (listType) {
        listType = /([a-z]+)([0-9]+)/.exec(listType);
        if (listType) {
          t = listType[1];
          level = Number(listType[2]);
        }
      }
      const newLevel = Math.max(0, Math.min(MAX_LIST_LEVEL, level + (isOut ? -1 : 1)));
      if (level != newLevel) {
        mods.push([n, (newLevel > 0) ? t + newLevel : '']);
      }
    }

    _.each(mods, (mod) => {
      setLineListType(mod[0], mod[1]);
    });
    return true;
  }
  editorInfo.ace_doIndentOutdent = doIndentOutdent;

  function doTabKey(shiftDown) {
    if (!doIndentOutdent(shiftDown)) {
      performDocumentReplaceSelection(THE_TAB);
    }
  }

  function doDeleteKey(optEvt) {
    const evt = optEvt || {};
    let handled = false;
    if (rep.selStart) {
      if (isCaret()) {
        const lineNum = caretLine();
        const col = caretColumn();
        var lineEntry = rep.lines.atIndex(lineNum);
        const lineText = lineEntry.text;
        const lineMarker = lineEntry.lineMarker;
        if (/^ +$/.exec(lineText.substring(lineMarker, col))) {
          const col2 = col - lineMarker;
          const tabSize = THE_TAB.length;
          const toDelete = ((col2 - 1) % tabSize) + 1;
          performDocumentReplaceRange([lineNum, col - toDelete], [lineNum, col], '');
          // scrollSelectionIntoView();
          handled = true;
        }
      }
      if (!handled) {
        if (isCaret()) {
          const theLine = caretLine();
          var lineEntry = rep.lines.atIndex(theLine);
          if (caretColumn() <= lineEntry.lineMarker) {
            // delete at beginning of line
            const action = 'delete_newline';
            const prevLineListType = (theLine > 0 ? getLineListType(theLine - 1) : '');
            const thisLineListType = getLineListType(theLine);
            const prevLineEntry = (theLine > 0 && rep.lines.atIndex(theLine - 1));
            const prevLineBlank = (prevLineEntry && prevLineEntry.text.length == prevLineEntry.lineMarker);

            const thisLineHasMarker = documentAttributeManager.lineHasMarker(theLine);

            if (thisLineListType) {
              // this line is a list
              if (prevLineBlank && !prevLineListType) {
                // previous line is blank, remove it
                performDocumentReplaceRange([theLine - 1, prevLineEntry.text.length], [theLine, 0], '');
              } else {
                // delistify
                performDocumentReplaceRange([theLine, 0], [theLine, lineEntry.lineMarker], '');
              }
            } else if (thisLineHasMarker && prevLineEntry) {
              // If the line has any attributes assigned, remove them by removing the marker '*'
              performDocumentReplaceRange([theLine - 1, prevLineEntry.text.length], [theLine, lineEntry.lineMarker], '');
            } else if (theLine > 0) {
              // remove newline
              performDocumentReplaceRange([theLine - 1, prevLineEntry.text.length], [theLine, 0], '');
            }
          } else {
            const docChar = caretDocChar();
            if (docChar > 0) {
              if (evt.metaKey || evt.ctrlKey || evt.altKey) {
                // delete as many unicode "letters or digits" in a row as possible;
                // always delete one char, delete further even if that first char
                // isn't actually a word char.
                let deleteBackTo = docChar - 1;
                while (deleteBackTo > lineEntry.lineMarker && isWordChar(rep.alltext.charAt(deleteBackTo - 1))) {
                  deleteBackTo--;
                }
                performDocumentReplaceCharRange(deleteBackTo, docChar, '');
              } else {
                // normal delete
                performDocumentReplaceCharRange(docChar - 1, docChar, '');
              }
            }
          }
        } else {
          performDocumentReplaceSelection('');
        }
      }
    }
    // if the list has been removed, it is necessary to renumber
    // starting from the *next* line because the list may have been
    // separated. If it returns null, it means that the list was not cut, try
    // from the current one.
    const line = caretLine();
    if (line != -1 && renumberList(line + 1) === null) {
      renumberList(line);
    }
  }

  // set of "letter or digit" chars is based on section 20.5.16 of the original Java Language Spec
  const REGEX_WORDCHAR = /[\u0030-\u0039\u0041-\u005A\u0061-\u007A\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u00FF\u0100-\u1FFF\u3040-\u9FFF\uF900-\uFDFF\uFE70-\uFEFE\uFF10-\uFF19\uFF21-\uFF3A\uFF41-\uFF5A\uFF66-\uFFDC]/;
  const REGEX_SPACE = /\s/;

  function isWordChar(c) {
    return !!REGEX_WORDCHAR.exec(c);
  }
  editorInfo.ace_isWordChar = isWordChar;

  function isSpaceChar(c) {
    return !!REGEX_SPACE.exec(c);
  }

  function moveByWordInLine(lineText, initialIndex, forwardNotBack) {
    let i = initialIndex;

    function nextChar() {
      if (forwardNotBack) return lineText.charAt(i);
      else return lineText.charAt(i - 1);
    }

    function advance() {
      if (forwardNotBack) i++;
      else i--;
    }

    function isDone() {
      if (forwardNotBack) return i >= lineText.length;
      else return i <= 0;
    }

    // On Mac and Linux, move right moves to end of word and move left moves to start;
    // on Windows, always move to start of word.
    // On Windows, Firefox and IE disagree on whether to stop for punctuation (FF says no).
    if (browser.msie && forwardNotBack) {
      while ((!isDone()) && isWordChar(nextChar())) {
        advance();
      }
      while ((!isDone()) && !isWordChar(nextChar())) {
        advance();
      }
    } else {
      while ((!isDone()) && !isWordChar(nextChar())) {
        advance();
      }
      while ((!isDone()) && isWordChar(nextChar())) {
        advance();
      }
    }

    return i;
  }

  function handleKeyEvent(evt) {
    if (!isEditable) return;
    const type = evt.type;
    const charCode = evt.charCode;
    const keyCode = evt.keyCode;
    const which = evt.which;
    const altKey = evt.altKey;
    const shiftKey = evt.shiftKey;

    // Is caret potentially hidden by the chat button?
    const myselection = document.getSelection(); // get the current caret selection
    const caretOffsetTop = myselection.focusNode.parentNode.offsetTop | myselection.focusNode.offsetTop; // get the carets selection offset in px IE 214

    if (myselection.focusNode.wholeText) { // Is there any content?  If not lineHeight will report wrong..
      var lineHeight = myselection.focusNode.parentNode.offsetHeight; // line height of populated links
    } else {
      var lineHeight = myselection.focusNode.offsetHeight; // line height of blank lines
    }

    // dmesg("keyevent type: "+type+", which: "+which);
    // Don't take action based on modifier keys going up and down.
    // Modifier keys do not generate "keypress" events.
    // 224 is the command-key under Mac Firefox.
    // 91 is the Windows key in IE; it is ASCII for open-bracket but isn't the keycode for that key
    // 20 is capslock in IE.
    const isModKey = ((!charCode) && ((type == 'keyup') || (type == 'keydown')) && (keyCode == 16 || keyCode == 17 || keyCode == 18 || keyCode == 20 || keyCode == 224 || keyCode == 91));
    if (isModKey) return;

    // If the key is a keypress and the browser is opera and the key is enter, do nothign at all as this fires twice.
    if (keyCode == 13 && browser.opera && (type == 'keypress')) {
      return; // This stops double enters in Opera but double Tabs still show on single tab keypress, adding keyCode == 9 to this doesn't help as the event is fired twice
    }
    let specialHandled = false;
    const isTypeForSpecialKey = ((browser.msie || browser.safari || browser.chrome || browser.firefox) ? (type == 'keydown') : (type == 'keypress'));
    const isTypeForCmdKey = ((browser.msie || browser.safari || browser.chrome || browser.firefox) ? (type == 'keydown') : (type == 'keypress'));
    let stopped = false;

    inCallStackIfNecessary('handleKeyEvent', function () {
      if (type == 'keypress' || (isTypeForSpecialKey && keyCode == 13 /* return*/)) {
        // in IE, special keys don't send keypress, the keydown does the action
        if (!outsideKeyPress(evt)) {
          evt.preventDefault();
          stopped = true;
        }
      } else if (evt.key === 'Dead') {
        // If it's a dead key we don't want to do any Etherpad behavior.
        stopped = true;
        return true;
      } else if (type == 'keydown') {
        outsideKeyDown(evt);
      }
      if (!stopped) {
        const specialHandledInHook = hooks.callAll('aceKeyEvent', {
          callstack: currentCallStack,
          editorInfo,
          rep,
          documentAttributeManager,
          evt,
        });

        // if any hook returned true, set specialHandled with true
        if (specialHandledInHook) {
          specialHandled = _.contains(specialHandledInHook, true);
        }

        const padShortcutEnabled = parent.parent.clientVars.padShortcutEnabled;
        if ((!specialHandled) && altKey && isTypeForSpecialKey && keyCode == 120 && padShortcutEnabled.altF9) {
          // Alt F9 focuses on the File Menu and/or editbar.
          // Note that while most editors use Alt F10 this is not desirable
          // As ubuntu cannot use Alt F10....
          // Focus on the editbar. -- TODO: Move Focus back to previous state (we know it so we can use it)
          const firstEditbarElement = parent.parent.$('#editbar').children('ul').first().children().first().children().first().children().first();
          $(this).blur();
          firstEditbarElement.focus();
          evt.preventDefault();
        }
        if ((!specialHandled) && altKey && keyCode == 67 && type === 'keydown' && padShortcutEnabled.altC) {
          // Alt c focuses on the Chat window
          $(this).blur();
          parent.parent.chat.show();
          parent.parent.$('#chatinput').focus();
          evt.preventDefault();
        }
        if ((!specialHandled) && evt.ctrlKey && shiftKey && keyCode == 50 && type === 'keydown' && padShortcutEnabled.cmdShift2) {
          // Control-Shift-2 shows a gritter popup showing a line author
          const lineNumber = rep.selEnd[0];
          const alineAttrs = rep.alines[lineNumber];
          const apool = rep.apool;

          // TODO: support selection ranges
          // TODO: Still work when authorship colors have been cleared
          // TODO: i18n
          // TODO: There appears to be a race condition or so.

          let author = null;
          if (alineAttrs) {
            var authors = [];
            var authorNames = [];
            const opIter = Changeset.opIterator(alineAttrs);

            while (opIter.hasNext()) {
              const op = opIter.next();
              authorId = Changeset.opAttributeValue(op, 'author', apool);

              // Only push unique authors and ones with values
              if (authors.indexOf(authorId) === -1 && authorId !== '') {
                authors.push(authorId);
              }
            }
          }

          // No author information is available IE on a new pad.
          if (authors.length === 0) {
            var authorString = 'No author information is available';
          } else {
            // Known authors info, both current and historical
            const padAuthors = parent.parent.pad.userList();
            let authorObj = {};
            authors.forEach((authorId) => {
              padAuthors.forEach((padAuthor) => {
                // If the person doing the lookup is the author..
                if (padAuthor.userId === authorId) {
                  if (parent.parent.clientVars.userId === authorId) {
                    authorObj = {
                      name: 'Me',
                    };
                  } else {
                    authorObj = padAuthor;
                  }
                }
              });
              if (!authorObj) {
                author = 'Unknown';
                return;
              }
              author = authorObj.name;
              if (!author) author = 'Unknown';
              authorNames.push(author);
            });
          }
          if (authors.length === 1) {
            var authorString = `The author of this line is ${authorNames}`;
          }
          if (authors.length > 1) {
            var authorString = `The authors of this line are ${authorNames.join(' & ')}`;
	  }

          parent.parent.$.gritter.add({
            // (string | mandatory) the heading of the notification
            title: 'Line Authors',
            // (string | mandatory) the text inside the notification
            text: authorString,
            // (bool | optional) if you want it to fade out on its own or just sit there
            sticky: false,
            // (int | optional) the time you want it to be alive for before fading out
            time: '4000',
          });
        }
        if ((!specialHandled) && isTypeForSpecialKey && keyCode == 8 && padShortcutEnabled.delete) {
          // "delete" key; in mozilla, if we're at the beginning of a line, normalize now,
          // or else deleting a blank line can take two delete presses.
          // --
          // we do deletes completely customly now:
          //  - allows consistent (and better) meta-delete behavior
          //  - normalizing and then allowing default behavior confused IE
          //  - probably eliminates a few minor quirks
          fastIncorp(3);
          evt.preventDefault();
          doDeleteKey(evt);
          specialHandled = true;
        }
        if ((!specialHandled) && isTypeForSpecialKey && keyCode == 13 && padShortcutEnabled.return) {
          // return key, handle specially;
          // note that in mozilla we need to do an incorporation for proper return behavior anyway.
          fastIncorp(4);
          evt.preventDefault();
          doReturnKey();
          // scrollSelectionIntoView();
          scheduler.setTimeout(() => {
            outerWin.scrollBy(-100, 0);
          }, 0);
          specialHandled = true;
        }
        if ((!specialHandled) && isTypeForSpecialKey && keyCode == 27 && padShortcutEnabled.esc) {
          // prevent esc key;
          // in mozilla versions 14-19 avoid reconnecting pad.

          fastIncorp(4);
          evt.preventDefault();
          specialHandled = true;

          // close all gritters when the user hits escape key
          parent.parent.$.gritter.removeAll();
        }
        if ((!specialHandled) && isTypeForCmdKey && String.fromCharCode(which).toLowerCase() == 's' && (evt.metaKey || evt.ctrlKey) && !evt.altKey && padShortcutEnabled.cmdS) /* Do a saved revision on ctrl S */
        {
          evt.preventDefault();
          const originalBackground = parent.parent.$('#revisionlink').css('background');
          parent.parent.$('#revisionlink').css({background: 'lightyellow'});
          scheduler.setTimeout(() => {
            parent.parent.$('#revisionlink').css({background: originalBackground});
          }, 1000);
          parent.parent.pad.collabClient.sendMessage({type: 'SAVE_REVISION'}); /* The parent.parent part of this is BAD and I feel bad..  It may break something */
          specialHandled = true;
        }
        if ((!specialHandled) && isTypeForSpecialKey && keyCode == 9 && !(evt.metaKey || evt.ctrlKey) && padShortcutEnabled.tab) {
          // tab
          fastIncorp(5);
          evt.preventDefault();
          doTabKey(evt.shiftKey);
          // scrollSelectionIntoView();
          specialHandled = true;
        }
        if ((!specialHandled) && isTypeForCmdKey && String.fromCharCode(which).toLowerCase() == 'z' && (evt.metaKey || evt.ctrlKey) && !evt.altKey && padShortcutEnabled.cmdZ) {
          // cmd-Z (undo)
          fastIncorp(6);
          evt.preventDefault();
          if (evt.shiftKey) {
            doUndoRedo('redo');
          } else {
            doUndoRedo('undo');
          }
          specialHandled = true;
        }
        if ((!specialHandled) && isTypeForCmdKey && String.fromCharCode(which).toLowerCase() == 'y' && (evt.metaKey || evt.ctrlKey) && padShortcutEnabled.cmdY) {
          // cmd-Y (redo)
          fastIncorp(10);
          evt.preventDefault();
          doUndoRedo('redo');
          specialHandled = true;
        }
        if ((!specialHandled) && isTypeForCmdKey && String.fromCharCode(which).toLowerCase() == 'b' && (evt.metaKey || evt.ctrlKey) && padShortcutEnabled.cmdB) {
          // cmd-B (bold)
          fastIncorp(13);
          evt.preventDefault();
          toggleAttributeOnSelection('bold');
          specialHandled = true;
        }
        if ((!specialHandled) && isTypeForCmdKey && String.fromCharCode(which).toLowerCase() == 'i' && (evt.metaKey || evt.ctrlKey) && padShortcutEnabled.cmdI) {
          // cmd-I (italic)
          fastIncorp(14);
          evt.preventDefault();
          toggleAttributeOnSelection('italic');
          specialHandled = true;
        }
        if ((!specialHandled) && isTypeForCmdKey && String.fromCharCode(which).toLowerCase() == 'u' && (evt.metaKey || evt.ctrlKey) && padShortcutEnabled.cmdU) {
          // cmd-U (underline)
          fastIncorp(15);
          evt.preventDefault();
          toggleAttributeOnSelection('underline');
          specialHandled = true;
        }
        if ((!specialHandled) && isTypeForCmdKey && String.fromCharCode(which).toLowerCase() == '5' && (evt.metaKey || evt.ctrlKey) && evt.altKey !== true && padShortcutEnabled.cmd5) {
          // cmd-5 (strikethrough)
          fastIncorp(13);
          evt.preventDefault();
          toggleAttributeOnSelection('strikethrough');
          specialHandled = true;
        }
        if ((!specialHandled) && isTypeForCmdKey && String.fromCharCode(which).toLowerCase() == 'l' && (evt.metaKey || evt.ctrlKey) && evt.shiftKey && padShortcutEnabled.cmdShiftL) {
          // cmd-shift-L (unorderedlist)
          fastIncorp(9);
          evt.preventDefault();
          doInsertUnorderedList();
          specialHandled = true;
        }
        if ((!specialHandled) && isTypeForCmdKey && ((String.fromCharCode(which).toLowerCase() == 'n' && padShortcutEnabled.cmdShiftN) || (String.fromCharCode(which) == 1 && padShortcutEnabled.cmdShift1)) && (evt.metaKey || evt.ctrlKey) && evt.shiftKey) {
          // cmd-shift-N and cmd-shift-1 (orderedlist)
          fastIncorp(9);
          evt.preventDefault();
          doInsertOrderedList();
          specialHandled = true;
        }
        if ((!specialHandled) && isTypeForCmdKey && String.fromCharCode(which).toLowerCase() == 'c' && (evt.metaKey || evt.ctrlKey) && evt.shiftKey && padShortcutEnabled.cmdShiftC) {
          // cmd-shift-C (clearauthorship)
          fastIncorp(9);
          evt.preventDefault();
          CMDS.clearauthorship();
        }
        if ((!specialHandled) && isTypeForCmdKey && String.fromCharCode(which).toLowerCase() == 'h' && (evt.ctrlKey) && padShortcutEnabled.cmdH) {
          // cmd-H (backspace)
          fastIncorp(20);
          evt.preventDefault();
          doDeleteKey();
          specialHandled = true;
        }
        if ((evt.which == 36 && evt.ctrlKey == true) && padShortcutEnabled.ctrlHome) { scroll.setScrollY(0); } // Control Home send to Y = 0
        if ((evt.which == 33 || evt.which == 34) && type == 'keydown' && !evt.ctrlKey) {
          evt.preventDefault(); // This is required, browsers will try to do normal default behavior on page up / down and the default behavior SUCKS

          const oldVisibleLineRange = scroll.getVisibleLineRange(rep);
          let topOffset = rep.selStart[0] - oldVisibleLineRange[0];
          if (topOffset < 0) {
            topOffset = 0;
          }

          const isPageDown = evt.which === 34;
          const isPageUp = evt.which === 33;

          scheduler.setTimeout(() => {
            const newVisibleLineRange = scroll.getVisibleLineRange(rep); // the visible lines IE 1,10
            const linesCount = rep.lines.length(); // total count of lines in pad IE 10
            const numberOfLinesInViewport = newVisibleLineRange[1] - newVisibleLineRange[0]; // How many lines are in the viewport right now?

            if (isPageUp && padShortcutEnabled.pageUp) {
              rep.selEnd[0] = rep.selEnd[0] - numberOfLinesInViewport; // move to the bottom line +1 in the viewport (essentially skipping over a page)
              rep.selStart[0] = rep.selStart[0] - numberOfLinesInViewport; // move to the bottom line +1 in the viewport (essentially skipping over a page)
            }

            if (isPageDown && padShortcutEnabled.pageDown) { // if we hit page down
              if (rep.selEnd[0] >= oldVisibleLineRange[0]) { // If the new viewpoint position is actually further than where we are right now
                rep.selStart[0] = oldVisibleLineRange[1] - 1; // dont go further in the page down than what's visible IE go from 0 to 50 if 50 is visible on screen but dont go below that else we miss content
                rep.selEnd[0] = oldVisibleLineRange[1] - 1; // dont go further in the page down than what's visible IE go from 0 to 50 if 50 is visible on screen but dont go below that else we miss content
              }
            }

            // ensure min and max
            if (rep.selEnd[0] < 0) {
              rep.selEnd[0] = 0;
            }
            if (rep.selStart[0] < 0) {
              rep.selStart[0] = 0;
            }
            if (rep.selEnd[0] >= linesCount) {
              rep.selEnd[0] = linesCount - 1;
            }
            updateBrowserSelectionFromRep();
            const myselection = document.getSelection(); // get the current caret selection, can't use rep. here because that only gives us the start position not the current
            let caretOffsetTop = myselection.focusNode.parentNode.offsetTop || myselection.focusNode.offsetTop; // get the carets selection offset in px IE 214

            // sometimes the first selection is -1 which causes problems (Especially with ep_page_view)
            // so use focusNode.offsetTop value.
            if (caretOffsetTop === -1) caretOffsetTop = myselection.focusNode.offsetTop;
            scroll.setScrollY(caretOffsetTop); // set the scrollY offset of the viewport on the document
          }, 200);
        }

        // scroll to viewport when user presses arrow keys and caret is out of the viewport
        if ((evt.which == 37 || evt.which == 38 || evt.which == 39 || evt.which == 40)) {
          // we use arrowKeyWasReleased to avoid triggering the animation when a key is continuously pressed
          // this makes the scroll smooth
          if (!continuouslyPressingArrowKey(type)) {
            // We use getSelection() instead of rep to get the caret position. This avoids errors like when
            // the caret position is not synchronized with the rep. For example, when an user presses arrow
            // down to scroll the pad without releasing the key. When the key is released the rep is not
            // synchronized, so we don't get the right node where caret is.
            const selection = getSelection();

            if (selection) {
              const arrowUp = evt.which === 38;
              const innerHeight = getInnerHeight();
              scroll.scrollWhenPressArrowKeys(arrowUp, rep, innerHeight);
            }
          }
        }
      }

      if (type == 'keydown') {
        idleWorkTimer.atLeast(500);
      } else if (type == 'keypress') {
        if ((!specialHandled) && false /* parenModule.shouldNormalizeOnChar(charCode)*/) {
          idleWorkTimer.atMost(0);
        } else {
          idleWorkTimer.atLeast(500);
        }
      } else if (type == 'keyup') {
        const wait = 0;
        idleWorkTimer.atLeast(wait);
        idleWorkTimer.atMost(wait);
      }

      // Is part of multi-keystroke international character on Firefox Mac
      const isFirefoxHalfCharacter = (browser.firefox && evt.altKey && charCode === 0 && keyCode === 0);

      // Is part of multi-keystroke international character on Safari Mac
      const isSafariHalfCharacter = (browser.safari && evt.altKey && keyCode == 229);

      if (thisKeyDoesntTriggerNormalize || isFirefoxHalfCharacter || isSafariHalfCharacter) {
        idleWorkTimer.atLeast(3000); // give user time to type
        // if this is a keydown, e.g., the keyup shouldn't trigger a normalize
        thisKeyDoesntTriggerNormalize = true;
      }

      if ((!specialHandled) && (!thisKeyDoesntTriggerNormalize) && (!inInternationalComposition)) {
        if (type != 'keyup') {
          observeChangesAroundSelection();
        }
      }

      if (type == 'keyup') {
        thisKeyDoesntTriggerNormalize = false;
      }
    });
  }

  var thisKeyDoesntTriggerNormalize = false;

  let arrowKeyWasReleased = true;
  function continuouslyPressingArrowKey(type) {
    let firstTimeKeyIsContinuouslyPressed = false;

    if (type == 'keyup') { arrowKeyWasReleased = true; } else if (type == 'keydown' && arrowKeyWasReleased) {
      firstTimeKeyIsContinuouslyPressed = true;
      arrowKeyWasReleased = false;
    }

    return !firstTimeKeyIsContinuouslyPressed;
  }

  function doUndoRedo(which) {
    // precond: normalized DOM
    if (undoModule.enabled) {
      let whichMethod;
      if (which == 'undo') whichMethod = 'performUndo';
      if (which == 'redo') whichMethod = 'performRedo';
      if (whichMethod) {
        const oldEventType = currentCallStack.editEvent.eventType;
        currentCallStack.startNewEvent(which);
        undoModule[whichMethod]((backset, selectionInfo) => {
          if (backset) {
            performDocumentApplyChangeset(backset);
          }
          if (selectionInfo) {
            performSelectionChange(lineAndColumnFromChar(selectionInfo.selStart), lineAndColumnFromChar(selectionInfo.selEnd), selectionInfo.selFocusAtStart);
          }
          const oldEvent = currentCallStack.startNewEvent(oldEventType, true);
          return oldEvent;
        });
      }
    }
  }
  editorInfo.ace_doUndoRedo = doUndoRedo;

  function updateBrowserSelectionFromRep() {
    // requires normalized DOM!
    const selStart = rep.selStart;
    const selEnd = rep.selEnd;

    if (!(selStart && selEnd)) {
      setSelection(null);
      return;
    }

    const selection = {};

    const ss = [selStart[0], selStart[1]];
    selection.startPoint = getPointForLineAndChar(ss);

    const se = [selEnd[0], selEnd[1]];
    selection.endPoint = getPointForLineAndChar(se);

    selection.focusAtStart = !!rep.selFocusAtStart;
    setSelection(selection);
  }
  editorInfo.ace_updateBrowserSelectionFromRep = updateBrowserSelectionFromRep;

  function nodeMaxIndex(nd) {
    if (isNodeText(nd)) return nd.nodeValue.length;
    else return 1;
  }

  function hasIESelection() {
    let browserSelection;
    try {
      browserSelection = doc.selection;
    } catch (e) {}
    if (!browserSelection) return false;
    let origSelectionRange;
    try {
      origSelectionRange = browserSelection.createRange();
    } catch (e) {}
    if (!origSelectionRange) return false;
    return true;
  }

  function getSelection() {
    // returns null, or a structure containing startPoint and endPoint,
    // each of which has node (a magicdom node), index, and maxIndex.  If the node
    // is a text node, maxIndex is the length of the text; else maxIndex is 1.
    // index is between 0 and maxIndex, inclusive.
    if (browser.msie) {
      var browserSelection;
      try {
        browserSelection = doc.selection;
      } catch (e) {}
      if (!browserSelection) return null;
      let origSelectionRange;
      try {
        origSelectionRange = browserSelection.createRange();
      } catch (e) {}
      if (!origSelectionRange) return null;
      const selectionParent = origSelectionRange.parentElement();
      if (selectionParent.ownerDocument != doc) return null;

      const newRange = function () {
        return doc.body.createTextRange();
      };

      const rangeForElementNode = function (nd) {
        const rng = newRange();
        // doesn't work on text nodes
        rng.moveToElementText(nd);
        return rng;
      };

      const pointFromCollapsedRange = function (rng) {
        const parNode = rng.parentElement();
        let elemBelow = -1;
        let elemAbove = parNode.childNodes.length;
        const rangeWithin = rangeForElementNode(parNode);

        if (rng.compareEndPoints('StartToStart', rangeWithin) === 0) {
          return {
            node: parNode,
            index: 0,
            maxIndex: 1,
          };
        } else if (rng.compareEndPoints('EndToEnd', rangeWithin) === 0) {
          if (isBlockElement(parNode) && parNode.nextSibling) {
            // caret after block is not consistent across browsers
            // (same line vs next) so put caret before next node
            return {
              node: parNode.nextSibling,
              index: 0,
              maxIndex: 1,
            };
          }
          return {
            node: parNode,
            index: 1,
            maxIndex: 1,
          };
        } else if (parNode.childNodes.length === 0) {
          return {
            node: parNode,
            index: 0,
            maxIndex: 1,
          };
        }

        for (let i = 0; i < parNode.childNodes.length; i++) {
          const n = parNode.childNodes.item(i);
          if (!isNodeText(n)) {
            const nodeRange = rangeForElementNode(n);
            const startComp = rng.compareEndPoints('StartToStart', nodeRange);
            const endComp = rng.compareEndPoints('EndToEnd', nodeRange);
            if (startComp >= 0 && endComp <= 0) {
              let index = 0;
              if (startComp > 0) {
                index = 1;
              }
              return {
                node: n,
                index,
                maxIndex: 1,
              };
            } else if (endComp > 0) {
              if (i > elemBelow) {
                elemBelow = i;
                rangeWithin.setEndPoint('StartToEnd', nodeRange);
              }
            } else if (startComp < 0) {
              if (i < elemAbove) {
                elemAbove = i;
                rangeWithin.setEndPoint('EndToStart', nodeRange);
              }
            }
          }
        }
        if ((elemAbove - elemBelow) == 1) {
          if (elemBelow >= 0) {
            return {
              node: parNode.childNodes.item(elemBelow),
              index: 1,
              maxIndex: 1,
            };
          } else {
            return {
              node: parNode.childNodes.item(elemAbove),
              index: 0,
              maxIndex: 1,
            };
          }
        }
        let idx = 0;
        const r = rng.duplicate();
        // infinite stateful binary search! call function for values 0 to inf,
        // expecting the answer to be about 40.  return index of smallest
        // true value.
        const indexIntoRange = binarySearchInfinite(40, (i) => {
          // the search algorithm whips the caret back and forth,
          // though it has to be moved relatively and may hit
          // the end of the buffer
          const delta = i - idx;
          const moved = Math.abs(r.move('character', -delta));
          // next line is work-around for fact that when moving left, the beginning
          // of a text node is considered to be after the start of the parent element:
          if (r.move('character', -1)) r.move('character', 1);
          if (delta < 0) idx -= moved;
          else idx += moved;
          return (r.compareEndPoints('StartToStart', rangeWithin) <= 0);
        });
        // iterate over consecutive text nodes, point is in one of them
        let textNode = elemBelow + 1;
        let indexLeft = indexIntoRange;
        while (textNode < elemAbove) {
          var tn = parNode.childNodes.item(textNode);
          if (indexLeft <= tn.nodeValue.length) {
            return {
              node: tn,
              index: indexLeft,
              maxIndex: tn.nodeValue.length,
            };
          }
          indexLeft -= tn.nodeValue.length;
          textNode++;
        }
        var tn = parNode.childNodes.item(textNode - 1);
        return {
          node: tn,
          index: tn.nodeValue.length,
          maxIndex: tn.nodeValue.length,
        };
      };

      var selection = {};
      if (origSelectionRange.compareEndPoints('StartToEnd', origSelectionRange) === 0) {
        // collapsed
        const pnt = pointFromCollapsedRange(origSelectionRange);
        selection.startPoint = pnt;
        selection.endPoint = {
          node: pnt.node,
          index: pnt.index,
          maxIndex: pnt.maxIndex,
        };
      } else {
        const start = origSelectionRange.duplicate();
        start.collapse(true);
        const end = origSelectionRange.duplicate();
        end.collapse(false);
        selection.startPoint = pointFromCollapsedRange(start);
        selection.endPoint = pointFromCollapsedRange(end);
      }
      return selection;
    } else {
      // non-IE browser
      var browserSelection = window.getSelection();
      if (browserSelection && browserSelection.type != 'None' && browserSelection.rangeCount !== 0) {
        const range = browserSelection.getRangeAt(0);

        function isInBody(n) {
          while (n && !(n.tagName && n.tagName.toLowerCase() == 'body')) {
            n = n.parentNode;
          }
          return !!n;
        }

        function pointFromRangeBound(container, offset) {
          if (!isInBody(container)) {
            // command-click in Firefox selects whole document, HEAD and BODY!
            return {
              node: root,
              index: 0,
              maxIndex: 1,
            };
          }
          const n = container;
          const childCount = n.childNodes.length;
          if (isNodeText(n)) {
            return {
              node: n,
              index: offset,
              maxIndex: n.nodeValue.length,
            };
          } else if (childCount === 0) {
            return {
              node: n,
              index: 0,
              maxIndex: 1,
            };
          }
          // treat point between two nodes as BEFORE the second (rather than after the first)
          // if possible; this way point at end of a line block-element is treated as
          // at beginning of next line
          else if (offset == childCount) {
            var nd = n.childNodes.item(childCount - 1);
            var max = nodeMaxIndex(nd);
            return {
              node: nd,
              index: max,
              maxIndex: max,
            };
          } else {
            var nd = n.childNodes.item(offset);
            var max = nodeMaxIndex(nd);
            return {
              node: nd,
              index: 0,
              maxIndex: max,
            };
          }
        }
        var selection = {};
        selection.startPoint = pointFromRangeBound(range.startContainer, range.startOffset);
        selection.endPoint = pointFromRangeBound(range.endContainer, range.endOffset);
        selection.focusAtStart = (((range.startContainer != range.endContainer) || (range.startOffset != range.endOffset)) && browserSelection.anchorNode && (browserSelection.anchorNode == range.endContainer) && (browserSelection.anchorOffset == range.endOffset));

        if (selection.startPoint.node.ownerDocument !== window.document) {
          return null;
        }

        return selection;
      } else { return null; }
    }
  }

  function setSelection(selection) {
    function copyPoint(pt) {
      return {
        node: pt.node,
        index: pt.index,
        maxIndex: pt.maxIndex,
      };
    }
    if (browser.msie) {
      // Oddly enough, accessing scrollHeight fixes return key handling on IE 8,
      // presumably by forcing some kind of internal DOM update.
      doc.body.scrollHeight;

      function moveToElementText(s, n) {
        while (n.firstChild && !isNodeText(n.firstChild)) {
          n = n.firstChild;
        }
        s.moveToElementText(n);
      }

      function newRange() {
        return doc.body.createTextRange();
      }

      function setCollapsedBefore(s, n) {
        // s is an IE TextRange, n is a dom node
        if (isNodeText(n)) {
          // previous node should not also be text, but prevent inf recurs
          if (n.previousSibling && !isNodeText(n.previousSibling)) {
            setCollapsedAfter(s, n.previousSibling);
          } else {
            setCollapsedBefore(s, n.parentNode);
          }
        } else {
          moveToElementText(s, n);
          // work around for issue that caret at beginning of line
          // somehow ends up at end of previous line
          if (s.move('character', 1)) {
            s.move('character', -1);
          }
          s.collapse(true); // to start
        }
      }

      function setCollapsedAfter(s, n) {
        // s is an IE TextRange, n is a magicdom node
        if (isNodeText(n)) {
          // can't use end of container when no nextSibling (could be on next line),
          // so use previousSibling or start of container and move forward.
          setCollapsedBefore(s, n);
          s.move('character', n.nodeValue.length);
        } else {
          moveToElementText(s, n);
          s.collapse(false); // to end
        }
      }

      function getPointRange(point) {
        const s = newRange();
        const n = point.node;
        if (isNodeText(n)) {
          setCollapsedBefore(s, n);
          s.move('character', point.index);
        } else if (point.index === 0) {
          setCollapsedBefore(s, n);
        } else {
          setCollapsedAfter(s, n);
        }
        return s;
      }

      if (selection) {
        if (!hasIESelection()) {
          return; // don't steal focus
        }

        const startPoint = copyPoint(selection.startPoint);
        const endPoint = copyPoint(selection.endPoint);

        // fix issue where selection can't be extended past end of line
        // with shift-rightarrow or shift-downarrow
        if (endPoint.index == endPoint.maxIndex && endPoint.node.nextSibling) {
          endPoint.node = endPoint.node.nextSibling;
          endPoint.index = 0;
          endPoint.maxIndex = nodeMaxIndex(endPoint.node);
        }
        var range = getPointRange(startPoint);
        range.setEndPoint('EndToEnd', getPointRange(endPoint));

        // setting the selection in IE causes everything to scroll
        // so that the selection is visible.  if setting the selection
        // definitely accomplishes nothing, don't do it.


        function isEqualToDocumentSelection(rng) {
          let browserSelection;
          try {
            browserSelection = doc.selection;
          } catch (e) {}
          if (!browserSelection) return false;
          const rng2 = browserSelection.createRange();
          if (rng2.parentElement().ownerDocument != doc) return false;
          if (rng.compareEndPoints('StartToStart', rng2) !== 0) return false;
          if (rng.compareEndPoints('EndToEnd', rng2) !== 0) return false;
          return true;
        }
        if (!isEqualToDocumentSelection(range)) {
          // dmesg(toSource(selection));
          // dmesg(escapeHTML(doc.body.innerHTML));
          range.select();
        }
      } else {
        try {
          doc.selection.empty();
        } catch (e) {}
      }
    } else {
      // non-IE browser
      let isCollapsed;

      function pointToRangeBound(pt) {
        const p = copyPoint(pt);
        // Make sure Firefox cursor is deep enough; fixes cursor jumping when at top level,
        // and also problem where cut/copy of a whole line selected with fake arrow-keys
        // copies the next line too.
        if (isCollapsed) {
          function diveDeep() {
            while (p.node.childNodes.length > 0) {
              // && (p.node == root || p.node.parentNode == root)) {
              if (p.index === 0) {
                p.node = p.node.firstChild;
                p.maxIndex = nodeMaxIndex(p.node);
              } else if (p.index == p.maxIndex) {
                p.node = p.node.lastChild;
                p.maxIndex = nodeMaxIndex(p.node);
                p.index = p.maxIndex;
              } else { break; }
            }
          }
          // now fix problem where cursor at end of text node at end of span-like element
          // with background doesn't seem to show up...
          if (isNodeText(p.node) && p.index == p.maxIndex) {
            let n = p.node;
            while ((!n.nextSibling) && (n != root) && (n.parentNode != root)) {
              n = n.parentNode;
            }
            if (n.nextSibling && (!((typeof n.nextSibling.tagName) === 'string' && n.nextSibling.tagName.toLowerCase() == 'br')) && (n != p.node) && (n != root) && (n.parentNode != root)) {
              // found a parent, go to next node and dive in
              p.node = n.nextSibling;
              p.maxIndex = nodeMaxIndex(p.node);
              p.index = 0;
              diveDeep();
            }
          }
          // try to make sure insertion point is styled;
          // also fixes other FF problems
          if (!isNodeText(p.node)) {
            diveDeep();
          }
        }
        if (isNodeText(p.node)) {
          return {
            container: p.node,
            offset: p.index,
          };
        } else {
          // p.index in {0,1}
          return {
            container: p.node.parentNode,
            offset: childIndex(p.node) + p.index,
          };
        }
      }
      const browserSelection = window.getSelection();
      if (browserSelection) {
        browserSelection.removeAllRanges();
        if (selection) {
          isCollapsed = (selection.startPoint.node === selection.endPoint.node && selection.startPoint.index === selection.endPoint.index);
          const start = pointToRangeBound(selection.startPoint);
          const end = pointToRangeBound(selection.endPoint);

          if ((!isCollapsed) && selection.focusAtStart && browserSelection.collapse && browserSelection.extend) {
            // can handle "backwards"-oriented selection, shift-arrow-keys move start
            // of selection
            browserSelection.collapse(end.container, end.offset);
            browserSelection.extend(start.container, start.offset);
          } else {
            var range = doc.createRange();
            range.setStart(start.container, start.offset);
            range.setEnd(end.container, end.offset);
            browserSelection.removeAllRanges();
            browserSelection.addRange(range);
          }
        }
      }
    }
  }

  function childIndex(n) {
    let idx = 0;
    while (n.previousSibling) {
      idx++;
      n = n.previousSibling;
    }
    return idx;
  }

  function fixView() {
    // calling this method repeatedly should be fast
    if (getInnerWidth() === 0 || getInnerHeight() === 0) {
      return;
    }

    const win = outerWin;

    enforceEditability();

    $(sideDiv).addClass('sidedivdelayed');
  }

  const _teardownActions = [];

  function teardown() {
    _.each(_teardownActions, (a) => {
      a();
    });
  }

  const iePastedLines = null;

  function handleIEPaste(evt) {
    // Pasting in IE loses blank lines in a way that loses information;
    // "one\n\ntwo\nthree" becomes "<p>one</p><p>two</p><p>three</p>",
    // which becomes "one\ntwo\nthree".  We can get the correct text
    // from the clipboard directly, but we still have to let the paste
    // happen to get the style information.
    const clipText = window.clipboardData && window.clipboardData.getData('Text');
    if (clipText && doc.selection) {
      // this "paste" event seems to mess with the selection whether we try to
      // stop it or not, so can't really do document-level manipulation now
      // or in an idle call-stack.  instead, use IE native manipulation
      // function escapeLine(txt) {
      // return processSpaces(escapeHTML(textify(txt)));
      // }
      // var newHTML = map(clipText.replace(/\r/g,'').split('\n'), escapeLine).join('<br>');
      // doc.selection.createRange().pasteHTML(newHTML);
      // evt.preventDefault();
      // iePastedLines = map(clipText.replace(/\r/g,'').split('\n'), textify);
    }
  }


  var inInternationalComposition = false;
  function handleCompositionEvent(evt) {
    // international input events, fired in FF3, at least;  allow e.g. Japanese input
    if (evt.type == 'compositionstart') {
      inInternationalComposition = true;
    } else if (evt.type == 'compositionend') {
      inInternationalComposition = false;
    }
  }

  editorInfo.ace_getInInternationalComposition = function () {
    return inInternationalComposition;
  };

  function bindTheEventHandlers() {
    $(document).on('keydown', handleKeyEvent);
    $(document).on('keypress', handleKeyEvent);
    $(document).on('keyup', handleKeyEvent);
    $(document).on('click', handleClick);
    // dropdowns on edit bar need to be closed on clicks on both pad inner and pad outer
    $(outerWin.document).on('click', hideEditBarDropdowns);
    // Disabled: https://github.com/ether/etherpad-lite/issues/2546
    // Will break OL re-numbering: https://github.com/ether/etherpad-lite/pull/2533
    // $(document).on("cut", handleCut);

    $(root).on('blur', handleBlur);
    if (browser.msie) {
      $(document).on('click', handleIEOuterClick);
    }
    if (browser.msie) $(root).on('paste', handleIEPaste);

    // If non-nullish, pasting on a link should be suppressed.
    let suppressPasteOnLink = null;

    $(root).on('auxclick', (e) => {
      if (e.originalEvent.button === 1 && (e.target.a || e.target.localName === 'a')) {
        // The user middle-clicked on a link. Usually users do this to open a link in a new tab, but
        // in X11 (Linux) this will instead paste the contents of the primary selection at the mouse
        // cursor. Users almost certainly do not want to paste when middle-clicking on a link, so
        // tell the 'paste' event handler to suppress the paste. This is done by starting a
        // short-lived timer that suppresses paste (when the target is a link) until either the
        // paste event arrives or the timer fires.
        //
        // Why it is implemented this way:
        //   * Users want to be able to paste on a link via Ctrl-V, the Edit menu, or the context
        //     menu (https://github.com/ether/etherpad-lite/issues/2775) so we cannot simply
        //     suppress all paste actions when the target is a link.
        //   * Non-X11 systems do not paste when the user middle-clicks, so the paste suppression
        //     must be self-resetting.
        //   * On non-X11 systems, middle click should continue to open the link in a new tab.
        //     Suppressing the middle click here in the 'auxclick' handler (via e.preventDefault())
        //     would break that behavior.
        suppressPasteOnLink = scheduler.setTimeout(() => { suppressPasteOnLink = null; }, 0);
      }
    });

    $(root).on('paste', (e) => {
      if (suppressPasteOnLink != null && (e.target.a || e.target.localName === 'a')) {
        scheduler.clearTimeout(suppressPasteOnLink);
        suppressPasteOnLink = null;
        e.preventDefault();
        return;
      }

      // Call paste hook
      hooks.callAll('acePaste', {
        editorInfo,
        rep,
        documentAttributeManager,
        e,
      });
    });

    // We reference document here, this is because if we don't this will expose a bug
    // in Google Chrome.  This bug will cause the last character on the last line to
    // not fire an event when dropped into..
    $(document).on('drop', (e) => {
      if (e.target.a || e.target.localName === 'a') {
        e.preventDefault();
      }

      // Bug fix: when user drags some content and drop it far from its origin, we
      // need to merge the changes into a single changeset. So mark origin with <style>,
      // in order to make content be observed by incorporateUserChanges() (see
      // observeSuspiciousNodes() for more info)
      const selection = getSelection();
      if (selection) {
        const firstLineSelected = topLevel(selection.startPoint.node);
        const lastLineSelected = topLevel(selection.endPoint.node);

        const lineBeforeSelection = firstLineSelected.previousSibling;
        const lineAfterSelection = lastLineSelected.nextSibling;

        const neighbor = lineBeforeSelection || lineAfterSelection;
        neighbor.appendChild(document.createElement('style'));
      }

      // Call drop hook
      hooks.callAll('aceDrop', {
        editorInfo,
        rep,
        documentAttributeManager,
        e,
      });
    });

    // CompositionEvent is not implemented below IE version 8
    if (!(browser.msie && parseInt(browser.version <= 9)) && document.documentElement) {
      $(document.documentElement).on('compositionstart', handleCompositionEvent);
      $(document.documentElement).on('compositionend', handleCompositionEvent);
    }
  }

  function topLevel(n) {
    if ((!n) || n == root) return null;
    while (n.parentNode != root) {
      n = n.parentNode;
    }
    return n;
  }

  function handleIEOuterClick(evt) {
    if ((evt.target.tagName || '').toLowerCase() != 'html') {
      return;
    }
    if (!(evt.pageY > root.clientHeight)) {
      return;
    }

    // click below the body
    inCallStackIfNecessary('handleOuterClick', () => {
      // put caret at bottom of doc
      fastIncorp(11);
      if (isCaret()) { // don't interfere with drag
        const lastLine = rep.lines.length() - 1;
        const lastCol = rep.lines.atIndex(lastLine).text.length;
        performSelectionChange([lastLine, lastCol], [lastLine, lastCol]);
      }
    });
  }

  function getClassArray(elem, optFilter) {
    const bodyClasses = [];
    (elem.className || '').replace(/\S+/g, (c) => {
      if ((!optFilter) || (optFilter(c))) {
        bodyClasses.push(c);
      }
    });
    return bodyClasses;
  }

  function setClassArray(elem, array) {
    elem.className = array.join(' ');
  }

  function focus() {
    window.focus();
  }

  function handleBlur(evt) {
    if (browser.msie) {
      // a fix: in IE, clicking on a control like a button outside the
      // iframe can "blur" the editor, causing it to stop getting
      // events, though typing still affects it(!).
      setSelection(null);
    }
  }

  function getSelectionPointX(point) {
    // doesn't work in wrap-mode
    const node = point.node;
    const index = point.index;

    function leftOf(n) {
      return n.offsetLeft;
    }

    function rightOf(n) {
      return n.offsetLeft + n.offsetWidth;
    }
    if (!isNodeText(node)) {
      if (index === 0) return leftOf(node);
      else return rightOf(node);
    } else {
      // we can get bounds of element nodes, so look for those.
      // allow consecutive text nodes for robustness.
      let charsToLeft = index;
      let charsToRight = node.nodeValue.length - index;
      let n;
      for (n = node.previousSibling; n && isNodeText(n); n = n.previousSibling) charsToLeft += n.nodeValue;
      const leftEdge = (n ? rightOf(n) : leftOf(node.parentNode));
      for (n = node.nextSibling; n && isNodeText(n); n = n.nextSibling) charsToRight += n.nodeValue;
      const rightEdge = (n ? leftOf(n) : rightOf(node.parentNode));
      const frac = (charsToLeft / (charsToLeft + charsToRight));
      const pixLoc = leftEdge + frac * (rightEdge - leftEdge);
      return Math.round(pixLoc);
    }
  }

  function getPageHeight() {
    const win = outerWin;
    const odoc = win.document;
    if (win.innerHeight && win.scrollMaxY) return win.innerHeight + win.scrollMaxY;
    else if (odoc.body.scrollHeight > odoc.body.offsetHeight) return odoc.body.scrollHeight;
    else return odoc.body.offsetHeight;
  }

  function getPageWidth() {
    const win = outerWin;
    const odoc = win.document;
    if (win.innerWidth && win.scrollMaxX) return win.innerWidth + win.scrollMaxX;
    else if (odoc.body.scrollWidth > odoc.body.offsetWidth) return odoc.body.scrollWidth;
    else return odoc.body.offsetWidth;
  }

  function getInnerHeight() {
    const win = outerWin;
    const odoc = win.document;
    let h;
    if (browser.opera) h = win.innerHeight;
    else h = odoc.documentElement.clientHeight;
    if (h) return h;

    // deal with case where iframe is hidden, hope that
    // style.height of iframe container is set in px
    return Number(editorInfo.frame.parentNode.style.height.replace(/[^0-9]/g, '') || 0);
  }

  function getInnerWidth() {
    const win = outerWin;
    const odoc = win.document;
    return odoc.documentElement.clientWidth;
  }

  function scrollXHorizontallyIntoView(pixelX) {
    const win = outerWin;
    const odoc = outerWin.document;
    const distInsideLeft = pixelX - win.scrollX;
    const distInsideRight = win.scrollX + getInnerWidth() - pixelX;
    if (distInsideLeft < 0) {
      win.scrollBy(distInsideLeft, 0);
    } else if (distInsideRight < 0) {
      win.scrollBy(-distInsideRight + 1, 0);
    }
  }

  function scrollSelectionIntoView() {
    if (!rep.selStart) return;
    fixView();
    const innerHeight = getInnerHeight();
    scroll.scrollNodeVerticallyIntoView(rep, innerHeight);
    if (!doesWrap) {
      const browserSelection = getSelection();
      if (browserSelection) {
        const focusPoint = (browserSelection.focusAtStart ? browserSelection.startPoint : browserSelection.endPoint);
        const selectionPointX = getSelectionPointX(focusPoint);
        scrollXHorizontallyIntoView(selectionPointX);
        fixView();
      }
    }
  }

  const listAttributeName = 'list';

  function getLineListType(lineNum) {
    return documentAttributeManager.getAttributeOnLine(lineNum, listAttributeName);
  }

  function setLineListType(lineNum, listType) {
    if (listType == '') {
      documentAttributeManager.removeAttributeOnLine(lineNum, listAttributeName);
      documentAttributeManager.removeAttributeOnLine(lineNum, 'start');
    } else {
      documentAttributeManager.setAttributeOnLine(lineNum, listAttributeName, listType);
    }

    // if the list has been removed, it is necessary to renumber
    // starting from the *next* line because the list may have been
    // separated. If it returns null, it means that the list was not cut, try
    // from the current one.
    if (renumberList(lineNum + 1) == null) {
      renumberList(lineNum);
    }
  }

  function renumberList(lineNum) {
    // 1-check we are in a list
    let type = getLineListType(lineNum);
    if (!type) {
      return null;
    }
    type = /([a-z]+)[0-9]+/.exec(type);
    if (type[1] == 'indent') {
      return null;
    }

    // 2-find the first line of the list
    while (lineNum - 1 >= 0 && (type = getLineListType(lineNum - 1))) {
      type = /([a-z]+)[0-9]+/.exec(type);
      if (type[1] == 'indent') break;
      lineNum--;
    }

    // 3-renumber every list item of the same level from the beginning, level 1
    // IMPORTANT: never skip a level because there imbrication may be arbitrary
    const builder = Changeset.builder(rep.lines.totalWidth());
    let loc = [0, 0];
    function applyNumberList(line, level) {
      // init
      let position = 1;
      let curLevel = level;
      let listType;
      // loop over the lines
      while (listType = getLineListType(line)) {
        // apply new num
        listType = /([a-z]+)([0-9]+)/.exec(listType);
        curLevel = Number(listType[2]);
        if (isNaN(curLevel) || listType[0] == 'indent') {
          return line;
        } else if (curLevel == level) {
          ChangesetUtils.buildKeepRange(rep, builder, loc, (loc = [line, 0]));
          ChangesetUtils.buildKeepRange(rep, builder, loc, (loc = [line, 1]), [
            ['start', position],
          ], rep.apool);

          position++;
          line++;
        } else if (curLevel < level) {
          return line;// back to parent
        } else {
          line = applyNumberList(line, level + 1);// recursive call
        }
      }
      return line;
    }

    applyNumberList(lineNum, 1);
    const cs = builder.toString();
    if (!Changeset.isIdentity(cs)) {
      performDocumentApplyChangeset(cs);
    }

    // 4-apply the modifications
  }


  function doInsertList(type) {
    if (!(rep.selStart && rep.selEnd)) {
      return;
    }

    let firstLine, lastLine;
    firstLine = rep.selStart[0];
    lastLine = Math.max(firstLine, rep.selEnd[0] - ((rep.selEnd[1] === 0) ? 1 : 0));

    let allLinesAreList = true;
    for (var n = firstLine; n <= lastLine; n++) {
      var listType = getLineListType(n);
      if (!listType || listType.slice(0, type.length) != type) {
        allLinesAreList = false;
        break;
      }
    }

    const mods = [];
    for (var n = firstLine; n <= lastLine; n++) {
      var t = '';
      let level = 0;
      var listType = /([a-z]+)([0-9]+)/.exec(getLineListType(n));

      // Used to outdent if ol is removed
      if (allLinesAreList) {
        var togglingOn = false;
      } else {
        var togglingOn = true;
      }

      if (listType) {
        t = listType[1];
        level = Number(listType[2]);
      }
      var t = getLineListType(n);

      if (t === listType) togglingOn = false;

      if (togglingOn) {
        mods.push([n, allLinesAreList ? `indent${level}` : (t ? type + level : `${type}1`)]);
      } else {
        // scrap the entire indentation and list type
        if (level === 1) { // if outdending but are the first item in the list then outdent
          setLineListType(n, ''); // outdent
        }
        // else change to indented not bullet
        if (level > 1) {
          setLineListType(n, ''); // remove bullet
          setLineListType(n, `indent${level}`); // in/outdent
        }
      }
    }

    _.each(mods, (mod) => {
      setLineListType(mod[0], mod[1]);
    });
  }

  function doInsertUnorderedList() {
    doInsertList('bullet');
  }
  function doInsertOrderedList() {
    doInsertList('number');
  }
  editorInfo.ace_doInsertUnorderedList = doInsertUnorderedList;
  editorInfo.ace_doInsertOrderedList = doInsertOrderedList;

  function initLineNumbers() {
    lineNumbersShown = 1;
    sideDiv.innerHTML = '<div id="sidedivinner" class="sidedivinner"><div><span class="line-number">1</span></div></div>';
    sideDivInner = outerWin.document.getElementById('sidedivinner');
    $(sideDiv).addClass('sidediv');
  }

  // We apply the height of a line in the doc body, to the corresponding sidediv line number
  function updateLineNumbers() {
    if (!currentCallStack || currentCallStack && !currentCallStack.domClean) return;

    // Refs #4228, to avoid layout trashing, we need to first calculate all the heights,
    // and then apply at once all new height to div elements
    const lineHeights = [];
    let docLine = doc.body.firstChild;
    let currentLine = 0;
    let h = null;

    // First loop to calculate the heights from doc body
    while (docLine) {
      if (docLine.nextSibling) {
        if (currentLine === 0) {
          // It's the first line. For line number alignment purposes, its
          // height is taken to be the top offset of the next line. If we
          // didn't do this special case, we would miss out on any top margin
          // included on the first line. The default stylesheet doesn't add
          // extra margins/padding, but plugins might.
          h = docLine.nextSibling.offsetTop - parseInt(window.getComputedStyle(doc.body).getPropertyValue('padding-top').split('px')[0]);
        } else {
          h = docLine.nextSibling.offsetTop - docLine.offsetTop;
        }
      } else {
        // last line
        h = (docLine.clientHeight || docLine.offsetHeight);
      }
      lineHeights.push(h);
      docLine = docLine.nextSibling;
      currentLine++;
    }

    let newNumLines = rep.lines.length();
    if (newNumLines < 1) newNumLines = 1;
    let sidebarLine = sideDivInner.firstChild;

    // Apply height to existing sidediv lines
    currentLine = 0;
    while (sidebarLine && currentLine <= lineNumbersShown) {
      if (lineHeights[currentLine]) {
        sidebarLine.style.height = `${lineHeights[currentLine]}px`;
      }
      sidebarLine = sidebarLine.nextSibling;
      currentLine++;
    }

    if (newNumLines != lineNumbersShown) {
      const container = sideDivInner;
      const odoc = outerWin.document;
      const fragment = odoc.createDocumentFragment();

      // Create missing line and apply height
      while (lineNumbersShown < newNumLines) {
        lineNumbersShown++;
        const div = odoc.createElement('DIV');
        if (lineHeights[currentLine]) {
          div.style.height = `${lineHeights[currentLine]}px`;
        }
        $(div).append($(`<span class='line-number'>${String(lineNumbersShown)}</span>`));
        fragment.appendChild(div);
        currentLine++;
      }
      container.appendChild(fragment);

      // Remove extra lines
      while (lineNumbersShown > newNumLines) {
        container.removeChild(container.lastChild);
        lineNumbersShown--;
      }
    }
  }


  // Init documentAttributeManager
  documentAttributeManager = new AttributeManager(rep, performDocumentApplyChangeset);
  editorInfo.ace_performDocumentApplyAttributesToRange = function () {
    return documentAttributeManager.setAttributesOnRange.apply(documentAttributeManager, arguments);
  };

  this.init = function () {
    $(document).ready(() => {
      doc = document; // defined as a var in scope outside
      inCallStack('setup', () => {
        const body = doc.getElementById('innerdocbody');
        root = body; // defined as a var in scope outside
        if (browser.firefox) $(root).addClass('mozilla');
        if (browser.safari) $(root).addClass('safari');
        if (browser.msie) $(root).addClass('msie');
        root.classList.toggle('authorColors', true);
        root.classList.toggle('doesWrap', doesWrap);

        initDynamicCSS();

        enforceEditability();

        // set up dom and rep
        while (root.firstChild) root.removeChild(root.firstChild);
        const oneEntry = createDomLineEntry('');
        doRepLineSplice(0, rep.lines.length(), [oneEntry]);
        insertDomLines(null, [oneEntry.domInfo]);
        rep.alines = Changeset.splitAttributionLines(
            Changeset.makeAttribution('\n'), '\n');

        bindTheEventHandlers();
      });

      hooks.callAll('aceInitialized', {
        editorInfo,
        rep,
        documentAttributeManager,
      });

      scheduler.setTimeout(() => {
        parent.readyFunc(); // defined in code that sets up the inner iframe
      }, 0);

      isSetUp = true;
    });
  };
}

exports.init = function () {
  const editor = new Ace2Inner();
  editor.init();
};
