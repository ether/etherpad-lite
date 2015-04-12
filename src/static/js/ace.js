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

var hooks = require('ep_etherpad-lite/static/js/pluginfw/hooks');
var _ = require('./underscore');

function scriptTag(source) {
  return (
    '<script type="text/javascript">\n'
    + source.replace(/<\//g, '<\\/') +
    '</script>'
  )
}

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
    _.each(actionsPendingInit, function(fn,i){
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

  _.each(aceFunctionsPendingInit, function(fnName,i){
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

  editor.getInInternationalComposition = function()
  {
    if (!loaded) return false;
    return info.ace_getInInternationalComposition();
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

  function pushStyleTagsFor(buffer, files) {
    for (var i = 0, ii = files.length; i < ii; i++) {
      var file = files[i];
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

      var includedCSS = ["../static/css/iframe_editor.css",
                         "../static/css/pad.css",
                         "../static/custom/pad.css"]
        
      var additionalCSS = _(hooks.callAll("aceEditorCSS")).map(function(path){ return '../static/plugins/' + path });
      includedCSS = includedCSS.concat(additionalCSS);

      pushStyleTagsFor(iframeHTML, includedCSS);

      iframeHTML.push('<script type="text/javascript" src="../static/js/require-kernel.js"></script>');
      iframeHTML.push(scriptTag('\n\
        require.setRootURI("../javascripts/src");\n\
        require.setLibraryURI("../javascripts/lib");\n\
        require.setGlobalKeyPath("require");\n\
        '));

      iframeHTML.push('<script type="text/javascript" src="../static/plugins/requirejs/require.js"></script>');

      iframeHTML.push(scriptTag('\n\
        var pathComponents = parent.parent.location.pathname.split("/");\n\
        var baseURL = pathComponents.slice(0,pathComponents.length-2).join("/") + "/";\n\
        requirejs.config({\n\
          baseUrl: baseURL + "static/plugins",\n\
          paths: {underscore: baseURL + "static/plugins/underscore/underscore"}\n\
        });\n\
        \n\
        requirejs(["ep_etherpad-lite/static/js/rjquery", "ep_etherpad-lite/static/js/pluginfw/client_plugins", "ep_etherpad-lite/static/js/ace2_inner"], function (j, plugins, Ace2Inner) {\n\
          jQuery = $ = window.jQuery = window.$ = j; // Expose jQuery #HACK\n\
          \n\
          plugins.adoptPluginsFromAncestorsOf(window, function () {\n\
            var hooks = require("ep_etherpad-lite/static/js/pluginfw/hooks");\n\
            hooks.plugins = plugins;\n\
            \n\
            plugins.ensure(function () {\n\
              Ace2Inner.init();\n\
            });\n\
          });\n\
        });\n\
      '));

      iframeHTML.push('<style type="text/css" title="dynamicsyntax"></style>');

      hooks.callAll("aceInitInnerdocbodyHead", {
        iframeHTML: iframeHTML
      });

      iframeHTML.push('</head><body id="innerdocbody" role="application" class="syntax" spellcheck="false">&nbsp;</body></html>');

      // Expose myself to global for my child frame.
      var thisFunctionsName = "ChildAccessibleAce2Editor";
      (function () {return this}())[thisFunctionsName] = Ace2Editor;

      var outerScript = '\
editorId = ' + JSON.stringify(info.id) + ';\n\
editorInfo = parent[' + JSON.stringify(thisFunctionsName) + '].registry[editorId];\n\
window.onload = function () {\n\
  window.onload = null;\n\
  setTimeout(function () {\n\
    var iframe = document.createElement("IFRAME");\n\
    iframe.name = "ace_inner";\n\
    iframe.title = "pad";\n\
    iframe.scrolling = "no";\n\
    var outerdocbody = document.getElementById("outerdocbody");\n\
    iframe.frameBorder = 0;\n\
    iframe.allowTransparency = true; // for IE\n\
    outerdocbody.insertBefore(iframe, outerdocbody.firstChild);\n\
    iframe.ace_outerWin = window;\n\
    readyFunc = function () {\n\
      editorInfo.onEditorReady();\n\
      readyFunc = null;\n\
      editorInfo = null;\n\
    };\n\
    var doc = iframe.contentWindow.document;\n\
    doc.open();\n\
    var text = (' + JSON.stringify(iframeHTML.join('\n')) + ');\n\
    doc.write(text);\n\
    doc.close();\n\
  }, 0);\n\
}';

      var outerHTML = [doctype, '<html><head>']

      var includedCSS = [
          "../static/css/iframe_editor.css",
          "../static/css/pad.css",
          "../static/custom/pad.css"];

      var additionalCSS = _(hooks.callAll("aceEditorCSS")).map(function(path){ return '../static/plugins/' + path });
      includedCSS = includedCSS.concat(additionalCSS);

      pushStyleTagsFor(outerHTML, includedCSS);

      // bizarrely, in FF2, a file with no "external" dependencies won't finish loading properly
      // (throbs busy while typing)
      outerHTML.push('<style type="text/css" title="dynamicsyntax"></style>', '<link rel="stylesheet" type="text/css" href="data:text/css,"/>', scriptTag(outerScript), '</head><body id="outerdocbody"><div id="sidediv"><!-- --></div><div id="linemetricsdiv">x</div></body></html>');

      var outerFrame = document.createElement("IFRAME");
      outerFrame.name = "ace_outer";
      outerFrame.frameBorder = 0; // for IE
      outerFrame.title = "Ether";
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
