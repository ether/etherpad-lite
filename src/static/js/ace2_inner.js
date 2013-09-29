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
var _, $, jQuery, plugins, Ace2Common;

Ace2Common = require('./ace2_common');

plugins = require('ep_etherpad-lite/static/js/pluginfw/client_plugins');
$ = jQuery = require('./rjquery').$;
_ = require("./underscore");

var isNodeText = Ace2Common.isNodeText,
  browser = $.browser,
  getAssoc = Ace2Common.getAssoc,
  setAssoc = Ace2Common.setAssoc,
  isTextNode = Ace2Common.isTextNode,
  binarySearchInfinite = Ace2Common.binarySearchInfinite,
  htmlPrettyEscape = Ace2Common.htmlPrettyEscape,
  noop = Ace2Common.noop;
  var hooks = require('./pluginfw/hooks');


function Ace2Inner(){

  var makeChangesetTracker = require('./changesettracker').makeChangesetTracker;
  var colorutils = require('./colorutils').colorutils;
  var makeContentCollector = require('./contentcollector').makeContentCollector;
  var makeCSSManager = require('./cssmanager').makeCSSManager;
  var domline = require('./domline').domline;
  var AttribPool = require('./AttributePool');
  var Changeset = require('./Changeset');
  var ChangesetUtils = require('./ChangesetUtils');
  var linestylefilter = require('./linestylefilter').linestylefilter;
  var SkipList = require('./skiplist');
  var undoModule = require('./undomodule').undoModule;
  var makeVirtualLineView = require('./virtual_lines').makeVirtualLineView;
  var AttributeManager = require('./AttributeManager');

  var DEBUG = false; //$$ build script replaces the string "var DEBUG=true;//$$" with "var DEBUG=false;"
  // changed to false
  var isSetUp = false;

  var THE_TAB = '    '; //4
  var MAX_LIST_LEVEL = 8;

  var LINE_NUMBER_PADDING_RIGHT = 4;
  var LINE_NUMBER_PADDING_LEFT = 4;
  var MIN_LINEDIV_WIDTH = 20;
  var EDIT_BODY_PADDING_TOP = 8;
  var EDIT_BODY_PADDING_LEFT = 8;

  var caughtErrors = [];

  var thisAuthor = '';

  var disposed = false;
  var editorInfo = parent.editorInfo;

  var iframe = window.frameElement;
  var outerWin = iframe.ace_outerWin;
  iframe.ace_outerWin = null; // prevent IE 6 memory leak
  var sideDiv = iframe.nextSibling;
  var lineMetricsDiv = sideDiv.nextSibling;
  var overlaysdiv = lineMetricsDiv.nextSibling;
  initLineNumbers();

  var outsideKeyDown = noop;

  var outsideKeyPress = function(){return true;};

  var outsideNotifyDirty = noop;

  // selFocusAtStart -- determines whether the selection extends "backwards", so that the focus
  // point (controlled with the arrow keys) is at the beginning; not supported in IE, though
  // native IE selections have that behavior (which we try not to interfere with).
  // Must be false if selection is collapsed!
  var rep = {
    lines: new SkipList(),
    selStart: null,
    selEnd: null,
    selFocusAtStart: false,
    alltext: "",
    alines: [],
    apool: new AttribPool()
  };

  // lines, alltext, alines, and DOM are set up in setup()
  if (undoModule.enabled)
  {
    undoModule.apool = rep.apool;
  }

  var root, doc; // set in setup()
  var isEditable = true;
  var doesWrap = true;
  var hasLineNumbers = true;
  var isStyled = true;

  // space around the innermost iframe element
  var iframePadLeft = MIN_LINEDIV_WIDTH + LINE_NUMBER_PADDING_RIGHT + EDIT_BODY_PADDING_LEFT;
  var iframePadTop = EDIT_BODY_PADDING_TOP;
  var iframePadBottom = 0,
      iframePadRight = 0;

  var console = (DEBUG && window.console);
  var documentAttributeManager;

  if (!window.console)
  {
    var names = ["log", "debug", "info", "warn", "error", "assert", "dir", "dirxml", "group", "groupEnd", "time", "timeEnd", "count", "trace", "profile", "profileEnd"];
    console = {};
    for (var i = 0; i < names.length; ++i)
    console[names[i]] = noop;
    //console.error = function(str) { alert(str); };
  }

  var PROFILER = window.PROFILER;
  if (!PROFILER)
  {
    PROFILER = function()
    {
      return {
        start: noop,
        mark: noop,
        literal: noop,
        end: noop,
        cancel: noop
      };
    };
  }

  // "dmesg" is for displaying messages in the in-page output pane
  // visible when "?djs=1" is appended to the pad URL.  It generally
  // remains a no-op unless djs is enabled, but we make a habit of
  // only calling it in error cases or while debugging.
  var dmesg = noop;
  window.dmesg = noop;


  var scheduler = parent; // hack for opera required

  var textFace = 'monospace';
  var textSize = 12;


  function textLineHeight()
  {
    return Math.round(textSize * 4 / 3);
  }

  var dynamicCSS = null;
  var outerDynamicCSS = null;
  var parentDynamicCSS = null;

  function initDynamicCSS()
  {
    dynamicCSS = makeCSSManager("dynamicsyntax");
    outerDynamicCSS = makeCSSManager("dynamicsyntax", "outer");
    parentDynamicCSS = makeCSSManager("dynamicsyntax", "parent");
  }

  var changesetTracker = makeChangesetTracker(scheduler, rep.apool, {
    withCallbacks: function(operationName, f)
    {
      inCallStackIfNecessary(operationName, function()
      {
        fastIncorp(1);
        f(
        {
          setDocumentAttributedText: function(atext)
          {
            setDocAText(atext);
          },
          applyChangesetToDocument: function(changeset, preferInsertionAfterCaret)
          {
            var oldEventType = currentCallStack.editEvent.eventType;
            currentCallStack.startNewEvent("nonundoable");

            performDocumentApplyChangeset(changeset, preferInsertionAfterCaret);

            currentCallStack.startNewEvent(oldEventType);
          }
        });
      });
    }
  });

  var authorInfos = {}; // presence of key determines if author is present in doc

  function getAuthorInfos(){
    return authorInfos;
  };
  editorInfo.ace_getAuthorInfos= getAuthorInfos;

  function setAuthorStyle(author, info)
  {
    if (!dynamicCSS) {
      return;
    }
    var authorSelector = getAuthorColorClassSelector(getAuthorClassName(author));

    var authorStyleSet = hooks.callAll('aceSetAuthorStyle', {
      dynamicCSS: dynamicCSS,
      parentDynamicCSS: parentDynamicCSS,
      outerDynamicCSS: outerDynamicCSS,
      info: info,
      author: author,
      authorSelector: authorSelector,
    });

    // Prevent default behaviour if any hook says so
    if (_.any(authorStyleSet, function(it) { return it }))
    {
      return
    }

    if (!info)
    {
      dynamicCSS.removeSelectorStyle(authorSelector);
      parentDynamicCSS.removeSelectorStyle(authorSelector);
    }
    else
    {
      if (info.bgcolor)
      {
        var bgcolor = info.bgcolor;
        if ((typeof info.fade) == "number")
        {
          bgcolor = fadeColor(bgcolor, info.fade);
        }

        var authorStyle = dynamicCSS.selectorStyle(authorSelector);
        var parentAuthorStyle = parentDynamicCSS.selectorStyle(authorSelector);
        var anchorStyle = dynamicCSS.selectorStyle(authorSelector + ' > a')

        // author color
        authorStyle.backgroundColor = bgcolor;
        parentAuthorStyle.backgroundColor = bgcolor;

        // text contrast
        if(colorutils.luminosity(colorutils.css2triple(bgcolor)) < 0.5)
        {
          authorStyle.color = '#ffffff';
          parentAuthorStyle.color = '#ffffff';
        }else{
          authorStyle.color = null;
          parentAuthorStyle.color = null;
        }

        // anchor text contrast
        if(colorutils.luminosity(colorutils.css2triple(bgcolor)) < 0.55)
        {
          anchorStyle.color = colorutils.triple2css(colorutils.complementary(colorutils.css2triple(bgcolor)));
        }else{
          anchorStyle.color = null;
        }
      }
    }
  }

  function setAuthorInfo(author, info)
  {
    if ((typeof author) != "string")
    {
      throw new Error("setAuthorInfo: author (" + author + ") is not a string");
    }
    if (!info)
    {
      delete authorInfos[author];
    }
    else
    {
      authorInfos[author] = info;
    }
    setAuthorStyle(author, info);
  }

  function getAuthorClassName(author)
  {
    return "author-" + author.replace(/[^a-y0-9]/g, function(c)
    {
      if (c == ".") return "-";
      return 'z' + c.charCodeAt(0) + 'z';
    });
  }

  function className2Author(className)
  {
    if (className.substring(0, 7) == "author-")
    {
      return className.substring(7).replace(/[a-y0-9]+|-|z.+?z/g, function(cc)
      {
        if (cc == '-') return '.';
        else if (cc.charAt(0) == 'z')
        {
          return String.fromCharCode(Number(cc.slice(1, -1)));
        }
        else
        {
          return cc;
        }
      });
    }
    return null;
  }

  function getAuthorColorClassSelector(oneClassName)
  {
    return ".authorColors ." + oneClassName;
  }

  function setUpTrackingCSS()
  {
    if (dynamicCSS)
    {
      var backgroundHeight = lineMetricsDiv.offsetHeight;
      var lineHeight = textLineHeight();
      var extraBodding = 0;
      var extraTodding = 0;
      if (backgroundHeight < lineHeight)
      {
        extraBodding = Math.ceil((lineHeight - backgroundHeight) / 2);
        extraTodding = lineHeight - backgroundHeight - extraBodding;
      }
      var spanStyle = dynamicCSS.selectorStyle("#innerdocbody span");
      spanStyle.paddingTop = extraTodding + "px";
      spanStyle.paddingBottom = extraBodding + "px";
    }
  }

  function boldColorFromColor(lightColorCSS)
  {
    var color = colorutils.css2triple(lightColorCSS);

    // amp up the saturation to full
    color = colorutils.saturate(color);

    // normalize brightness based on luminosity
    color = colorutils.scaleColor(color, 0, 0.5 / colorutils.luminosity(color));

    return colorutils.triple2css(color);
  }

  function fadeColor(colorCSS, fadeFrac)
  {
    var color = colorutils.css2triple(colorCSS);
    color = colorutils.blend(color, [1, 1, 1], fadeFrac);
    return colorutils.triple2css(color);
  }

  editorInfo.ace_getRep = function()
  {
    return rep;
  };

  editorInfo.ace_getAuthor = function()
  {
    return thisAuthor;
  }

  var currentCallStack = null;

  function inCallStack(type, action)
  {
    if (disposed) return;

    if (currentCallStack)
    {
      console.error("Can't enter callstack " + type + ", already in " + currentCallStack.type);
    }

    var profiling = false;

    function profileRest()
    {
      profiling = true;
      console.profile();
    }

    function newEditEvent(eventType)
    {
      return {
        eventType: eventType,
        backset: null
      };
    }

    function submitOldEvent(evt)
    {
      if (rep.selStart && rep.selEnd)
      {
        var selStartChar = rep.lines.offsetOfIndex(rep.selStart[0]) + rep.selStart[1];
        var selEndChar = rep.lines.offsetOfIndex(rep.selEnd[0]) + rep.selEnd[1];
        evt.selStart = selStartChar;
        evt.selEnd = selEndChar;
        evt.selFocusAtStart = rep.selFocusAtStart;
      }
      if (undoModule.enabled)
      {
        var undoWorked = false;
        try
        {
          if (evt.eventType == "setup" || evt.eventType == "importText" || evt.eventType == "setBaseText")
          {
            undoModule.clearHistory();
          }
          else if (evt.eventType == "nonundoable")
          {
            if (evt.changeset)
            {
              undoModule.reportExternalChange(evt.changeset);
            }
          }
          else
          {
            undoModule.reportEvent(evt);
          }
          undoWorked = true;
        }
        finally
        {
          if (!undoWorked)
          {
            undoModule.enabled = false; // for safety
          }
        }
      }
    }

    function startNewEvent(eventType, dontSubmitOld)
    {
      var oldEvent = currentCallStack.editEvent;
      if (!dontSubmitOld)
      {
        submitOldEvent(oldEvent);
      }
      currentCallStack.editEvent = newEditEvent(eventType);
      return oldEvent;
    }

    currentCallStack = {
      type: type,
      docTextChanged: false,
      selectionAffected: false,
      userChangedSelection: false,
      domClean: false,
      profileRest: profileRest,
      isUserChange: false,
      // is this a "user change" type of call-stack
      repChanged: false,
      editEvent: newEditEvent(type),
      startNewEvent: startNewEvent
    };
    var cleanExit = false;
    var result;
    try
    {
      result = action();

      hooks.callAll('aceEditEvent', {
        callstack: currentCallStack,
        editorInfo: editorInfo,
        rep: rep,
        documentAttributeManager: documentAttributeManager
      });

      //console.log("Just did action for: "+type);
      cleanExit = true;
    }
    catch (e)
    {
      caughtErrors.push(
      {
        error: e,
        time: +new Date()
      });
      dmesg(e.toString());
      throw e;
    }
    finally
    {
      var cs = currentCallStack;
      //console.log("Finished action for: "+type);
      if (cleanExit)
      {
        submitOldEvent(cs.editEvent);
        if (cs.domClean && cs.type != "setup")
        {
          // if (cs.isUserChange)
          // {
          //  if (cs.repChanged) parenModule.notifyChange();
          //  else parenModule.notifyTick();
          // }
          if (cs.selectionAffected)
          {
            updateBrowserSelectionFromRep();
          }
          if ((cs.docTextChanged || cs.userChangedSelection) && cs.type != "applyChangesToBase")
          {
            scrollSelectionIntoView();
          }
          if (cs.docTextChanged && cs.type.indexOf("importText") < 0)
          {
            outsideNotifyDirty();
          }
        }
      }
      else
      {
        // non-clean exit
        if (currentCallStack.type == "idleWorkTimer")
        {
          idleWorkTimer.atLeast(1000);
        }
      }
      currentCallStack = null;
      if (profiling) console.profileEnd();
    }
    return result;
  }
  editorInfo.ace_inCallStack = inCallStack;

  function inCallStackIfNecessary(type, action)
  {
    if (!currentCallStack)
    {
      inCallStack(type, action);
    }
    else
    {
      action();
    }
  }
  editorInfo.ace_inCallStackIfNecessary = inCallStackIfNecessary;

  function recolorLineByKey(key)
  {
    if (rep.lines.containsKey(key))
    {
      var offset = rep.lines.offsetOfKey(key);
      var width = rep.lines.atKey(key).width;
      recolorLinesInRange(offset, offset + width);
    }
  }

  function getLineKeyForOffset(charOffset)
  {
    return rep.lines.atOffset(charOffset).key;
  }


  function dispose()
  {
    disposed = true;
    if (idleWorkTimer) idleWorkTimer.never();
    teardown();
  }

  function checkALines()
  {
    return; // disable for speed


    function error()
    {
      throw new Error("checkALines");
    }
    if (rep.alines.length != rep.lines.length())
    {
      error();
    }
    for (var i = 0; i < rep.alines.length; i++)
    {
      var aline = rep.alines[i];
      var lineText = rep.lines.atIndex(i).text + "\n";
      var lineTextLength = lineText.length;
      var opIter = Changeset.opIterator(aline);
      var alineLength = 0;
      while (opIter.hasNext())
      {
        var o = opIter.next();
        alineLength += o.chars;
        if (opIter.hasNext())
        {
          if (o.lines !== 0) error();
        }
        else
        {
          if (o.lines != 1) error();
        }
      }
      if (alineLength != lineTextLength)
      {
        error();
      }
    }
  }

  function setWraps(newVal)
  {
    doesWrap = newVal;
    var dwClass = "doesWrap";
    setClassPresence(root, "doesWrap", doesWrap);
    scheduler.setTimeout(function()
    {
      inCallStackIfNecessary("setWraps", function()
      {
        fastIncorp(7);
        recreateDOM();
        fixView();
      });
    }, 0);
  }

  function setStyled(newVal)
  {
    var oldVal = isStyled;
    isStyled = !! newVal;

    if (newVal != oldVal)
    {
      if (!newVal)
      {
        // clear styles
        inCallStackIfNecessary("setStyled", function()
        {
          fastIncorp(12);
          var clearStyles = [];
          for (var k in STYLE_ATTRIBS)
          {
            clearStyles.push([k, '']);
          }
          performDocumentApplyAttributesToCharRange(0, rep.alltext.length, clearStyles);
        });
      }
    }
  }

  function setTextFace(face)
  {
    textFace = face;
    root.style.fontFamily = textFace;
    lineMetricsDiv.style.fontFamily = textFace;
    scheduler.setTimeout(function()
    {
      setUpTrackingCSS();
    }, 0);
  }

  function setTextSize(size)
  {
    textSize = size;
    root.style.fontSize = textSize + "px";
    root.style.lineHeight = textLineHeight() + "px";
    sideDiv.style.lineHeight = textLineHeight() + "px";
    lineMetricsDiv.style.fontSize = textSize + "px";
    scheduler.setTimeout(function()
    {
      setUpTrackingCSS();
    }, 0);
  }

  function recreateDOM()
  {
    // precond: normalized
    recolorLinesInRange(0, rep.alltext.length);
  }

  function setEditable(newVal)
  {
    isEditable = newVal;

    // the following may fail, e.g. if iframe is hidden
    if (!isEditable)
    {
      setDesignMode(false);
    }
    else
    {
      setDesignMode(true);
    }
    setClassPresence(root, "static", !isEditable);
  }

  function enforceEditability()
  {
    setEditable(isEditable);
  }

  function importText(text, undoable, dontProcess)
  {
    var lines;
    if (dontProcess)
    {
      if (text.charAt(text.length - 1) != "\n")
      {
        throw new Error("new raw text must end with newline");
      }
      if (/[\r\t\xa0]/.exec(text))
      {
        throw new Error("new raw text must not contain CR, tab, or nbsp");
      }
      lines = text.substring(0, text.length - 1).split('\n');
    }
    else
    {
      lines = _.map(text.split('\n'), textify);
    }
    var newText = "\n";
    if (lines.length > 0)
    {
      newText = lines.join('\n') + '\n';
    }

    inCallStackIfNecessary("importText" + (undoable ? "Undoable" : ""), function()
    {
      setDocText(newText);
    });

    if (dontProcess && rep.alltext != text)
    {
      throw new Error("mismatch error setting raw text in importText");
    }
  }

  function importAText(atext, apoolJsonObj, undoable)
  {
    atext = Changeset.cloneAText(atext);
    if (apoolJsonObj)
    {
      var wireApool = (new AttribPool()).fromJsonable(apoolJsonObj);
      atext.attribs = Changeset.moveOpsToNewPool(atext.attribs, wireApool, rep.apool);
    }
    inCallStackIfNecessary("importText" + (undoable ? "Undoable" : ""), function()
    {
      setDocAText(atext);
    });
  }

  function setDocAText(atext)
  {
    fastIncorp(8);

    var oldLen = rep.lines.totalWidth();
    var numLines = rep.lines.length();
    var upToLastLine = rep.lines.offsetOfIndex(numLines - 1);
    var lastLineLength = rep.lines.atIndex(numLines - 1).text.length;
    var assem = Changeset.smartOpAssembler();
    var o = Changeset.newOp('-');
    o.chars = upToLastLine;
    o.lines = numLines - 1;
    assem.append(o);
    o.chars = lastLineLength;
    o.lines = 0;
    assem.append(o);
    Changeset.appendATextToAssembler(atext, assem);
    var newLen = oldLen + assem.getLengthChange();
    var changeset = Changeset.checkRep(
    Changeset.pack(oldLen, newLen, assem.toString(), atext.text.slice(0, -1)));
    performDocumentApplyChangeset(changeset);

    performSelectionChange([0, rep.lines.atIndex(0).lineMarker], [0, rep.lines.atIndex(0).lineMarker]);

    idleWorkTimer.atMost(100);

    if (rep.alltext != atext.text)
    {
      dmesg(htmlPrettyEscape(rep.alltext));
      dmesg(htmlPrettyEscape(atext.text));
      throw new Error("mismatch error setting raw text in setDocAText");
    }
  }

  function setDocText(text)
  {
    setDocAText(Changeset.makeAText(text));
  }

  function getDocText()
  {
    var alltext = rep.alltext;
    var len = alltext.length;
    if (len > 0) len--; // final extra newline
    return alltext.substring(0, len);
  }

  function exportText()
  {
    if (currentCallStack && !currentCallStack.domClean)
    {
      inCallStackIfNecessary("exportText", function()
      {
        fastIncorp(2);
      });
    }
    return getDocText();
  }

  function editorChangedSize()
  {
    fixView();
  }

  function setOnKeyPress(handler)
  {
    outsideKeyPress = handler;
  }

  function setOnKeyDown(handler)
  {
    outsideKeyDown = handler;
  }

  function setNotifyDirty(handler)
  {
    outsideNotifyDirty = handler;
  }

  function getFormattedCode()
  {
    if (currentCallStack && !currentCallStack.domClean)
    {
      inCallStackIfNecessary("getFormattedCode", incorporateUserChanges);
    }
    var buf = [];
    if (rep.lines.length() > 0)
    {
      // should be the case, even for empty file
      var entry = rep.lines.atIndex(0);
      while (entry)
      {
        var domInfo = entry.domInfo;
        buf.push((domInfo && domInfo.getInnerHTML()) || domline.processSpaces(domline.escapeHTML(entry.text), doesWrap) || '&nbsp;' /*empty line*/ );
        entry = rep.lines.next(entry);
      }
    }
    return '<div class="syntax"><div>' + buf.join('</div>\n<div>') + '</div></div>';
  }

  var CMDS = {
    clearauthorship: function(prompt)
    {
      if ((!(rep.selStart && rep.selEnd)) || isCaret())
      {
        if (prompt)
        {
          prompt();
        }
        else
        {
          performDocumentApplyAttributesToCharRange(0, rep.alltext.length, [
            ['author', '']
          ]);
        }
      }
      else
      {
        setAttributeOnSelection('author', '');
      }
    }
  };

  function execCommand(cmd)
  {
    cmd = cmd.toLowerCase();
    var cmdArgs = Array.prototype.slice.call(arguments, 1);
    if (CMDS[cmd])
    {
      inCallStackIfNecessary(cmd, function()
      {
        fastIncorp(9);
        CMDS[cmd].apply(CMDS, cmdArgs);
      });
    }
  }

  function replaceRange(start, end, text)
  {
    inCallStackIfNecessary('replaceRange', function()
    {
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
  editorInfo.ace_getAuthorInfos= getAuthorInfos;
  editorInfo.ace_performDocumentReplaceRange = performDocumentReplaceRange;
  editorInfo.ace_performDocumentReplaceCharRange = performDocumentReplaceCharRange;
  editorInfo.ace_renumberList = renumberList;
  editorInfo.ace_doReturnKey = doReturnKey;
  editorInfo.ace_isBlockElement = isBlockElement;
  editorInfo.ace_getLineListType = getLineListType;

  editorInfo.ace_callWithAce = function(fn, callStack, normalize)
  {
    var wrapper = function()
    {
      return fn(editorInfo);
    };

    if (normalize !== undefined)
    {
      var wrapper1 = wrapper;
      wrapper = function()
      {
        editorInfo.ace_fastIncorp(9);
        wrapper1();
      };
    }

    if (callStack !== undefined)
    {
      return editorInfo.ace_inCallStack(callStack, wrapper);
    }
    else
    {
      return wrapper();
    }
  };

  // This methed exposes a setter for some ace properties
  // @param key the name of the parameter
  // @param value the value to set to
  editorInfo.ace_setProperty = function(key, value)
  {

    // Convinience function returning a setter for a class on an element
    var setClassPresenceNamed = function(element, cls){
      return function(value){
         setClassPresence(element, cls, !! value)
      }
    };

    // These properties are exposed
    var setters = {
      wraps: setWraps,
      showsauthorcolors: setClassPresenceNamed(root, "authorColors"),
      showsuserselections: setClassPresenceNamed(root, "userSelections"),
      showslinenumbers : function(value){
        hasLineNumbers = !! value;
        // disable line numbers on mobile devices
        if (browser.mobile) hasLineNumbers = false;
        setClassPresence(sideDiv, "sidedivhidden", !hasLineNumbers);
        fixView();
      },
      grayedout: setClassPresenceNamed(outerWin.document.body, "grayedout"),
      dmesg: function(){ dmesg = window.dmesg = value; },
      userauthor: function(value){
        thisAuthor = String(value);
        documentAttributeManager.author = thisAuthor;
      },
      styled: setStyled,
      textface: setTextFace,
      textsize: setTextSize,
      rtlistrue: function(value) {
        setClassPresence(root, "rtl", value)
        setClassPresence(root, "ltr", !value)
        document.documentElement.dir = value? 'rtl' : 'ltr'
      }
    };

    var setter = setters[key.toLowerCase()];

    // check if setter is present
    if(setter !== undefined){
      setter(value)
    }
  };

  editorInfo.ace_setBaseText = function(txt)
  {
    changesetTracker.setBaseText(txt);
  };
  editorInfo.ace_setBaseAttributedText = function(atxt, apoolJsonObj)
  {
    setUpTrackingCSS();
    changesetTracker.setBaseAttributedText(atxt, apoolJsonObj);
  };
  editorInfo.ace_applyChangesToBase = function(c, optAuthor, apoolJsonObj)
  {
    changesetTracker.applyChangesToBase(c, optAuthor, apoolJsonObj);
  };
  editorInfo.ace_prepareUserChangeset = function()
  {
    return changesetTracker.prepareUserChangeset();
  };
  editorInfo.ace_applyPreparedChangesetToBase = function()
  {
    changesetTracker.applyPreparedChangesetToBase();
  };
  editorInfo.ace_setUserChangeNotificationCallback = function(f)
  {
    changesetTracker.setUserChangeNotificationCallback(f);
  };
  editorInfo.ace_setAuthorInfo = function(author, info)
  {
    setAuthorInfo(author, info);
  };
  editorInfo.ace_setAuthorSelectionRange = function(author, start, end)
  {
    changesetTracker.setAuthorSelectionRange(author, start, end);
  };

  editorInfo.ace_getUnhandledErrors = function()
  {
    return caughtErrors.slice();
  };

  editorInfo.ace_getDocument = function()
  {
    return doc;
  };

  editorInfo.ace_getDebugProperty = function(prop)
  {
    if (prop == "debugger")
    {
      // obfuscate "eval" so as not to scare yuicompressor
      window['ev' + 'al']("debugger");
    }
    else if (prop == "rep")
    {
      return rep;
    }
    else if (prop == "window")
    {
      return window;
    }
    else if (prop == "document")
    {
      return document;
    }
    return undefined;
  };

  function now()
  {
    return (new Date()).getTime();
  }

  function newTimeLimit(ms)
  {
    //console.debug("new time limit");
    var startTime = now();
    var lastElapsed = 0;
    var exceededAlready = false;
    var printedTrace = false;
    var isTimeUp = function()
      {
        if (exceededAlready)
        {
          if ((!printedTrace))
          { // && now() - startTime - ms > 300) {
            //console.trace();
            printedTrace = true;
          }
          return true;
        }
        var elapsed = now() - startTime;
        if (elapsed > ms)
        {
          exceededAlready = true;
          //console.debug("time limit hit, before was %d/%d", lastElapsed, ms);
          //console.trace();
          return true;
        }
        else
        {
          lastElapsed = elapsed;
          return false;
        }
      };

    isTimeUp.elapsed = function()
    {
      return now() - startTime;
    };
    return isTimeUp;
  }


  function makeIdleAction(func)
  {
    var scheduledTimeout = null;
    var scheduledTime = 0;

    function unschedule()
    {
      if (scheduledTimeout)
      {
        scheduler.clearTimeout(scheduledTimeout);
        scheduledTimeout = null;
      }
    }

    function reschedule(time)
    {
      unschedule();
      scheduledTime = time;
      var delay = time - now();
      if (delay < 0) delay = 0;
      scheduledTimeout = scheduler.setTimeout(callback, delay);
    }

    function callback()
    {
      scheduledTimeout = null;
      // func may reschedule the action
      func();
    }
    return {
      atMost: function(ms)
      {
        var latestTime = now() + ms;
        if ((!scheduledTimeout) || scheduledTime > latestTime)
        {
          reschedule(latestTime);
        }
      },
      // atLeast(ms) will schedule the action if not scheduled yet.
      // In other words, "infinity" is replaced by ms, even though
      // it is technically larger.
      atLeast: function(ms)
      {
        var earliestTime = now() + ms;
        if ((!scheduledTimeout) || scheduledTime < earliestTime)
        {
          reschedule(earliestTime);
        }
      },
      never: function()
      {
        unschedule();
      }
    };
  }

  function fastIncorp(n)
  {
    // normalize but don't do any lexing or anything
    incorporateUserChanges(newTimeLimit(0));
  }
  editorInfo.ace_fastIncorp = fastIncorp;

  function incorpIfQuick()
  {
    var me = incorpIfQuick;
    var failures = (me.failures || 0);
    if (failures < 5)
    {
      var isTimeUp = newTimeLimit(40);
      var madeChanges = incorporateUserChanges(isTimeUp);
      if (isTimeUp())
      {
        me.failures = failures + 1;
      }
      return true;
    }
    else
    {
      var skipCount = (me.skipCount || 0);
      skipCount++;
      if (skipCount == 20)
      {
        skipCount = 0;
        me.failures = 0;
      }
      me.skipCount = skipCount;
    }
    return false;
  }

  var idleWorkTimer = makeIdleAction(function()
  {

    //if (! top.BEFORE) top.BEFORE = [];
    //top.BEFORE.push(magicdom.root.dom.innerHTML);
    //if (! isEditable) return; // and don't reschedule
    if (inInternationalComposition)
    {
      // don't do idle input incorporation during international input composition
      idleWorkTimer.atLeast(500);
      return;
    }

    inCallStackIfNecessary("idleWorkTimer", function()
    {

      var isTimeUp = newTimeLimit(250);

      //console.time("idlework");
      var finishedImportantWork = false;
      var finishedWork = false;

      try
      {

        // isTimeUp() is a soft constraint for incorporateUserChanges,
        // which always renormalizes the DOM, no matter how long it takes,
        // but doesn't necessarily lex and highlight it
        incorporateUserChanges(isTimeUp);

        if (isTimeUp()) return;

        updateLineNumbers(); // update line numbers if any time left
        if (isTimeUp()) return;

        var visibleRange = getVisibleCharRange();
        var docRange = [0, rep.lines.totalWidth()];
        //console.log("%o %o", docRange, visibleRange);
        finishedImportantWork = true;
        finishedWork = true;
      }
      finally
      {
        //console.timeEnd("idlework");
        if (finishedWork)
        {
          idleWorkTimer.atMost(1000);
        }
        else if (finishedImportantWork)
        {
          // if we've finished highlighting the view area,
          // more highlighting could be counter-productive,
          // e.g. if the user just opened a triple-quote and will soon close it.
          idleWorkTimer.atMost(500);
        }
        else
        {
          var timeToWait = Math.round(isTimeUp.elapsed() / 2);
          if (timeToWait < 100) timeToWait = 100;
          idleWorkTimer.atMost(timeToWait);
        }
      }
    });

    //if (! top.AFTER) top.AFTER = [];
    //top.AFTER.push(magicdom.root.dom.innerHTML);
  });

  var _nextId = 1;

  function uniqueId(n)
  {
    // not actually guaranteed to be unique, e.g. if user copy-pastes
    // nodes with ids
    var nid = n.id;
    if (nid) return nid;
    return (n.id = "magicdomid" + (_nextId++));
  }


  function recolorLinesInRange(startChar, endChar, isTimeUp, optModFunc)
  {
    if (endChar <= startChar) return;
    if (startChar < 0 || startChar >= rep.lines.totalWidth()) return;
    var lineEntry = rep.lines.atOffset(startChar); // rounds down to line boundary
    var lineStart = rep.lines.offsetOfEntry(lineEntry);
    var lineIndex = rep.lines.indexOfEntry(lineEntry);
    var selectionNeedsResetting = false;
    var firstLine = null;
    var lastLine = null;
    isTimeUp = (isTimeUp || noop);

    // tokenFunc function; accesses current value of lineEntry and curDocChar,
    // also mutates curDocChar
    var curDocChar;
    var tokenFunc = function(tokenText, tokenClass)
      {
        lineEntry.domInfo.appendSpan(tokenText, tokenClass);
        };
    if (optModFunc)
    {
      var f = tokenFunc;
      tokenFunc = function(tokenText, tokenClass)
      {
        optModFunc(tokenText, tokenClass, f, curDocChar);
        curDocChar += tokenText.length;
      };
    }

    while (lineEntry && lineStart < endChar && !isTimeUp())
    {
      //var timer = newTimeLimit(200);
      var lineEnd = lineStart + lineEntry.width;

      curDocChar = lineStart;
      lineEntry.domInfo.clearSpans();
      getSpansForLine(lineEntry, tokenFunc, lineStart);
      lineEntry.domInfo.finishUpdate();

      markNodeClean(lineEntry.lineNode);

      if (rep.selStart && rep.selStart[0] == lineIndex || rep.selEnd && rep.selEnd[0] == lineIndex)
      {
        selectionNeedsResetting = true;
      }

      //if (timer()) console.dirxml(lineEntry.lineNode.dom);
      if (firstLine === null) firstLine = lineIndex;
      lastLine = lineIndex;
      lineStart = lineEnd;
      lineEntry = rep.lines.next(lineEntry);
      lineIndex++;
    }
    if (selectionNeedsResetting)
    {
      currentCallStack.selectionAffected = true;
    }
    //console.debug("Recolored line range %d-%d", firstLine, lastLine);
  }

  // like getSpansForRange, but for a line, and the func takes (text,class)
  // instead of (width,class); excludes the trailing '\n' from
  // consideration by func


  function getSpansForLine(lineEntry, textAndClassFunc, lineEntryOffsetHint)
  {
    var lineEntryOffset = lineEntryOffsetHint;
    if ((typeof lineEntryOffset) != "number")
    {
      lineEntryOffset = rep.lines.offsetOfEntry(lineEntry);
    }
    var text = lineEntry.text;
    var width = lineEntry.width; // text.length+1
    if (text.length === 0)
    {
      // allow getLineStyleFilter to set line-div styles
      var func = linestylefilter.getLineStyleFilter(
      0, '', textAndClassFunc, rep.apool);
      func('', '');
    }
    else
    {
      var offsetIntoLine = 0;
      var filteredFunc = linestylefilter.getFilterStack(text, textAndClassFunc, browser);
      var lineNum = rep.lines.indexOfEntry(lineEntry);
      var aline = rep.alines[lineNum];
      filteredFunc = linestylefilter.getLineStyleFilter(
      text.length, aline, filteredFunc, rep.apool);
      filteredFunc(text, '');
    }
  }

  var observedChanges;

  function clearObservedChanges()
  {
    observedChanges = {
      cleanNodesNearChanges: {}
    };
  }
  clearObservedChanges();

  function getCleanNodeByKey(key)
  {
    var p = PROFILER("getCleanNodeByKey", false);
    p.extra = 0;
    var n = doc.getElementById(key);
    // copying and pasting can lead to duplicate ids
    while (n && isNodeDirty(n))
    {
      p.extra++;
      n.id = "";
      n = doc.getElementById(key);
    }
    p.literal(p.extra, "extra");
    p.end();
    return n;
  }

  function observeChangesAroundNode(node)
  {
    // Around this top-level DOM node, look for changes to the document
    // (from how it looks in our representation) and record them in a way
    // that can be used to "normalize" the document (apply the changes to our
    // representation, and put the DOM in a canonical form).
    //top.console.log("observeChangesAroundNode(%o)", node);
    var cleanNode;
    var hasAdjacentDirtyness;
    if (!isNodeDirty(node))
    {
      cleanNode = node;
      var prevSib = cleanNode.previousSibling;
      var nextSib = cleanNode.nextSibling;
      hasAdjacentDirtyness = ((prevSib && isNodeDirty(prevSib)) || (nextSib && isNodeDirty(nextSib)));
    }
    else
    {
      // node is dirty, look for clean node above
      var upNode = node.previousSibling;
      while (upNode && isNodeDirty(upNode))
      {
        upNode = upNode.previousSibling;
      }
      if (upNode)
      {
        cleanNode = upNode;
      }
      else
      {
        var downNode = node.nextSibling;
        while (downNode && isNodeDirty(downNode))
        {
          downNode = downNode.nextSibling;
        }
        if (downNode)
        {
          cleanNode = downNode;
        }
      }
      if (!cleanNode)
      {
        // Couldn't find any adjacent clean nodes!
        // Since top and bottom of doc is dirty, the dirty area will be detected.
        return;
      }
      hasAdjacentDirtyness = true;
    }

    if (hasAdjacentDirtyness)
    {
      // previous or next line is dirty
      observedChanges.cleanNodesNearChanges['$' + uniqueId(cleanNode)] = true;
    }
    else
    {
      // next and prev lines are clean (if they exist)
      var lineKey = uniqueId(cleanNode);
      var prevSib = cleanNode.previousSibling;
      var nextSib = cleanNode.nextSibling;
      var actualPrevKey = ((prevSib && uniqueId(prevSib)) || null);
      var actualNextKey = ((nextSib && uniqueId(nextSib)) || null);
      var repPrevEntry = rep.lines.prev(rep.lines.atKey(lineKey));
      var repNextEntry = rep.lines.next(rep.lines.atKey(lineKey));
      var repPrevKey = ((repPrevEntry && repPrevEntry.key) || null);
      var repNextKey = ((repNextEntry && repNextEntry.key) || null);
      if (actualPrevKey != repPrevKey || actualNextKey != repNextKey)
      {
        observedChanges.cleanNodesNearChanges['$' + uniqueId(cleanNode)] = true;
      }
    }
  }

  function observeChangesAroundSelection()
  {
    if (currentCallStack.observedSelection) return;
    currentCallStack.observedSelection = true;

    var p = PROFILER("getSelection", false);
    var selection = getSelection();
    p.end();

    function topLevel(n)
    {
      if ((!n) || n == root) return null;
      while (n.parentNode != root)
      {
        n = n.parentNode;
      }
      return n;
    }

    if (selection)
    {
      var node1 = topLevel(selection.startPoint.node);
      var node2 = topLevel(selection.endPoint.node);
      if (node1) observeChangesAroundNode(node1);
      if (node2 && node1 != node2)
      {
        observeChangesAroundNode(node2);
      }
    }
  }

  function observeSuspiciousNodes()
  {
    // inspired by Firefox bug #473255, where pasting formatted text
    // causes the cursor to jump away, making the new HTML never found.
    if (root.getElementsByTagName)
    {
      var nds = root.getElementsByTagName("style");
      for (var i = 0; i < nds.length; i++)
      {
        var n = nds[i];
        while (n.parentNode && n.parentNode != root)
        {
          n = n.parentNode;
        }
        if (n.parentNode == root)
        {
          observeChangesAroundNode(n);
        }
      }
    }
  }

  function incorporateUserChanges(isTimeUp)
  {

    if (currentCallStack.domClean) return false;

    currentCallStack.isUserChange = true;

    isTimeUp = (isTimeUp ||
    function()
    {
      return false;
    });

    if (DEBUG && window.DONT_INCORP || window.DEBUG_DONT_INCORP) return false;

    var p = PROFILER("incorp", false);

    //if (doc.body.innerHTML.indexOf("AppJet") >= 0)
    //dmesg(htmlPrettyEscape(doc.body.innerHTML));
    //if (top.RECORD) top.RECORD.push(doc.body.innerHTML);
    // returns true if dom changes were made
    if (!root.firstChild)
    {
      root.innerHTML = "<div><!-- --></div>";
    }

    p.mark("obs");
    observeChangesAroundSelection();
    observeSuspiciousNodes();
    p.mark("dirty");
    var dirtyRanges = getDirtyRanges();
    //console.log("dirtyRanges: "+toSource(dirtyRanges));
    var dirtyRangesCheckOut = true;
    var j = 0;
    var a, b;
    while (j < dirtyRanges.length)
    {
      a = dirtyRanges[j][0];
      b = dirtyRanges[j][1];
      if (!((a === 0 || getCleanNodeByKey(rep.lines.atIndex(a - 1).key)) && (b == rep.lines.length() || getCleanNodeByKey(rep.lines.atIndex(b).key))))
      {
        dirtyRangesCheckOut = false;
        break;
      }
      j++;
    }
    if (!dirtyRangesCheckOut)
    {
      var numBodyNodes = root.childNodes.length;
      for (var k = 0; k < numBodyNodes; k++)
      {
        var bodyNode = root.childNodes.item(k);
        if ((bodyNode.tagName) && ((!bodyNode.id) || (!rep.lines.containsKey(bodyNode.id))))
        {
          observeChangesAroundNode(bodyNode);
        }
      }
      dirtyRanges = getDirtyRanges();
    }

    clearObservedChanges();

    p.mark("getsel");
    var selection = getSelection();

    //console.log(magicdom.root.dom.innerHTML);
    //console.log("got selection: %o", selection);
    var selStart, selEnd; // each one, if truthy, has [line,char] needed to set selection
    var i = 0;
    var splicesToDo = [];
    var netNumLinesChangeSoFar = 0;
    var toDeleteAtEnd = [];
    p.mark("ranges");
    p.literal(dirtyRanges.length, "numdirt");
    var domInsertsNeeded = []; // each entry is [nodeToInsertAfter, [info1, info2, ...]]
    while (i < dirtyRanges.length)
    {
      var range = dirtyRanges[i];
      a = range[0];
      b = range[1];
      var firstDirtyNode = (((a === 0) && root.firstChild) || getCleanNodeByKey(rep.lines.atIndex(a - 1).key).nextSibling);
      firstDirtyNode = (firstDirtyNode && isNodeDirty(firstDirtyNode) && firstDirtyNode);
      var lastDirtyNode = (((b == rep.lines.length()) && root.lastChild) || getCleanNodeByKey(rep.lines.atIndex(b).key).previousSibling);
      lastDirtyNode = (lastDirtyNode && isNodeDirty(lastDirtyNode) && lastDirtyNode);
      if (firstDirtyNode && lastDirtyNode)
      {
        var cc = makeContentCollector(isStyled, browser, rep.apool, null, className2Author);
        cc.notifySelection(selection);
        var dirtyNodes = [];
        for (var n = firstDirtyNode; n && !(n.previousSibling && n.previousSibling == lastDirtyNode);
        n = n.nextSibling)
        {
          if (browser.msie)
          {
            // try to undo IE's pesky and overzealous linkification
            try
            {
              n.createTextRange().execCommand("unlink", false, null);
            }
            catch (e)
            {}
          }
          cc.collectContent(n);
          dirtyNodes.push(n);
        }
        cc.notifyNextNode(lastDirtyNode.nextSibling);
        var lines = cc.getLines();
        if ((lines.length <= 1 || lines[lines.length - 1] !== "") && lastDirtyNode.nextSibling)
        {
          // dirty region doesn't currently end a line, even taking the following node
          // (or lack of node) into account, so include the following clean node.
          // It could be SPAN or a DIV; basically this is any case where the contentCollector
          // decides it isn't done.
          // Note that this clean node might need to be there for the next dirty range.
          //console.log("inclusive of "+lastDirtyNode.next().dom.tagName);
          b++;
          var cleanLine = lastDirtyNode.nextSibling;
          cc.collectContent(cleanLine);
          toDeleteAtEnd.push(cleanLine);
          cc.notifyNextNode(cleanLine.nextSibling);
        }

        var ccData = cc.finish();
        var ss = ccData.selStart;
        var se = ccData.selEnd;
        lines = ccData.lines;
        var lineAttribs = ccData.lineAttribs;
        var linesWrapped = ccData.linesWrapped;
        var scrollToTheLeftNeeded = false;

        if (linesWrapped > 0)
        {
          if(!browser.ie){
            // chrome decides in it's infinite wisdom that its okay to put the browsers visisble window in the middle of the span
            // an outcome of this is that the first chars of the string are no longer visible to the user..  Yay chrome..
            // Move the browsers visible area to the left hand side of the span
            // Firefox isn't quite so bad, but it's still pretty quirky.
            var scrollToTheLeftNeeded = true;
          }
          // console.log("Editor warning: " + linesWrapped + " long line" + (linesWrapped == 1 ? " was" : "s were") + " hard-wrapped into " + ccData.numLinesAfter + " lines.");
        }

        if (ss[0] >= 0) selStart = [ss[0] + a + netNumLinesChangeSoFar, ss[1]];
        if (se[0] >= 0) selEnd = [se[0] + a + netNumLinesChangeSoFar, se[1]];

        var entries = [];
        var nodeToAddAfter = lastDirtyNode;
        var lineNodeInfos = new Array(lines.length);
        for (var k = 0; k < lines.length; k++)
        {
          var lineString = lines[k];
          var newEntry = createDomLineEntry(lineString);
          entries.push(newEntry);
          lineNodeInfos[k] = newEntry.domInfo;
        }
        //var fragment = magicdom.wrapDom(document.createDocumentFragment());
        domInsertsNeeded.push([nodeToAddAfter, lineNodeInfos]);
        _.each(dirtyNodes,function(n){
          toDeleteAtEnd.push(n);
        });
        var spliceHints = {};
        if (selStart) spliceHints.selStart = selStart;
        if (selEnd) spliceHints.selEnd = selEnd;
        splicesToDo.push([a + netNumLinesChangeSoFar, b - a, entries, lineAttribs, spliceHints]);
        netNumLinesChangeSoFar += (lines.length - (b - a));
      }
      else if (b > a)
      {
        splicesToDo.push([a + netNumLinesChangeSoFar, b - a, [],
          []
        ]);
      }
      i++;
    }

    var domChanges = (splicesToDo.length > 0);

    // update the representation
    p.mark("splice");
    _.each(splicesToDo, function(splice)
    {
      doIncorpLineSplice(splice[0], splice[1], splice[2], splice[3], splice[4]);
    });

    //p.mark("relex");
    //rep.lexer.lexCharRange(getVisibleCharRange(), function() { return false; });
    //var isTimeUp = newTimeLimit(100);
    // do DOM inserts
    p.mark("insert");
    _.each(domInsertsNeeded,function(ins)
    {
      insertDomLines(ins[0], ins[1], isTimeUp);
    });

    p.mark("del");
    // delete old dom nodes
    _.each(toDeleteAtEnd,function(n)
    {
      //var id = n.uniqueId();
      // parent of n may not be "root" in IE due to non-tree-shaped DOM (wtf)
      n.parentNode.removeChild(n);

      //dmesg(htmlPrettyEscape(htmlForRemovedChild(n)));
      //console.log("removed: "+id);
    });

    if(scrollToTheLeftNeeded){ // needed to stop chrome from breaking the ui when long strings without spaces are pasted
      $("#innerdocbody").scrollLeft(0);
    }

    p.mark("findsel");
    // if the nodes that define the selection weren't encountered during
    // content collection, figure out where those nodes are now.
    if (selection && !selStart)
    {
      //if (domChanges) dmesg("selection not collected");
      var selStartFromHook = hooks.callAll('aceStartLineAndCharForPoint', {
        callstack: currentCallStack,
        editorInfo: editorInfo,
        rep: rep,
        root:root,
        point:selection.startPoint,
        documentAttributeManager: documentAttributeManager
      });
      selStart = (selStartFromHook==null||selStartFromHook.length==0)?getLineAndCharForPoint(selection.startPoint):selStartFromHook;
    }
    if (selection && !selEnd)
    {
      var selEndFromHook = hooks.callAll('aceEndLineAndCharForPoint', {
        callstack: currentCallStack,
        editorInfo: editorInfo,
        rep: rep,
        root:root,
        point:selection.endPoint,
        documentAttributeManager: documentAttributeManager
      });
      selEnd = (selEndFromHook==null||selEndFromHook.length==0)?getLineAndCharForPoint(selection.endPoint):selEndFromHook;
    }

    // selection from content collection can, in various ways, extend past final
    // BR in firefox DOM, so cap the line
    var numLines = rep.lines.length();
    if (selStart && selStart[0] >= numLines)
    {
      selStart[0] = numLines - 1;
      selStart[1] = rep.lines.atIndex(selStart[0]).text.length;
    }
    if (selEnd && selEnd[0] >= numLines)
    {
      selEnd[0] = numLines - 1;
      selEnd[1] = rep.lines.atIndex(selEnd[0]).text.length;
    }

    p.mark("repsel");
    // update rep if we have a new selection
    // NOTE: IE loses the selection when you click stuff in e.g. the
    // editbar, so removing the selection when it's lost is not a good
    // idea.
    if (selection) repSelectionChange(selStart, selEnd, selection && selection.focusAtStart);
    // update browser selection
    p.mark("browsel");
    if (selection && (domChanges || isCaret()))
    {
      // if no DOM changes (not this case), want to treat range selection delicately,
      // e.g. in IE not lose which end of the selection is the focus/anchor;
      // on the other hand, we may have just noticed a press of PageUp/PageDown
      currentCallStack.selectionAffected = true;
    }

    currentCallStack.domClean = true;

    p.mark("fixview");

    fixView();

    p.end("END");

    return domChanges;
  }

  function htmlForRemovedChild(n)
  {
    var div = doc.createElement("DIV");
    div.appendChild(n);
    return div.innerHTML;
  }

  var STYLE_ATTRIBS = {
    bold: true,
    italic: true,
    underline: true,
    strikethrough: true,
    list: true
  };
  var OTHER_INCORPED_ATTRIBS = {
    insertorder: true,
    author: true
  };

  function isStyleAttribute(aname)
  {
    return !!STYLE_ATTRIBS[aname];
  }

  function isIncorpedAttribute(aname)
  {
    return ( !! STYLE_ATTRIBS[aname]) || ( !! OTHER_INCORPED_ATTRIBS[aname]);
  }

  function insertDomLines(nodeToAddAfter, infoStructs, isTimeUp)
  {
    isTimeUp = (isTimeUp ||
    function()
    {
      return false;
    });

    var lastEntry;
    var lineStartOffset;
    if (infoStructs.length < 1) return;
    var startEntry = rep.lines.atKey(uniqueId(infoStructs[0].node));
    var endEntry = rep.lines.atKey(uniqueId(infoStructs[infoStructs.length - 1].node));
    var charStart = rep.lines.offsetOfEntry(startEntry);
    var charEnd = rep.lines.offsetOfEntry(endEntry) + endEntry.width;

    //rep.lexer.lexCharRange([charStart, charEnd], isTimeUp);
    _.each(infoStructs, function(info)
    {
      var p2 = PROFILER("insertLine", false);
      var node = info.node;
      var key = uniqueId(node);
      var entry;
      p2.mark("findEntry");
      if (lastEntry)
      {
        // optimization to avoid recalculation
        var next = rep.lines.next(lastEntry);
        if (next && next.key == key)
        {
          entry = next;
          lineStartOffset += lastEntry.width;
        }
      }
      if (!entry)
      {
        p2.literal(1, "nonopt");
        entry = rep.lines.atKey(key);
        lineStartOffset = rep.lines.offsetOfKey(key);
      }
      else p2.literal(0, "nonopt");
      lastEntry = entry;
      p2.mark("spans");
      getSpansForLine(entry, function(tokenText, tokenClass)
      {
        info.appendSpan(tokenText, tokenClass);
      }, lineStartOffset, isTimeUp());
      //else if (entry.text.length > 0) {
      //info.appendSpan(entry.text, 'dirty');
      //}
      p2.mark("addLine");
      info.prepareForAdd();
      entry.lineMarker = info.lineMarker;
      if (!nodeToAddAfter)
      {
        root.insertBefore(node, root.firstChild);
      }
      else
      {
        root.insertBefore(node, nodeToAddAfter.nextSibling);
      }
      nodeToAddAfter = node;
      info.notifyAdded();
      p2.mark("markClean");
      markNodeClean(node);
      p2.end();
    });
  }

  function isCaret()
  {
    return (rep.selStart && rep.selEnd && rep.selStart[0] == rep.selEnd[0] && rep.selStart[1] == rep.selEnd[1]);
  }
  editorInfo.ace_isCaret = isCaret;

  // prereq: isCaret()


  function caretLine()
  {
    return rep.selStart[0];
  }
  editorInfo.ace_caretLine = caretLine;

  function caretColumn()
  {
    return rep.selStart[1];
  }
  editorInfo.ace_caretColumn = caretColumn;

  function caretDocChar()
  {
    return rep.lines.offsetOfIndex(caretLine()) + caretColumn();
  }
  editorInfo.ace_caretDocChar = caretDocChar;

  function handleReturnIndentation()
  {
    // on return, indent to level of previous line
    if (isCaret() && caretColumn() === 0 && caretLine() > 0)
    {
      var lineNum = caretLine();
      var thisLine = rep.lines.atIndex(lineNum);
      var prevLine = rep.lines.prev(thisLine);
      var prevLineText = prevLine.text;
      var theIndent = /^ *(?:)/.exec(prevLineText)[0];
      if (/[\[\(\:\{]\s*$/.exec(prevLineText)) theIndent += THE_TAB;
      var cs = Changeset.builder(rep.lines.totalWidth()).keep(
      rep.lines.offsetOfIndex(lineNum), lineNum).insert(
      theIndent, [
        ['author', thisAuthor]
      ], rep.apool).toString();
      performDocumentApplyChangeset(cs);
      performSelectionChange([lineNum, theIndent.length], [lineNum, theIndent.length]);
    }
  }

  function getPointForLineAndChar(lineAndChar)
  {
    var line = lineAndChar[0];
    var charsLeft = lineAndChar[1];
    //console.log("line: %d, key: %s, node: %o", line, rep.lines.atIndex(line).key,
    //getCleanNodeByKey(rep.lines.atIndex(line).key));
    var lineEntry = rep.lines.atIndex(line);
    charsLeft -= lineEntry.lineMarker;
    if (charsLeft < 0)
    {
      charsLeft = 0;
    }
    var lineNode = lineEntry.lineNode;
    var n = lineNode;
    var after = false;
    if (charsLeft === 0)
    {
      var index = 0;
      if (browser.msie && line == (rep.lines.length() - 1) && lineNode.childNodes.length === 0)
      {
        // best to stay at end of last empty div in IE
        index = 1;
      }
      return {
        node: lineNode,
        index: index,
        maxIndex: 1
      };
    }
    while (!(n == lineNode && after))
    {
      if (after)
      {
        if (n.nextSibling)
        {
          n = n.nextSibling;
          after = false;
        }
        else n = n.parentNode;
      }
      else
      {
        if (isNodeText(n))
        {
          var len = n.nodeValue.length;
          if (charsLeft <= len)
          {
            return {
              node: n,
              index: charsLeft,
              maxIndex: len
            };
          }
          charsLeft -= len;
          after = true;
        }
        else
        {
          if (n.firstChild) n = n.firstChild;
          else after = true;
        }
      }
    }
    return {
      node: lineNode,
      index: 1,
      maxIndex: 1
    };
  }

  function nodeText(n)
  {
    return n.innerText || n.textContent || n.nodeValue || '';
  }

  function getLineAndCharForPoint(point)
  {
    // Turn DOM node selection into [line,char] selection.
    // This method has to work when the DOM is not pristine,
    // assuming the point is not in a dirty node.
    if (point.node == root)
    {
      if (point.index === 0)
      {
        return [0, 0];
      }
      else
      {
        var N = rep.lines.length();
        var ln = rep.lines.atIndex(N - 1);
        return [N - 1, ln.text.length];
      }
    }
    else
    {
      var n = point.node;
      var col = 0;
      // if this part fails, it probably means the selection node
      // was dirty, and we didn't see it when collecting dirty nodes.
      if (isNodeText(n))
      {
        col = point.index;
      }
      else if (point.index > 0)
      {
        col = nodeText(n).length;
      }
      var parNode, prevSib;
      while ((parNode = n.parentNode) != root)
      {
        if ((prevSib = n.previousSibling))
        {
          n = prevSib;
          col += nodeText(n).length;
        }
        else
        {
          n = parNode;
        }
      }
      if (n.id === "") console.debug("BAD");
      if (n.firstChild && isBlockElement(n.firstChild))
      {
        col += 1; // lineMarker
      }
      var lineEntry = rep.lines.atKey(n.id);
      var lineNum = rep.lines.indexOfEntry(lineEntry);
      return [lineNum, col];
    }
  }
  editorInfo.ace_getLineAndCharForPoint = getLineAndCharForPoint;

  function createDomLineEntry(lineString)
  {
    var info = doCreateDomLine(lineString.length > 0);
    var newNode = info.node;
    return {
      key: uniqueId(newNode),
      text: lineString,
      lineNode: newNode,
      domInfo: info,
      lineMarker: 0
    };
  }

  function canApplyChangesetToDocument(changes)
  {
    return Changeset.oldLen(changes) == rep.alltext.length;
  }

  function performDocumentApplyChangeset(changes, insertsAfterSelection)
  {
    doRepApplyChangeset(changes, insertsAfterSelection);

    var requiredSelectionSetting = null;
    if (rep.selStart && rep.selEnd)
    {
      var selStartChar = rep.lines.offsetOfIndex(rep.selStart[0]) + rep.selStart[1];
      var selEndChar = rep.lines.offsetOfIndex(rep.selEnd[0]) + rep.selEnd[1];
      var result = Changeset.characterRangeFollow(changes, selStartChar, selEndChar, insertsAfterSelection);
      requiredSelectionSetting = [result[0], result[1], rep.selFocusAtStart];
    }

    var linesMutatee = {
      splice: function(start, numRemoved, newLinesVA)
      {
        var args = Array.prototype.slice.call(arguments, 2);
        domAndRepSplice(start, numRemoved, _.map(args, function(s){ return s.slice(0, -1); }), null);
      },
      get: function(i)
      {
        return rep.lines.atIndex(i).text + '\n';
      },
      length: function()
      {
        return rep.lines.length();
      },
      slice_notused: function(start, end)
      {
        return _.map(rep.lines.slice(start, end), function(e)
        {
          return e.text + '\n';
        });
      }
    };

    Changeset.mutateTextLines(changes, linesMutatee);

    checkALines();

    if (requiredSelectionSetting)
    {
      performSelectionChange(lineAndColumnFromChar(requiredSelectionSetting[0]), lineAndColumnFromChar(requiredSelectionSetting[1]), requiredSelectionSetting[2]);
    }

    function domAndRepSplice(startLine, deleteCount, newLineStrings, isTimeUp)
    {
      // dgreensp 3/2009: the spliced lines may be in the middle of a dirty region,
      // so if no explicit time limit, don't spend a lot of time highlighting
      isTimeUp = (isTimeUp || newTimeLimit(50));

      var keysToDelete = [];
      if (deleteCount > 0)
      {
        var entryToDelete = rep.lines.atIndex(startLine);
        for (var i = 0; i < deleteCount; i++)
        {
          keysToDelete.push(entryToDelete.key);
          entryToDelete = rep.lines.next(entryToDelete);
        }
      }

      var lineEntries = _.map(newLineStrings, createDomLineEntry);

      doRepLineSplice(startLine, deleteCount, lineEntries);

      var nodeToAddAfter;
      if (startLine > 0)
      {
        nodeToAddAfter = getCleanNodeByKey(rep.lines.atIndex(startLine - 1).key);
      }
      else nodeToAddAfter = null;

      insertDomLines(nodeToAddAfter, _.map(lineEntries, function(entry)
      {
        return entry.domInfo;
      }), isTimeUp);

      _.each(keysToDelete, function(k)
      {
        var n = doc.getElementById(k);
        n.parentNode.removeChild(n);
      });

      if ((rep.selStart && rep.selStart[0] >= startLine && rep.selStart[0] <= startLine + deleteCount) || (rep.selEnd && rep.selEnd[0] >= startLine && rep.selEnd[0] <= startLine + deleteCount))
      {
        currentCallStack.selectionAffected = true;
      }
    }
  }

  function checkChangesetLineInformationAgainstRep(changes)
  {
    return true; // disable for speed
    var opIter = Changeset.opIterator(Changeset.unpack(changes).ops);
    var curOffset = 0;
    var curLine = 0;
    var curCol = 0;
    while (opIter.hasNext())
    {
      var o = opIter.next();
      if (o.opcode == '-' || o.opcode == '=')
      {
        curOffset += o.chars;
        if (o.lines)
        {
          curLine += o.lines;
          curCol = 0;
        }
        else
        {
          curCol += o.chars;
        }
      }
      var calcLine = rep.lines.indexOfOffset(curOffset);
      var calcLineStart = rep.lines.offsetOfIndex(calcLine);
      var calcCol = curOffset - calcLineStart;
      if (calcCol != curCol || calcLine != curLine)
      {
        return false;
      }
    }
    return true;
  }

  function doRepApplyChangeset(changes, insertsAfterSelection)
  {
    Changeset.checkRep(changes);

    if (Changeset.oldLen(changes) != rep.alltext.length) throw new Error("doRepApplyChangeset length mismatch: " + Changeset.oldLen(changes) + "/" + rep.alltext.length);

    if (!checkChangesetLineInformationAgainstRep(changes))
    {
      throw new Error("doRepApplyChangeset line break mismatch");
    }

    (function doRecordUndoInformation(changes)
    {
      var editEvent = currentCallStack.editEvent;
      if (editEvent.eventType == "nonundoable")
      {
        if (!editEvent.changeset)
        {
          editEvent.changeset = changes;
        }
        else
        {
          editEvent.changeset = Changeset.compose(editEvent.changeset, changes, rep.apool);
        }
      }
      else
      {
        var inverseChangeset = Changeset.inverse(changes, {
          get: function(i)
          {
            return rep.lines.atIndex(i).text + '\n';
          },
          length: function()
          {
            return rep.lines.length();
          }
        }, rep.alines, rep.apool);

        if (!editEvent.backset)
        {
          editEvent.backset = inverseChangeset;
        }
        else
        {
          editEvent.backset = Changeset.compose(inverseChangeset, editEvent.backset, rep.apool);
        }
      }
    })(changes);

    //rep.alltext = Changeset.applyToText(changes, rep.alltext);
    Changeset.mutateAttributionLines(changes, rep.alines, rep.apool);

    if (changesetTracker.isTracking())
    {
      changesetTracker.composeUserChangeset(changes);
    }

  }

  /*
    Converts the position of a char (index in String) into a [row, col] tuple
  */
  function lineAndColumnFromChar(x)
  {
    var lineEntry = rep.lines.atOffset(x);
    var lineStart = rep.lines.offsetOfEntry(lineEntry);
    var lineNum = rep.lines.indexOfEntry(lineEntry);
    return [lineNum, x - lineStart];
  }

  function performDocumentReplaceCharRange(startChar, endChar, newText)
  {
    if (startChar == endChar && newText.length === 0)
    {
      return;
    }
    // Requires that the replacement preserve the property that the
    // internal document text ends in a newline.  Given this, we
    // rewrite the splice so that it doesn't touch the very last
    // char of the document.
    if (endChar == rep.alltext.length)
    {
      if (startChar == endChar)
      {
        // an insert at end
        startChar--;
        endChar--;
        newText = '\n' + newText.substring(0, newText.length - 1);
      }
      else if (newText.length === 0)
      {
        // a delete at end
        startChar--;
        endChar--;
      }
      else
      {
        // a replace at end
        endChar--;
        newText = newText.substring(0, newText.length - 1);
      }
    }
    performDocumentReplaceRange(lineAndColumnFromChar(startChar), lineAndColumnFromChar(endChar), newText);
  }

  function performDocumentReplaceRange(start, end, newText)
  {
    if (start === undefined) start = rep.selStart;
    if (end === undefined) end = rep.selEnd;

    //dmesg(String([start.toSource(),end.toSource(),newText.toSource()]));
    // start[0]: <--- start[1] --->CCCCCCCCCCC\n
    //           CCCCCCCCCCCCCCCCCCCC\n
    //           CCCC\n
    // end[0]:   <CCC end[1] CCC>-------\n
    var builder = Changeset.builder(rep.lines.totalWidth());
    ChangesetUtils.buildKeepToStartOfRange(rep, builder, start);
    ChangesetUtils.buildRemoveRange(rep, builder, start, end);
    builder.insert(newText, [
      ['author', thisAuthor]
    ], rep.apool);
    var cs = builder.toString();

    performDocumentApplyChangeset(cs);
  }

  function performDocumentApplyAttributesToCharRange(start, end, attribs)
  {
    end = Math.min(end, rep.alltext.length - 1);
    documentAttributeManager.setAttributesOnRange(lineAndColumnFromChar(start), lineAndColumnFromChar(end), attribs);
  }
  editorInfo.ace_performDocumentApplyAttributesToCharRange = performDocumentApplyAttributesToCharRange;


  function setAttributeOnSelection(attributeName, attributeValue)
  {
    if (!(rep.selStart && rep.selEnd)) return;

    documentAttributeManager.setAttributesOnRange(rep.selStart, rep.selEnd, [
      [attributeName, attributeValue]
    ]);
  }
  editorInfo.ace_setAttributeOnSelection = setAttributeOnSelection;

  function toggleAttributeOnSelection(attributeName)
  {
    if (!(rep.selStart && rep.selEnd)) return;

    var selectionAllHasIt = true;
    var withIt = Changeset.makeAttribsString('+', [
      [attributeName, 'true']
    ], rep.apool);
    var withItRegex = new RegExp(withIt.replace(/\*/g, '\\*') + "(\\*|$)");

    function hasIt(attribs)
    {
      return withItRegex.test(attribs);
    }

    var selStartLine = rep.selStart[0];
    var selEndLine = rep.selEnd[0];
    for (var n = selStartLine; n <= selEndLine; n++)
    {
      var opIter = Changeset.opIterator(rep.alines[n]);
      var indexIntoLine = 0;
      var selectionStartInLine = 0;
      var selectionEndInLine = rep.lines.atIndex(n).text.length; // exclude newline
      if (n == selStartLine)
      {
        selectionStartInLine = rep.selStart[1];
      }
      if (n == selEndLine)
      {
        selectionEndInLine = rep.selEnd[1];
      }
      while (opIter.hasNext())
      {
        var op = opIter.next();
        var opStartInLine = indexIntoLine;
        var opEndInLine = opStartInLine + op.chars;
        if (!hasIt(op.attribs))
        {
          // does op overlap selection?
          if (!(opEndInLine <= selectionStartInLine || opStartInLine >= selectionEndInLine))
          {
            selectionAllHasIt = false;
            break;
          }
        }
        indexIntoLine = opEndInLine;
      }
      if (!selectionAllHasIt)
      {
        break;
      }
    }

    if (selectionAllHasIt)
    {
      documentAttributeManager.setAttributesOnRange(rep.selStart, rep.selEnd, [
        [attributeName, '']
      ]);
    }
    else
    {
      documentAttributeManager.setAttributesOnRange(rep.selStart, rep.selEnd, [
        [attributeName, 'true']
      ]);
    }
  }
  editorInfo.ace_toggleAttributeOnSelection = toggleAttributeOnSelection;

  function performDocumentReplaceSelection(newText)
  {
    if (!(rep.selStart && rep.selEnd)) return;
    performDocumentReplaceRange(rep.selStart, rep.selEnd, newText);
  }

  // Change the abstract representation of the document to have a different set of lines.
  // Must be called after rep.alltext is set.


  function doRepLineSplice(startLine, deleteCount, newLineEntries)
  {

    _.each(newLineEntries, function(entry)
    {
      entry.width = entry.text.length + 1;
    });

    var startOldChar = rep.lines.offsetOfIndex(startLine);
    var endOldChar = rep.lines.offsetOfIndex(startLine + deleteCount);

    var oldRegionStart = rep.lines.offsetOfIndex(startLine);
    var oldRegionEnd = rep.lines.offsetOfIndex(startLine + deleteCount);
    rep.lines.splice(startLine, deleteCount, newLineEntries);
    currentCallStack.docTextChanged = true;
    currentCallStack.repChanged = true;
    var newRegionEnd = rep.lines.offsetOfIndex(startLine + newLineEntries.length);

    var newText = _.map(newLineEntries, function(e)
    {
      return e.text + '\n';
    }).join('');

    rep.alltext = rep.alltext.substring(0, startOldChar) + newText + rep.alltext.substring(endOldChar, rep.alltext.length);

    //var newTotalLength = rep.alltext.length;
    //rep.lexer.updateBuffer(rep.alltext, oldRegionStart, oldRegionEnd - oldRegionStart,
    //newRegionEnd - oldRegionStart);
  }

  function doIncorpLineSplice(startLine, deleteCount, newLineEntries, lineAttribs, hints)
  {

    var startOldChar = rep.lines.offsetOfIndex(startLine);
    var endOldChar = rep.lines.offsetOfIndex(startLine + deleteCount);

    var oldRegionStart = rep.lines.offsetOfIndex(startLine);

    var selStartHintChar, selEndHintChar;
    if (hints && hints.selStart)
    {
      selStartHintChar = rep.lines.offsetOfIndex(hints.selStart[0]) + hints.selStart[1] - oldRegionStart;
    }
    if (hints && hints.selEnd)
    {
      selEndHintChar = rep.lines.offsetOfIndex(hints.selEnd[0]) + hints.selEnd[1] - oldRegionStart;
    }

    var newText = _.map(newLineEntries, function(e)
    {
      return e.text + '\n';
    }).join('');
    var oldText = rep.alltext.substring(startOldChar, endOldChar);
    var oldAttribs = rep.alines.slice(startLine, startLine + deleteCount).join('');
    var newAttribs = lineAttribs.join('|1+1') + '|1+1'; // not valid in a changeset
    var analysis = analyzeChange(oldText, newText, oldAttribs, newAttribs, selStartHintChar, selEndHintChar);
    var commonStart = analysis[0];
    var commonEnd = analysis[1];
    var shortOldText = oldText.substring(commonStart, oldText.length - commonEnd);
    var shortNewText = newText.substring(commonStart, newText.length - commonEnd);
    var spliceStart = startOldChar + commonStart;
    var spliceEnd = endOldChar - commonEnd;
    var shiftFinalNewlineToBeforeNewText = false;

    // adjust the splice to not involve the final newline of the document;
    // be very defensive
    if (shortOldText.charAt(shortOldText.length - 1) == '\n' && shortNewText.charAt(shortNewText.length - 1) == '\n')
    {
      // replacing text that ends in newline with text that also ends in newline
      // (still, after analysis, somehow)
      shortOldText = shortOldText.slice(0, -1);
      shortNewText = shortNewText.slice(0, -1);
      spliceEnd--;
      commonEnd++;
    }
    if (shortOldText.length === 0 && spliceStart == rep.alltext.length && shortNewText.length > 0)
    {
      // inserting after final newline, bad
      spliceStart--;
      spliceEnd--;
      shortNewText = '\n' + shortNewText.slice(0, -1);
      shiftFinalNewlineToBeforeNewText = true;
    }
    if (spliceEnd == rep.alltext.length && shortOldText.length > 0 && shortNewText.length === 0)
    {
      // deletion at end of rep.alltext
      if (rep.alltext.charAt(spliceStart - 1) == '\n')
      {
        // (if not then what the heck?  it will definitely lead
        // to a rep.alltext without a final newline)
        spliceStart--;
        spliceEnd--;
      }
    }

    if (!(shortOldText.length === 0 && shortNewText.length === 0))
    {
      var oldDocText = rep.alltext;
      var oldLen = oldDocText.length;

      var spliceStartLine = rep.lines.indexOfOffset(spliceStart);
      var spliceStartLineStart = rep.lines.offsetOfIndex(spliceStartLine);

      var startBuilder = function()
      {
        var builder = Changeset.builder(oldLen);
        builder.keep(spliceStartLineStart, spliceStartLine);
        builder.keep(spliceStart - spliceStartLineStart);
        return builder;
      };

      var eachAttribRun = function(attribs, func /*(startInNewText, endInNewText, attribs)*/ )
      {
        var attribsIter = Changeset.opIterator(attribs);
        var textIndex = 0;
        var newTextStart = commonStart;
        var newTextEnd = newText.length - commonEnd - (shiftFinalNewlineToBeforeNewText ? 1 : 0);
        while (attribsIter.hasNext())
        {
          var op = attribsIter.next();
          var nextIndex = textIndex + op.chars;
          if (!(nextIndex <= newTextStart || textIndex >= newTextEnd))
          {
            func(Math.max(newTextStart, textIndex), Math.min(newTextEnd, nextIndex), op.attribs);
          }
          textIndex = nextIndex;
        }
      };

      var justApplyStyles = (shortNewText == shortOldText);
      var theChangeset;

      if (justApplyStyles)
      {
        // create changeset that clears the incorporated styles on
        // the existing text.  we compose this with the
        // changeset the applies the styles found in the DOM.
        // This allows us to incorporate, e.g., Safari's native "unbold".
        var incorpedAttribClearer = cachedStrFunc(function(oldAtts)
        {
          return Changeset.mapAttribNumbers(oldAtts, function(n)
          {
            var k = rep.apool.getAttribKey(n);
            if (isStyleAttribute(k))
            {
              return rep.apool.putAttrib([k, '']);
            }
            return false;
          });
        });

        var builder1 = startBuilder();
        if (shiftFinalNewlineToBeforeNewText)
        {
          builder1.keep(1, 1);
        }
        eachAttribRun(oldAttribs, function(start, end, attribs)
        {
          builder1.keepText(newText.substring(start, end), incorpedAttribClearer(attribs));
        });
        var clearer = builder1.toString();

        var builder2 = startBuilder();
        if (shiftFinalNewlineToBeforeNewText)
        {
          builder2.keep(1, 1);
        }
        eachAttribRun(newAttribs, function(start, end, attribs)
        {
          builder2.keepText(newText.substring(start, end), attribs);
        });
        var styler = builder2.toString();

        theChangeset = Changeset.compose(clearer, styler, rep.apool);
      }
      else
      {
        var builder = startBuilder();

        var spliceEndLine = rep.lines.indexOfOffset(spliceEnd);
        var spliceEndLineStart = rep.lines.offsetOfIndex(spliceEndLine);
        if (spliceEndLineStart > spliceStart)
        {
          builder.remove(spliceEndLineStart - spliceStart, spliceEndLine - spliceStartLine);
          builder.remove(spliceEnd - spliceEndLineStart);
        }
        else
        {
          builder.remove(spliceEnd - spliceStart);
        }

        var isNewTextMultiauthor = false;
        var authorAtt = Changeset.makeAttribsString('+', (thisAuthor ? [
          ['author', thisAuthor]
        ] : []), rep.apool);
        var authorizer = cachedStrFunc(function(oldAtts)
        {
          if (isNewTextMultiauthor)
          {
            // prefer colors from DOM
            return Changeset.composeAttributes(authorAtt, oldAtts, true, rep.apool);
          }
          else
          {
            // use this author's color
            return Changeset.composeAttributes(oldAtts, authorAtt, true, rep.apool);
          }
        });

        var foundDomAuthor = '';
        eachAttribRun(newAttribs, function(start, end, attribs)
        {
          var a = Changeset.attribsAttributeValue(attribs, 'author', rep.apool);
          if (a && a != foundDomAuthor)
          {
            if (!foundDomAuthor)
            {
              foundDomAuthor = a;
            }
            else
            {
              isNewTextMultiauthor = true; // multiple authors in DOM!
            }
          }
        });

        if (shiftFinalNewlineToBeforeNewText)
        {
          builder.insert('\n', authorizer(''));
        }

        eachAttribRun(newAttribs, function(start, end, attribs)
        {
          builder.insert(newText.substring(start, end), authorizer(attribs));
        });
        theChangeset = builder.toString();
      }

      //dmesg(htmlPrettyEscape(theChangeset));
      doRepApplyChangeset(theChangeset);
    }

    // do this no matter what, because we need to get the right
    // line keys into the rep.
    doRepLineSplice(startLine, deleteCount, newLineEntries);

    checkALines();
  }

  function cachedStrFunc(func)
  {
    var cache = {};
    return function(s)
    {
      if (!cache[s])
      {
        cache[s] = func(s);
      }
      return cache[s];
    };
  }

  function analyzeChange(oldText, newText, oldAttribs, newAttribs, optSelStartHint, optSelEndHint)
  {
    function incorpedAttribFilter(anum)
    {
      return isStyleAttribute(rep.apool.getAttribKey(anum));
    }

    function attribRuns(attribs)
    {
      var lengs = [];
      var atts = [];
      var iter = Changeset.opIterator(attribs);
      while (iter.hasNext())
      {
        var op = iter.next();
        lengs.push(op.chars);
        atts.push(op.attribs);
      }
      return [lengs, atts];
    }

    function attribIterator(runs, backward)
    {
      var lengs = runs[0];
      var atts = runs[1];
      var i = (backward ? lengs.length - 1 : 0);
      var j = 0;
      return function next()
      {
        while (j >= lengs[i])
        {
          if (backward) i--;
          else i++;
          j = 0;
        }
        var a = atts[i];
        j++;
        return a;
      };
    }

    var oldLen = oldText.length;
    var newLen = newText.length;
    var minLen = Math.min(oldLen, newLen);

    var oldARuns = attribRuns(Changeset.filterAttribNumbers(oldAttribs, incorpedAttribFilter));
    var newARuns = attribRuns(Changeset.filterAttribNumbers(newAttribs, incorpedAttribFilter));

    var commonStart = 0;
    var oldStartIter = attribIterator(oldARuns, false);
    var newStartIter = attribIterator(newARuns, false);
    while (commonStart < minLen)
    {
      if (oldText.charAt(commonStart) == newText.charAt(commonStart) && oldStartIter() == newStartIter())
      {
        commonStart++;
      }
      else break;
    }

    var commonEnd = 0;
    var oldEndIter = attribIterator(oldARuns, true);
    var newEndIter = attribIterator(newARuns, true);
    while (commonEnd < minLen)
    {
      if (commonEnd === 0)
      {
        // assume newline in common
        oldEndIter();
        newEndIter();
        commonEnd++;
      }
      else if (oldText.charAt(oldLen - 1 - commonEnd) == newText.charAt(newLen - 1 - commonEnd) && oldEndIter() == newEndIter())
      {
        commonEnd++;
      }
      else break;
    }

    var hintedCommonEnd = -1;
    if ((typeof optSelEndHint) == "number")
    {
      hintedCommonEnd = newLen - optSelEndHint;
    }


    if (commonStart + commonEnd > oldLen)
    {
      // ambiguous insertion
      var minCommonEnd = oldLen - commonStart;
      var maxCommonEnd = commonEnd;
      if (hintedCommonEnd >= minCommonEnd && hintedCommonEnd <= maxCommonEnd)
      {
        commonEnd = hintedCommonEnd;
      }
      else
      {
        commonEnd = minCommonEnd;
      }
      commonStart = oldLen - commonEnd;
    }
    if (commonStart + commonEnd > newLen)
    {
      // ambiguous deletion
      var minCommonEnd = newLen - commonStart;
      var maxCommonEnd = commonEnd;
      if (hintedCommonEnd >= minCommonEnd && hintedCommonEnd <= maxCommonEnd)
      {
        commonEnd = hintedCommonEnd;
      }
      else
      {
        commonEnd = minCommonEnd;
      }
      commonStart = newLen - commonEnd;
    }

    return [commonStart, commonEnd];
  }

  function equalLineAndChars(a, b)
  {
    if (!a) return !b;
    if (!b) return !a;
    return (a[0] == b[0] && a[1] == b[1]);
  }

  function performSelectionChange(selectStart, selectEnd, focusAtStart)
  {
    if (repSelectionChange(selectStart, selectEnd, focusAtStart))
    {
      currentCallStack.selectionAffected = true;
    }
  }
  editorInfo.ace_performSelectionChange = performSelectionChange;

  // Change the abstract representation of the document to have a different selection.
  // Should not rely on the line representation.  Should not affect the DOM.


  function repSelectionChange(selectStart, selectEnd, focusAtStart)
  {
    focusAtStart = !! focusAtStart;

    var newSelFocusAtStart = (focusAtStart && ((!selectStart) || (!selectEnd) || (selectStart[0] != selectEnd[0]) || (selectStart[1] != selectEnd[1])));

    if ((!equalLineAndChars(rep.selStart, selectStart)) || (!equalLineAndChars(rep.selEnd, selectEnd)) || (rep.selFocusAtStart != newSelFocusAtStart))
    {
      rep.selStart = selectStart;
      rep.selEnd = selectEnd;
      rep.selFocusAtStart = newSelFocusAtStart;
      currentCallStack.repChanged = true;

      return true;
      //console.log("selStart: %o, selEnd: %o, focusAtStart: %s", rep.selStart, rep.selEnd,
      //String(!!rep.selFocusAtStart));
    }
    return false;
    //console.log("%o %o %s", rep.selStart, rep.selEnd, rep.selFocusAtStart);
  }

  function doCreateDomLine(nonEmpty)
  {
    if (browser.msie && (!nonEmpty))
    {
      var result = {
        node: null,
        appendSpan: noop,
        prepareForAdd: noop,
        notifyAdded: noop,
        clearSpans: noop,
        finishUpdate: noop,
        lineMarker: 0
      };

      var lineElem = doc.createElement("div");
      result.node = lineElem;

      result.notifyAdded = function()
      {
        // magic -- settng an empty div's innerHTML to the empty string
        // keeps it from collapsing.  Apparently innerHTML must be set *after*
        // adding the node to the DOM.
        // Such a div is what IE 6 creates naturally when you make a blank line
        // in a document of divs.  However, when copy-and-pasted the div will
        // contain a space, so we note its emptiness with a property.
        lineElem.innerHTML = " "; // Frist we set a value that isnt blank
        // a primitive-valued property survives copy-and-paste
        setAssoc(lineElem, "shouldBeEmpty", true);
        // an object property doesn't
        setAssoc(lineElem, "unpasted", {});
        lineElem.innerHTML = ""; // Then we make it blank..  New line and no space = Awesome :)
      };
      var lineClass = 'ace-line';
      result.appendSpan = function(txt, cls)
      {
        if ((!txt) && cls)
        {
          // gain a whole-line style (currently to show insertion point in CSS)
          lineClass = domline.addToLineClass(lineClass, cls);
        }
        // otherwise, ignore appendSpan, this is an empty line
      };
      result.clearSpans = function()
      {
        lineClass = ''; // non-null to cause update
      };

      var writeClass = function()
      {
        if (lineClass !== null) lineElem.className = lineClass;
      };

      result.prepareForAdd = writeClass;
      result.finishUpdate = writeClass;
      result.getInnerHTML = function()
      {
        return "";
      };

      return result;
    }
    else
    {
      return domline.createDomLine(nonEmpty, doesWrap, browser, doc);
    }
  }

  function textify(str)
  {
    return str.replace(/[\n\r ]/g, ' ').replace(/\xa0/g, ' ').replace(/\t/g, '        ');
  }

  var _blockElems = {
    "div": 1,
    "p": 1,
    "pre": 1,
    "li": 1,
    "ol": 1,
    "ul": 1
  };

  _.each(hooks.callAll('aceRegisterBlockElements'), function(element){
      _blockElems[element] = 1;
  });

  function isBlockElement(n)
  {
    return !!_blockElems[(n.tagName || "").toLowerCase()];
  }

  function getDirtyRanges()
  {
    // based on observedChanges, return a list of ranges of original lines
    // that need to be removed or replaced with new user content to incorporate
    // the user's changes into the line representation.  ranges may be zero-length,
    // indicating inserted content.  for example, [0,0] means content was inserted
    // at the top of the document, while [3,4] means line 3 was deleted, modified,
    // or replaced with one or more new lines of content. ranges do not touch.
    var p = PROFILER("getDirtyRanges", false);
    p.forIndices = 0;
    p.consecutives = 0;
    p.corrections = 0;

    var cleanNodeForIndexCache = {};
    var N = rep.lines.length(); // old number of lines


    function cleanNodeForIndex(i)
    {
      // if line (i) in the un-updated line representation maps to a clean node
      // in the document, return that node.
      // if (i) is out of bounds, return true. else return false.
      if (cleanNodeForIndexCache[i] === undefined)
      {
        p.forIndices++;
        var result;
        if (i < 0 || i >= N)
        {
          result = true; // truthy, but no actual node
        }
        else
        {
          var key = rep.lines.atIndex(i).key;
          result = (getCleanNodeByKey(key) || false);
        }
        cleanNodeForIndexCache[i] = result;
      }
      return cleanNodeForIndexCache[i];
    }
    var isConsecutiveCache = {};

    function isConsecutive(i)
    {
      if (isConsecutiveCache[i] === undefined)
      {
        p.consecutives++;
        isConsecutiveCache[i] = (function()
        {
          // returns whether line (i) and line (i-1), assumed to be map to clean DOM nodes,
          // or document boundaries, are consecutive in the changed DOM
          var a = cleanNodeForIndex(i - 1);
          var b = cleanNodeForIndex(i);
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

    function isClean(i)
    {
      // returns whether line (i) in the un-updated representation maps to a clean node,
      // or is outside the bounds of the document
      return !!cleanNodeForIndex(i);
    }
    // list of pairs, each representing a range of lines that is clean and consecutive
    // in the changed DOM.  lines (-1) and (N) are always clean, but may or may not
    // be consecutive with lines in the document.  pairs are in sorted order.
    var cleanRanges = [
      [-1, N + 1]
    ];

    function rangeForLine(i)
    {
      // returns index of cleanRange containing i, or -1 if none
      var answer = -1;
      _.each(cleanRanges ,function(r, idx)
      {
        if (i >= r[1]) return false; // keep looking
        if (i < r[0]) return true; // not found, stop looking
        answer = idx;
        return true; // found, stop looking
      });
      return answer;
    }

    function removeLineFromRange(rng, line)
    {
      // rng is index into cleanRanges, line is line number
      // precond: line is in rng
      var a = cleanRanges[rng][0];
      var b = cleanRanges[rng][1];
      if ((a + 1) == b) cleanRanges.splice(rng, 1);
      else if (line == a) cleanRanges[rng][0]++;
      else if (line == (b - 1)) cleanRanges[rng][1]--;
      else cleanRanges.splice(rng, 1, [a, line], [line + 1, b]);
    }

    function splitRange(rng, pt)
    {
      // precond: pt splits cleanRanges[rng] into two non-empty ranges
      var a = cleanRanges[rng][0];
      var b = cleanRanges[rng][1];
      cleanRanges.splice(rng, 1, [a, pt], [pt, b]);
    }
    var correctedLines = {};

    function correctlyAssignLine(line)
    {
      if (correctedLines[line]) return true;
      p.corrections++;
      correctedLines[line] = true;
      // "line" is an index of a line in the un-updated rep.
      // returns whether line was already correctly assigned (i.e. correctly
      // clean or dirty, according to cleanRanges, and if clean, correctly
      // attached or not attached (i.e. in the same range as) the prev and next lines).
      //console.log("correctly assigning: %d", line);
      var rng = rangeForLine(line);
      var lineClean = isClean(line);
      if (rng < 0)
      {
        if (lineClean)
        {
          console.debug("somehow lost clean line");
        }
        return true;
      }
      if (!lineClean)
      {
        // a clean-range includes this dirty line, fix it
        removeLineFromRange(rng, line);
        return false;
      }
      else
      {
        // line is clean, but could be wrongly connected to a clean line
        // above or below
        var a = cleanRanges[rng][0];
        var b = cleanRanges[rng][1];
        var didSomething = false;
        // we'll leave non-clean adjacent nodes in the clean range for the caller to
        // detect and deal with.  we deal with whether the range should be split
        // just above or just below this line.
        if (a < line && isClean(line - 1) && !isConsecutive(line))
        {
          splitRange(rng, line);
          didSomething = true;
        }
        if (b > (line + 1) && isClean(line + 1) && !isConsecutive(line + 1))
        {
          splitRange(rng, line + 1);
          didSomething = true;
        }
        return !didSomething;
      }
    }

    function detectChangesAroundLine(line, reqInARow)
    {
      // make sure cleanRanges is correct about line number "line" and the surrounding
      // lines; only stops checking at end of document or after no changes need
      // making for several consecutive lines. note that iteration is over old lines,
      // so this operation takes time proportional to the number of old lines
      // that are changed or missing, not the number of new lines inserted.
      var correctInARow = 0;
      var currentIndex = line;
      while (correctInARow < reqInARow && currentIndex >= 0)
      {
        if (correctlyAssignLine(currentIndex))
        {
          correctInARow++;
        }
        else correctInARow = 0;
        currentIndex--;
      }
      correctInARow = 0;
      currentIndex = line;
      while (correctInARow < reqInARow && currentIndex < N)
      {
        if (correctlyAssignLine(currentIndex))
        {
          correctInARow++;
        }
        else correctInARow = 0;
        currentIndex++;
      }
    }

    if (N === 0)
    {
      p.cancel();
      if (!isConsecutive(0))
      {
        splitRange(0, 0);
      }
    }
    else
    {
      p.mark("topbot");
      detectChangesAroundLine(0, 1);
      detectChangesAroundLine(N - 1, 1);

      p.mark("obs");
      //console.log("observedChanges: "+toSource(observedChanges));
      for (var k in observedChanges.cleanNodesNearChanges)
      {
        var key = k.substring(1);
        if (rep.lines.containsKey(key))
        {
          var line = rep.lines.indexOfKey(key);
          detectChangesAroundLine(line, 2);
        }
      }
      p.mark("stats&calc");
      p.literal(p.forIndices, "byidx");
      p.literal(p.consecutives, "cons");
      p.literal(p.corrections, "corr");
    }

    var dirtyRanges = [];
    for (var r = 0; r < cleanRanges.length - 1; r++)
    {
      dirtyRanges.push([cleanRanges[r][1], cleanRanges[r + 1][0]]);
    }

    p.end();

    return dirtyRanges;
  }

  function markNodeClean(n)
  {
    // clean nodes have knownHTML that matches their innerHTML
    var dirtiness = {};
    dirtiness.nodeId = uniqueId(n);
    dirtiness.knownHTML = n.innerHTML;
    if (browser.msie)
    {
      // adding a space to an "empty" div in IE designMode doesn't
      // change the innerHTML of the div's parent; also, other
      // browsers don't support innerText
      dirtiness.knownText = n.innerText;
    }
    setAssoc(n, "dirtiness", dirtiness);
  }

  function isNodeDirty(n)
  {
    var p = PROFILER("cleanCheck", false);
    if (n.parentNode != root) return true;
    var data = getAssoc(n, "dirtiness");
    if (!data) return true;
    if (n.id !== data.nodeId) return true;
    if (browser.msie)
    {
      if (n.innerText !== data.knownText) return true;
    }
    if (n.innerHTML !== data.knownHTML) return true;
    p.end();
    return false;
  }

  function getLineEntryTopBottom(entry, destObj)
  {
    var dom = entry.lineNode;
    var top = dom.offsetTop;
    var height = dom.offsetHeight;
    var obj = (destObj || {});
    obj.top = top;
    obj.bottom = (top + height);
    return obj;
  }

  function getViewPortTopBottom()
  {
    var theTop = getScrollY();
    var doc = outerWin.document;
    var height = doc.documentElement.clientHeight;
    return {
      top: theTop,
      bottom: (theTop + height)
    };
  }

  function getVisibleLineRange()
  {
    var viewport = getViewPortTopBottom();
    //console.log("viewport top/bottom: %o", viewport);
    var obj = {};
    var start = rep.lines.search(function(e)
    {
      return getLineEntryTopBottom(e, obj).bottom > viewport.top;
    });
    var end = rep.lines.search(function(e)
    {
      return getLineEntryTopBottom(e, obj).top >= viewport.bottom;
    });
    if (end < start) end = start; // unlikely
    //console.log(start+","+end);
    return [start, end];
  }

  function getVisibleCharRange()
  {
    var lineRange = getVisibleLineRange();
    return [rep.lines.offsetOfIndex(lineRange[0]), rep.lines.offsetOfIndex(lineRange[1])];
  }

  function handleClick(evt)
  {
    inCallStackIfNecessary("handleClick", function()
    {
      idleWorkTimer.atMost(200);
    });

    function isLink(n)
    {
      return (n.tagName || '').toLowerCase() == "a" && n.href;
    }

    // only want to catch left-click
    if ((!evt.ctrlKey) && (evt.button != 2) && (evt.button != 3))
    {
      // find A tag with HREF
      var n = evt.target;
      while (n && n.parentNode && !isLink(n))
      {
        n = n.parentNode;
      }
      if (n && isLink(n))
      {
        try
        {
          var newWindow = window.open(n.href, '_blank');
          newWindow.focus();
        }
        catch (e)
        {
          // absorb "user canceled" error in IE for certain prompts
        }
        evt.preventDefault();
      }
    }
    //hide the dropdownso
    if(window.parent.parent.padeditbar){ // required in case its in an iframe should probably use parent..  See Issue 327 https://github.com/ether/etherpad-lite/issues/327
      window.parent.parent.padeditbar.toggleDropDown("none");
    }
  }

  function doReturnKey()
  {
    if (!(rep.selStart && rep.selEnd))
    {
      return;
    }

    var lineNum = rep.selStart[0];
    var listType = getLineListType(lineNum);

    if (listType)
    {
      var text = rep.lines.atIndex(lineNum).text;
      listType = /([a-z]+)([12345678])/.exec(listType);
      var type  = listType[1];
      var level = Number(listType[2]);

      //detect empty list item; exclude indentation
      if(text === '*' && type !== "indent")
      {
        //if not already on the highest level
        if(level > 1)
        {
          setLineListType(lineNum, type+(level-1));//automatically decrease the level
        }
        else
        {
          setLineListType(lineNum, '');//remove the list
          renumberList(lineNum + 1);//trigger renumbering of list that may be right after
        }
      }
      else if (lineNum + 1 < rep.lines.length())
      {
        performDocumentReplaceSelection('\n');
        setLineListType(lineNum + 1, type+level);
      }
    }
    else
    {
      performDocumentReplaceSelection('\n');
      handleReturnIndentation();
    }
  }

  function doIndentOutdent(isOut)
  {
    if (!((rep.selStart && rep.selEnd) ||
        ((rep.selStart[0] == rep.selEnd[0]) && (rep.selStart[1] == rep.selEnd[1]) &&  rep.selEnd[1] > 1)) &&
        (isOut != true)
       )
    {
      return false;
    }

    var firstLine, lastLine;
    firstLine = rep.selStart[0];
    lastLine = Math.max(firstLine, rep.selEnd[0] - ((rep.selEnd[1] === 0) ? 1 : 0));
    var mods = [];
    for (var n = firstLine; n <= lastLine; n++)
    {
      var listType = getLineListType(n);
      var t = 'indent';
      var level = 0;
      if (listType)
      {
        listType = /([a-z]+)([12345678])/.exec(listType);
        if (listType)
        {
          t = listType[1];
          level = Number(listType[2]);
        }
      }
      var newLevel = Math.max(0, Math.min(MAX_LIST_LEVEL, level + (isOut ? -1 : 1)));
      if (level != newLevel)
      {
        mods.push([n, (newLevel > 0) ? t + newLevel : '']);
      }
    }

    _.each(mods, function(mod){
      setLineListType(mod[0], mod[1]);
    });
    return true;
  }
  editorInfo.ace_doIndentOutdent = doIndentOutdent;

  function doTabKey(shiftDown)
  {
    if (!doIndentOutdent(shiftDown))
    {
      performDocumentReplaceSelection(THE_TAB);
    }
  }

  function doDeleteKey(optEvt)
  {
    var evt = optEvt || {};
    var handled = false;
    if (rep.selStart)
    {
      if (isCaret())
      {
        var lineNum = caretLine();
        var col = caretColumn();
        var lineEntry = rep.lines.atIndex(lineNum);
        var lineText = lineEntry.text;
        var lineMarker = lineEntry.lineMarker;
        if (/^ +$/.exec(lineText.substring(lineMarker, col)))
        {
          var col2 = col - lineMarker;
          var tabSize = THE_TAB.length;
          var toDelete = ((col2 - 1) % tabSize) + 1;
          performDocumentReplaceRange([lineNum, col - toDelete], [lineNum, col], '');
          //scrollSelectionIntoView();
          handled = true;
        }
      }
      if (!handled)
      {
        if (isCaret())
        {
          var theLine = caretLine();
          var lineEntry = rep.lines.atIndex(theLine);
          if (caretColumn() <= lineEntry.lineMarker)
          {
            // delete at beginning of line
            var action = 'delete_newline';
            var prevLineListType = (theLine > 0 ? getLineListType(theLine - 1) : '');
            var thisLineListType = getLineListType(theLine);
            var prevLineEntry = (theLine > 0 && rep.lines.atIndex(theLine - 1));
            var prevLineBlank = (prevLineEntry && prevLineEntry.text.length == prevLineEntry.lineMarker);

            var thisLineHasMarker = documentAttributeManager.lineHasMarker(theLine);

            if (thisLineListType)
            {
              // this line is a list
              if (prevLineBlank && !prevLineListType)
              {
                // previous line is blank, remove it
                performDocumentReplaceRange([theLine - 1, prevLineEntry.text.length], [theLine, 0], '');
              }
              else
              {
                // delistify
                performDocumentReplaceRange([theLine, 0], [theLine, lineEntry.lineMarker], '');
              }
            }else if (thisLineHasMarker && prevLineEntry){
              // If the line has any attributes assigned, remove them by removing the marker '*'
              performDocumentReplaceRange([theLine -1 , prevLineEntry.text.length], [theLine, lineEntry.lineMarker], '');
            }
            else if (theLine > 0)
            {
              // remove newline
              performDocumentReplaceRange([theLine - 1, prevLineEntry.text.length], [theLine, 0], '');
            }
          }
          else
          {
            var docChar = caretDocChar();
            if (docChar > 0)
            {
              if (evt.metaKey || evt.ctrlKey || evt.altKey)
              {
                // delete as many unicode "letters or digits" in a row as possible;
                // always delete one char, delete further even if that first char
                // isn't actually a word char.
                var deleteBackTo = docChar - 1;
                while (deleteBackTo > lineEntry.lineMarker && isWordChar(rep.alltext.charAt(deleteBackTo - 1)))
                {
                  deleteBackTo--;
                }
                performDocumentReplaceCharRange(deleteBackTo, docChar, '');
              }
              else
              {
                // normal delete
                performDocumentReplaceCharRange(docChar - 1, docChar, '');
              }
            }
          }
        }
        else
        {
          performDocumentReplaceSelection('');
        }
      }
    }
     //if the list has been removed, it is necessary to renumber
    //starting from the *next* line because the list may have been
    //separated. If it returns null, it means that the list was not cut, try
    //from the current one.
    var line = caretLine();
    if(line != -1 && renumberList(line+1) === null)
    {
      renumberList(line);
    }
  }

  // set of "letter or digit" chars is based on section 20.5.16 of the original Java Language Spec
  var REGEX_WORDCHAR = /[\u0030-\u0039\u0041-\u005A\u0061-\u007A\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u00FF\u0100-\u1FFF\u3040-\u9FFF\uF900-\uFDFF\uFE70-\uFEFE\uFF10-\uFF19\uFF21-\uFF3A\uFF41-\uFF5A\uFF66-\uFFDC]/;
  var REGEX_SPACE = /\s/;

  function isWordChar(c)
  {
    return !!REGEX_WORDCHAR.exec(c);
  }
  editorInfo.ace_isWordChar = isWordChar;

  function isSpaceChar(c)
  {
    return !!REGEX_SPACE.exec(c);
  }

  function moveByWordInLine(lineText, initialIndex, forwardNotBack)
  {
    var i = initialIndex;

    function nextChar()
    {
      if (forwardNotBack) return lineText.charAt(i);
      else return lineText.charAt(i - 1);
    }

    function advance()
    {
      if (forwardNotBack) i++;
      else i--;
    }

    function isDone()
    {
      if (forwardNotBack) return i >= lineText.length;
      else return i <= 0;
    }

    // On Mac and Linux, move right moves to end of word and move left moves to start;
    // on Windows, always move to start of word.
    // On Windows, Firefox and IE disagree on whether to stop for punctuation (FF says no).
    if (browser.windows && forwardNotBack)
    {
      while ((!isDone()) && isWordChar(nextChar()))
      {
        advance();
      }
      while ((!isDone()) && !isWordChar(nextChar()))
      {
        advance();
      }
    }
    else
    {
      while ((!isDone()) && !isWordChar(nextChar()))
      {
        advance();
      }
      while ((!isDone()) && isWordChar(nextChar()))
      {
        advance();
      }
    }

    return i;
  }

  function handleKeyEvent(evt)
  {
    // if (DEBUG && window.DONT_INCORP) return;
    if (!isEditable) return;
    var type = evt.type;
    var charCode = evt.charCode;
    var keyCode = evt.keyCode;
    var which = evt.which;

    // prevent ESC key
    if (keyCode == 27)
    {
      evt.preventDefault();
      return;
    }

    //dmesg("keyevent type: "+type+", which: "+which);
    // Don't take action based on modifier keys going up and down.
    // Modifier keys do not generate "keypress" events.
    // 224 is the command-key under Mac Firefox.
    // 91 is the Windows key in IE; it is ASCII for open-bracket but isn't the keycode for that key
    // 20 is capslock in IE.
    var isModKey = ((!charCode) && ((type == "keyup") || (type == "keydown")) && (keyCode == 16 || keyCode == 17 || keyCode == 18 || keyCode == 20 || keyCode == 224 || keyCode == 91));
    if (isModKey) return;

    // If the key is a keypress and the browser is opera and the key is enter, do nothign at all as this fires twice.
    if (keyCode == 13 && browser.opera && (type == "keypress")){
      return; // This stops double enters in Opera but double Tabs still show on single tab keypress, adding keyCode == 9 to this doesn't help as the event is fired twice
    }

    var specialHandled = false;
    var isTypeForSpecialKey = ((browser.msie || browser.safari || browser.chrome) ? (type == "keydown") : (type == "keypress"));
    var isTypeForCmdKey = ((browser.msie || browser.safari || browser.chrome) ? (type == "keydown") : (type == "keypress"));

    var stopped = false;

    inCallStackIfNecessary("handleKeyEvent", function()
    {
      if (type == "keypress" || (isTypeForSpecialKey && keyCode == 13 /*return*/ ))
      {
        // in IE, special keys don't send keypress, the keydown does the action
        if (!outsideKeyPress(evt))
        {
          evt.preventDefault();
          stopped = true;
        }
      }
      else if (type == "keydown")
      {
        outsideKeyDown(evt);
      }
      if (!stopped)
      {
        var specialHandledInHook = hooks.callAll('aceKeyEvent', {
          callstack: currentCallStack,
          editorInfo: editorInfo,
          rep: rep,
          documentAttributeManager: documentAttributeManager,
          evt:evt
        });
        specialHandled = (specialHandledInHook&&specialHandledInHook.length>0)?specialHandledInHook[0]:specialHandled;
        if ((!specialHandled) && isTypeForSpecialKey && keyCode == 8)
        {
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
        if ((!specialHandled) && isTypeForSpecialKey && keyCode == 13)
        {
          // return key, handle specially;
          // note that in mozilla we need to do an incorporation for proper return behavior anyway.
          fastIncorp(4);
          evt.preventDefault();
          doReturnKey();
          //scrollSelectionIntoView();
          scheduler.setTimeout(function()
          {
            outerWin.scrollBy(-100, 0);
          }, 0);
          specialHandled = true;
        }
        if ((!specialHandled) && isTypeForCmdKey && String.fromCharCode(which).toLowerCase() == "s" && (evt.metaKey || evt.ctrlKey)) /* Do a saved revision on ctrl S */
        {
          evt.preventDefault();
          var originalBackground = parent.parent.$('#revisionlink').css("background")
          parent.parent.$('#revisionlink').css({"background":"lightyellow"});
          scheduler.setTimeout(function(){
            parent.parent.$('#revisionlink').css({"background":originalBackground});
          }, 1000);
          parent.parent.pad.collabClient.sendMessage({"type":"SAVE_REVISION"}); /* The parent.parent part of this is BAD and I feel bad..  It may break something */
          specialHandled = true;
        }
        if ((!specialHandled) && isTypeForSpecialKey && keyCode == 9 && !(evt.metaKey || evt.ctrlKey))
        {
          // tab
          fastIncorp(5);
          evt.preventDefault();
          doTabKey(evt.shiftKey);
          //scrollSelectionIntoView();
          specialHandled = true;
        }
        if ((!specialHandled) && isTypeForCmdKey && String.fromCharCode(which).toLowerCase() == "z" && (evt.metaKey || evt.ctrlKey) && !evt.altKey)
        {
          // cmd-Z (undo)
          fastIncorp(6);
          evt.preventDefault();
          if (evt.shiftKey)
          {
            doUndoRedo("redo");
          }
          else
          {
            doUndoRedo("undo");
          }
          specialHandled = true;
        }
        if ((!specialHandled) && isTypeForCmdKey && String.fromCharCode(which).toLowerCase() == "y" && (evt.metaKey || evt.ctrlKey))
        {
          // cmd-Y (redo)
          fastIncorp(10);
          evt.preventDefault();
          doUndoRedo("redo");
          specialHandled = true;
        }
        if ((!specialHandled) && isTypeForCmdKey && String.fromCharCode(which).toLowerCase() == "b" && (evt.metaKey || evt.ctrlKey))
        {
          // cmd-B (bold)
          fastIncorp(13);
          evt.preventDefault();
          toggleAttributeOnSelection('bold');
          specialHandled = true;
        }
        if ((!specialHandled) && isTypeForCmdKey && String.fromCharCode(which).toLowerCase() == "i" && (evt.metaKey || evt.ctrlKey))
        {
          // cmd-I (italic)
          fastIncorp(14);
          evt.preventDefault();
          toggleAttributeOnSelection('italic');
          specialHandled = true;
        }
        if ((!specialHandled) && isTypeForCmdKey && String.fromCharCode(which).toLowerCase() == "u" && (evt.metaKey || evt.ctrlKey))
        {
          // cmd-U (underline)
          fastIncorp(15);
          evt.preventDefault();
          toggleAttributeOnSelection('underline');
          specialHandled = true;
        }
        if ((!specialHandled) && isTypeForCmdKey && String.fromCharCode(which).toLowerCase() == "h" && (evt.ctrlKey))
        {
          // cmd-H (backspace)
          fastIncorp(20);
          evt.preventDefault();
          doDeleteKey();
          specialHandled = true;
        }
        if((evt.which == 36 && evt.ctrlKey == true)){ setScrollY(0); } // Control Home send to Y = 0
        if((evt.which == 33 || evt.which == 34) && type == 'keydown'){

          evt.preventDefault(); // This is required, browsers will try to do normal default behavior on page up / down and the default behavior SUCKS

          var oldVisibleLineRange = getVisibleLineRange();
          var topOffset = rep.selStart[0] - oldVisibleLineRange[0];
          if(topOffset < 0 ){
            topOffset = 0;
          }

          var isPageDown = evt.which === 34;
          var isPageUp = evt.which === 33;

          scheduler.setTimeout(function(){
            var newVisibleLineRange = getVisibleLineRange(); // the visible lines IE 1,10
            var linesCount = rep.lines.length(); // total count of lines in pad IE 10
            var numberOfLinesInViewport = newVisibleLineRange[1] - newVisibleLineRange[0]; // How many lines are in the viewport right now?

            if(isPageUp){
              rep.selEnd[0] = rep.selEnd[0] - numberOfLinesInViewport; // move to the bottom line +1 in the viewport (essentially skipping over a page)
              rep.selStart[0] = rep.selStart[0] - numberOfLinesInViewport; // move to the bottom line +1 in the viewport (essentially skipping over a page)
            }

            if(isPageDown){ // if we hit page down
              if(rep.selEnd[0] >= oldVisibleLineRange[0]){ // If the new viewpoint position is actually further than where we are right now
                rep.selStart[0] = oldVisibleLineRange[1] -1; // dont go further in the page down than what's visible IE go from 0 to 50 if 50 is visible on screen but dont go below that else we miss content
                rep.selEnd[0] = oldVisibleLineRange[1] -1; // dont go further in the page down than what's visible IE go from 0 to 50 if 50 is visible on screen but dont go below that else we miss content
              }
            }

            //ensure min and max
            if(rep.selEnd[0] < 0){
              rep.selEnd[0] = 0;
            }
            if(rep.selStart[0] < 0){
              rep.selStart[0] = 0;
            }
            if(rep.selEnd[0] >= linesCount){
              rep.selEnd[0] = linesCount-1;
            }
            updateBrowserSelectionFromRep();
            var myselection = document.getSelection(); // get the current caret selection, can't use rep. here because that only gives us the start position not the current
            var caretOffsetTop = myselection.focusNode.parentNode.offsetTop | myselection.focusNode.offsetTop; // get the carets selection offset in px IE 214
            // top.console.log(caretOffsetTop);
            setScrollY(caretOffsetTop); // set the scrollY offset of the viewport on the document

          }, 200);
        }
        /* Attempt to apply some sanity to cursor handling in Chrome after a copy / paste event
           We have to do this the way we do because rep. doesn't hold the value for keyheld events IE if the user
           presses and holds the arrow key ..  Sorry if this is ugly, blame Chrome's weird handling of viewports after new content is added*/
        if((evt.which == 37 || evt.which == 38 || evt.which == 39 || evt.which == 40) && $.browser.chrome){
          var viewport = getViewPortTopBottom();
          var myselection = document.getSelection(); // get the current caret selection, can't use rep. here because that only gives us the start position not the current
          var caretOffsetTop = myselection.focusNode.parentNode.offsetTop || myselection.focusNode.offsetTop; // get the carets selection offset in px IE 214
          var lineHeight = $(myselection.focusNode.parentNode).parent("div").height(); // get the line height of the caret line
          // top.console.log("offsetTop", myselection.focusNode.parentNode.parentNode.offsetTop);
          try {
            lineHeight = $(myselection.focusNode).height() // needed for how chrome handles line heights of null objects
            // console.log("lineHeight now", lineHeight);
          }catch(e){}
          var caretOffsetTopBottom = caretOffsetTop + lineHeight;
          var visibleLineRange = getVisibleLineRange(); // the visible lines IE 1,10

          if(caretOffsetTop){ // sometimes caretOffsetTop bugs out and returns 0, not sure why, possible Chrome bug?  Either way if it does we don't wanna mess with it
            // top.console.log(caretOffsetTop, viewport.top, caretOffsetTopBottom, viewport.bottom);
            var caretIsNotVisible = (caretOffsetTop < viewport.top || caretOffsetTopBottom >= viewport.bottom); // Is the Caret Visible to the user?
            // Expect some weird behavior caretOffsetTopBottom is greater than viewport.bottom on a keypress down
            var offsetTopSamePlace = caretOffsetTop == viewport.top; // sometimes moving key left & up leaves the caret at the same point as the viewport.top, technically the caret is visible but it's not fully visible so we should move to it 
            if(offsetTopSamePlace && (evt.which == 37 || evt.which == 38)){
                var newY = caretOffsetTop;
                setScrollY(newY);
            }

            if(caretIsNotVisible){ // is the cursor no longer visible to the user?
              // top.console.log("Caret is NOT visible to the user");
              // top.console.log(caretOffsetTop,viewport.top,caretOffsetTopBottom,viewport.bottom);
              // Oh boy the caret is out of the visible area, I need to scroll the browser window to lineNum.
              if(evt.which == 37 || evt.which == 38){ // If left or up arrow
                var newY = caretOffsetTop; // That was easy!
              }
              if(evt.which == 39 || evt.which == 40){ // if down or right arrow
                // only move the viewport if we're at the bottom of the viewport, if we hit down any other time the viewport shouldn't change
                // NOTE: This behavior only fires if Chrome decides to break the page layout after a paste, it's annoying but nothing I can do
                var selection = getSelection();
                top.console.log("line #", rep.selStart[0]); // the line our caret is on
                top.console.log("firstvisible", visibleLineRange[0]); // the first visiblel ine
                top.console.log("lastVisible", visibleLineRange[1]); // the last visible line
                top.console.log(rep.selStart[0], visibleLineRange[1], rep.selStart[0], visibleLineRange[0]);
                var newY = viewport.top + lineHeight;
              }
              if(newY){
                setScrollY(newY); // set the scrollY offset of the viewport on the document
              }
            }
          }
        }
      }

      if (type == "keydown")
      {
        idleWorkTimer.atLeast(500);
      }
      else if (type == "keypress")
      {
        if ((!specialHandled) && false /*parenModule.shouldNormalizeOnChar(charCode)*/)
        {
          idleWorkTimer.atMost(0);
        }
        else
        {
          idleWorkTimer.atLeast(500);
        }
      }
      else if (type == "keyup")
      {
        var wait = 0;
        idleWorkTimer.atLeast(wait);
        idleWorkTimer.atMost(wait);
      }

      // Is part of multi-keystroke international character on Firefox Mac
      var isFirefoxHalfCharacter = (browser.mozilla && evt.altKey && charCode === 0 && keyCode === 0);

      // Is part of multi-keystroke international character on Safari Mac
      var isSafariHalfCharacter = (browser.safari && evt.altKey && keyCode == 229);

      if (thisKeyDoesntTriggerNormalize || isFirefoxHalfCharacter || isSafariHalfCharacter)
      {
        idleWorkTimer.atLeast(3000); // give user time to type
        // if this is a keydown, e.g., the keyup shouldn't trigger a normalize
        thisKeyDoesntTriggerNormalize = true;
      }

      if ((!specialHandled) && (!thisKeyDoesntTriggerNormalize) && (!inInternationalComposition))
      {
        if (type != "keyup")
        {
          observeChangesAroundSelection();
        }
      }

      if (type == "keyup")
      {
        thisKeyDoesntTriggerNormalize = false;
      }
    });
  }

  var thisKeyDoesntTriggerNormalize = false;

  function doUndoRedo(which)
  {
    // precond: normalized DOM
    if (undoModule.enabled)
    {
      var whichMethod;
      if (which == "undo") whichMethod = 'performUndo';
      if (which == "redo") whichMethod = 'performRedo';
      if (whichMethod)
      {
        var oldEventType = currentCallStack.editEvent.eventType;
        currentCallStack.startNewEvent(which);
        undoModule[whichMethod](function(backset, selectionInfo)
        {
          if (backset)
          {
            performDocumentApplyChangeset(backset);
          }
          if (selectionInfo)
          {
            performSelectionChange(lineAndColumnFromChar(selectionInfo.selStart), lineAndColumnFromChar(selectionInfo.selEnd), selectionInfo.selFocusAtStart);
          }
          var oldEvent = currentCallStack.startNewEvent(oldEventType, true);
          return oldEvent;
        });
      }
    }
  }
  editorInfo.ace_doUndoRedo = doUndoRedo;

  function updateBrowserSelectionFromRep()
  {
    // requires normalized DOM!
    var selStart = rep.selStart,
        selEnd = rep.selEnd;

    if (!(selStart && selEnd))
    {
      setSelection(null);
      return;
    }

    var selection = {};

    var ss = [selStart[0], selStart[1]];
    selection.startPoint = getPointForLineAndChar(ss);

    var se = [selEnd[0], selEnd[1]];
    selection.endPoint = getPointForLineAndChar(se);

    selection.focusAtStart = !! rep.selFocusAtStart;
    setSelection(selection);
  }

  function nodeMaxIndex(nd)
  {
    if (isNodeText(nd)) return nd.nodeValue.length;
    else return 1;
  }

  function hasIESelection()
  {
    var browserSelection;
    try
    {
      browserSelection = doc.selection;
    }
    catch (e)
    {}
    if (!browserSelection) return false;
    var origSelectionRange;
    try
    {
      origSelectionRange = browserSelection.createRange();
    }
    catch (e)
    {}
    if (!origSelectionRange) return false;
    return true;
  }

  function getSelection()
  {
    // returns null, or a structure containing startPoint and endPoint,
    // each of which has node (a magicdom node), index, and maxIndex.  If the node
    // is a text node, maxIndex is the length of the text; else maxIndex is 1.
    // index is between 0 and maxIndex, inclusive.
    if (browser.msie)
    {
      var browserSelection;
      try
      {
        browserSelection = doc.selection;
      }
      catch (e)
      {}
      if (!browserSelection) return null;
      var origSelectionRange;
      try
      {
        origSelectionRange = browserSelection.createRange();
      }
      catch (e)
      {}
      if (!origSelectionRange) return null;
      var selectionParent = origSelectionRange.parentElement();
      if (selectionParent.ownerDocument != doc) return null;

      var newRange = function()
      {
        return doc.body.createTextRange();
      };

      var rangeForElementNode = function(nd)
      {
        var rng = newRange();
        // doesn't work on text nodes
        rng.moveToElementText(nd);
        return rng;
      };

      var pointFromCollapsedRange = function(rng)
      {
        var parNode = rng.parentElement();
        var elemBelow = -1;
        var elemAbove = parNode.childNodes.length;
        var rangeWithin = rangeForElementNode(parNode);

        if (rng.compareEndPoints("StartToStart", rangeWithin) === 0)
        {
          return {
            node: parNode,
            index: 0,
            maxIndex: 1
          };
        }
        else if (rng.compareEndPoints("EndToEnd", rangeWithin) === 0)
        {
          if (isBlockElement(parNode) && parNode.nextSibling)
          {
            // caret after block is not consistent across browsers
            // (same line vs next) so put caret before next node
            return {
              node: parNode.nextSibling,
              index: 0,
              maxIndex: 1
            };
          }
          return {
            node: parNode,
            index: 1,
            maxIndex: 1
          };
        }
        else if (parNode.childNodes.length === 0)
        {
          return {
            node: parNode,
            index: 0,
            maxIndex: 1
          };
        }

        for (var i = 0; i < parNode.childNodes.length; i++)
        {
          var n = parNode.childNodes.item(i);
          if (!isNodeText(n))
          {
            var nodeRange = rangeForElementNode(n);
            var startComp = rng.compareEndPoints("StartToStart", nodeRange);
            var endComp = rng.compareEndPoints("EndToEnd", nodeRange);
            if (startComp >= 0 && endComp <= 0)
            {
              var index = 0;
              if (startComp > 0)
              {
                index = 1;
              }
              return {
                node: n,
                index: index,
                maxIndex: 1
              };
            }
            else if (endComp > 0)
            {
              if (i > elemBelow)
              {
                elemBelow = i;
                rangeWithin.setEndPoint("StartToEnd", nodeRange);
              }
            }
            else if (startComp < 0)
            {
              if (i < elemAbove)
              {
                elemAbove = i;
                rangeWithin.setEndPoint("EndToStart", nodeRange);
              }
            }
          }
        }
        if ((elemAbove - elemBelow) == 1)
        {
          if (elemBelow >= 0)
          {
            return {
              node: parNode.childNodes.item(elemBelow),
              index: 1,
              maxIndex: 1
            };
          }
          else
          {
            return {
              node: parNode.childNodes.item(elemAbove),
              index: 0,
              maxIndex: 1
            };
          }
        }
        var idx = 0;
        var r = rng.duplicate();
        // infinite stateful binary search! call function for values 0 to inf,
        // expecting the answer to be about 40.  return index of smallest
        // true value.
        var indexIntoRange = binarySearchInfinite(40, function(i)
        {
          // the search algorithm whips the caret back and forth,
          // though it has to be moved relatively and may hit
          // the end of the buffer
          var delta = i - idx;
          var moved = Math.abs(r.move("character", -delta));
          // next line is work-around for fact that when moving left, the beginning
          // of a text node is considered to be after the start of the parent element:
          if (r.move("character", -1)) r.move("character", 1);
          if (delta < 0) idx -= moved;
          else idx += moved;
          return (r.compareEndPoints("StartToStart", rangeWithin) <= 0);
        });
        // iterate over consecutive text nodes, point is in one of them
        var textNode = elemBelow + 1;
        var indexLeft = indexIntoRange;
        while (textNode < elemAbove)
        {
          var tn = parNode.childNodes.item(textNode);
          if (indexLeft <= tn.nodeValue.length)
          {
            return {
              node: tn,
              index: indexLeft,
              maxIndex: tn.nodeValue.length
            };
          }
          indexLeft -= tn.nodeValue.length;
          textNode++;
        }
        var tn = parNode.childNodes.item(textNode - 1);
        return {
          node: tn,
          index: tn.nodeValue.length,
          maxIndex: tn.nodeValue.length
        };
      };

      var selection = {};
      if (origSelectionRange.compareEndPoints("StartToEnd", origSelectionRange) === 0)
      {
        // collapsed
        var pnt = pointFromCollapsedRange(origSelectionRange);
        selection.startPoint = pnt;
        selection.endPoint = {
          node: pnt.node,
          index: pnt.index,
          maxIndex: pnt.maxIndex
        };
      }
      else
      {
        var start = origSelectionRange.duplicate();
        start.collapse(true);
        var end = origSelectionRange.duplicate();
        end.collapse(false);
        selection.startPoint = pointFromCollapsedRange(start);
        selection.endPoint = pointFromCollapsedRange(end);
/*if ((!selection.startPoint.node.isText) && (!selection.endPoint.node.isText)) {
  console.log(selection.startPoint.node.uniqueId()+","+
    selection.startPoint.index+" / "+
    selection.endPoint.node.uniqueId()+","+
    selection.endPoint.index);
	}*/
      }
      return selection;
    }
    else
    {
      // non-IE browser
      var browserSelection = window.getSelection();
      if (browserSelection && browserSelection.type != "None" && browserSelection.rangeCount !== 0)
      {
        var range = browserSelection.getRangeAt(0);

        function isInBody(n)
        {
          while (n && !(n.tagName && n.tagName.toLowerCase() == "body"))
          {
            n = n.parentNode;
          }
          return !!n;
        }

        function pointFromRangeBound(container, offset)
        {
          if (!isInBody(container))
          {
            // command-click in Firefox selects whole document, HEAD and BODY!
            return {
              node: root,
              index: 0,
              maxIndex: 1
            };
          }
          var n = container;
          var childCount = n.childNodes.length;
          if (isNodeText(n))
          {
            return {
              node: n,
              index: offset,
              maxIndex: n.nodeValue.length
            };
          }
          else if (childCount === 0)
          {
            return {
              node: n,
              index: 0,
              maxIndex: 1
            };
          }
          // treat point between two nodes as BEFORE the second (rather than after the first)
          // if possible; this way point at end of a line block-element is treated as
          // at beginning of next line
          else if (offset == childCount)
          {
            var nd = n.childNodes.item(childCount - 1);
            var max = nodeMaxIndex(nd);
            return {
              node: nd,
              index: max,
              maxIndex: max
            };
          }
          else
          {
            var nd = n.childNodes.item(offset);
            var max = nodeMaxIndex(nd);
            return {
              node: nd,
              index: 0,
              maxIndex: max
            };
          }
        }
        var selection = {};
        selection.startPoint = pointFromRangeBound(range.startContainer, range.startOffset);
        selection.endPoint = pointFromRangeBound(range.endContainer, range.endOffset);
        selection.focusAtStart = (((range.startContainer != range.endContainer) || (range.startOffset != range.endOffset)) && browserSelection.anchorNode && (browserSelection.anchorNode == range.endContainer) && (browserSelection.anchorOffset == range.endOffset));

        if(selection.startPoint.node.ownerDocument !== window.document){
          return null;
        }

        return selection;
      }
      else return null;
    }
  }

  function setSelection(selection)
  {
    function copyPoint(pt)
    {
      return {
        node: pt.node,
        index: pt.index,
        maxIndex: pt.maxIndex
      };
    }
    if (browser.msie)
    {
      // Oddly enough, accessing scrollHeight fixes return key handling on IE 8,
      // presumably by forcing some kind of internal DOM update.
      doc.body.scrollHeight;

      function moveToElementText(s, n)
      {
        while (n.firstChild && !isNodeText(n.firstChild))
        {
          n = n.firstChild;
        }
        s.moveToElementText(n);
      }

      function newRange()
      {
        return doc.body.createTextRange();
      }

      function setCollapsedBefore(s, n)
      {
        // s is an IE TextRange, n is a dom node
        if (isNodeText(n))
        {
          // previous node should not also be text, but prevent inf recurs
          if (n.previousSibling && !isNodeText(n.previousSibling))
          {
            setCollapsedAfter(s, n.previousSibling);
          }
          else
          {
            setCollapsedBefore(s, n.parentNode);
          }
        }
        else
        {
          moveToElementText(s, n);
          // work around for issue that caret at beginning of line
          // somehow ends up at end of previous line
          if (s.move('character', 1))
          {
            s.move('character', -1);
          }
          s.collapse(true); // to start
        }
      }

      function setCollapsedAfter(s, n)
      {
        // s is an IE TextRange, n is a magicdom node
        if (isNodeText(n))
        {
          // can't use end of container when no nextSibling (could be on next line),
          // so use previousSibling or start of container and move forward.
          setCollapsedBefore(s, n);
          s.move("character", n.nodeValue.length);
        }
        else
        {
          moveToElementText(s, n);
          s.collapse(false); // to end
        }
      }

      function getPointRange(point)
      {
        var s = newRange();
        var n = point.node;
        if (isNodeText(n))
        {
          setCollapsedBefore(s, n);
          s.move("character", point.index);
        }
        else if (point.index === 0)
        {
          setCollapsedBefore(s, n);
        }
        else
        {
          setCollapsedAfter(s, n);
        }
        return s;
      }

      if (selection)
      {
        if (!hasIESelection())
        {
          return; // don't steal focus
        }

        var startPoint = copyPoint(selection.startPoint);
        var endPoint = copyPoint(selection.endPoint);

        // fix issue where selection can't be extended past end of line
        // with shift-rightarrow or shift-downarrow
        if (endPoint.index == endPoint.maxIndex && endPoint.node.nextSibling)
        {
          endPoint.node = endPoint.node.nextSibling;
          endPoint.index = 0;
          endPoint.maxIndex = nodeMaxIndex(endPoint.node);
        }
        var range = getPointRange(startPoint);
        range.setEndPoint("EndToEnd", getPointRange(endPoint));

        // setting the selection in IE causes everything to scroll
        // so that the selection is visible.  if setting the selection
        // definitely accomplishes nothing, don't do it.


        function isEqualToDocumentSelection(rng)
        {
          var browserSelection;
          try
          {
            browserSelection = doc.selection;
          }
          catch (e)
          {}
          if (!browserSelection) return false;
          var rng2 = browserSelection.createRange();
          if (rng2.parentElement().ownerDocument != doc) return false;
          if (rng.compareEndPoints("StartToStart", rng2) !== 0) return false;
          if (rng.compareEndPoints("EndToEnd", rng2) !== 0) return false;
          return true;
        }
        if (!isEqualToDocumentSelection(range))
        {
          //dmesg(toSource(selection));
          //dmesg(escapeHTML(doc.body.innerHTML));
          range.select();
        }
      }
      else
      {
        try
        {
          doc.selection.empty();
        }
        catch (e)
        {}
      }
    }
    else
    {
      // non-IE browser
      var isCollapsed;

      function pointToRangeBound(pt)
      {
        var p = copyPoint(pt);
        // Make sure Firefox cursor is deep enough; fixes cursor jumping when at top level,
        // and also problem where cut/copy of a whole line selected with fake arrow-keys
        // copies the next line too.
        if (isCollapsed)
        {
          function diveDeep()
          {
            while (p.node.childNodes.length > 0)
            {
              //&& (p.node == root || p.node.parentNode == root)) {
              if (p.index === 0)
              {
                p.node = p.node.firstChild;
                p.maxIndex = nodeMaxIndex(p.node);
              }
              else if (p.index == p.maxIndex)
              {
                p.node = p.node.lastChild;
                p.maxIndex = nodeMaxIndex(p.node);
                p.index = p.maxIndex;
              }
              else break;
            }
          }
          // now fix problem where cursor at end of text node at end of span-like element
          // with background doesn't seem to show up...
          if (isNodeText(p.node) && p.index == p.maxIndex)
          {
            var n = p.node;
            while ((!n.nextSibling) && (n != root) && (n.parentNode != root))
            {
              n = n.parentNode;
            }
            if (n.nextSibling && (!((typeof n.nextSibling.tagName) == "string" && n.nextSibling.tagName.toLowerCase() == "br")) && (n != p.node) && (n != root) && (n.parentNode != root))
            {
              // found a parent, go to next node and dive in
              p.node = n.nextSibling;
              p.maxIndex = nodeMaxIndex(p.node);
              p.index = 0;
              diveDeep();
            }
          }
          // try to make sure insertion point is styled;
          // also fixes other FF problems
          if (!isNodeText(p.node))
          {
            diveDeep();
          }
        }
        if (isNodeText(p.node))
        {
          return {
            container: p.node,
            offset: p.index
          };
        }
        else
        {
          // p.index in {0,1}
          return {
            container: p.node.parentNode,
            offset: childIndex(p.node) + p.index
          };
        }
      }
      var browserSelection = window.getSelection();
      if (browserSelection)
      {
        browserSelection.removeAllRanges();
        if (selection)
        {
          isCollapsed = (selection.startPoint.node === selection.endPoint.node && selection.startPoint.index === selection.endPoint.index);
          var start = pointToRangeBound(selection.startPoint);
          var end = pointToRangeBound(selection.endPoint);

          if ((!isCollapsed) && selection.focusAtStart && browserSelection.collapse && browserSelection.extend)
          {
            // can handle "backwards"-oriented selection, shift-arrow-keys move start
            // of selection
            browserSelection.collapse(end.container, end.offset);
            //console.trace();
            //console.log(htmlPrettyEscape(rep.alltext));
            //console.log("%o %o", rep.selStart, rep.selEnd);
            //console.log("%o %d", start.container, start.offset);
            browserSelection.extend(start.container, start.offset);
          }
          else
          {
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

  function childIndex(n)
  {
    var idx = 0;
    while (n.previousSibling)
    {
      idx++;
      n = n.previousSibling;
    }
    return idx;
  }

  function fixView()
  {
    // calling this method repeatedly should be fast
    if (getInnerWidth() === 0 || getInnerHeight() === 0)
    {
      return;
    }

    function setIfNecessary(obj, prop, value)
    {
      if (obj[prop] != value)
      {
        obj[prop] = value;
      }
    }

    var lineNumberWidth = sideDiv.firstChild.offsetWidth;
    var newSideDivWidth = lineNumberWidth + LINE_NUMBER_PADDING_LEFT;
    if (newSideDivWidth < MIN_LINEDIV_WIDTH) newSideDivWidth = MIN_LINEDIV_WIDTH;
    iframePadLeft = EDIT_BODY_PADDING_LEFT;
    if (hasLineNumbers) iframePadLeft += newSideDivWidth + LINE_NUMBER_PADDING_RIGHT;
    setIfNecessary(iframe.style, "left", iframePadLeft + "px");
    setIfNecessary(sideDiv.style, "width", newSideDivWidth + "px");

    for (var i = 0; i < 2; i++)
    {
      var newHeight = root.clientHeight;
      var newWidth = (browser.msie ? root.createTextRange().boundingWidth : root.clientWidth);
      var viewHeight = getInnerHeight() - iframePadBottom - iframePadTop;
      var viewWidth = getInnerWidth() - iframePadLeft - iframePadRight;
      if (newHeight < viewHeight)
      {
        newHeight = viewHeight;
        if (browser.msie) setIfNecessary(outerWin.document.documentElement.style, 'overflowY', 'auto');
      }
      else
      {
        if (browser.msie) setIfNecessary(outerWin.document.documentElement.style, 'overflowY', 'scroll');
      }
      if (doesWrap)
      {
        newWidth = viewWidth;
      }
      else
      {
        if (newWidth < viewWidth) newWidth = viewWidth;
      }
      setIfNecessary(iframe.style, "height", newHeight + "px");
      setIfNecessary(iframe.style, "width", newWidth + "px");
      setIfNecessary(sideDiv.style, "height", newHeight + "px");
    }
    if (browser.mozilla)
    {
      if (!doesWrap)
      {
        // the body:display:table-cell hack makes mozilla do scrolling
        // correctly by shrinking the <body> to fit around its content,
        // but mozilla won't act on clicks below the body.  We keep the
        // style.height property set to the viewport height (editor height
        // not including scrollbar), so it will never shrink so that part of
        // the editor isn't clickable.
        var body = root;
        var styleHeight = viewHeight + "px";
        setIfNecessary(body.style, "height", styleHeight);
      }
      else
      {
        setIfNecessary(root.style, "height", "");
      }
    }
    // if near edge, scroll to edge
    var scrollX = getScrollX();
    var scrollY = getScrollY();
    var win = outerWin;
    var r = 20;

    enforceEditability();

    $(sideDiv).addClass('sidedivdelayed');
  }

  function getScrollXY()
  {
    var win = outerWin;
    var odoc = outerWin.document;
    if (typeof(win.pageYOffset) == "number")
    {
      return {
        x: win.pageXOffset,
        y: win.pageYOffset
      };
    }
    var docel = odoc.documentElement;
    if (docel && typeof(docel.scrollTop) == "number")
    {
      return {
        x: docel.scrollLeft,
        y: docel.scrollTop
      };
    }
  }

  function getScrollX()
  {
    return getScrollXY().x;
  }

  function getScrollY()
  {
    return getScrollXY().y;
  }

  function setScrollX(x)
  {
    outerWin.scrollTo(x, getScrollY());
  }

  function setScrollY(y)
  {
    outerWin.scrollTo(getScrollX(), y);
  }

  function setScrollXY(x, y)
  {
    outerWin.scrollTo(x, y);
  }

  var _teardownActions = [];

  function teardown()
  {
    _.each(_teardownActions, function(a)
    {
      a();
    });
  }

  function setDesignMode(newVal)
  {
    try
    {
      function setIfNecessary(target, prop, val)
      {
        if (String(target[prop]).toLowerCase() != val)
        {
          target[prop] = val;
          return true;
        }
        return false;
      }
      if (browser.msie || browser.safari)
      {
        setIfNecessary(root, 'contentEditable', (newVal ? 'true' : 'false'));
      }
      else
      {
        var wasSet = setIfNecessary(doc, 'designMode', (newVal ? 'on' : 'off'));
        if (wasSet && newVal && browser.opera)
        {
          // turning on designMode clears event handlers
          bindTheEventHandlers();
        }
      }
      return true;
    }
    catch (e)
    {
      return false;
    }
  }

  var iePastedLines = null;

  function handleIEPaste(evt)
  {
    // Pasting in IE loses blank lines in a way that loses information;
    // "one\n\ntwo\nthree" becomes "<p>one</p><p>two</p><p>three</p>",
    // which becomes "one\ntwo\nthree".  We can get the correct text
    // from the clipboard directly, but we still have to let the paste
    // happen to get the style information.
    var clipText = window.clipboardData && window.clipboardData.getData("Text");
    if (clipText && doc.selection)
    {
      // this "paste" event seems to mess with the selection whether we try to
      // stop it or not, so can't really do document-level manipulation now
      // or in an idle call-stack.  instead, use IE native manipulation
      //function escapeLine(txt) {
      //return processSpaces(escapeHTML(textify(txt)));
      //}
      //var newHTML = map(clipText.replace(/\r/g,'').split('\n'), escapeLine).join('<br>');
      //doc.selection.createRange().pasteHTML(newHTML);
      //evt.preventDefault();
      //iePastedLines = map(clipText.replace(/\r/g,'').split('\n'), textify);
    }
  }


  var inInternationalComposition = false;
  function handleCompositionEvent(evt)
  {
    // international input events, fired in FF3, at least;  allow e.g. Japanese input
    if (evt.type == "compositionstart")
    {
      inInternationalComposition = true;
    }
    else if (evt.type == "compositionend")
    {
      inInternationalComposition = false;
    }
  }

  editorInfo.ace_getInInternationalComposition = function ()
  {
    return inInternationalComposition;
  }

  function bindTheEventHandlers()
  {
    $(document).on("keydown", handleKeyEvent);
    $(document).on("keypress", handleKeyEvent);
    $(document).on("keyup", handleKeyEvent);
    $(document).on("click", handleClick);
    $(root).on("blur", handleBlur);
    if (browser.msie)
    {
      $(document).on("click", handleIEOuterClick);
    }
    if (browser.msie) $(root).on("paste", handleIEPaste);
    // CompositionEvent is not implemented below IE version 8
    if ( !(browser.msie && browser.version < 9) && document.documentElement)
    {
      $(document.documentElement).on("compositionstart", handleCompositionEvent);
      $(document.documentElement).on("compositionend", handleCompositionEvent);
    }
  }

  function handleIEOuterClick(evt)
  {
    if ((evt.target.tagName || '').toLowerCase() != "html")
    {
      return;
    }
    if (!(evt.pageY > root.clientHeight))
    {
      return;
    }

    // click below the body
    inCallStackIfNecessary("handleOuterClick", function()
    {
      // put caret at bottom of doc
      fastIncorp(11);
      if (isCaret())
      { // don't interfere with drag
        var lastLine = rep.lines.length() - 1;
        var lastCol = rep.lines.atIndex(lastLine).text.length;
        performSelectionChange([lastLine, lastCol], [lastLine, lastCol]);
      }
    });
  }

  function getClassArray(elem, optFilter)
  {
    var bodyClasses = [];
    (elem.className || '').replace(/\S+/g, function(c)
    {
      if ((!optFilter) || (optFilter(c)))
      {
        bodyClasses.push(c);
      }
    });
    return bodyClasses;
  }

  function setClassArray(elem, array)
  {
    elem.className = array.join(' ');
  }

  function setClassPresence(elem, className, present)
  {
    if (present) $(elem).addClass(className);
    else $(elem).removeClass(className);
  }

  function setup()
  {
    doc = document; // defined as a var in scope outside
    inCallStackIfNecessary("setup", function()
    {
      var body = doc.getElementById("innerdocbody");
      root = body; // defined as a var in scope outside
      if (browser.mozilla) addClass(root, "mozilla");
      if (browser.safari) addClass(root, "safari");
      if (browser.msie) addClass(root, "msie");
      if (browser.msie)
      {
        // cache CSS background images
        try
        {
          doc.execCommand("BackgroundImageCache", false, true);
        }
        catch (e)
        { /* throws an error in some IE 6 but not others! */
        }
      }
      setClassPresence(root, "authorColors", true);
      setClassPresence(root, "doesWrap", doesWrap);

      initDynamicCSS();

      enforceEditability();

      // set up dom and rep
      while (root.firstChild) root.removeChild(root.firstChild);
      var oneEntry = createDomLineEntry("");
      doRepLineSplice(0, rep.lines.length(), [oneEntry]);
      insertDomLines(null, [oneEntry.domInfo], null);
      rep.alines = Changeset.splitAttributionLines(
      Changeset.makeAttribution("\n"), "\n");

      bindTheEventHandlers();

    });

    scheduler.setTimeout(function()
    {
      parent.readyFunc(); // defined in code that sets up the inner iframe
    }, 0);

    isSetUp = true;
  }

  function focus()
  {
    window.focus();
  }

  function handleBlur(evt)
  {
    if (browser.msie)
    {
      // a fix: in IE, clicking on a control like a button outside the
      // iframe can "blur" the editor, causing it to stop getting
      // events, though typing still affects it(!).
      setSelection(null);
    }
  }

  function getSelectionPointX(point)
  {
    // doesn't work in wrap-mode
    var node = point.node;
    var index = point.index;

    function leftOf(n)
    {
      return n.offsetLeft;
    }

    function rightOf(n)
    {
      return n.offsetLeft + n.offsetWidth;
    }
    if (!isNodeText(node))
    {
      if (index === 0) return leftOf(node);
      else return rightOf(node);
    }
    else
    {
      // we can get bounds of element nodes, so look for those.
      // allow consecutive text nodes for robustness.
      var charsToLeft = index;
      var charsToRight = node.nodeValue.length - index;
      var n;
      for (n = node.previousSibling; n && isNodeText(n); n = n.previousSibling)
      charsToLeft += n.nodeValue;
      var leftEdge = (n ? rightOf(n) : leftOf(node.parentNode));
      for (n = node.nextSibling; n && isNodeText(n); n = n.nextSibling)
      charsToRight += n.nodeValue;
      var rightEdge = (n ? leftOf(n) : rightOf(node.parentNode));
      var frac = (charsToLeft / (charsToLeft + charsToRight));
      var pixLoc = leftEdge + frac * (rightEdge - leftEdge);
      return Math.round(pixLoc);
    }
  }

  function getPageHeight()
  {
    var win = outerWin;
    var odoc = win.document;
    if (win.innerHeight && win.scrollMaxY) return win.innerHeight + win.scrollMaxY;
    else if (odoc.body.scrollHeight > odoc.body.offsetHeight) return odoc.body.scrollHeight;
    else return odoc.body.offsetHeight;
  }

  function getPageWidth()
  {
    var win = outerWin;
    var odoc = win.document;
    if (win.innerWidth && win.scrollMaxX) return win.innerWidth + win.scrollMaxX;
    else if (odoc.body.scrollWidth > odoc.body.offsetWidth) return odoc.body.scrollWidth;
    else return odoc.body.offsetWidth;
  }

  function getInnerHeight()
  {
    var win = outerWin;
    var odoc = win.document;
    var h;
    if (browser.opera) h = win.innerHeight;
    else h = odoc.documentElement.clientHeight;
    if (h) return h;

    // deal with case where iframe is hidden, hope that
    // style.height of iframe container is set in px
    return Number(editorInfo.frame.parentNode.style.height.replace(/[^0-9]/g, '') || 0);
  }

  function getInnerWidth()
  {
    var win = outerWin;
    var odoc = win.document;
    return odoc.documentElement.clientWidth;
  }

  function scrollNodeVerticallyIntoView(node)
  {
    // requires element (non-text) node;
    // if node extends above top of viewport or below bottom of viewport (or top of scrollbar),
    // scroll it the minimum distance needed to be completely in view.
    var win = outerWin;
    var odoc = outerWin.document;
    var distBelowTop = node.offsetTop + iframePadTop - win.scrollY;
    var distAboveBottom = win.scrollY + getInnerHeight() - (node.offsetTop + iframePadTop + node.offsetHeight);

    if (distBelowTop < 0)
    {
      win.scrollBy(0, distBelowTop);
    }
    else if (distAboveBottom < 0)
    {
      win.scrollBy(0, -distAboveBottom);
    }
  }

  function scrollXHorizontallyIntoView(pixelX)
  {
    var win = outerWin;
    var odoc = outerWin.document;
    pixelX += iframePadLeft;
    var distInsideLeft = pixelX - win.scrollX;
    var distInsideRight = win.scrollX + getInnerWidth() - pixelX;
    if (distInsideLeft < 0)
    {
      win.scrollBy(distInsideLeft, 0);
    }
    else if (distInsideRight < 0)
    {
      win.scrollBy(-distInsideRight + 1, 0);
    }
  }

  function scrollSelectionIntoView()
  {
    if (!rep.selStart) return;
    fixView();
    var focusLine = (rep.selFocusAtStart ? rep.selStart[0] : rep.selEnd[0]);
    scrollNodeVerticallyIntoView(rep.lines.atIndex(focusLine).lineNode);
    if (!doesWrap)
    {
      var browserSelection = getSelection();
      if (browserSelection)
      {
        var focusPoint = (browserSelection.focusAtStart ? browserSelection.startPoint : browserSelection.endPoint);
        var selectionPointX = getSelectionPointX(focusPoint);
        scrollXHorizontallyIntoView(selectionPointX);
        fixView();
      }
    }
  }

  var listAttributeName = 'list';

  function getLineListType(lineNum)
  {
    return documentAttributeManager.getAttributeOnLine(lineNum, listAttributeName)
  }

  function setLineListType(lineNum, listType)
  {
    if(listType == ''){
      documentAttributeManager.removeAttributeOnLine(lineNum, listAttributeName);
    }else{
      documentAttributeManager.setAttributeOnLine(lineNum, listAttributeName, listType);
    }

    //if the list has been removed, it is necessary to renumber
    //starting from the *next* line because the list may have been
    //separated. If it returns null, it means that the list was not cut, try
    //from the current one.
    if(renumberList(lineNum+1)==null)
    {
      renumberList(lineNum);
    }
  }

  function renumberList(lineNum){
    //1-check we are in a list
    var type = getLineListType(lineNum);
    if(!type)
    {
      return null;
    }
    type = /([a-z]+)[12345678]/.exec(type);
    if(type[1] == "indent")
    {
      return null;
    }

    //2-find the first line of the list
    while(lineNum-1 >= 0 && (type=getLineListType(lineNum-1)))
    {
      type = /([a-z]+)[12345678]/.exec(type);
      if(type[1] == "indent")
        break;
      lineNum--;
    }

    //3-renumber every list item of the same level from the beginning, level 1
    //IMPORTANT: never skip a level because there imbrication may be arbitrary
    var builder = Changeset.builder(rep.lines.totalWidth());
    loc = [0,0];
    function applyNumberList(line, level)
    {
      //init
      var position = 1;
      var curLevel = level;
      var listType;
      //loop over the lines
      while(listType = getLineListType(line))
      {
        //apply new num
        listType = /([a-z]+)([12345678])/.exec(listType);
        curLevel = Number(listType[2]);
        if(isNaN(curLevel) || listType[0] == "indent")
        {
          return line;
        }
        else if(curLevel == level)
        {
          ChangesetUtils.buildKeepRange(rep, builder, loc, (loc = [line, 0]));
          ChangesetUtils.buildKeepRange(rep, builder, loc, (loc = [line, 1]), [
            ['start', position]
          ], rep.apool);

          position++;
          line++;
        }
        else if(curLevel < level)
        {
          return line;//back to parent
        }
        else
        {
          line = applyNumberList(line, level+1);//recursive call
        }
      }
      return line;
    }

    applyNumberList(lineNum, 1);
    var cs = builder.toString();
    if (!Changeset.isIdentity(cs))
    {
      performDocumentApplyChangeset(cs);
    }

    //4-apply the modifications


  }


  function doInsertList(type)
  {
    if (!(rep.selStart && rep.selEnd))
    {
      return;
    }

    var firstLine, lastLine;
    firstLine = rep.selStart[0];
    lastLine = Math.max(firstLine, rep.selEnd[0] - ((rep.selEnd[1] === 0) ? 1 : 0));

    var allLinesAreList = true;
    for (var n = firstLine; n <= lastLine; n++)
    {
      var listType = getLineListType(n);
      if (!listType || listType.slice(0, type.length) != type)
      {
        allLinesAreList = false;
        break;
      }
    }

    var mods = [];
    for (var n = firstLine; n <= lastLine; n++)
    {
      var t = '';
      var level = 0;
      var listType = /([a-z]+)([12345678])/.exec(getLineListType(n));
      if (listType)
      {
        t = listType[1];
        level = Number(listType[2]);
      }
      var t = getLineListType(n);
      mods.push([n, allLinesAreList ? 'indent' + level : (t ? type + level : type + '1')]);
    }

    _.each(mods, function(mod){
      setLineListType(mod[0], mod[1]);
    });
  }

  function doInsertUnorderedList(){
    doInsertList('bullet');
  }
  function doInsertOrderedList(){
    doInsertList('number');
  }
  editorInfo.ace_doInsertUnorderedList = doInsertUnorderedList;
  editorInfo.ace_doInsertOrderedList = doInsertOrderedList;

  var lineNumbersShown;
  var sideDivInner;

  function initLineNumbers()
  {
    lineNumbersShown = 1;
    sideDiv.innerHTML = '<table border="0" cellpadding="0" cellspacing="0" align="right"><tr><td id="sidedivinner"><div>1</div></td></tr></table>';
    sideDivInner = outerWin.document.getElementById("sidedivinner");
  }

  function updateLineNumbers()
  {
    var newNumLines = rep.lines.length();
    if (newNumLines < 1) newNumLines = 1;
    //update height of all current line numbers

    var a = sideDivInner.firstChild;
    var b = doc.body.firstChild;
    var n = 0;

    if (currentCallStack && currentCallStack.domClean)
    {

      while (a && b)
      {
        if(n > lineNumbersShown) //all updated, break
        break;
        var h = (b.clientHeight || b.offsetHeight);
        if (b.nextSibling)
        {
          // when text is zoomed in mozilla, divs have fractional
          // heights (though the properties are always integers)
          // and the line-numbers don't line up unless we pay
          // attention to where the divs are actually placed...
          // (also: padding on TTs/SPANs in IE...)
          h = b.nextSibling.offsetTop - b.offsetTop;
        }
        if (h)
        {
          var hpx = h + "px";
          if (a.style.height != hpx) {
            a.style.height = hpx;
          }
        }
        a = a.nextSibling;
        b = b.nextSibling;
        n++;
      }
    }

    if (newNumLines != lineNumbersShown)
    {
      var container = sideDivInner;
      var odoc = outerWin.document;
      var fragment = odoc.createDocumentFragment();
      while (lineNumbersShown < newNumLines)
      {
        lineNumbersShown++;
        var n = lineNumbersShown;
        var div = odoc.createElement("DIV");
        //calculate height for new line number
        if(b){
          var h = (b.clientHeight || b.offsetHeight);

          if (b.nextSibling){
            h = b.nextSibling.offsetTop - b.offsetTop;
          }
        }

        if(h){ // apply style to div
          div.style.height = h +"px";
	}

        div.appendChild(odoc.createTextNode(String(n)));
        fragment.appendChild(div);
        if(b){
          b = b.nextSibling;
        }
      }

      container.appendChild(fragment);
      while (lineNumbersShown > newNumLines)
      {
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
    $(document).ready(function(){
      doc = document; // defined as a var in scope outside
      inCallStack("setup", function()
      {
        var body = doc.getElementById("innerdocbody");
        root = body; // defined as a var in scope outside
        if (browser.mozilla) $(root).addClass("mozilla");
        if (browser.safari) $(root).addClass("safari");
        if (browser.msie) $(root).addClass("msie");
        if (browser.msie)
        {
          // cache CSS background images
          try
          {
            doc.execCommand("BackgroundImageCache", false, true);
          }
          catch (e)
          { /* throws an error in some IE 6 but not others! */
          }
        }
        setClassPresence(root, "authorColors", true);
        setClassPresence(root, "doesWrap", doesWrap);

        initDynamicCSS();

        enforceEditability();

        // set up dom and rep
        while (root.firstChild) root.removeChild(root.firstChild);
        var oneEntry = createDomLineEntry("");
        doRepLineSplice(0, rep.lines.length(), [oneEntry]);
        insertDomLines(null, [oneEntry.domInfo], null);
        rep.alines = Changeset.splitAttributionLines(
        Changeset.makeAttribution("\n"), "\n");

        bindTheEventHandlers();

      });

      hooks.callAll('aceInitialized', {
        editorInfo: editorInfo,
        rep: rep,
        documentAttributeManager: documentAttributeManager
      });

      scheduler.setTimeout(function()
      {
        parent.readyFunc(); // defined in code that sets up the inner iframe
      }, 0);

      isSetUp = true;
    });
  }

}

exports.init = function () {
  var editor = new Ace2Inner()
  editor.init();
};
