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

// requires: top
// requires: plugins
// requires: undefined

Ace2Editor.registry = {
  nextId: 1
};

var plugins = require('/plugins').plugins;

function Ace2Editor()
{
  var ace2 = Ace2Editor;

  var editor = {};
  var info = {
    editor: editor,
    id: (ace2.registry.nextId++)
  };
  var loaded = false;

  var actionsPendingInit = [];

  function pendingInit(func, optDoNow)
  {
    return function()
    {
      var that = this;
      var args = arguments;

      function action()
      {
        func.apply(that, args);
      }
      if (optDoNow)
      {
        optDoNow.apply(that, args);
      }
      if (loaded)
      {
        action();
      }
      else
      {
        actionsPendingInit.push(action);
      }
    };
  }

  function doActionsPendingInit()
  {
    for (var i = 0; i < actionsPendingInit.length; i++)
    {
      actionsPendingInit[i]();
    }
    actionsPendingInit = [];
  }

  ace2.registry[info.id] = info;

  editor.importText = pendingInit(function(newCode, undoable)
  {
    info.ace_importText(newCode, undoable);
  });
  editor.importAText = pendingInit(function(newCode, apoolJsonObj, undoable)
  {
    info.ace_importAText(newCode, apoolJsonObj, undoable);
  });
  editor.exportText = function()
  {
    if (!loaded) return "(awaiting init)\n";
    return info.ace_exportText();
  };
  editor.getFrame = function()
  {
    return info.frame || null;
  };
  editor.focus = pendingInit(function()
  {
    info.ace_focus();
  });
  editor.setEditable = pendingInit(function(newVal)
  {
    info.ace_setEditable(newVal);
  });
  editor.getFormattedCode = function()
  {
    return info.ace_getFormattedCode();
  };
  editor.setOnKeyPress = pendingInit(function(handler)
  {
    info.ace_setOnKeyPress(handler);
  });
  editor.setOnKeyDown = pendingInit(function(handler)
  {
    info.ace_setOnKeyDown(handler);
  });
  editor.setNotifyDirty = pendingInit(function(handler)
  {
    info.ace_setNotifyDirty(handler);
  });

  editor.setProperty = pendingInit(function(key, value)
  {
    info.ace_setProperty(key, value);
  });
  editor.getDebugProperty = function(prop)
  {
    return info.ace_getDebugProperty(prop);
  };

  editor.setBaseText = pendingInit(function(txt)
  {
    info.ace_setBaseText(txt);
  });
  editor.setBaseAttributedText = pendingInit(function(atxt, apoolJsonObj)
  {
    info.ace_setBaseAttributedText(atxt, apoolJsonObj);
  });
  editor.applyChangesToBase = pendingInit(function(changes, optAuthor, apoolJsonObj)
  {
    info.ace_applyChangesToBase(changes, optAuthor, apoolJsonObj);
  });
  // prepareUserChangeset:
  // Returns null if no new changes or ACE not ready.  Otherwise, bundles up all user changes
  // to the latest base text into a Changeset, which is returned (as a string if encodeAsString).
  // If this method returns a truthy value, then applyPreparedChangesetToBase can be called
  // at some later point to consider these changes part of the base, after which prepareUserChangeset
  // must be called again before applyPreparedChangesetToBase.  Multiple consecutive calls
  // to prepareUserChangeset will return an updated changeset that takes into account the
  // latest user changes, and modify the changeset to be applied by applyPreparedChangesetToBase
  // accordingly.
  editor.prepareUserChangeset = function()
  {
    if (!loaded) return null;
    return info.ace_prepareUserChangeset();
  };
  editor.applyPreparedChangesetToBase = pendingInit(

  function()
  {
    info.ace_applyPreparedChangesetToBase();
  });
  editor.setUserChangeNotificationCallback = pendingInit(function(callback)
  {
    info.ace_setUserChangeNotificationCallback(callback);
  });
  editor.setAuthorInfo = pendingInit(function(author, authorInfo)
  {
    info.ace_setAuthorInfo(author, authorInfo);
  });
  editor.setAuthorSelectionRange = pendingInit(function(author, start, end)
  {
    info.ace_setAuthorSelectionRange(author, start, end);
  });

  editor.getUnhandledErrors = function()
  {
    if (!loaded) return [];
    // returns array of {error: <browser Error object>, time: +new Date()}
    return info.ace_getUnhandledErrors();
  };

  editor.callWithAce = pendingInit(function(fn, callStack, normalize)
  {
    return info.ace_callWithAce(fn, callStack, normalize);
  });

  editor.execCommand = pendingInit(function(cmd, arg1)
  {
    info.ace_execCommand(cmd, arg1);
  });
  editor.replaceRange = pendingInit(function(start, end, text)
  {
    info.ace_replaceRange(start, end, text);
  });

  function sortFilesByEmbeded(files) {
    var embededFiles = [];
    var remoteFiles = [];

    if (Ace2Editor.EMBEDED) {
      for (var i = 0, ii = files.length; i < ii; i++) {
        var file = files[i];
        if (Object.prototype.hasOwnProperty.call(Ace2Editor.EMBEDED, file)) {
          embededFiles.push(file);
        } else {
          remoteFiles.push(file);
        }
      }
    } else {
      remoteFiles = files;
    }

    return {embeded: embededFiles, remote: remoteFiles};
  }
  function pushRequireScriptTo(buffer) {
    /* Folling is for packaging regular expression. */
    /* $$INCLUDE_JS("../static/js/require-kernel.js"); */
    var KERNEL_SOURCE = '../static/js/require-kernel.js';
    if (Ace2Editor.EMBEDED && Ace2Editor.EMBEDED[KERNEL_SOURCE]) {
      buffer.push('<script type="text/javascript">');
      buffer.push(Ace2Editor.EMBEDED[KERNEL_SOURCE]);
      buffer.push('<\/script>');
    } else {
      buffer.push('<script type="application/javascript" src="'+KERNEL_SOURCE+'"><\/script>');
    }
  }
  function pushScriptTagsFor(buffer, files) {
    var sorted = sortFilesByEmbeded(files);
    var embededFiles = sorted.embeded;
    var remoteFiles = sorted.remote;

    for (var i = 0, ii = remoteFiles.length; i < ii; i++) {
      var file = remoteFiles[i];
      file = file.replace(/^\.\.\/static\/js\//, '../minified/');
      buffer.push('<script type="application/javascript" src="' + file + '"><\/script>');
    }

    buffer.push('<script type="text/javascript">');
    for (var i = 0, ii = embededFiles.length; i < ii; i++) {
      var file = embededFiles[i];
      buffer.push(Ace2Editor.EMBEDED[file].replace(/<\//g, '<\\/'));
      buffer.push(';\n');
    }
    for (var i = 0, ii = files.length; i < ii; i++) {
      var file = files[i];
      file = file.replace(/^\.\.\/static\/js\//, '');
      buffer.push('require('+ JSON.stringify('/' + file) + ');\n');
    }
    buffer.push('<\/script>');
  }
  function pushStyleTagsFor(buffer, files) {
    var sorted = sortFilesByEmbeded(files);
    var embededFiles = sorted.embeded;
    var remoteFiles = sorted.remote;

    if (embededFiles.length > 0) {
      buffer.push('<style type="text/css">');
      for (var i = 0, ii = embededFiles.length; i < ii; i++) {
        var file = embededFiles[i];
        buffer.push(Ace2Editor.EMBEDED[file].replace(/<\//g, '<\\/'));
      }
      buffer.push('<\/style>');
    }
    for (var i = 0, ii = remoteFiles.length; i < ii; i++) {
      var file = remoteFiles[i];
      buffer.push('<link rel="stylesheet" type="text/css" href="' + file + '"\/>');
    }
  }

  editor.destroy = pendingInit(function()
  {
    info.ace_dispose();
    info.frame.parentNode.removeChild(info.frame);
    delete ace2.registry[info.id];
    info = null; // prevent IE 6 closure memory leaks
  });

  editor.init = function(containerId, initialCode, doneFunc)
  {

    editor.importText(initialCode);

    info.onEditorReady = function()
    {
      loaded = true;
      doActionsPendingInit();
      doneFunc();
    };

    (function()
    {
      var doctype = "<!doctype html>";

      var iframeHTML = [];

      iframeHTML.push(doctype);
      iframeHTML.push("<html><head>");

      // For compatability's sake transform in and out.
      for (var i = 0, ii = iframeHTML.length; i < ii; i++) {
        iframeHTML[i] = JSON.stringify(iframeHTML[i]);
      }
      plugins.callHook("aceInitInnerdocbodyHead", {
        iframeHTML: iframeHTML
      });
      for (var i = 0, ii = iframeHTML.length; i < ii; i++) {
        iframeHTML[i] = JSON.parse(iframeHTML[i]);
      }

      // calls to these functions ($$INCLUDE_...)  are replaced when this file is processed
      // and compressed, putting the compressed code from the named file directly into the
      // source here.
      // these lines must conform to a specific format because they are passed by the build script:      
      var includedCSS = [];
      var $$INCLUDE_CSS = function(filename) {includedCSS.push(filename)};
      $$INCLUDE_CSS("../static/css/iframe_editor.css");
      $$INCLUDE_CSS("../static/css/pad.css");
      $$INCLUDE_CSS("../static/custom/pad.css");
      pushStyleTagsFor(iframeHTML, includedCSS);

      var includedJS = [];
      var $$INCLUDE_JS = function(filename) {includedJS.push(filename)};
      $$INCLUDE_JS("../static/js/ace2_common.js");
      $$INCLUDE_JS("../static/js/skiplist.js");
      $$INCLUDE_JS("../static/js/virtual_lines.js");
      $$INCLUDE_JS("../static/js/easysync2.js");
      $$INCLUDE_JS("../static/js/cssmanager.js");
      $$INCLUDE_JS("../static/js/colorutils.js");
      $$INCLUDE_JS("../static/js/undomodule.js");
      $$INCLUDE_JS("../static/js/contentcollector.js");
      $$INCLUDE_JS("../static/js/changesettracker.js");
      $$INCLUDE_JS("../static/js/linestylefilter.js");
      $$INCLUDE_JS("../static/js/domline.js");
      $$INCLUDE_JS("../static/js/ace2_inner.js");
      pushRequireScriptTo(iframeHTML);
      pushScriptTagsFor(iframeHTML, includedJS);

      iframeHTML.push('<style type="text/css" title="dynamicsyntax"></style>');
      iframeHTML.push('</head><body id="innerdocbody" class="syntax" spellcheck="false">&nbsp;</body></html>');

      // Expose myself to global for my child frame.
      var thisFunctionsName = "ChildAccessibleAce2Editor";
      (function () {return this}())[thisFunctionsName] = Ace2Editor;

      var outerScript = 'editorId = "' + info.id + '"; editorInfo = parent.' + thisFunctionsName + '.registry[editorId]; ' + 'window.onload = function() ' + '{ window.onload = null; setTimeout' + '(function() ' + '{ var iframe = document.createElement("IFRAME"); ' + 'iframe.scrolling = "no"; var outerdocbody = document.getElementById("outerdocbody"); ' + 'iframe.frameBorder = 0; iframe.allowTransparency = true; ' + // for IE
      'outerdocbody.insertBefore(iframe, outerdocbody.firstChild); ' + 'iframe.ace_outerWin = window; ' + 'readyFunc = function() { editorInfo.onEditorReady(); readyFunc = null; editorInfo = null; }; ' + 'var doc = iframe.contentWindow.document; doc.open(); var text = (' + JSON.stringify(iframeHTML.join('\n')) + ');doc.write(text); doc.close(); ' + '}, 0); }';

      var outerHTML = [doctype, '<html><head>']

      var includedCSS = [];
      var $$INCLUDE_CSS = function(filename) {includedCSS.push(filename)};
      $$INCLUDE_CSS("../static/css/iframe_editor.css");
      $$INCLUDE_CSS("../static/css/pad.css");
      $$INCLUDE_CSS("../static/custom/pad.css");
      pushStyleTagsFor(outerHTML, includedCSS);

      // bizarrely, in FF2, a file with no "external" dependencies won't finish loading properly
      // (throbs busy while typing)
      outerHTML.push('<link rel="stylesheet" type="text/css" href="data:text/css,"/>', '\x3cscript>\n', outerScript.replace(/<\//g, '<\\/'), '\n\x3c/script>', '</head><body id="outerdocbody"><div id="sidediv"><!-- --></div><div id="linemetricsdiv">x</div><div id="overlaysdiv"><!-- --></div></body></html>');

      if (!Array.prototype.map) Array.prototype.map = function(fun)
      { //needed for IE
        if (typeof fun != "function") throw new TypeError();
        var len = this.length;
        var res = new Array(len);
        var thisp = arguments[1];
        for (var i = 0; i < len; i++)
        {
          if (i in this) res[i] = fun.call(thisp, this[i], i, this);
        }
        return res;
      };

      var outerFrame = document.createElement("IFRAME");
      outerFrame.frameBorder = 0; // for IE
      info.frame = outerFrame;
      document.getElementById(containerId).appendChild(outerFrame);

      var editorDocument = outerFrame.contentWindow.document;

      editorDocument.open();
      editorDocument.write(outerHTML.join(''));
      editorDocument.close();
    })();
  };

  return editor;
}

if (typeof exports !== 'undefined') {
exports.Ace2Editor = Ace2Editor;
}
