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

var hooks = require('./pluginfw/hooks');
var _ = require('./underscore');

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
    var KERNEL_SOURCE = '../static/js/require-kernel.js';
    var KERNEL_BOOT = '\
require.setRootURI("../javascripts/src");\n\
require.setLibraryURI("../javascripts/lib");\n\
require.setGlobalKeyPath("require");\n\
';
    if (Ace2Editor.EMBEDED && Ace2Editor.EMBEDED[KERNEL_SOURCE]) {
      buffer.push('<script type="text/javascript">');
      buffer.push(Ace2Editor.EMBEDED[KERNEL_SOURCE]);
      buffer.push(KERNEL_BOOT);
      buffer.push('<\/script>');
    } else {
      file = KERNEL_SOURCE;
      buffer.push('<script type="application/javascript" src="' + KERNEL_SOURCE + '"><\/script>');
      buffer.push('<script type="text/javascript">');
      buffer.push(KERNEL_BOOT);
      buffer.push('<\/script>');
    } 
  }
  function pushScriptsTo(buffer) {
    /* Folling is for packaging regular expression. */
    /* $$INCLUDE_JS("../javascripts/lib/ep_etherpad-lite/static/js/ace2_inner.js?callback=require.define"); */
    /* $$INCLUDE_JS("../javascripts/lib/ep_etherpad-lite/static/js/ace2_common.js?callback=require.define"); */
    var ACE_SOURCE = '../javascripts/lib/ep_etherpad-lite/static/js/ace2_inner.js?callback=require.define';
    var ACE_COMMON = '../javascripts/lib/ep_etherpad-lite/static/js/ace2_common.js?callback=require.define';
    if (Ace2Editor.EMBEDED && Ace2Editor.EMBEDED[ACE_SOURCE]) {
      buffer.push('<script type="text/javascript">');
      buffer.push(Ace2Editor.EMBEDED[ACE_SOURCE]);
      buffer.push(Ace2Editor.EMBEDED[ACE_COMMON]);
      buffer.push('<\/script>');
    } else {
      buffer.push('<script type="application/javascript" src="' + ACE_SOURCE + '"><\/script>');
      buffer.push('<script type="application/javascript" src="' + ACE_COMMON + '"><\/script>');
    }
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

      hooks.callAll("aceInitInnerdocbodyHead", {
        iframeHTML: iframeHTML
      });

      // calls to these functions ($$INCLUDE_...)  are replaced when this file is processed
      // and compressed, putting the compressed code from the named file directly into the
      // source here.
      // these lines must conform to a specific format because they are passed by the build script:      
      var includedCSS = [];
      var $$INCLUDE_CSS = function(filename) {includedCSS.push(filename)};
      $$INCLUDE_CSS("../static/css/iframe_editor.css");
      $$INCLUDE_CSS("../static/css/pad.css");
      $$INCLUDE_CSS("../static/custom/pad.css");
      
      var additionalCSS = _(hooks.callAll("aceEditorCSS")).map(function(path){ return '../static/plugins/' + path });
      includedCSS = includedCSS.concat(additionalCSS);
      
      pushStyleTagsFor(iframeHTML, includedCSS);

      var includedJS = [];
      pushRequireScriptTo(iframeHTML);
      pushScriptsTo(iframeHTML);

      // Inject my plugins into my child.
      iframeHTML.push('\
<script type="text/javascript">\
  parent_req = require("ep_etherpad-lite/static/js/pluginfw/parent_require");\
  parent_req.getRequirementFromParent(require, "ep_etherpad-lite/static/js/pluginfw/hooks");\
  parent_req.getRequirementFromParent(require, "ep_etherpad-lite/static/js/pluginfw/plugins");\
  parent_req.getRequirementFromParent(require, "./pluginfw/hooks");\
  parent_req.getRequirementFromParent(require, "./pluginfw/plugins");\
  require.define("/plugins", null);\n\
  require.define("/plugins.js", function (require, exports, module) {\
    module.exports = require("ep_etherpad-lite/static/js/plugins");\
  });\
</script>\
');

      iframeHTML.push('<script type="text/javascript">');
      iframeHTML.push('$ = jQuery = require("ep_etherpad-lite/static/js/rjquery").jQuery; // Expose jQuery #HACK');
      iframeHTML.push('require("ep_etherpad-lite/static/js/ace2_inner");');
      iframeHTML.push('<\/script>');

      iframeHTML.push('<style type="text/css" title="dynamicsyntax"></style>');
      iframeHTML.push('</head><body id="innerdocbody" class="syntax" spellcheck="false">&nbsp;</body></html>');

      // Expose myself to global for my child frame.
      var thisFunctionsName = "ChildAccessibleAce2Editor";
      (function () {return this}())[thisFunctionsName] = Ace2Editor;

      var outerScript = 'editorId = "' + info.id + '"; editorInfo = parent.' + thisFunctionsName + '.registry[editorId]; ' + 'window.onload = function() ' + '{ window.onload = null; setTimeout' + '(function() ' + '{ var iframe = document.createElement("IFRAME"); iframe.name = "ace_inner";' + 'iframe.scrolling = "no"; var outerdocbody = document.getElementById("outerdocbody"); ' + 'iframe.frameBorder = 0; iframe.allowTransparency = true; ' + // for IE
      'outerdocbody.insertBefore(iframe, outerdocbody.firstChild); ' + 'iframe.ace_outerWin = window; ' + 'readyFunc = function() { editorInfo.onEditorReady(); readyFunc = null; editorInfo = null; }; ' + 'var doc = iframe.contentWindow.document; doc.open(); var text = (' + JSON.stringify(iframeHTML.join('\n')) + ');doc.write(text); doc.close(); ' + '}, 0); }';

      var outerHTML = [doctype, '<html><head>']

      var includedCSS = [];
      var $$INCLUDE_CSS = function(filename) {includedCSS.push(filename)};
      $$INCLUDE_CSS("../static/css/iframe_editor.css");
      $$INCLUDE_CSS("../static/css/pad.css");
      $$INCLUDE_CSS("../static/custom/pad.css");
      
      
      var additionalCSS = _(hooks.callAll("aceEditorCSS")).map(function(path){ return '../static/plugins/' + path });
      includedCSS = includedCSS.concat(additionalCSS);
            
      pushStyleTagsFor(outerHTML, includedCSS);

      // bizarrely, in FF2, a file with no "external" dependencies won't finish loading properly
      // (throbs busy while typing)
      outerHTML.push('<link rel="stylesheet" type="text/css" href="data:text/css,"/>', '\x3cscript>\n', outerScript.replace(/<\//g, '<\\/'), '\n\x3c/script>', '</head><body id="outerdocbody"><div id="sidediv"><!-- --></div><div id="linemetricsdiv">x</div><div id="overlaysdiv"><!-- --></div></body></html>');

      var outerFrame = document.createElement("IFRAME");
      outerFrame.name = "ace_outer";
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
