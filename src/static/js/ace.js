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
// requires: undefined

const KERNEL_SOURCE = '../static/js/require-kernel.js';

Ace2Editor.registry = {
  nextId: 1,
};

const hooks = require('./pluginfw/hooks');
const pluginUtils = require('./pluginfw/shared');
const _ = require('./underscore');

function scriptTag(source) {
  return (
    `<script type="text/javascript">\n${
      source.replace(/<\//g, '<\\/')
    }</script>`
  );
}

function Ace2Editor() {
  const ace2 = Ace2Editor;

  const editor = {};
  let info = {
    editor,
    id: (ace2.registry.nextId++),
  };
  let loaded = false;

  let actionsPendingInit = [];

  function pendingInit(func, optDoNow) {
    return function () {
      const that = this;
      const args = arguments;
      const action = function () {
        func.apply(that, args);
      };
      if (optDoNow) {
        optDoNow.apply(that, args);
      }
      if (loaded) {
        action();
      } else {
        actionsPendingInit.push(action);
      }
    };
  }

  function doActionsPendingInit() {
    _.each(actionsPendingInit, (fn, i) => {
      fn();
    });
    actionsPendingInit = [];
  }

  ace2.registry[info.id] = info;

  // The following functions (prefixed by 'ace_')  are exposed by editor, but
  // execution is delayed until init is complete
  const aceFunctionsPendingInit = ['importText',
    'importAText',
    'focus',
    'setEditable',
    'getFormattedCode',
    'setOnKeyPress',
    'setOnKeyDown',
    'setNotifyDirty',
    'setProperty',
    'setBaseText',
    'setBaseAttributedText',
    'applyChangesToBase',
    'applyPreparedChangesetToBase',
    'setUserChangeNotificationCallback',
    'setAuthorInfo',
    'setAuthorSelectionRange',
    'callWithAce',
    'execCommand',
    'replaceRange'];

  _.each(aceFunctionsPendingInit, (fnName, i) => {
    const prefix = 'ace_';
    const name = prefix + fnName;
    editor[fnName] = pendingInit(function () {
      if (fnName === 'setAuthorInfo') {
        if (!arguments[0]) {
          // setAuthorInfo AuthorId not set for some reason
        } else {
          info[prefix + fnName].apply(this, arguments);
        }
      } else {
        info[prefix + fnName].apply(this, arguments);
      }
    });
  });

  editor.exportText = function () {
    if (!loaded) return '(awaiting init)\n';
    return info.ace_exportText();
  };

  editor.getFrame = function () {
    return info.frame || null;
  };

  editor.getDebugProperty = function (prop) {
    return info.ace_getDebugProperty(prop);
  };

  editor.getInInternationalComposition = function () {
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
  editor.prepareUserChangeset = function () {
    if (!loaded) return null;
    return info.ace_prepareUserChangeset();
  };

  editor.getUnhandledErrors = function () {
    if (!loaded) return [];
    // returns array of {error: <browser Error object>, time: +new Date()}
    return info.ace_getUnhandledErrors();
  };


  function sortFilesByEmbeded(files) {
    const embededFiles = [];
    let remoteFiles = [];

    if (Ace2Editor.EMBEDED) {
      for (let i = 0, ii = files.length; i < ii; i++) {
        const file = files[i];
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
  function pushStyleTagsFor(buffer, files) {
    const sorted = sortFilesByEmbeded(files);
    const embededFiles = sorted.embeded;
    const remoteFiles = sorted.remote;

    if (embededFiles.length > 0) {
      buffer.push('<style type="text/css">');
      for (var i = 0, ii = embededFiles.length; i < ii; i++) {
        var file = embededFiles[i];
        buffer.push((Ace2Editor.EMBEDED[file] || '').replace(/<\//g, '<\\/'));
      }
      buffer.push('<\/style>');
    }
    for (var i = 0, ii = remoteFiles.length; i < ii; i++) {
      var file = remoteFiles[i];
      buffer.push(`<link rel="stylesheet" type="text/css" href="${encodeURI(file)}"\/>`);
    }
  }

  editor.destroy = pendingInit(() => {
    info.ace_dispose();
    info.frame.parentNode.removeChild(info.frame);
    delete ace2.registry[info.id];
    info = null; // prevent IE 6 closure memory leaks
  });

  editor.init = function (containerId, initialCode, doneFunc) {
    editor.importText(initialCode);

    info.onEditorReady = function () {
      loaded = true;
      doActionsPendingInit();
      doneFunc();
    };

    (function () {
      const doctype = '<!doctype html>';

      const iframeHTML = [];

      iframeHTML.push(doctype);
      iframeHTML.push(`<html class='inner-editor ${clientVars.skinVariants}'><head>`);

      // calls to these functions ($$INCLUDE_...)  are replaced when this file is processed
      // and compressed, putting the compressed code from the named file directly into the
      // source here.
      // these lines must conform to a specific format because they are passed by the build script:
      var includedCSS = [];
      var $$INCLUDE_CSS = function (filename) { includedCSS.push(filename); };
      $$INCLUDE_CSS('../static/css/iframe_editor.css');

      // disableCustomScriptsAndStyles can be used to disable loading of custom scripts
      if (!clientVars.disableCustomScriptsAndStyles) {
        $$INCLUDE_CSS(`../static/css/pad.css?v=${clientVars.randomVersionString}`);
      }

      var additionalCSS = _(hooks.callAll('aceEditorCSS')).map((path) => {
        if (path.match(/\/\//)) { // Allow urls to external CSS - http(s):// and //some/path.css
          return path;
        }
        return `../static/plugins/${path}`;
      });
      includedCSS = includedCSS.concat(additionalCSS);
      $$INCLUDE_CSS(`../static/skins/${clientVars.skinName}/pad.css?v=${clientVars.randomVersionString}`);

      pushStyleTagsFor(iframeHTML, includedCSS);

      if (!Ace2Editor.EMBEDED && Ace2Editor.EMBEDED[KERNEL_SOURCE]) {
        // Remotely src'd script tag will not work in IE; it must be embedded, so
        // throw an error if it is not.
        throw new Error('Require kernel could not be found.');
      }

      iframeHTML.push(scriptTag(
          `${Ace2Editor.EMBEDED[KERNEL_SOURCE]}\n\
require.setRootURI("../javascripts/src");\n\
require.setLibraryURI("../javascripts/lib");\n\
require.setGlobalKeyPath("require");\n\
\n\
var plugins = require("ep_etherpad-lite/static/js/pluginfw/client_plugins");\n\
plugins.adoptPluginsFromAncestorsOf(window);\n\
\n\
$ = jQuery = require("ep_etherpad-lite/static/js/rjquery").jQuery; // Expose jQuery #HACK\n\
var Ace2Inner = require("ep_etherpad-lite/static/js/ace2_inner");\n\
\n\
plugins.ensure(function () {\n\
  Ace2Inner.init();\n\
});\n\
`));

      iframeHTML.push('<style type="text/css" title="dynamicsyntax"></style>');

      hooks.callAll('aceInitInnerdocbodyHead', {
        iframeHTML,
      });

      iframeHTML.push('</head><body id="innerdocbody" class="innerdocbody" role="application" class="syntax" spellcheck="false">&nbsp;</body></html>');

      // Expose myself to global for my child frame.
      const thisFunctionsName = 'ChildAccessibleAce2Editor';
      (function () { return this; }())[thisFunctionsName] = Ace2Editor;

      const outerScript = `\
editorId = ${JSON.stringify(info.id)};\n\
editorInfo = parent[${JSON.stringify(thisFunctionsName)}].registry[editorId];\n\
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
    var text = (${JSON.stringify(iframeHTML.join('\n'))});\n\
    doc.write(text);\n\
    doc.close();\n\
  }, 0);\n\
}`;

      const outerHTML = [doctype, `<html class="inner-editor outerdoc ${clientVars.skinVariants}"><head>`];

      var includedCSS = [];
      var $$INCLUDE_CSS = function (filename) { includedCSS.push(filename); };
      $$INCLUDE_CSS('../static/css/iframe_editor.css');
      $$INCLUDE_CSS(`../static/css/pad.css?v=${clientVars.randomVersionString}`);


      var additionalCSS = _(hooks.callAll('aceEditorCSS')).map((path) => {
        if (path.match(/\/\//)) { // Allow urls to external CSS - http(s):// and //some/path.css
          return path;
        }
        return `../static/plugins/${path}`;
      }
      );
      includedCSS = includedCSS.concat(additionalCSS);
      $$INCLUDE_CSS(`../static/skins/${clientVars.skinName}/pad.css?v=${clientVars.randomVersionString}`);

      pushStyleTagsFor(outerHTML, includedCSS);

      // bizarrely, in FF2, a file with no "external" dependencies won't finish loading properly
      // (throbs busy while typing)
      const pluginNames = pluginUtils.clientPluginNames();
      outerHTML.push(
          '<style type="text/css" title="dynamicsyntax"></style>',
          '<link rel="stylesheet" type="text/css" href="data:text/css,"/>',
          scriptTag(outerScript),
          '</head>',
          '<body id="outerdocbody" class="outerdocbody ', pluginNames.join(' '), '">',
          '<div id="sidediv" class="sidediv"><!-- --></div>',
          '<div id="linemetricsdiv">x</div>',
          '</body></html>');

      const outerFrame = document.createElement('IFRAME');
      outerFrame.name = 'ace_outer';
      outerFrame.frameBorder = 0; // for IE
      outerFrame.title = 'Ether';
      info.frame = outerFrame;
      document.getElementById(containerId).appendChild(outerFrame);

      const editorDocument = outerFrame.contentWindow.document;

      editorDocument.open();
      editorDocument.write(outerHTML.join(''));
      editorDocument.close();
    })();
  };

  return editor;
}

exports.Ace2Editor = Ace2Editor;
