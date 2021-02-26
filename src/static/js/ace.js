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

const Ace2Editor = function () {
  const ace2 = Ace2Editor;

  let info = {
    editor: this,
    id: (ace2.registry.nextId++),
  };
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

  ace2.registry[info.id] = info;

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

  this.getFrame = () => info.frame || null;

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

  const sortFilesByEmbeded = (files) => {
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
  };

  const addStyleTagsFor = (doc, files) => {
    const sorted = sortFilesByEmbeded(files);
    const embededFiles = sorted.embeded;
    const remoteFiles = sorted.remote;

    if (embededFiles.length > 0) {
      const css = embededFiles.map((f) => Ace2Editor.EMBEDED[f]).join('\n');
      const style = doc.createElement('style');
      style.type = 'text/css';
      style.appendChild(doc.createTextNode(css));
      doc.head.appendChild(style);
    }
    for (const file of remoteFiles) {
      const link = doc.createElement('link');
      link.rel = 'stylesheet';
      link.type = 'text/css';
      link.href = encodeURI(file);
      doc.head.appendChild(link);
    }
  };

  this.destroy = pendingInit(() => {
    info.ace_dispose();
    info.frame.parentNode.removeChild(info.frame);
    delete ace2.registry[info.id];
    info = null; // prevent IE 6 closure memory leaks
  });

  this.init = function (containerId, initialCode, doneFunc) {
    this.importText(initialCode);

    info.onEditorReady = () => {
      loaded = true;
      doActionsPendingInit();
      doneFunc();
    };

    const includedCSS = [
      '../static/css/iframe_editor.css',
      `../static/css/pad.css?v=${clientVars.randomVersionString}`,
      // Allow urls to external CSS - http(s):// and //some/path.css
      ...hooks.callAll('aceEditorCSS').map((p) => /\/\//.test(p) ? p : `../static/plugins/${p}`),
      `../static/skins/${clientVars.skinName}/pad.css?v=${clientVars.randomVersionString}`,
    ];

    const outerFrame = document.createElement('iframe');
    outerFrame.name = 'ace_outer';
    outerFrame.frameBorder = 0; // for IE
    outerFrame.title = 'Ether';
    info.frame = outerFrame;
    document.getElementById(containerId).appendChild(outerFrame);

    const outerWindow = outerFrame.contentWindow;
    const outerDocument = outerWindow.document;
    const skinVariants = clientVars.skinVariants.split(' ').filter((x) => x !== '');
    outerDocument.documentElement.classList.add('inner-editor', 'outerdoc', ...skinVariants);
    addStyleTagsFor(outerDocument, includedCSS);

    const style = outerDocument.createElement('style');
    style.type = 'text/css';
    style.title = 'dynamicsyntax';
    outerDocument.head.appendChild(style);

    const link = outerDocument.createElement('link');
    link.rel = 'stylesheet';
    link.type = 'text/css';
    link.href = 'data:text/css,';
    outerDocument.head.appendChild(link);

    outerWindow.editorInfo = Ace2Editor.registry[info.id];
    outerWindow.onload = () => {
      outerWindow.onload = null;
      const window = outerWindow;
      const document = outerDocument;
      setTimeout(() => {
        const iframe = document.createElement('iframe');
        iframe.name = 'ace_inner';
        iframe.title = 'pad';
        iframe.scrolling = 'no';
        iframe.frameBorder = 0;
        iframe.allowTransparency = true; // for IE
        iframe.ace_outerWin = window;
        document.body.insertBefore(iframe, document.body.firstChild);
        window.readyFunc = () => {
          delete window.readyFunc;
          window.editorInfo.onEditorReady();
          delete window.editorInfo;
        };
        const innerWindow = iframe.contentWindow;
        const innerDocument = innerWindow.document;
        innerDocument.documentElement.classList.add('inner-editor', ...skinVariants);
        addStyleTagsFor(innerDocument, includedCSS);

        const script = innerDocument.createElement('script');
        script.type = 'text/javascript';
        script.src = `../static/js/require-kernel.js?v=${clientVars.randomVersionString}`;
        innerDocument.head.appendChild(script);

        innerWindow.onload = () => {
          innerWindow.onload = null;
          const window = innerWindow;
          const require = window.require;
          require.setRootURI('../javascripts/src');
          require.setLibraryURI('../javascripts/lib');
          require.setGlobalKeyPath('require');

          window.plugins = require('ep_etherpad-lite/static/js/pluginfw/client_plugins');
          window.plugins.adoptPluginsFromAncestorsOf(window);

          window.$ = window.jQuery = require('ep_etherpad-lite/static/js/rjquery').jQuery;
          window.Ace2Inner = require('ep_etherpad-lite/static/js/ace2_inner');

          window.plugins.ensure(() => window.Ace2Inner.init());
        };

        const style = innerDocument.createElement('style');
        style.type = 'text/css';
        style.title = 'dynamicsyntax';
        innerDocument.head.appendChild(style);

        const headLines = [];
        hooks.callAll('aceInitInnerdocbodyHead', {iframeHTML: headLines});
        const tmp = innerDocument.createElement('div');
        tmp.innerHTML = headLines.join('\n');
        while (tmp.firstChild) innerDocument.head.appendChild(tmp.firstChild);

        innerDocument.body.id = 'innerdocbody';
        innerDocument.body.classList.add('innerdocbody');
        innerDocument.body.setAttribute('role', 'application');
        innerDocument.body.setAttribute('spellcheck', 'false');
        innerDocument.body.appendChild(innerDocument.createTextNode('\u00A0')); // &nbsp;
      }, 0);
    };

    outerDocument.body.id = 'outerdocbody';
    outerDocument.body.classList.add('outerdocbody', ...pluginUtils.clientPluginNames());

    const sideDiv = outerDocument.createElement('div');
    sideDiv.id = 'sidediv';
    sideDiv.classList.add('sidediv');
    outerDocument.body.appendChild(sideDiv);

    const lineMetricsDiv = outerDocument.createElement('div');
    lineMetricsDiv.id = 'linemetricsdiv';
    lineMetricsDiv.appendChild(outerDocument.createTextNode('x'));
    outerDocument.body.appendChild(lineMetricsDiv);
  };
};

Ace2Editor.registry = {
  nextId: 1,
};

exports.Ace2Editor = Ace2Editor;
