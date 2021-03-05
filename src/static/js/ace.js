'use strict';
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

const hooks = require('./pluginfw/hooks');
const pluginUtils = require('./pluginfw/shared');

const debugLog = (...args) => {};
window.debugLog = debugLog;

// The inner and outer iframe's locations are about:blank, so relative URLs are relative to that.
// Firefox and Chrome seem to do what the developer intends if given a relative URL, but Safari
// errors out unless given an absolute URL for a JavaScript-created element.
const absUrl = (url) => new URL(url, window.location.href).href;

const scriptTag =
    (source) => `<script type="text/javascript">\n${source.replace(/<\//g, '<\\/')}</script>`;

const Ace2Editor = function () {
  let info = {editor: this};
  window.ace2EditorInfo = info; // Make it accessible to iframes.
  let loaded = false;

  let actionsPendingInit = [];

  const pendingInit = (func) => function (...args) {
    const action = () => func.apply(this, args);
    if (loaded) return action();
    actionsPendingInit.push(action);
  };

  const doActionsPendingInit = () => {
    for (const fn of actionsPendingInit) fn();
    actionsPendingInit = [];
  };

  // The following functions (prefixed by 'ace_')  are exposed by editor, but
  // execution is delayed until init is complete
  const aceFunctionsPendingInit = [
    'importText',
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
    'replaceRange',
  ];

  for (const fnName of aceFunctionsPendingInit) {
    // Note: info[`ace_${fnName}`] does not exist yet, so it can't be passed directly to
    // pendingInit(). A simple wrapper is used to defer the info[`ace_${fnName}`] lookup until
    // method invocation.
    this[fnName] = pendingInit(function (...args) {
      info[`ace_${fnName}`].apply(this, args);
    });
  }

  this.exportText = () => loaded ? info.ace_exportText() : '(awaiting init)\n';

  this.getDebugProperty = (prop) => info.ace_getDebugProperty(prop);

  this.getInInternationalComposition =
      () => loaded ? info.ace_getInInternationalComposition() : false;

  // prepareUserChangeset:
  // Returns null if no new changes or ACE not ready.  Otherwise, bundles up all user changes
  // to the latest base text into a Changeset, which is returned (as a string if encodeAsString).
  // If this method returns a truthy value, then applyPreparedChangesetToBase can be called at some
  // later point to consider these changes part of the base, after which prepareUserChangeset must
  // be called again before applyPreparedChangesetToBase. Multiple consecutive calls to
  // prepareUserChangeset will return an updated changeset that takes into account the latest user
  // changes, and modify the changeset to be applied by applyPreparedChangesetToBase accordingly.
  this.prepareUserChangeset = () => loaded ? info.ace_prepareUserChangeset() : null;

  // returns array of {error: <browser Error object>, time: +new Date()}
  this.getUnhandledErrors = () => loaded ? info.ace_getUnhandledErrors() : [];

  const pushStyleTagsFor = (buffer, files) => {
    for (const file of files) {
      buffer.push(`<link rel="stylesheet" type="text/css" href="${absUrl(encodeURI(file))}"/>`);
    }
  };

  this.destroy = pendingInit(() => {
    info.ace_dispose();
    info.frame.parentNode.removeChild(info.frame);
    delete window.ace2EditorInfo;
    info = null; // prevent IE 6 closure memory leaks
  });

  this.init = async function (containerId, initialCode) {
    debugLog('Ace2Editor.init()');
    this.importText(initialCode);

    const includedCSS = [
      '../static/css/iframe_editor.css',
      `../static/css/pad.css?v=${clientVars.randomVersionString}`,
      ...hooks.callAll('aceEditorCSS').map(
          // Allow urls to external CSS - http(s):// and //some/path.css
          (p) => /\/\//.test(p) ? p : `../static/plugins/${p}`),
      `../static/skins/${clientVars.skinName}/pad.css?v=${clientVars.randomVersionString}`,
    ];

    const doctype = '<!doctype html>';

    const iframeHTML = [];

    iframeHTML.push(doctype);
    iframeHTML.push(`<html class='inner-editor ${clientVars.skinVariants}'><head>`);
    pushStyleTagsFor(iframeHTML, includedCSS);
    const requireKernelUrl =
        absUrl(`../static/js/require-kernel.js?v=${clientVars.randomVersionString}`);
    iframeHTML.push(`<script type="text/javascript" src="${requireKernelUrl}"></script>`);
    // Pre-fetch modules to improve load performance.
    for (const module of ['ace2_inner', 'ace2_common']) {
      const url = absUrl(`../javascripts/lib/ep_etherpad-lite/static/js/${module}.js` +
                         `?callback=require.define&v=${clientVars.randomVersionString}`);
      iframeHTML.push(`<script type="text/javascript" src="${url}"></script>`);
    }

    iframeHTML.push(scriptTag(`(async () => {
      parent.parent.debugLog('Ace2Editor.init() inner frame ready');
      const require = window.require;
      require.setRootURI(${JSON.stringify(absUrl('../javascripts/src'))});
      require.setLibraryURI(${JSON.stringify(absUrl('../javascripts/lib'))});
      require.setGlobalKeyPath('require');

      // intentially moved before requiring client_plugins to save a 307
      window.Ace2Inner = require('ep_etherpad-lite/static/js/ace2_inner');
      window.plugins = require('ep_etherpad-lite/static/js/pluginfw/client_plugins');
      window.plugins.adoptPluginsFromAncestorsOf(window);

      window.$ = window.jQuery = require('ep_etherpad-lite/static/js/rjquery').jQuery;

      parent.parent.debugLog('Ace2Editor.init() waiting for plugins');
      await new Promise((resolve, reject) => window.plugins.ensure(
          (err) => err != null ? reject(err) : resolve()));
      parent.parent.debugLog('Ace2Editor.init() waiting for Ace2Inner.init()');
      const editorInfo = parent.parent.ace2EditorInfo;
      await new Promise((resolve, reject) => window.Ace2Inner.init(
          editorInfo, (err) => err != null ? reject(err) : resolve()));
      parent.parent.debugLog('Ace2Editor.init() Ace2Inner.init() returned');
      editorInfo.onEditorReady();
    })();`));

    iframeHTML.push('<style type="text/css" title="dynamicsyntax"></style>');

    hooks.callAll('aceInitInnerdocbodyHead', {
      iframeHTML,
    });

    iframeHTML.push('</head><body id="innerdocbody" class="innerdocbody" role="application" ' +
                    'spellcheck="false">&nbsp;</body></html>');

    const outerScript = `(async () => {
      await new Promise((resolve) => { window.onload = () => resolve(); });
      parent.debugLog('Ace2Editor.init() outer frame ready');
      window.onload = null;
      await new Promise((resolve) => setTimeout(resolve, 0));
      const iframe = document.createElement('iframe');
      iframe.name = 'ace_inner';
      iframe.title = 'pad';
      iframe.scrolling = 'no';
      iframe.frameBorder = 0;
      iframe.allowTransparency = true; // for IE
      iframe.ace_outerWin = window;
      document.body.insertBefore(iframe, document.body.firstChild);
      const doc = iframe.contentWindow.document;
      doc.open();
      doc.write(${JSON.stringify(iframeHTML.join('\n'))});
      doc.close();
      parent.debugLog('Ace2Editor.init() waiting for inner frame');
    })();`;

    const outerHTML =
        [doctype, `<html class="inner-editor outerdoc ${clientVars.skinVariants}"><head>`];
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

    debugLog('Ace2Editor.init() waiting for outer frame');
    await new Promise((resolve, reject) => {
      info.onEditorReady = (err) => err != null ? reject(err) : resolve();
      editorDocument.open();
      editorDocument.write(outerHTML.join(''));
      editorDocument.close();
    });
    loaded = true;
    doActionsPendingInit();
    debugLog('Ace2Editor.init() done');
  };
};

exports.Ace2Editor = Ace2Editor;
