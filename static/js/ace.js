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
      var action = function()
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
    $.each(actionsPendingInit, function(i,fn){
      fn()
    });
    actionsPendingInit = [];
  }
  
  ace2.registry[info.id] = info;

  // The following functions (prefixed by 'ace_')  are exposed by editor, but
  // execution is delayed until init is complete
  var aceFunctionsPendingInit = ['importText', 'importAText', 'focus',
  'setEditable', 'getFormattedCode', 'setOnKeyPress', 'setOnKeyDown',
  'setNotifyDirty', 'setProperty', 'setBaseText', 'setBaseAttributedText',
  'applyChangesToBase', 'applyPreparedChangesetToBase',
  'setUserChangeNotificationCallback', 'setAuthorInfo',
  'setAuthorSelectionRange', 'callWithAce', 'execCommand', 'replaceRange'];
  
  $.each(aceFunctionsPendingInit, function(i,fnName){
    var prefix = 'ace_';
    var name = prefix + fnName;
    editor[fnName] = pendingInit(function(){
      info[prefix + fnName].apply(this, arguments);
    });
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
  
  editor.getDebugProperty = function(prop)
  {
    return info.ace_getDebugProperty(prop);
  };

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

  editor.getUnhandledErrors = function()
  {
    if (!loaded) return [];
    // returns array of {error: <browser Error object>, time: +new Date()}
    return info.ace_getUnhandledErrors();
  };

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

      var styleTags = '\
          <link rel="stylesheet" type="text/css" href="../static/css/iframe_editor.css"\/>\n\
          <link rel="stylesheet" type="text/css" href="../static/css/pad.css"\/>\n\
          <link rel="stylesheet" type="text/css" href="../static/custom/pad.css"\/>\n\
          ';

      iframeHTML.push(styleTags);

      // Inject my require into my child.
      // HACK: Sharing this means that `window` can be bound cross frame.
      // TODO: Drop script include and rely on `require` to retrieve code. This
      //   May impact debuggability and also (ATM) breaks down due to odd
      //   binding of `window` to parent...
      iframeHTML.push('\
<script type="text/javascript">\
  require = parent.parent.require;
</script>\
<script type="application/javascript" src="../minified/ace2_inner.js?callback=require.define"></script>\n\
<script type="text/javascript">\
  require("/ace2_inner");
</script>\
');

      iframeHTML.push('<style type="text/css" title="dynamicsyntax"></style>');
      iframeHTML.push('</head><body id="innerdocbody" class="syntax" spellcheck="false">&nbsp;</body></html>');

      // Expose myself to global for my child frame.
      var thisFunctionsName = "ChildAccessibleAce2Editor";
      (function () {return this}())[thisFunctionsName] = Ace2Editor;

      var outerScript = 'editorId = "' + info.id + '"; editorInfo = parent.' + thisFunctionsName + '.registry[editorId]; ' + 'window.onload = function() ' + '{ window.onload = null; setTimeout' + '(function() ' + '{ var iframe = document.createElement("IFRAME"); ' + 'iframe.scrolling = "no"; var outerdocbody = document.getElementById("outerdocbody"); ' + 'iframe.frameBorder = 0; iframe.allowTransparency = true; ' + // for IE
      'outerdocbody.insertBefore(iframe, outerdocbody.firstChild); ' + 'iframe.ace_outerWin = window; ' + 'readyFunc = function() { editorInfo.onEditorReady(); readyFunc = null; editorInfo = null; }; ' + 'var doc = iframe.contentWindow.document; doc.open(); var text = (' + JSON.stringify(iframeHTML.join('\n')) + ');doc.write(text); doc.close(); ' + '}, 0); }';

      var outerHTML = [doctype, '<html><head>']

      outerHTML.push(styleTags);

      // bizarrely, in FF2, a file with no "external" dependencies won't finish loading properly
      // (throbs busy while typing)
      outerHTML.push('<link rel="stylesheet" type="text/css" href="data:text/css,"/>', '\x3cscript>\n', outerScript.replace(/<\//g, '<\\/'), '\n\x3c/script>', '</head><body id="outerdocbody"><div id="sidediv"><!-- --></div><div id="linemetricsdiv">x</div><div id="overlaysdiv"><!-- --></div></body></html>');

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

exports.Ace2Editor = Ace2Editor;
